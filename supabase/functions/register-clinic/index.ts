// Clinic-admin account bootstrap: creates the auth user (password mode) or
// verifies an existing session (oauth mode), then grants the clinic_admin
// role. Nothing else — the clinic profile itself is created and filled in
// client-side, step by step, once the user has a session (RLS covers those
// writes because clinics.user_id = auth.uid()).
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
    const mode = body?.mode === 'oauth' ? 'oauth' : 'password'

    const grantClinicAdminRole = async (userId: string) => {
      await admin.from('user_roles').upsert(
        { user_id: userId, role: 'clinic_admin' },
        { onConflict: 'user_id,role', ignoreDuplicates: true } as any
      )
    }

    if (mode === 'oauth') {
      // Caller already has a Supabase session (e.g. just completed Google
      // sign-in). supabase-js sends it as a Bearer token automatically when
      // functions.invoke() is called with an active session.
      const authHeader = req.headers.get('Authorization') || ''
      const token = authHeader.replace(/^Bearer\s+/i, '')
      if (!token) return json({ error: 'Missing session' }, 401)

      const { data: userData, error: userErr } = await admin.auth.getUser(token)
      if (userErr || !userData?.user) return json({ error: 'Invalid session' }, 401)

      await grantClinicAdminRole(userData.user.id)
      return json({ success: true, userId: userData.user.id })
    }

    // mode === 'password'
    const { email, password } = body || {}
    if (!email) return json({ error: 'Missing required fields: email' }, 400)
    if (!password) return json({ error: 'Missing required fields: password' }, 400)
    if (typeof password !== 'string' || password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { user_type: 'clinic_admin' },
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

    await grantClinicAdminRole(created.user.id)
    return json({ success: true, userId: created.user.id })
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
