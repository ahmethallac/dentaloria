// Nightly clean-up, triggered by pg_cron (migration 20260910130000).
//
//  • Trash: a clinic an admin moved to the trash is kept for 15 days, then
//    deleted for good — files included.
//  • Drafts: an outreach draft nobody answered before its link expired is
//    deleted for good, as the preview page promises.
//
// Deliberately takes no secret. It only ever deletes what is already due, so
// anyone calling it early, or twice, changes nothing.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'
import { purgeClinics, type PurgeResult } from '../_shared/purgeClinics.ts'

// Mirrors TRASH_RETENTION_DAYS in src/pages/Admin.tsx, which shows the
// countdown on each trashed clinic.
const TRASH_RETENTION_DAYS = 15
const BATCH = 50

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

Deno.serve(async () => {
  try {
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const now = new Date()
    const trashCutoff = new Date(now.getTime() - TRASH_RETENTION_DAYS * 86_400_000).toISOString()

    const { data: trashed, error: trashError } = await admin
      .from('clinics').select('id').lt('deleted_at', trashCutoff)
    if (trashError) throw trashError

    // Only genuine unanswered drafts: still pending, past expiry, never claimed.
    // A clinic that approved and verified has an owner and is live, so the
    // user_id and page_status checks keep it well away from this.
    const { data: expired, error: expiredError } = await admin
      .from('clinic_approvals')
      .select('clinic_id, clinics!inner(user_id, page_status)')
      .eq('status', 'pending')
      .lt('expires_at', now.toISOString())
      .is('clinics.user_id', null)
      .eq('clinics.page_status', 'awaiting_clinic_approval')
    if (expiredError) throw expiredError

    const run = async (ids: string[], deleteOwners: boolean) => {
      const total: PurgeResult = { deletedClinics: 0, deletedImages: 0, deletedDocs: 0, deletedVideos: 0, deletedAuthUsers: 0, errors: [] }
      for (let i = 0; i < ids.length; i += BATCH) {
        const r = await purgeClinics(admin, ids.slice(i, i + BATCH), { deleteOwners })
        for (const k of ['deletedClinics', 'deletedImages', 'deletedDocs', 'deletedVideos', 'deletedAuthUsers'] as const) total[k] += r[k]
        total.errors.push(...r.errors)
      }
      return total
    }

    const trash = await run([...new Set((trashed ?? []).map((r: any) => r.id))], true)
    // Drafts never had an owner account, so there is none to remove.
    const drafts = await run([...new Set((expired ?? []).map((r: any) => r.clinic_id))], false)

    console.log('purge-expired', JSON.stringify({ trash, drafts }))
    return json({ trash, drafts })
  } catch (e: any) {
    console.error('purge-expired failed', e)
    return json({ error: e?.message ?? 'purge failed' }, 500)
  }
})
