// Turns one listing URL into ready-to-send draft pages.
//
// Give it a booking.dentist listing (a city page or a filtered search-results
// URL) and how many clinics to take; it walks the first N clinic pages, reads
// each one, and creates a draft with a secret link — the same drafts the
// clinic-preview flow already serves.
//
// It reads the schema.org JSON-LD the site publishes for machines rather than
// scraping markup, so the data is structured and does not break when the page
// design changes. Requests are spaced out; this is not meant to be fast.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'

// One page per second-ish. Nothing here needs to be quick, and hammering the
// source is both rude and the fastest way to get blocked.
const REQUEST_GAP_MS = 900
const MAX_PER_RUN = 20
const DRAFT_LIFETIME_DAYS = 14

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

const ALPHABET = 'abcdefghjkmnpqrstuvwxyz23456789'
const makeToken = (length = 24) => {
  const bytes = new Uint8Array(length)
  crypto.getRandomValues(bytes)
  return Array.from(bytes, (b) => ALPHABET[b % ALPHABET.length]).join('')
}

const fetchPage = async (url: string): Promise<string> => {
  const res = await fetch(url, { headers: { 'User-Agent': UA, 'Accept-Language': 'en' } })
  if (!res.ok) throw new Error(`${res.status} on ${url}`)
  return await res.text()
}

// Pull every schema.org node out of a page, flattening @graph wrappers.
const jsonLdNodes = (html: string): any[] => {
  const out: any[] = []
  const re = /<script[^>]+type="application\/ld\+json"[^>]*>([\s\S]*?)<\/script>/gi
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    try {
      const parsed = JSON.parse(m[1])
      for (const node of parsed['@graph'] ?? [parsed]) out.push(node)
    } catch {
      // A malformed block is not worth failing the whole clinic over.
    }
  }
  return out
}

const isDentist = (node: any) => {
  const t = node?.['@type']
  const types = Array.isArray(t) ? t : [t]
  return types.includes('Dentist') || types.includes('LocalBusiness') || types.includes('MedicalBusiness')
}

const metaContent = (html: string, prop: string): string | null => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, 'i'))
  return m?.[1] ? m[1].replace(/&amp;/g, '&').replace(/&#(\d+);/g, (_, d) => String.fromCharCode(+d)) : null
}

const norm = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, ' ').replace(/\s+/g, ' ').trim()

// Source names differ from our catalogue and are far more granular: the site
// lists nine implant brands where we list "Single Tooth Implant". These rules
// run in order, most specific first, so "All on 4 dental implants" is not
// swallowed by the generic implant rule below it. Anything that matches
// nothing is reported back unmapped rather than guessed at — a treatment
// attached to the wrong price is worse than a missing row.
const RULES: [RegExp, string][] = [
  [/all on 6/, 'all on 6 dental implants'],
  [/all on 4/, 'all on 4 dental implants'],
  [/invisalign/, 'invisalign'],
  [/braces/, 'traditional braces'],
  [/whitening/, 'teeth whitening'],
  [/laminate/, 'laminate veneer'],
  [/porcelain veneer/, 'porcelain veneers'],
  [/composite (bonding|veneer)/, 'composite bonding'],
  [/zirconi.* crown|crown.*zirconi/, 'zirconium crown'],
  [/wisdom/, 'wisdom tooth extraction'],
  [/implant/, 'single tooth implant'],
]

