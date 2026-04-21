import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

type AppRole = 'admin'
// Role management is restricted to Super Admin promotion only.
const ALLOWED_ROLES: AppRole[] = ['admin']

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const authHeader = req.headers.get('Authorization')
    if (!authHeader?.startsWith('Bearer ')) return json({ error: 'Unauthorized' }, 401)

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authHeader } },
    })
    const token = authHeader.replace('Bearer ', '')
    const { data: userData, error: userErr } = await userClient.auth.getUser(token)
    if (userErr || !userData?.user?.id) return json({ error: 'Unauthorized' }, 401)
    const callerId = userData.user.id

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: callerId, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Forbidden — admin role required' }, 403)

    const body = await req.json().catch(() => ({}))
    const action = String(body.action || '') // 'set_role' | 'list_users' | 'delete_user'

    if (action === 'list_users') {
      // List all auth users + join with roles
      const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
      if (listErr) return json({ error: listErr.message }, 500)

      const { data: roles } = await admin.from('user_roles').select('user_id, role, created_at')
      const { data: profiles } = await admin.from('profiles').select('id, full_name')

      const profileMap = new Map((profiles || []).map((p: any) => [p.id, p.full_name]))
      const roleMap = new Map<string, string[]>()
      ;(roles || []).forEach((r: any) => {
        const arr = roleMap.get(r.user_id) || []
        arr.push(r.role)
        roleMap.set(r.user_id, arr)
      })

      const users = (usersList?.users || []).map((u: any) => ({
        id: u.id,
        email: u.email,
        full_name: profileMap.get(u.id) || (u.user_metadata?.full_name ?? null),
        created_at: u.created_at,
        roles: roleMap.get(u.id) || [],
      }))
      return json({ users })
    }

    if (action === 'set_role') {
      const userId = String(body.user_id || '')
      const role = body.role as AppRole
      if (!userId || !role) return json({ error: 'Missing user_id or role' }, 400)
      if (!ALLOWED_ROLES.includes(role)) return json({ error: 'Invalid role' }, 400)

      // Prevent removing the last admin
      if (role !== 'admin') {
        const { data: existing } = await admin
          .from('user_roles')
          .select('user_id')
          .eq('role', 'admin')
        const isCurrentlyAdmin = (existing || []).some((r: any) => r.user_id === userId)
        if (isCurrentlyAdmin && (existing || []).length <= 1) {
          return json({ error: 'Cannot demote the last Super Admin.' }, 400)
        }
      }

      // Replace all roles for this user with the new single role
      await admin.from('user_roles').delete().eq('user_id', userId)
      const { error: insErr } = await admin.from('user_roles').insert({
        user_id: userId,
        role,
        created_by: callerId,
      })
      if (insErr) return json({ error: insErr.message }, 500)
      return json({ success: true, user_id: userId, role })
    }

    if (action === 'delete_user') {
      const userId = String(body.user_id || '')
      if (!userId) return json({ error: 'Missing user_id' }, 400)
      if (userId === callerId) return json({ error: 'You cannot delete your own account.' }, 400)

      const { data: existing } = await admin
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
      const isTargetAdmin = (existing || []).some((r: any) => r.user_id === userId)
      if (isTargetAdmin && (existing || []).length <= 1) {
        return json({ error: 'Cannot delete the last Super Admin.' }, 400)
      }

      const { error: delErr } = await admin.auth.admin.deleteUser(userId)
      if (delErr) return json({ error: delErr.message }, 500)
      return json({ success: true })
    }

    return json({ error: 'Unknown action' }, 400)
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
