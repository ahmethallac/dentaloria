// Creates one outreach draft: an ownerless clinic row plus the secret link we
// send them. Admin-only.
//
// This runs server-side rather than as a plain insert from the panel for three
// reasons: clinics has no admin INSERT policy, the token needs real randomness,
// and the suppression check must not be skippable by whoever is driving the UI.
// A clinic that already rejected us must never be re-imported and re-mailed.
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

// Unambiguous alphabet: no O/0 or I/1, so a token read off a screen or dictated
// over the phone still works.
const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const makeToken = (length = 24) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

const hostnameOf = (url: string | null | undefined): string | null => {
  if (!url) return null
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '')
  } catch {
    return null
  }
}

const DRAFT_LIFETIME_DAYS = 14

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Not signed in' }, 401)

    const { data: userData } = await admin.auth.getUser(jwt)
    const caller = userData?.user
    if (!caller) return json({ error: 'Not signed in' }, 401)

    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: caller.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Admins only' }, 403)

    const body = await req.json()
    const name = (body?.name ?? '').trim()
    const cityId = body?.cityId
    if (!name || !cityId) return json({ error: 'Clinic name and city are required' }, 400)

    const email = (body?.email ?? '').trim().toLowerCase() || null
    const website = (body?.website ?? '').trim() || null
    const domain = hostnameOf(website)

    // Anyone who already told us no stays told. Checked here so it holds no
    // matter which screen or script is creating the draft.
    const suppression = await admin
      .from('outreach_suppressions')
      .select('id, clinic_name, created_at')
      .or([
        email ? `email.eq.${email}` : null,
        domain ? `website_domain.eq.${domain}` : null,
      ].filter(Boolean).join(','))
      .limit(1)

    if (suppression.data?.length) {
      return json({
        error: 'This clinic previously rejected an invitation and must not be contacted again.',
        suppressed: true,
      }, 409)
    }

    const { data: clinic, error: clinicError } = await admin
      .from('clinics')
      .insert({
        name,
        city_id: cityId,
        description: (body?.description ?? '').trim() || null,
        email,
        website,
        phone: (body?.phone ?? '').trim() || null,
        // Ownerless and unpublished: sync_clinics_public only copies rows with
        // is_published = true AND page_status = 'live', so this is invisible to
        // the public site until the clinic itself claims it.
        user_id: null,
        is_published: false,
        page_status: 'awaiting_clinic_approval',
        approval_status: 'pending',
      })
      .select('id, name, slug')
      .single()

    if (clinicError) throw clinicError

    const previewToken = makeToken()
    const expiresAt = new Date(Date.now() + DRAFT_LIFETIME_DAYS * 86_400_000).toISOString()

    const { error: approvalError } = await admin
      .from('clinic_approvals')
      .insert({
        clinic_id: clinic.id,
        status: 'pending',
        preview_token: previewToken,
        expires_at: expiresAt,
      })

    // Without a token the draft is unreachable and would just sit there, so
    // roll the clinic back rather than leave an orphan behind.
    if (approvalError) {
      await admin.from('clinics').delete().eq('id', clinic.id)
      throw approvalError
    }

    return json({
      clinicId: clinic.id,
      clinicName: clinic.name,
      previewToken,
      expiresAt,
    })
  } catch (error) {
    console.error('create-clinic-draft failed:', error)
    return json({ error: (error as Error)?.message ?? 'Could not create the draft' }, 500)
  }
})
