// Atomic clinic registration: creates auth user + clinic + approval + role.
// Rolls back the auth user if any subsequent step fails so we never leave orphans.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const admin = createClient(supabaseUrl, serviceKey)

    const body = await req.json().catch(() => ({}))
    const {
      email, password,
      clinicName, cityId, phone, website,
      healthTourismDocUrl,
      agencyCertificateUrl,
      appliedAsHealthcareFacility,
      locale,
    } = body || {}

    // Whichever site locale the registrant was browsing in — used later to
    // send them transactional emails in their own language. Falls back to
    // English for anything unrecognized rather than rejecting the request.
    const SUPPORTED_LOCALES = ['en', 'tr', 'ro', 'pl', 'ru', 'de', 'fr']
    const resolvedLocale = SUPPORTED_LOCALES.includes(locale) ? locale : 'en'

    // Basic validation
    const missing: string[] = []
    if (!email) missing.push('email')
    if (!password) missing.push('password')
    if (!clinicName) missing.push('clinicName')
    if (!cityId) missing.push('cityId')
    if (!phone) missing.push('phone')
    if (!healthTourismDocUrl) missing.push('healthTourismDocUrl')
    // agencyCertificateUrl (TÜRSAB certificate) is fully optional.
    if (missing.length) {
      return json({ error: `Missing required fields: ${missing.join(', ')}` }, 400)
    }
    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    // 1) Create auth user
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_type: 'clinic_admin', full_name: clinicName, clinic_name: clinicName },
    })
    if (createErr || !created?.user) {
      // Surface a stable, machine-readable key for "this email is already
      // registered" so the frontend can show a localized, actionable message
      // (point the user to log in) instead of Supabase's raw English text.
      const isDuplicateEmail =
        (createErr as any)?.code === 'email_exists' ||
        /already.*registered|already.*exists/i.test(createErr?.message || '')
      return json(
        { error: isDuplicateEmail ? 'email_already_registered' : (createErr?.message || 'Failed to create user') },
        400
      )
    }
    const userId = created.user.id

    const rollback = async (reason: string) => {
      try { await admin.auth.admin.deleteUser(userId) } catch (_) {}
      return json({ error: reason }, 500)
    }

    // 2) Insert clinic (pending application + incomplete page)
    const { data: clinicRow, error: clinicErr } = await admin
      .from('clinics')
      .insert({
        name: String(clinicName).toUpperCase(),
        email,
        user_id: userId,
        city_id: cityId,
        phone,
        website: website || null,
        is_published: false,
        approval_status: 'pending',
        page_status: 'incomplete',
        locale: resolvedLocale,
      })
      .select('id')
      .single()
    if (clinicErr || !clinicRow) return await rollback(`Failed to create clinic: ${clinicErr?.message}`)

    // 3) Approval row with documents.
    //    NOTE: existing column tax_certificate_url is reused to store the agency certificate URL
    //    (kept for backwards compatibility — no schema rename needed).
    const { error: apprErr } = await admin
      .from('clinic_approvals')
      .insert({
        clinic_id: clinicRow.id,
        status: 'pending',
        health_tourism_doc_url: healthTourismDocUrl,
        tax_certificate_url: appliedAsHealthcareFacility ? null : agencyCertificateUrl,
        applied_as_healthcare_facility: !!appliedAsHealthcareFacility,
      })
    if (apprErr) return await rollback(`Failed to create approval: ${apprErr.message}`)

    // 4) Ensure user_role = clinic_admin
    await admin.from('user_roles').upsert(
      { user_id: userId, role: 'clinic_admin' },
      { onConflict: 'user_id,role', ignoreDuplicates: true } as any
    )

    // 5) Fire-and-forget notification emails (clinic confirmation + admin alert)
    try {
      await admin.functions.invoke('send-clinic-notification', {
        body: { type: 'application_received', clinicId: clinicRow.id },
      })
    } catch (_) { /* non-fatal */ }
    try {
      await admin.functions.invoke('send-clinic-notification', {
        body: { type: 'admin_new_application', clinicId: clinicRow.id },
      })
    } catch (_) { /* non-fatal */ }

    return json({ success: true, clinicId: clinicRow.id, userId })
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
