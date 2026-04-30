import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function pathFromPublicUrl(url: string, bucket: string): string | null {
  if (!url) return null
  const marker = `/storage/v1/object/public/${bucket}/`
  const i = url.indexOf(marker)
  if (i >= 0) return decodeURIComponent(url.slice(i + marker.length))
  const marker2 = `/storage/v1/object/${bucket}/`
  const j = url.indexOf(marker2)
  if (j >= 0) return decodeURIComponent(url.slice(j + marker2.length))
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders })

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY')!

    const authHeader = req.headers.get('Authorization') || ''
    const token = authHeader.replace('Bearer ', '')
    if (!token) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    // Verify caller is admin
    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${token}` } },
    })
    const { data: userData, error: userErr } = await userClient.auth.getUser()
    if (userErr || !userData.user) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const admin = createClient(supabaseUrl, serviceKey)
    const { data: roleRow } = await admin
      .from('user_roles').select('role').eq('user_id', userData.user.id).eq('role', 'admin').maybeSingle()
    if (!roleRow) {
      return new Response(JSON.stringify({ error: 'Forbidden — admin only' }), {
        status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const body = await req.json().catch(() => ({}))
    const clinicIds: string[] = Array.isArray(body.clinicIds) ? body.clinicIds.filter((x: any) => typeof x === 'string') : []
    if (!clinicIds.length) {
      return new Response(JSON.stringify({ error: 'clinicIds required' }), {
        status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const errors: string[] = []
    let deletedImages = 0
    let deletedDocs = 0
    let deletedAuthUsers = 0

    // Collect owner user_ids + storage paths
    const [clinicsRes, imagesRes, doctorsRes, approvalsRes] = await Promise.all([
      admin.from('clinics').select('user_id').in('id', clinicIds),
      admin.from('clinic_images').select('image_url').in('clinic_id', clinicIds),
      admin.from('doctors').select('image_url, profile_image_url').in('clinic_id', clinicIds),
      admin.from('clinic_approvals').select('tax_certificate_url, health_tourism_doc_url').in('clinic_id', clinicIds),
    ])

    const ownerUserIds = Array.from(new Set(
      (clinicsRes.data || []).map((r: any) => r.user_id).filter(Boolean)
    )) as string[]

    const clinicImagePaths = (imagesRes.data || [])
      .map(r => pathFromPublicUrl(r.image_url, 'clinic-images')).filter(Boolean) as string[]
    const doctorImagePaths = (doctorsRes.data || [])
      .flatMap(r => [pathFromPublicUrl(r.image_url || '', 'doctor-images'), pathFromPublicUrl(r.profile_image_url || '', 'doctor-images')])
      .filter(Boolean) as string[]
    const docPaths = (approvalsRes.data || [])
      .flatMap(r => [pathFromPublicUrl(r.tax_certificate_url || '', 'clinic-documents'), pathFromPublicUrl(r.health_tourism_doc_url || '', 'clinic-documents')])
      .filter(Boolean) as string[]

    if (clinicImagePaths.length) {
      const { data, error } = await admin.storage.from('clinic-images').remove(clinicImagePaths)
      if (error) errors.push(`clinic-images: ${error.message}`)
      deletedImages += data?.length || 0
    }
    if (doctorImagePaths.length) {
      const { data, error } = await admin.storage.from('doctor-images').remove(doctorImagePaths)
      if (error) errors.push(`doctor-images: ${error.message}`)
      deletedImages += data?.length || 0
    }
    if (docPaths.length) {
      const { data, error } = await admin.storage.from('clinic-documents').remove(docPaths)
      if (error) errors.push(`clinic-documents: ${error.message}`)
      deletedDocs += data?.length || 0
    }

    // Best-effort cleanup of related rows that may not have ON DELETE CASCADE
    await admin.from('clinic_images').delete().in('clinic_id', clinicIds)
    await admin.from('doctors').delete().in('clinic_id', clinicIds)
    await admin.from('clinic_treatments').delete().in('clinic_id', clinicIds)
    await admin.from('clinic_approvals').delete().in('clinic_id', clinicIds)
    await admin.from('lead_purchases').delete().in('clinic_id', clinicIds)
    await admin.from('contact_requests').delete().in('clinic_id', clinicIds)
    await admin.from('reviews').delete().in('clinic_id', clinicIds)
    await admin.from('clinics_public').delete().in('id', clinicIds)

    const { error: delErr, count } = await admin
      .from('clinics').delete({ count: 'exact' }).in('id', clinicIds)
    if (delErr) errors.push(`clinics: ${delErr.message}`)

    // Delete owner accounts (profile, roles, auth user) — but NEVER admins
    for (const uid of ownerUserIds) {
      // Skip if this user has the admin role
      const { data: adminRow } = await admin
        .from('user_roles').select('id').eq('user_id', uid).eq('role', 'admin').maybeSingle()
      if (adminRow) continue

      // Skip if user still owns another (non-deleted) clinic outside this batch
      const { data: otherClinics } = await admin
        .from('clinics').select('id').eq('user_id', uid).limit(1)
      if (otherClinics && otherClinics.length > 0) continue

      await admin.from('user_roles').delete().eq('user_id', uid)
      await admin.from('profiles').delete().eq('id', uid)
      const { error: authDelErr } = await admin.auth.admin.deleteUser(uid)
      if (authDelErr) errors.push(`auth user ${uid}: ${authDelErr.message}`)
      else deletedAuthUsers++
    }

    return new Response(JSON.stringify({
      deletedClinics: count ?? clinicIds.length,
      deletedImages,
      deletedDocs,
      deletedAuthUsers,
      errors,
    }), { headers: { ...corsHeaders, 'Content-Type': 'application/json' } })
  } catch (e: any) {
    return new Response(JSON.stringify({ error: e?.message || 'Server error' }), {
      status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
