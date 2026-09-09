// The clinic's own answer to an outreach draft, taken from the preview page.
//
// Reject is final and immediate: the clinic row is deleted (images, treatments,
// doctors and videos cascade with it) and only a suppression tombstone stays,
// so the collector never mails them again.
//
// Approve deliberately does NOT publish. It records consent and hands back a
// "now prove you are this clinic" signal; the page only goes live once the
// clinic has signed up with a work email and verified it (clinic-draft-claim).
// Keeping the approval row 'pending' until then means someone who abandons the
// signup halfway can come back to the same link and finish.
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
    const { token, action, consentText } = await req.json()

    if (!token || typeof token !== 'string' || token.length < 16) {
      return json({ error: 'Invalid token' }, 404)
    }
    if (action !== 'approve' && action !== 'reject') {
      return json({ error: 'Invalid action' }, 400)
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const { data: approval, error: approvalError } = await supabase
      .from('clinic_approvals')
      .select('id, clinic_id, status, expires_at')
      .eq('preview_token', token)
      .maybeSingle()

    if (approvalError) throw approvalError
    if (!approval) return json({ error: 'Invalid token' }, 404)
    if (approval.status !== 'pending') return json({ error: 'Already answered' }, 410)
    if (approval.expires_at && new Date(approval.expires_at) <= new Date()) {
      return json({ error: 'Expired' }, 410)
    }

    const { data: clinic } = await supabase
      .from('clinics')
      .select('id, name, email, website')
      .eq('id', approval.clinic_id)
      .maybeSingle()

    if (action === 'reject') {
      // Tombstone first: if the delete succeeds but this insert never ran we
      // would lose the fact that they said no, which is the one thing we must
      // not forget.
      await supabase.from('outreach_suppressions').insert({
        clinic_name: clinic?.name ?? 'unknown',
        email: clinic?.email ?? null,
        website_domain: hostnameOf(clinic?.website ?? null),
        reason: 'clinic_rejected',
      })

      const { error: deleteError } = await supabase
        .from('clinics')
        .delete()
        .eq('id', approval.clinic_id)

      if (deleteError) throw deleteError

      return json({ state: 'rejected' })
    }

    // Approve: capture who consented to what, from where. This is the only
    // evidence that we were given the right to publish this content, so it is
    // written once and never overwritten.
    const forwardedFor = req.headers.get('x-forwarded-for') ?? ''
    const ip = forwardedFor.split(',')[0]?.trim() || null

    const { error: consentError } = await supabase
      .from('clinic_approvals')
      .update({
        consent_text: typeof consentText === 'string' ? consentText.slice(0, 4000) : null,
        consent_ip: ip,
        consent_user_agent: req.headers.get('user-agent')?.slice(0, 500) ?? null,
        consent_at: new Date().toISOString(),
      })
      .eq('id', approval.id)
      .is('consent_at', null)

    if (consentError) throw consentError

    return json({
      state: 'consented',
      // Prefills the signup form and lets the page hint at the expected domain.
      clinicName: clinic?.name ?? null,
      expectedDomain: hostnameOf(clinic?.website ?? null),
    })
  } catch (error) {
    console.error('clinic-draft-decision failed:', error)
    return json({ error: 'Could not record your answer' }, 500)
  }
})
