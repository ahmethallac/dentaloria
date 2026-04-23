// One-off cleanup function — wipes all clinic & non-admin user data.
// Preserves Super Admins, reference tables (countries, cities, treatments, treatment_categories).
// Caller must be authenticated and have the 'admin' role.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

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

    const report: Record<string, unknown> = {}

    // 1) Collect Super Admin user IDs to preserve
    const { data: adminRoles, error: arErr } = await admin
      .from('user_roles')
      .select('user_id')
      .eq('role', 'admin')
    if (arErr) return json({ error: `Failed to load admins: ${arErr.message}` }, 500)
    const adminIds = (adminRoles || []).map((r: any) => r.user_id as string)
    report.preserved_admin_ids = adminIds

    // 2) Delete data rows in dependency order. Use neq on a never-matching uuid to delete all rows.
    const NEVER = '00000000-0000-0000-0000-000000000000'
    const tablesAll = [
      'lead_purchases',
      'contact_requests',
      'contact_request_tracking',
      'rate_limits',
      'clinic_approvals',
      'clinic_billing_settings',
      'clinic_treatments',
      'clinic_images',
      'doctors',
      'reviews',
      'clinics',
    ]
    const tableReport: Record<string, string> = {}
    for (const t of tablesAll) {
      const { error } = await admin.from(t).delete().neq('id', NEVER)
      tableReport[t] = error ? `ERROR: ${error.message}` : 'ok'
    }
    report.tables = tableReport

    // 3) user_roles — delete all rows whose role != 'admin'
    {
      const { error } = await admin.from('user_roles').delete().neq('role', 'admin')
      report.user_roles_non_admin = error ? `ERROR: ${error.message}` : 'ok'
    }

    // 4) profiles — delete all profiles whose id is not a Super Admin
    if (adminIds.length > 0) {
      const inList = `(${adminIds.map((id) => `"${id}"`).join(',')})`
      const { error } = await admin.from('profiles').delete().not('id', 'in', inList)
      report.profiles_non_admin = error ? `ERROR: ${error.message}` : 'ok'
    }

    // 5) auth.users — delete every user not in adminIds
    let authDeleted = 0
    let authErrors: string[] = []
    const { data: usersList, error: listErr } = await admin.auth.admin.listUsers({ perPage: 1000 })
    if (listErr) {
      authErrors.push(`listUsers: ${listErr.message}`)
    } else {
      for (const u of usersList?.users || []) {
        if (adminIds.includes(u.id)) continue
        const { error: delErr } = await admin.auth.admin.deleteUser(u.id)
        if (delErr) authErrors.push(`${u.email || u.id}: ${delErr.message}`)
        else authDeleted++
      }
    }
    report.auth_users_deleted = authDeleted
    if (authErrors.length) report.auth_users_errors = authErrors

    // 6) Storage — empty the three buckets
    const buckets = ['clinic-images', 'doctor-images', 'clinic-documents']
    const storageReport: Record<string, unknown> = {}
    for (const bucket of buckets) {
      const allPaths: string[] = []
      // Recursively list all files
      async function walk(prefix: string) {
        const { data: items, error } = await admin.storage.from(bucket).list(prefix, {
          limit: 1000,
          sortBy: { column: 'name', order: 'asc' },
        })
        if (error) {
          storageReport[bucket] = `list error at "${prefix}": ${error.message}`
          return
        }
        for (const item of items || []) {
          const fullPath = prefix ? `${prefix}/${item.name}` : item.name
          // A "folder" entry has no metadata / no id
          if (item.id === null || item.metadata === null) {
            await walk(fullPath)
          } else {
            allPaths.push(fullPath)
          }
        }
      }
      await walk('')
      if (allPaths.length > 0) {
        // remove in chunks of 100
        let removed = 0
        const errors: string[] = []
        for (let i = 0; i < allPaths.length; i += 100) {
          const chunk = allPaths.slice(i, i + 100)
          const { error } = await admin.storage.from(bucket).remove(chunk)
          if (error) errors.push(error.message)
          else removed += chunk.length
        }
        storageReport[bucket] = { removed, errors: errors.length ? errors : undefined }
      } else if (storageReport[bucket] === undefined) {
        storageReport[bucket] = { removed: 0 }
      }
    }
    report.storage = storageReport

    return json({ success: true, report })
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
