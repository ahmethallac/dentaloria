// The one way a clinic is deleted for good.
//
// Three callers, one behaviour: the admin panel's "delete permanently", a
// clinic rejecting its outreach draft, and the nightly purge of expired drafts
// and 15-day-old trash. Row deletes cascade inside Postgres but never into
// Storage, so every file a clinic owns — gallery, before/after, doctor photos,
// documents, uploaded videos — is removed here explicitly. Before this was
// shared, each path forgot something different.

export interface PurgeResult {
  deletedClinics: number
  deletedImages: number
  deletedDocs: number
  deletedVideos: number
  deletedAuthUsers: number
  errors: string[]
}

const pathFromPublicUrl = (url: string, bucket: string): string | null => {
  if (!url) return null
  for (const marker of [`/storage/v1/object/public/${bucket}/`, `/storage/v1/object/${bucket}/`]) {
    const i = url.indexOf(marker)
    if (i >= 0) return decodeURIComponent(url.slice(i + marker.length))
  }
  // Anything else (a source CDN URL, say) is not a file we own.
  return null
}

const unique = (xs: (string | null | undefined)[]) => [...new Set(xs.filter(Boolean) as string[])]

export async function purgeClinics(
  admin: any,
  clinicIds: string[],
  { deleteOwners = true }: { deleteOwners?: boolean } = {},
): Promise<PurgeResult> {
  const result: PurgeResult = {
    deletedClinics: 0, deletedImages: 0, deletedDocs: 0, deletedVideos: 0, deletedAuthUsers: 0, errors: [],
  }
  if (!clinicIds.length) return result

  const [clinicsRes, imagesRes, beforeAfterRes, doctorsRes, approvalsRes, videosRes] = await Promise.all([
    admin.from('clinics').select('user_id').in('id', clinicIds),
    admin.from('clinic_images').select('image_url').in('clinic_id', clinicIds),
    admin.from('clinic_before_after_images').select('image_url').in('clinic_id', clinicIds),
    admin.from('doctors').select('image_url, profile_image_url').in('clinic_id', clinicIds),
    admin.from('clinic_approvals').select('tax_certificate_url, health_tourism_doc_url').in('clinic_id', clinicIds),
    admin.from('clinic_videos').select('provider, provider_id').in('clinic_id', clinicIds),
  ])

  const remove = async (bucket: string, paths: string[]) => {
    if (!paths.length) return 0
    const { data, error } = await admin.storage.from(bucket).remove(paths)
    if (error) result.errors.push(`${bucket}: ${error.message}`)
    return data?.length ?? 0
  }

  // Gallery and before/after share the clinic-images bucket.
  result.deletedImages += await remove('clinic-images', unique([
    ...(imagesRes.data ?? []).map((r: any) => pathFromPublicUrl(r.image_url, 'clinic-images')),
    ...(beforeAfterRes.data ?? []).map((r: any) => pathFromPublicUrl(r.image_url, 'clinic-images')),
  ]))
  result.deletedImages += await remove('doctor-images', unique(
    (doctorsRes.data ?? []).flatMap((r: any) => [
      pathFromPublicUrl(r.image_url ?? '', 'doctor-images'),
      pathFromPublicUrl(r.profile_image_url ?? '', 'doctor-images'),
    ]),
  ))
  result.deletedDocs += await remove('clinic-documents', unique(
    (approvalsRes.data ?? []).flatMap((r: any) => [
      pathFromPublicUrl(r.tax_certificate_url ?? '', 'clinic-documents'),
      pathFromPublicUrl(r.health_tourism_doc_url ?? '', 'clinic-documents'),
    ]),
  ))

  // Videos by their rows, plus whatever sits in each clinic's folder: an
  // import still copying when the clinic is deleted can leave a file whose row
  // never got written.
  const videoPaths: (string | null)[] = (videosRes.data ?? [])
    .filter((v: any) => v.provider === 'file').map((v: any) => v.provider_id)
  for (const id of clinicIds) {
    const { data: files } = await admin.storage.from('clinic-videos').list(id, { limit: 1000 })
    for (const f of files ?? []) videoPaths.push(`${id}/${f.name}`)
  }
  result.deletedVideos += await remove('clinic-videos', unique(videoPaths))

  // Some child tables predate ON DELETE CASCADE, so they are cleared by hand.
  for (const table of [
    'clinic_images', 'clinic_before_after_images', 'clinic_videos', 'doctors', 'clinic_treatments',
    'clinic_approvals', 'lead_purchases', 'contact_requests', 'reviews',
  ]) {
    const { error } = await admin.from(table).delete().in('clinic_id', clinicIds)
    if (error) result.errors.push(`${table}: ${error.message}`)
  }
  await admin.from('clinics_public').delete().in('id', clinicIds)

  const { error: clinicsError, count } = await admin.from('clinics').delete({ count: 'exact' }).in('id', clinicIds)
  if (clinicsError) result.errors.push(`clinics: ${clinicsError.message}`)
  result.deletedClinics = count ?? 0

  if (!deleteOwners) return result

  // Owner accounts go too — never an admin's, and never someone who still
  // owns another clinic.
  const ownerIds = unique((clinicsRes.data ?? []).map((r: any) => r.user_id))
  for (const uid of ownerIds) {
    const { data: isAdmin } = await admin.from('user_roles').select('id').eq('user_id', uid).eq('role', 'admin').maybeSingle()
    if (isAdmin) continue
    const { data: other } = await admin.from('clinics').select('id').eq('user_id', uid).limit(1)
    if (other?.length) continue
    await admin.from('user_roles').delete().eq('user_id', uid)
    await admin.from('profiles').delete().eq('id', uid)
    const { error } = await admin.auth.admin.deleteUser(uid)
    if (error) result.errors.push(`auth user ${uid}: ${error.message}`)
    else result.deletedAuthUsers++
  }

  return result
}
