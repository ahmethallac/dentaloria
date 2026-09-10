// Admin panel's "delete permanently" and "empty trash". Admin-only; the actual
// deletion lives in _shared/purgeClinics so it matches rejection and the
// nightly purge exactly.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'
import { purgeClinics } from '../_shared/purgeClinics.ts'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const token = (req.headers.get('Authorization') || '').replace('Bearer ', '')
    if (!token) return json({ error: 'Unauthorized' }, 401)

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) return json({ error: 'Unauthorized' }, 401)

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!roleRow) return json({ error: 'Forbidden — admin only' }, 403)

    const body = await req.json().catch(() => ({}))
    const clinicIds: string[] = Array.isArray(body.clinicIds) ? body.clinicIds.filter((x: any) => typeof x === 'string') : []
    if (!clinicIds.length) return json({ error: 'clinicIds required' }, 400)

    return json(await purgeClinics(admin, clinicIds))
  } catch (e: any) {
    return json({ error: e?.message || 'Server error' }, 500)
  }
})
