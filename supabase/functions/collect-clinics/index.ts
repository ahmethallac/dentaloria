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

// The source publishes the same photo at several widths ("…-1920.webp",
// "…-1440.webp"). Without collapsing those, one picture becomes several
// gallery entries.
const dedupeImages = (urls: string[]): string[] => {
  const seen = new Map<string, string>()
  for (const url of urls) {
    const key = url.replace(/-\d{3,4}\.webp$/i, '')
    // Keep the first (largest) variant of each picture.
    if (!seen.has(key)) seen.set(key, url)
  }
  return [...seen.values()]
}

// "Dr. Damla Öztürk" carries its own title; the schema keeps it in the name.
const TITLE_RE = /^((?:Prof\.|Assoc\.|Asst\.|Op\.|Uzm\.|Dr|Dt|DDS|DMD)[.\s]*)+/i
const splitTitle = (full: string): { title: string | null; name: string } => {
  const m = full.match(TITLE_RE)
  if (!m) return { title: null, name: full.trim() }
  return { title: m[0].trim().replace(/\s+/g, ' '), name: full.slice(m[0].length).trim() || full.trim() }
}


// ── The page's own data layer ──────────────────────────────────────────────
// The schema.org block is the reliable core, but it only carries what search
// engines need. Everything else the clinic page shows — phone, the full photo
// set, amenities, spoken languages, before/after pairs — lives in the Next.js
// streaming payload, as chunks that reference each other by id ("$7d").
// Reading it means rebuilding the stream and resolving those references.
const flightTable = (html: string) => {
  const stream = [...html.matchAll(/self\.__next_f\.push\(\[1,"((?:[^"\\]|\\.)*)"\]\)/g)]
    .map((m) => { try { return JSON.parse('"' + m[1] + '"') } catch { return '' } })
    .join('')
  const table = new Map<string, string>()
  for (const m of stream.matchAll(/(?:^|\n)([0-9a-f]{1,4}):(?:T[0-9a-f]+,)?/g)) {
    const start = (m.index ?? 0) + m[0].length
    const end = stream.indexOf('\n', start)
    table.set(m[1], stream.slice(start, end < 0 ? undefined : end))
  }
  return { stream, table }
}

const resolveRefs = (value: any, table: Map<string, string>, depth = 0): any => {
  if (depth > 6) return value
  if (typeof value === 'string' && /^\$[0-9a-f]{1,4}$/.test(value)) {
    const raw = table.get(value.slice(1))
    if (raw == null) return null
    let parsed: any
    try { parsed = JSON.parse(raw) } catch { parsed = raw }
    return resolveRefs(parsed, table, depth + 1)
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, table, depth + 1))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, table, depth + 1)]))
  }
  return value
}

// Brace matching that skips over string literals, so a "{" inside a
// description does not end the object early.
const objectAt = (s: string, start: number): string | null => {
  let depth = 0, inString = false, escaped = false
  for (let i = start; i < s.length; i++) {
    const ch = s[i]
    if (inString) {
      if (escaped) escaped = false
      else if (ch === '\\') escaped = true
      else if (ch === '"') inString = false
      continue
    }
    if (ch === '"') inString = true
    else if (ch === '{') depth++
    else if (ch === '}' && --depth === 0) return s.slice(start, i + 1)
  }
  return null
}

const clinicPayload = (html: string): any | null => {
  const { stream, table } = flightTable(html)
  const start = stream.indexOf('{"partnerId":"')
  if (start < 0) return null
  const raw = objectAt(stream, start)
  if (!raw) return null
  try { return resolveRefs(JSON.parse(raw), table) } catch { return null }
}

// The source folds spoken languages in with its amenities.
const LANGUAGE_KEYS: Record<string, string> = {
  englishLanguage: 'en', germanLanguage: 'de', frenchLanguage: 'fr',
  italianLanguage: 'it', spanishLanguage: 'es', russianLanguage: 'ru',
  arabicLanguage: 'ar', polishLanguage: 'pl', dutchLanguage: 'nl',
  portugueseLanguage: 'pt', romanianLanguage: 'ro',
}