const catalogueKey = (rawName: string): string | null => {
  const n = norm(rawName)
  for (const [pattern, key] of RULES) if (pattern.test(n)) return key
  return null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    )

    const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
    if (!jwt) return json({ error: 'Not signed in' }, 401)
    const { data: userData } = await admin.auth.getUser(jwt)
    if (!userData?.user) return json({ error: 'Not signed in' }, 401)
    const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
    if (!isAdmin) return json({ error: 'Admins only' }, 403)

    const body = await req.json()
    const listUrl: string = (body?.listUrl ?? '').trim()
    const limit = Math.min(Math.max(parseInt(body?.limit ?? '5', 10) || 5, 1), MAX_PER_RUN)
    if (!/^https?:\/\/(www\.)?booking\.dentist\//i.test(listUrl)) {
      return json({ error: 'Only booking.dentist listing URLs are supported for now.' }, 400)
    }

    // Reference data, fetched once rather than per clinic.
    const [{ data: cities }, { data: treatments }] = await Promise.all([
      admin.from('cities').select('id, name'),
      admin.from('treatments').select('id, name'),
    ])
    const cityByName = new Map((cities ?? []).map((c: any) => [norm(c.name), c.id]))
    const treatmentByName = new Map((treatments ?? []).map((t: any) => [norm(t.name), t.id]))

    const listingHtml = await fetchPage(listUrl)
    const slugs = [...new Set(
      [...listingHtml.matchAll(/\/dental-clinic\/([a-z0-9-]+)/gi)].map((m) => m[1]),
    )].slice(0, limit)

    if (!slugs.length) return json({ error: 'No clinics found on that page.', results: [] }, 200)

    const results: any[] = []

    for (const slug of slugs) {
      const sourceUrl = `https://www.booking.dentist/dental-clinic/${slug}`
      try {
        await sleep(REQUEST_GAP_MS)

        const html = await fetchPage(sourceUrl)
        const node = jsonLdNodes(html).find(isDentist)
        if (!node?.name) {
          results.push({ slug, status: 'failed', reason: 'no structured data on page' })
          continue
        }

        const locality: string = node.address?.addressLocality ?? ''
        const cityId = cityByName.get(norm(locality))
        if (!cityId) {
          results.push({ slug, name: node.name, status: 'skipped', reason: `city "${locality}" is not in your list` })
          continue
        }

        const { data: suppressed } = await admin
          .from('outreach_suppressions').select('id').eq('clinic_name', node.name).limit(1)
        if (suppressed?.length) {
          results.push({ slug, name: node.name, status: 'skipped', reason: 'clinic previously rejected us' })
          continue
        }

        // Re-importing would mean a second mail to the same clinic. We do not
        // keep the source URL, so identity here is the name within the city —
        // which is what the source itself is consistent about.
        const { data: existing } = await admin
          .from('clinics').select('id').eq('name', node.name).eq('city_id', cityId).limit(1)
        if (existing?.length) {
          results.push({ slug, name: node.name, status: 'skipped', reason: 'already in your clinics' })
          continue
        }

        const description = (node.description || metaContent(html, 'og:description') || '').trim() || null
        const images: string[] = (Array.isArray(node.image) ? node.image : [node.image])
          .map((i: any) => (typeof i === 'string' ? i : i?.url))
          .filter(Boolean)

        const { data: clinic, error: clinicError } = await admin
          .from('clinics')
          .insert({
            name: node.name,
            city_id: cityId,
            description,
            address: node.address?.streetAddress ?? null,
            rating: node.aggregateRating?.ratingValue ?? null,
            review_count: node.aggregateRating?.ratingCount ?? null,
            user_id: null,
            is_published: false,
            page_status: 'awaiting_clinic_approval',
            approval_status: 'pending',
          })
          .select('id, name')
          .single()
        if (clinicError) throw clinicError

        // Prices come from the offer catalogue, in EUR, which is what the
        // clinic page shows as its starting price.
        const offers: any[] = node.hasOfferCatalog?.itemListElement ?? []
        // Several source rows can collapse onto one catalogue treatment (nine
        // implant brands, four kinds of whitening). The page shows a starting
        // price, so the cheapest of the group is the honest one to keep.
        const cheapest = new Map<string, number>()
        const unmapped: string[] = []
        for (const offer of offers) {
          const rawName = offer?.itemOffered?.name
          const price = Number(offer?.price)
          if (!rawName || !Number.isFinite(price)) continue
          const key = catalogueKey(rawName)
          const treatmentId = key ? treatmentByName.get(key) : undefined
          if (!treatmentId) { unmapped.push(rawName); continue }
          const current = cheapest.get(treatmentId)
          if (current == null || price < current) cheapest.set(treatmentId, price)
        }
        const mapped = [...cheapest].map(([treatment_id, starting_price_euro]) => ({
          clinic_id: clinic.id, treatment_id, starting_price_euro,
        }))
        if (mapped.length) await admin.from('clinic_treatments').insert(mapped)

        if (images.length) {
          await admin.from('clinic_images').insert(
            images.map((url, idx) => ({ clinic_id: clinic.id, image_url: url, is_primary: idx === 0 })),
          )
        }

        const previewToken = makeToken()
        const { error: approvalError } = await admin.from('clinic_approvals').insert({
          clinic_id: clinic.id,
          status: 'pending',
          preview_token: previewToken,
          expires_at: new Date(Date.now() + DRAFT_LIFETIME_DAYS * 86_400_000).toISOString(),
        })
        if (approvalError) {
          await admin.from('clinics').delete().eq('id', clinic.id)
          throw approvalError
        }

        results.push({
          slug,
          name: clinic.name,
          status: 'created',
          clinicId: clinic.id,
          previewToken,
          treatments: mapped.length,
          images: images.length,
          unmappedTreatments: unmapped,
        })
      } catch (err) {
        results.push({ slug, status: 'failed', reason: (err as Error)?.message ?? 'unknown error' })
      }
    }

    return json({ found: slugs.length, results })
  } catch (error) {
    console.error('collect-clinics failed:', error)
    return json({ error: (error as Error)?.message ?? 'Collection failed' }, 500)
  }
})
