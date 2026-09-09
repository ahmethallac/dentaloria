// Final step of the outreach flow: the clinic has approved the draft, signed
// up with a work email and verified it. Here we hand them the clinic record
// and take the page live.
//
// After this runs the clinic is indistinguishable from one that registered
// itself: same clinic_admin role (see register-clinic), same ownership row,
// same panel. The only trace is the consent record on clinic_approvals.
//
// Publishing happens here and nowhere else in this flow. It requires a
// verified email on the caller's JWT — clicking "approve" alone never
// publishes anything, because anyone forwarded the link could click it.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const hostnameOf = (url: string | null): string | null => {
  if (!url) return null
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    if (!token || typeof token !== 'string' || token.length < 16) {
      return json({ error: 'Invalid token' }, 404)
    }

    const authHeader = req.headers.get('Authorization') ?? ''
    const jwt = authHeader.replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Not signed in' }, 401)

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: userData, error: userError } = await admin.auth.getUser(jwt)
    const user = userData?.user
    if (userError || !user) return json({ error: 'Not signed in' }, 401)

    // The whole point of the signup step is proving control of a mailbox at
    // this clinic. An unverified address proves nothing, so it cannot publish.
    if (!user.email_confirmed_at) {
      return json({ error: 'Email not verified yet', state: 'awaiting_verification' }, 403)
    }

    const { data: approval, error: approvalError } = await admin
      .from('clinic_approvals')
      .select('id, clinic_id, status, expires_at, consent_at')
      .eq('preview_token', token)
      .maybeSingle()

    if (approvalError) throw approvalError
    if (!approval) return json({ error: 'Invalid token' }, 404)
    if (approval.status !== 'pending') return json({ error: 'Already answered' }, 410)
    // Reaching here without a consent timestamp means the signup screen was
    // opened without ever pressing approve. Consent is what we publish on, so
    // there is nothing to claim yet.
    if (!approval.consent_at) return json({ error: 'Not approved yet' }, 409)
    if (approval.expires_at && new Date(approval.expires_at) <= new Date()) {
      return json({ error: 'Expired' }, 410)
    }

    const { data: clinic } = await admin
      .from('clinics')
      .select('id, user_id, website, slug, city_id, cities ( slug )')
      .eq('id', approval.clinic_id)
      .maybeSingle()

    if (!clinic) return json({ error: 'Invalid token' }, 404)
    if (clinic.user_id) return json({ error: 'Already claimed' }, 409)

    // Small clinics legitimately run on gmail, so a mismatch is never a block —
    // it is flagged for staff to glance at, and that is all.
    const expectedDomain = hostnameOf(clinic.website ?? null)
    const emailDomain = user.email?.split('@')[1]?.toLowerCase() ?? null
    const domainMatches = !!expectedDomain && !!emailDomain && expectedDomain.toLowerCase() === emailDomain

    await admin.from('user_roles').upsert(
      { user_id: user.id, role: 'clinic_admin' },
      { onConflict: 'user_id,role', ignoreDuplicates: true } as any,
    )

    const { error: claimError } = await admin
      .from('clinics')
      .update({
        user_id: user.id,
        email: user.email,
        email_verified: true,
        approval_status: 'approved',
        page_status: 'live',
        is_published: true,
        page_revision_notes: null,
      })
      .eq('id', clinic.id)
      .is('user_id', null)

    if (claimError) throw claimError

    // Burn the token only now that the page is actually live, so a failure
    // anywhere above leaves the clinic able to retry from the same link.
    const { error: closeError } = await admin
      .from('clinic_approvals')
      .update({
        status: 'approved',
        consent_email: user.email,
        reviewed_at: new Date().toISOString(),
        preview_token: null,
      })
      .eq('id', approval.id)

    if (closeError) throw closeError

    return json({
      state: 'published',
      clinicId: clinic.id,
      clinicSlug: clinic.slug,
      citySlug: (clinic as any)?.cities?.slug ?? null,
      domainMatches,
    })
  } catch (error) {
    console.error('clinic-draft-claim failed:', error)
    return json({ error: 'Could not publish your page' }, 500)
  }
})
