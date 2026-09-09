// Serves one outreach draft clinic to whoever holds its secret preview token.
//
// Drafts live in `clinics` with is_published = false, so they are never copied
// into clinics_public and no anon Postgres role can read them. That is
// deliberate: the ONLY way to see a draft is this function, which trades a
// token for exactly one clinic. It runs with the service role, so it must
// never accept a clinic id — only the token decides which row comes back.
//
// The select mirrors getClinicByIdPrivate() in src/lib/services.ts field for
// field: the clinic has to see the page exactly as it will look once live.
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

const CLINIC_SELECT = `
  *,
  cities (
    name,
    countries (
      name
    )
  ),
  clinic_images (
    id,
    image_url,
    is_primary
  ),
  clinic_treatments (
    id,
    treatment_id,
    starting_price_euro,
    treatments (
      name,
      description
    )
  ),
  doctors (
    id,
    name,
    title,
    experience_years,
    graduation_year,
    profile_image_url
  ),
  clinic_before_after_images (
    id,
    image_url,
    sort_order
  ),
  clinic_videos (
    id,
    video_url,
    provider,
    provider_id,
    thumbnail_url,
    sort_order
  )
`

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders })
  }

  try {
    const { token } = await req.json()
    // A short or missing token is never a near miss worth explaining — the
    // response for "wrong token" and "expired token" is deliberately the same
    // shape so this endpoint can't be used to probe which tokens exist.
    if (!token || typeof token !== 'string' || token.length < 16) {
      return json({ state: 'invalid' }, 404)
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
    if (!approval) return json({ state: 'invalid' }, 404)

    // Already answered: the clinic clicked approve or reject earlier. Say so
    // rather than 404, so someone re-opening the mail sees what happened.
    if (approval.status !== 'pending') {
      return json({ state: approval.status === 'approved' ? 'approved' : 'rejected' }, 410)
    }

    if (approval.expires_at && new Date(approval.expires_at) <= new Date()) {
      return json({ state: 'expired' }, 410)
    }

    const { data: clinic, error: clinicError } = await supabase
      .from('clinics')
      .select(CLINIC_SELECT)
      .eq('id', approval.clinic_id)
      .maybeSingle()

    if (clinicError) throw clinicError
    if (!clinic) return json({ state: 'invalid' }, 404)

    return json({
      state: 'pending',
      clinic,
      expiresAt: approval.expires_at,
    })
  } catch (error) {
    console.error('clinic-preview failed:', error)
    return json({ error: 'Preview could not be loaded' }, 500)
  }
})