// Only amenities that clearly mean the same thing are carried over. The rest
// of our list (insurance, dietitian, SIM card, installments) has no equivalent
// here, and inventing one would put a claim on the clinic's page that they
// never made.
const FACILITY_KEYS: Record<string, string> = {
  freeAccomodation: 'hotel_accommodation',
  freeVIPTransportation: 'airport_transfer',
  organizedBusVanTransfer: 'airport_transfer',
  organizeCityTour: 'city_tours',
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

        const payload = clinicPayload(html)

        // The schema description is a one-line summary; the page's own is the
        // real thing, already formatted, which is what the clinic expects to
        // see on their page.
        const description =
          (payload?.description || node.description || metaContent(html, 'og:description') || '').trim() || null

        // The payload carries the whole gallery; the schema block only ever
        // has the cover shot.
        const payloadImages: string[] = (Array.isArray(payload?.images) ? payload.images : [])
          .map((i: any) => (typeof i === 'string' ? i : i?.orig ?? i?.url))
          .filter(Boolean)
        const images: string[] = dedupeImages(
          payloadImages.length
            ? payloadImages
            : (Array.isArray(node.image) ? node.image : [node.image])
                .map((i: any) => (typeof i === 'string' ? i : i?.url))
                .filter(Boolean),
        )

        const amenityKeys: string[] = (Array.isArray(payload?.amenities) ? payload.amenities : [])
          .map((a: any) => a?.key).filter(Boolean)
        const languages = [...new Set(amenityKeys.map((k) => LANGUAGE_KEYS[k]).filter(Boolean))]
        const facilities = [...new Set(amenityKeys.map((k) => FACILITY_KEYS[k]).filter(Boolean))]

        const { data: clinic, error: clinicError } = await admin
          .from('clinics')
          .insert({
            name: node.name,
            display_name: node.name,
            city_id: cityId,
            description,
            address: node.address?.streetAddress ?? null,
            phone: payload?.phoneNumber ?? null,
            languages,
            facilities,
            // rating / review_count stay empty on purpose. On our pages those
            // fields are the Google Business score, and the source's own
            // rating is a different number from a different audience —
            // showing it as a Google rating would be a false claim. They fill
            // in when the Google Business profile is matched.
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

        // Doctors ride along in the schema as staff members, with their
        // specialty and photo. Graduation year is never published, so it stays
        // empty for the clinic to fill in — which is the point of storing the
        // year rather than a hand-maintained experience count.
        const members: any[] = Array.isArray(node.member) ? node.member : []
        const doctors = members
          .map((m: any) => {
            if (!m?.name) return null
            const { title, name } = splitTitle(String(m.name))
            const photos = dedupeImages(
              (Array.isArray(m.image) ? m.image : [m.image])
                .map((i: any) => (typeof i === 'string' ? i : i?.url))
                .filter(Boolean),
            )
            return {
              clinic_id: clinic.id,
              name,
              title,
              specialization: m.jobTitle ?? null,
              profile_image_url: photos[0] ?? null,
            }
          })
          .filter(Boolean)
        if (doctors.length) await admin.from('doctors').insert(doctors)

        // Before/after arrive as pairs; our gallery is a flat ordered list, so
        // each pair goes in as before-then-after to keep them side by side.
        const pairs: any[] = Array.isArray(payload?.features?.beforeAndAfter) ? payload.features.beforeAndAfter : []
        const beforeAfter = pairs.flatMap((pair: any, index: number) => {
          const before = typeof pair?.before === 'string' ? pair.before : pair?.before?.orig
          const after = typeof pair?.after === 'string' ? pair.after : pair?.after?.orig
          return [
            before && { clinic_id: clinic.id, image_url: before, sort_order: index * 2 },
            after && { clinic_id: clinic.id, image_url: after, sort_order: index * 2 + 1 },
          ].filter(Boolean)
        })
        if (beforeAfter.length) await admin.from('clinic_before_after_images').insert(beforeAfter)

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
          doctors: doctors.length,
          beforeAfter: beforeAfter.length,
          languages: languages.length,
          facilities: facilities.length,
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
