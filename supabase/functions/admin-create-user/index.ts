import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'admin' | 'sub_admin' | 'clinic_admin' | 'patient'
const ALLOWED_ROLES: AppRole[] = ['admin', 'sub_admin', 'clinic_admin', 'patient']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) {
      return json({ error: 'Unauthorized' }, 401)
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })

    const token = authHeader.replace('Bearer ', '')
    const { data: claims, error: claimsErr } = await userClient.auth.getClaims(token)
    if (claimsErr || !claims?.claims?.sub) return json({ error: 'Unauthorized' }, 401)

    const callerId = claims.claims.sub as string

    const admin = createClient(supabaseUrl, serviceKey)

    // Verify caller is admin
    const { data: isAdmin, error: roleErr } = await admin.rpc('has_role', {
      _user_id: callerId,
      _role: 'admin',
    })
    if (roleErr || !isAdmin) return json({ error: 'Forbidden — admin role required' }, 403)

    const body = await req.json().catch(() => ({}))
    const email = String(body.email || '').trim().toLowerCase()
    const password = String(body.password || '')
    const fullName = String(body.full_name || '').trim()
    const role = body.role as AppRole

    if (!email || !password || !fullName || !role) {
      return json({ error: 'Missing required fields: email, password, full_name, role' }, 400)
    }
    if (!ALLOWED_ROLES.includes(role)) {
      return json({ error: 'Invalid role' }, 400)
    }
    if (password.length < 6) {
      return json({ error: 'Password must be at least 6 characters' }, 400)
    }

    // Create auth user (auto-confirmed so they can log in immediately)
    const { data: created, error: createErr } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName, user_type: role },
    })
    if (createErr || !created?.user) {
      return json({ error: createErr?.message || 'Failed to create user' }, 400)
    }

    const newUserId = created.user.id

    // The handle_new_user_role trigger inserts the role from user_metadata.user_type
    // (or defaults to 'patient'). Make sure the requested role is the only one.
    await admin.from('user_roles').delete().eq('user_id', newUserId)
    const { error: roleInsertErr } = await admin.from('user_roles').insert({
      user_id: newUserId,
      role,
      created_by: callerId,
    })
    if (roleInsertErr) {
      return json({ error: `User created but role assignment failed: ${roleInsertErr.message}` }, 500)
    }

    return json({ success: true, user_id: newUserId, email, role })
  } catch (e) {
    return json({ error: e instanceof Error ? e.message : 'Unknown error' }, 500)
  }
})

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })
}
