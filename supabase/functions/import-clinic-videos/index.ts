// Copies a collected clinic's videos into our own storage.
//
// Internal only — collect-clinics calls it once per clinic with the service
// key. It exists because copying is slow: a clinic can have four 30–40 MB
// files, and doing that inline for a whole listing would blow through the
// collector's time limit. So this answers 202 at once and does the copying in
// its own run, one file at a time to keep memory flat.
//
// Files are copied rather than linked so the clinic's page does not depend on
// the source's CDN staying up, or staying willing to serve us.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const BUCKET = 'clinic-videos'
// Same ceiling as the bucket's file_size_limit; bigger files would be refused
// by storage anyway, after wasting the download.
const MAX_BYTES = 50 * 1024 * 1024

Deno.serve(async (req) => {
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  if ((req.headers.get('Authorization') ?? '') !== `Bearer ${serviceKey}`) {
    return new Response('Forbidden', { status: 403 })
  }

  const { clinicId, videos } = await req.json()
  if (!clinicId || !Array.isArray(videos) || !videos.length) {
    return new Response(JSON.stringify({ queued: 0 }), { status: 400 })
  }

  const admin = createClient(Deno.env.get('SUPABASE_URL')!, serviceKey)

  const work = (async () => {
    let order = 0
    for (const video of videos) {
      try {
        const res = await fetch(video.url)
        if (!res.ok) throw new Error(`source answered ${res.status}`)
        const declared = Number(res.headers.get('content-length') ?? 0)
        if (declared > MAX_BYTES) {
          await res.body?.cancel()
          console.warn('skipping oversized video', clinicId, video.url, declared)
          continue
        }
        const bytes = new Uint8Array(await res.arrayBuffer())
        if (bytes.byteLength > MAX_BYTES) continue

        const path = `${clinicId}/${crypto.randomUUID()}.mp4`
        const { error: uploadError } = await admin.storage
          .from(BUCKET)
          .upload(path, bytes, { contentType: 'video/mp4', upsert: false })
        if (uploadError) throw uploadError

        const { data: { publicUrl } } = admin.storage.from(BUCKET).getPublicUrl(path)
        const { error } = await admin.from('clinic_videos').insert({
          clinic_id: clinicId,
          video_url: publicUrl,
          provider: 'file',
          provider_id: path,
          thumbnail_url: video.poster ?? null,
          sort_order: order++,
        })
        // Most likely the clinic rejected us while this was copying and its
        // row is gone. Either way, do not leave an unreachable file behind.
        if (error) {
          await admin.storage.from(BUCKET).remove([path])
          throw error
        }
      } catch (e) {
        console.error('video import failed', clinicId, video?.url, e)
      }
    }
  })()

  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work)
  else await work

  return new Response(JSON.stringify({ queued: videos.length }), {
    status: 202,
    headers: { 'Content-Type': 'application/json' },
  })
})
