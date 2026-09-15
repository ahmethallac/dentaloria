// Turns one listing URL into ready-to-send draft pages.
//
// Two sources are understood: booking.dentist and whatclinic.com. Give it a
// listing on either and how many clinics you want; it walks the listing page
// by page, reads each clinic, and creates a draft with a secret link — the
// same drafts the clinic-preview flow already serves.
//
// "How many" counts clinics actually created, not pages read: a clinic that is
// already in the database is skipped and the walk keeps going, so asking for
// 40 gives you 40 new ones rather than 40 minus everything collected last
// week. That also makes re-running the same URL the way to continue a listing.
//
// Both sources are read through the structured data they publish for search
// engines (schema.org JSON-LD, and RDFa on whatclinic) rather than by scraping
// layout, so the parsing survives a redesign. Requests are spaced out; this is
// not meant to be fast.
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

// whatclinic answers 403 "Client-OldBrowserSpam" to anything claiming a
// browser more than a few versions old, so this has to be kept current — if
// collection starts failing on every clinic at once, raise it first.
const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36'

// One page per second-ish. Nothing here needs to be quick, and hammering the
// source is both rude and the fastest way to get blocked.
const REQUEST_GAP_MS = 900
const MAX_PER_RUN = 100
const DRAFT_LIFETIME_DAYS = 14

// The platform cuts a request off well before this function runs out of work,
// and when it does the caller sees only "non-2xx" — the drafts made so far are
// in the database, but nothing says which, so the run looks like a total
// failure. So stop on our own clock, comfortably inside the ceiling, and
// report it. Asking for 100 therefore takes several rounds; the panel makes
// them automatically, and each one picks up where the last stopped because
// everything already collected is skipped on the way past.
const RUN_BUDGET_MS = 110_000

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

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ', ndash: '–', mdash: '—', hellip: '…',
}

const decodeEntities = (s: string): string =>
  s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (whole, code: string) => {
    if (code[0] !== '#') return NAMED_ENTITIES[code.toLowerCase()] ?? whole
    const n = code[1].toLowerCase() === 'x' ? parseInt(code.slice(2), 16) : parseInt(code.slice(1), 10)
    return Number.isFinite(n) ? String.fromCodePoint(n) : whole
  })

const stripTags = (html: string): string =>
  decodeEntities(html.replace(/<[^>]*>/g, ' ')).replace(/\s+/g, ' ').trim()

// Markup to readable text: paragraphs and list items are what carry the
// clinic's own formatting, and losing them turns an "about us" into one wall.
const htmlToText = (html: string): string =>
  decodeEntities(
    html
      .replace(/<\s*(?:br|\/p|\/div|\/h[1-6])\s*[^>]*>/gi, '\n')
      .replace(/<\s*li[^>]*>/gi, '\n• ')
      .replace(/<[^>]*>/g, ''),
  )
    .replace(/[ \t ]+/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .split('\n').map((line) => line.trim()).join('\n')
    .trim()

// The contents of the <div …> that starts at `start`, matched by depth so a
// nested div does not end the block early.
const divAt = (html: string, start: number): string => {
  const re = /<\/?div\b[^>]*>/gi
  re.lastIndex = start
  let depth = 0
  let m: RegExpExecArray | null
  while ((m = re.exec(html))) {
    if (m[0][1] === '/') {
      if (--depth === 0) return html.slice(start, m.index)
    } else depth++
  }
  return html.slice(start)
}

const metaContent = (html: string, prop: string): string | null => {
  const m = html.match(new RegExp(`<meta[^>]+(?:property|name)="${prop}"[^>]+content="([^"]*)"`, 'i'))
  return m?.[1] ? decodeEntities(m[1]) : null
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

// Depth here counts every object and array level, and the before/after images
// sit a dozen levels down (clinic → features → pairs → pair → image → sizes).
// A shallow limit silently returned unresolved "$2d0" strings, which were then
// saved as image URLs and rendered as broken pictures. The seen-set is what
// actually stops runaway recursion.
const resolveRefs = (value: any, table: Map<string, string>, depth = 0, seen = new Set<string>()): any => {
  if (depth > 40) return value
  if (typeof value === 'string' && /^\$[0-9a-f]{1,4}$/.test(value)) {
    const id = value.slice(1)
    if (seen.has(id)) return null
    const raw = table.get(id)
    if (raw == null) return null
    let parsed: any
    try { parsed = JSON.parse(raw) } catch { parsed = raw }
    return resolveRefs(parsed, table, depth + 1, new Set(seen).add(id))
  }
  if (Array.isArray(value)) return value.map((v) => resolveRefs(v, table, depth + 1, seen))
  if (value && typeof value === 'object') {
    return Object.fromEntries(Object.entries(value).map(([k, v]) => [k, resolveRefs(v, table, depth + 1, seen)]))
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


// ── Google Business ────────────────────────────────────────────────────────
// Links each draft to its Google Business profile exactly the way the clinic
// panel's "link Google" button does — same five columns, same review shape —
// so a collected clinic is indistinguishable from one linked by hand.
declare const EdgeRuntime: { waitUntil(p: Promise<unknown>): void } | undefined

const GOOGLE_FIELDS = [
  'places.id', 'places.displayName', 'places.formattedAddress', 'places.websiteUri',
  'places.internationalPhoneNumber', 'places.rating', 'places.userRatingCount', 'places.reviews',
].join(',')

// Turkish letters would otherwise be stripped to nothing by the a-z filter,
// turning "Ağız ve Çene Kliniği" into unmatchable fragments.
const fold = (s: string) =>
  s.toLowerCase()
    .replace(/ı/g, 'i').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ü/g, 'u').replace(/ö/g, 'o').replace(/ç/g, 'c')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')

const GENERIC = new Set([
  'dental', 'dentist', 'dentistry', 'clinic', 'clinics', 'center', 'centre', 'oral',
  'health', 'care', 'the', 'and', 'turkey', 'istanbul', 'antalya', 'izmir',
  'dis', 'klinigi', 'poliklinigi', 'agiz', 'sagligi', 'merkezi',
])

// Deciding that a Google result is this clinic. Getting it wrong means showing
// another business's reviews under this clinic's name, so a miss is always
// preferred over a guess.
const isSameBusiness = (sourceName: string, place: any, city: string): boolean => {
  const googleName = fold(place?.displayName?.text ?? '')
  const address = fold(place?.formattedAddress ?? '')
  if (!googleName || !address.includes(fold(city))) return false

  const compact = (x: string) => x.replace(/[^a-z0-9]/g, '')
  const a = compact(fold(sourceName)), b = compact(googleName)
  // "Dent Spa" vs "DentSpa Istanbul Dental Clinic": spacing differs, the
  // name is the same.
  if (a.length >= 5 && (b.includes(a) || a.includes(b))) return true

  const distinctive = fold(sourceName).split(/[^a-z0-9]+/).filter((w) => w.length >= 4 && !GENERIC.has(w))
  return distinctive.length > 0 && distinctive.some((w) => b.includes(w))
}

// Mirrors fetch-google-rating: positive reviews only (that is all the page
// shows), reviewer's original language kept so translate-content works from
// the real source text.
const toReviews = (raw: any[]) =>
  (raw ?? [])
    .filter((r: any) => (r.rating ?? 0) >= 4)
    .map((r: any) => ({
      authorName: r.authorAttribution?.displayName ?? 'Google user',
      rating: r.rating ?? null,
      text: r.originalText?.text ?? r.text?.text ?? '',
      relativeTimeDescription: r.relativePublishTimeDescription ?? '',
      profilePhotoUrl: r.authorAttribution?.photoUri ?? null,
      time: r.publishTime ? Math.floor(new Date(r.publishTime).getTime() / 1000) : null,
    }))

const findGoogleBusiness = async (name: string, city: string): Promise<any | null> => {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!apiKey) return null
  const res = await fetch('https://places.googleapis.com/v1/places:searchText', {
    method: 'POST',
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': GOOGLE_FIELDS, 'Content-Type': 'application/json' },
    body: JSON.stringify({ textQuery: `${name} ${city}`, languageCode: 'en', maxResultCount: 3 }),
  })
  if (!res.ok) throw new Error(`Google Places ${res.status}: ${(await res.text()).slice(0, 160)}`)
  const data = await res.json()
  return (data.places ?? []).find((p: any) => isSameBusiness(name, p, city)) ?? null
}

// Same background translation the panel runs after linking. It must not hold
// up the collection run, and a failure only means reviews show untranslated.
const translateReviewsLater = (admin: any, clinicId: string, reviews: any[]) => {
  const work = (async () => {
    const url = `${Deno.env.get('SUPABASE_URL')}/functions/v1/translate-content`
    const key = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    const translated = await Promise.all(reviews.map(async (review) => {
      if (!review.text?.trim()) return review
      try {
        const r = await fetch(url, {
          method: 'POST',
          headers: { Authorization: `Bearer ${key}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: review.text, isHtml: false }),
        })
        const data = await r.json()
        return data?.translations ? { ...review, translations: data.translations } : review
      } catch {
        return review
      }
    }))
    await admin.from('clinics').update({ google_reviews: translated }).eq('id', clinicId)
  })().catch((e) => console.error('review translation failed', clinicId, e))
  if (typeof EdgeRuntime !== 'undefined') EdgeRuntime.waitUntil(work)
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

// ── What a clinic page boils down to ────────────────────────────────────────
// Two sites, one shape. Everything below the scrapers works from this, so a
// third source would mean writing one more scrape function and nothing else.
interface Scraped {
  name: string
  /** City names to try against our own list, most specific first. */
  localities: string[]
  description: string | null
  address: string | null
  phone: string | null
  images: string[]
  languages: string[]
  facilities: string[]
  doctors: { name: string; title: string | null; specialization: string | null; profile_image_url: string | null }[]
  /** Before/after shots, already flattened into before-then-after order. */
  beforeAfter: string[]
  /** Starting prices in EUR. A price quoted in another currency comes through
   *  as null rather than converted — a rate baked in today is a wrong number
   *  on the clinic's page next month, and they can fill it in themselves. */
  offers: { name: string; priceEuro: number | null }[]
  videos: { url: string; poster: string | null }[]
}

const scrapeBookingDentist = (html: string): Scraped | null => {
  const node = jsonLdNodes(html).find(isDentist)
  if (!node?.name) return null
  const payload = clinicPayload(html)

  // The schema description is a one-line summary; the page's own is the real
  // thing, already formatted, which is what the clinic expects to see.
  const description =
    (payload?.description || node.description || metaContent(html, 'og:description') || '').trim() || null

  // The payload carries the whole gallery; the schema block only ever has the
  // cover shot.
  const payloadImages: string[] = (Array.isArray(payload?.images) ? payload.images : [])
    .map((i: any) => (typeof i === 'string' ? i : i?.orig ?? i?.url))
    .filter(Boolean)
  const images = dedupeImages(
    payloadImages.length
      ? payloadImages
      : (Array.isArray(node.image) ? node.image : [node.image])
          .map((i: any) => (typeof i === 'string' ? i : i?.url))
          .filter(Boolean),
  )

  const amenityKeys: string[] = (Array.isArray(payload?.amenities) ? payload.amenities : [])
    .map((a: any) => a?.key).filter(Boolean)

  // Doctors ride along in the schema as staff members, with their specialty
  // and photo. Graduation year is never published, so it stays empty for the
  // clinic to fill in — which is the point of storing the year rather than a
  // hand-maintained experience count.
  const doctors = (Array.isArray(node.member) ? node.member : [])
    .map((m: any) => {
      if (!m?.name) return null
      const { title, name } = splitTitle(String(m.name))
      const photos = dedupeImages(
        (Array.isArray(m.image) ? m.image : [m.image])
          .map((i: any) => (typeof i === 'string' ? i : i?.url))
          .filter(Boolean),
      )
      return { name, title, specialization: m.jobTitle ?? null, profile_image_url: photos[0] ?? null }
    })
    .filter(Boolean) as Scraped['doctors']

  // Before/after arrive as pairs; our gallery is a flat ordered list, so each
  // pair goes in as before-then-after to keep them side by side.
  const absolute = (v: any): string | null => {
    const url = typeof v === 'string' ? v : v?.orig ?? v?.url
    // Anything that is not an absolute URL is an unresolved reference or junk;
    // saving it produces a broken picture on the clinic's page.
    return typeof url === 'string' && /^https?:\/\//.test(url) ? url : null
  }
  const beforeAfter = (Array.isArray(payload?.features?.beforeAndAfter) ? payload.features.beforeAndAfter : [])
    .flatMap((pair: any) => [absolute(pair?.before), absolute(pair?.after)].filter(Boolean) as string[])

  return {
    name: node.name,
    localities: [node.address?.addressLocality ?? ''].filter(Boolean),
    description,
    address: node.address?.streetAddress ?? null,
    phone: payload?.phoneNumber ?? null,
    images,
    languages: [...new Set(amenityKeys.map((k) => LANGUAGE_KEYS[k]).filter(Boolean))],
    facilities: [...new Set(amenityKeys.map((k) => FACILITY_KEYS[k]).filter(Boolean))],
    doctors,
    beforeAfter,
    // Prices come from the offer catalogue, in EUR, which is what the clinic
    // page shows as its starting price.
    offers: (node.hasOfferCatalog?.itemListElement ?? [])
      .map((o: any) => ({ name: o?.itemOffered?.name, priceEuro: Number(o?.price) }))
      .filter((o: any) => o.name)
      .map((o: any) => ({ name: String(o.name), priceEuro: Number.isFinite(o.priceEuro) ? o.priceEuro : null })),
    // The headline video plus the patient testimonial clips, each with its
    // poster when the source has one.
    videos: [
      payload?.featuredVideo?.url ? { url: payload.featuredVideo.url, poster: null } : null,
      ...(Array.isArray(payload?.patientTestimonials) ? payload.patientTestimonials : []).map((tm: any) =>
        tm?.videoUrl ? { url: tm.videoUrl, poster: typeof tm.poster === 'string' ? tm.poster : null } : null,
      ),
    ].filter((v: any) => v && /^https?:\/\//.test(v.url)) as Scraped['videos'],
  }
}

// ── whatclinic.com ──────────────────────────────────────────────────────────
// A thinner source: it publishes a JSON-LD block with the name, address and
// rating, and marks everything else up in RDFa (property="description",
// property="employee", property="knowsLanguage"). What it never publishes is
// the clinic's own phone number or website — both sit behind its enquiry form,
// because selling that contact is its business. Drafts from here therefore
// arrive without an address to mail, and the Google Business match is what
// fills the website in, if anything does.
const WC_ORIGIN = 'https://www.whatclinic.com'

const WC_LANGUAGES: Record<string, string> = {
  english: 'en', german: 'de', french: 'fr', italian: 'it', spanish: 'es',
  russian: 'ru', arabic: 'ar', polish: 'pl', dutch: 'nl', portuguese: 'pt',
  romanian: 'ro', turkish: 'tr',
}

// Same rule as the booking.dentist amenity map: only what unambiguously means
// the same thing is carried over, because a facility on a clinic's page is a
// claim made in their name.
const WC_FACILITY_RULES: [RegExp, string][] = [
  [/airport|transfer|pick[\s-]?up/i, 'airport_transfer'],
  [/hotel|accommodation|accomodation/i, 'hotel_accommodation'],
  [/\btour/i, 'city_tours'],
]

const scrapeWhatClinic = (html: string): Scraped | null => {
  const node = jsonLdNodes(html).find((n) => n?.name && (isDentist(n) || n?.['@type'] === 'MedicalClinic'))
  if (!node?.name) return null

  const aboutIdx = html.search(/<h3[^>]*>\s*About\b/i)
  const descIdx = aboutIdx < 0 ? -1 : html.indexOf('<div property="description"', aboutIdx)
  const description = descIdx < 0 ? null : (htmlToText(divAt(html, descIdx)) || null)

  // The lightbox links are the full-size originals; the <img> beside each one
  // is a thumbnail with the size baked into the query string. Attribute order
  // differs between the cover shot and the carousel, so the tag is matched
  // first and the href read out of it, rather than assuming one order.
  const lightboxHrefs = (group: string): string[] =>
    [...html.matchAll(new RegExp(`<a[^>]*data-lightbox=["']${group}["'][^>]*>`, 'gi'))]
      .map((m) => decodeEntities(m[0].match(/href=["']([^"']+)["']/i)?.[1] ?? ''))
      .filter(Boolean)
  // Same picture at different crops is still one picture, and the crop lives
  // in the query string.
  const images = [...new Map(lightboxHrefs('clinic-pictures').map((u) => [u.split('?')[0], u])).values()]

  const doctors: Scraped['doctors'] = []
  for (const m of html.matchAll(/<div[^>]*property="employee"[^>]*>/gi)) {
    const block = divAt(html, m.index ?? 0)
    const full = stripTags(block.match(/<h3[^>]*property="name"[^>]*>([\s\S]*?)<\/h3>/i)?.[1] ?? '')
    if (!full) continue
    const { title, name } = splitTitle(full)
    const photoTag = block.match(/<a[^>]*data-lightbox=["']staff-pictures["'][^>]*>/i)?.[0] ?? ''
    doctors.push({
      name,
      title,
      specialization: stripTags(block.match(/property="jobTitle"[^>]*>([\s\S]*?)<\//i)?.[1] ?? '') || null,
      profile_image_url: decodeEntities(photoTag.match(/href=["']([^"']+)["']/i)?.[1] ?? '') || null,
    })
  }

  const languages = [...new Set(
    [...html.matchAll(/property="knowsLanguage"[\s\S]{0,200}?property="name"[^>]*>([^<]+)</gi)]
      .map((m) => WC_LANGUAGES[stripTags(m[1]).toLowerCase()])
      .filter(Boolean),
  )]

  const services = [...html.matchAll(/class=["']provides-item["'][\s\S]{0,200}?class="text"[^>]*>([^<]+)</gi)]
    .map((m) => stripTags(m[1]))
  const facilities = [...new Set(
    services.flatMap((s) => WC_FACILITY_RULES.filter(([re]) => re.test(s)).map(([, key]) => key)),
  )]

  // "Dental Implants · TL16891 - TL56303". The first price is the low end of
  // the range, which is the starting price we show — but only EUR survives
  // the trip; anything else is left for the clinic to fill in.
  const offers: Scraped['offers'] = []
  for (const m of html.matchAll(/<div data-id="\d+">\s*<span class="name">([^<]+)<\/span>/gi)) {
    const name = stripTags(m[1])
    if (!name) continue
    // The row's own markup runs a few hundred characters past the name; the
    // first price inside that window is the low end of its range.
    const row = html.slice(m.index ?? 0, (m.index ?? 0) + 900)
    const first = row.match(/<span class="price"[^>]*>([^<]+)</i)?.[1] ?? ''
    const euro = decodeEntities(first).match(/(?:€|EUR)\s*([\d.,]+)/i)?.[1]
    const priceEuro = euro ? Number(euro.replace(/\./g, '').replace(',', '.')) : NaN
    offers.push({ name, priceEuro: Number.isFinite(priceEuro) ? priceEuro : null })
  }

  // "Muratpaşa / Antalya" — a district and the city it sits in. Our own list
  // holds cities, so both halves get a try.
  const locality = String(node.address?.addressLocality ?? '')
  const localities = [...locality.split('/').map((p) => p.trim()), locality].filter(Boolean)

  return {
    name: String(node.name),
    localities,
    description,
    address: node.address?.streetAddress ?? null,
    phone: null,
    images,
    languages,
    facilities,
    doctors,
    beforeAfter: [], // the gallery is not paired up here, so there is none to take
    offers,
    // Deliberately none: the source hosts no clinic video worth the storage,
    // and copying them in was filling the bucket for nothing.
    videos: [],
  }
}

// ── Sources and their listings ──────────────────────────────────────────────
type Source = 'booking' | 'whatclinic'

const sourceOf = (url: string): Source | null => {
  if (/^https?:\/\/(www\.)?booking\.dentist\//i.test(url)) return 'booking'
  if (/^https?:\/\/(www\.)?whatclinic\.com\//i.test(url)) return 'whatclinic'
  return null
}

const scrape = (source: Source, html: string): Scraped | null =>
  source === 'booking' ? scrapeBookingDentist(html) : scrapeWhatClinic(html)

const MAX_LISTING_PAGES = 30

// booking.dentist: a listing URL — a city page or a filtered search-results
// URL — only ever shows its own first page (a city page's "Top 10", or a
// search-results page's own ten). Going further means walking search-results
// pages for the same location, the way "See all N clinics" does client-side.
// A city page doesn't put that location id in its own URL, but it does embed
// it in the "see all" link inside its HTML.
const LOCATION_RE = /[?&]location=([a-f0-9-]{36})/i

async function* bookingListing(listUrl: string): AsyncGenerator<string[]> {
  const firstHtml = await fetchPage(listUrl)
  const urlsOn = (html: string) =>
    [...new Set([...html.matchAll(/\/dental-clinic\/([a-z0-9-]+)/gi)].map((m) => m[1]))]
      .map((slug) => `https://www.booking.dentist/dental-clinic/${slug}`)
  yield urlsOn(firstHtml)

  let searchUrl: URL
  let page: number
  try {
    searchUrl = new URL(listUrl)
  } catch {
    return
  }

  if (/\/search-results\/?$/i.test(searchUrl.pathname)) {
    page = parseInt(searchUrl.searchParams.get('page') ?? '1', 10) || 1
  } else {
    const location = firstHtml.match(LOCATION_RE)?.[1]
    if (!location) return // no way to find further pages
    searchUrl = new URL('https://www.booking.dentist/search-results')
    searchUrl.searchParams.set('direction', 'DESC')
    searchUrl.searchParams.set('limit', '10')
    searchUrl.searchParams.set('location', location)
    searchUrl.searchParams.set('sortBy', 'recommended')
    page = 1
  }

  for (let i = 0; i < MAX_LISTING_PAGES; i++) {
    page += 1
    searchUrl.searchParams.set('page', String(page))
    await sleep(REQUEST_GAP_MS)
    let html: string
    try {
      html = await fetchPage(searchUrl.toString())
    } catch {
      return
    }
    const urls = urlsOn(html)
    if (!urls.length) return
    yield urls
  }
}

// whatclinic: every listing paginates with ?page=N on the URL you were given,
// and the parameter is zero-based — the link labelled "2" is page=1. Each
// clinic card carries its profile path in a resource="" attribute.
async function* whatClinicListing(listUrl: string): AsyncGenerator<string[]> {
  const urlsOn = (html: string) =>
    [...new Set(
      [...html.matchAll(/<div[^>]*class="search-listing[^"]*"[^>]*resource="([^"]+)"/gi)].map((m) => m[1]),
    )].map((path) => WC_ORIGIN + decodeEntities(path))

  let base: URL
  try {
    base = new URL(listUrl)
  } catch {
    return
  }
  const startPage = parseInt(base.searchParams.get('page') ?? '0', 10) || 0

  for (let i = 0; i <= MAX_LISTING_PAGES; i++) {
    const pageUrl = new URL(base.toString())
    const page = startPage + i
    if (page > 0) pageUrl.searchParams.set('page', String(page))
    else pageUrl.searchParams.delete('page')

    if (i > 0) await sleep(REQUEST_GAP_MS)
    let html: string
    try {
      html = await fetchPage(pageUrl.toString())
    } catch {
      return
    }
    const urls = urlsOn(html)
    if (!urls.length) return
    yield urls
  }
}

const listingPages = (source: Source, listUrl: string): AsyncGenerator<string[]> =>
  source === 'booking' ? bookingListing(listUrl) : whatClinicListing(listUrl)

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
    // Language of the approval screen and invitation messages for this batch.
    const inviteLocale = body?.inviteLocale === 'en' ? 'en' : 'tr'
    const source = sourceOf(listUrl)
    if (!source) {
      return json({ error: 'Only booking.dentist and whatclinic.com listing URLs are supported.' }, 400)
    }

    // Reference data, fetched once rather than per clinic.
    const [{ data: cities }, { data: treatments }] = await Promise.all([
      admin.from('cities').select('id, name'),
      admin.from('treatments').select('id, name'),
    ])
    const cityByName = new Map((cities ?? []).map((c: any) => [norm(c.name), c.id]))
    const treatmentByName = new Map((treatments ?? []).map((t: any) => [norm(t.name), t.id]))

    const results: any[] = []
    let created = 0
    let visitedCount = 0
    let stoppedEarly: 'time' | null = null
    const deadline = Date.now() + RUN_BUDGET_MS
    const visited = new Set<string>()

    // The walk stops on the count of clinics *created*, so everything already
    // collected — or suppressed, or in a city we do not list — costs a page
    // read and nothing else. Run the same URL again tomorrow and it carries on
    // from where this stopped rather than re-reading what it already has.
    walk:
    for await (const pageUrls of listingPages(source, listUrl)) {
      for (const sourceUrl of pageUrls) {
        if (created >= limit) break walk
        if (Date.now() > deadline) { stoppedEarly = 'time'; break walk }
        if (visited.has(sourceUrl)) continue
        visited.add(sourceUrl)
        visitedCount++

        const slug = sourceUrl.replace(/\/+$/, '').split('/').pop() || sourceUrl
        try {
          await sleep(REQUEST_GAP_MS)

          const html = await fetchPage(sourceUrl)
          const s = scrape(source, html)
          if (!s) {
            results.push({ slug, status: 'failed', reason: 'no structured data on page' })
            continue
          }

          const locality = s.localities.find((l) => cityByName.get(norm(l))) ?? s.localities[0] ?? ''
          const cityId = cityByName.get(norm(locality))
          if (!cityId) {
            results.push({ slug, name: s.name, status: 'skipped', reason: `city "${locality}" is not in your list` })
            continue
          }

          const { data: suppressed } = await admin
            .from('outreach_suppressions').select('id').eq('clinic_name', s.name).limit(1)
          if (suppressed?.length) {
            results.push({ slug, name: s.name, status: 'skipped', reason: 'clinic previously rejected us' })
            continue
          }

          // Re-importing would mean a second mail to the same clinic. We do not
          // keep the source URL, so identity here is the name within the city —
          // which is what the sources themselves are consistent about.
          const { data: existing } = await admin
            .from('clinics').select('id').eq('name', s.name).eq('city_id', cityId).limit(1)
          if (existing?.length) {
            results.push({ slug, name: s.name, status: 'skipped', reason: 'already in your clinics' })
            continue
          }

          const { data: clinic, error: clinicError } = await admin
            .from('clinics')
            .insert({
              name: s.name,
              display_name: s.name,
              city_id: cityId,
              description: s.description,
              address: s.address,
              phone: s.phone,
              languages: s.languages,
              facilities: s.facilities,
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

          // Several source rows can collapse onto one catalogue treatment (nine
          // implant brands, four kinds of whitening). The page shows a starting
          // price, so the cheapest of the group is the honest one to keep — and
          // a treatment whose price came in an unconvertible currency is still
          // worth listing, with the price left for the clinic to fill in.
          const cheapest = new Map<string, number | null>()
          const unmapped: string[] = []
          for (const offer of s.offers) {
            const key = catalogueKey(offer.name)
            const treatmentId = key ? treatmentByName.get(key) : undefined
            if (!treatmentId) { unmapped.push(offer.name); continue }
            if (!cheapest.has(treatmentId)) { cheapest.set(treatmentId, offer.priceEuro); continue }
            const current = cheapest.get(treatmentId)!
            if (offer.priceEuro != null && (current == null || offer.priceEuro < current)) {
              cheapest.set(treatmentId, offer.priceEuro)
            }
          }
          const mapped = [...cheapest].map(([treatment_id, starting_price_euro]) => ({
            clinic_id: clinic.id, treatment_id, starting_price_euro,
          }))
          if (mapped.length) await admin.from('clinic_treatments').insert(mapped)

          if (s.images.length) {
            await admin.from('clinic_images').insert(
              s.images.map((url, idx) => ({ clinic_id: clinic.id, image_url: url, is_primary: idx === 0 })),
            )
          }

          if (s.doctors.length) {
            await admin.from('doctors').insert(s.doctors.map((d) => ({ ...d, clinic_id: clinic.id })))
          }

          if (s.beforeAfter.length) {
            await admin.from('clinic_before_after_images').insert(
              s.beforeAfter.map((image_url, sort_order) => ({ clinic_id: clinic.id, image_url, sort_order })),
            )
          }

          // Copying videos is handed to import-clinic-videos, which answers
          // immediately and copies in its own run — inline, a listing's worth of
          // 30–40 MB files would outlast this function's time limit.
          const videoSources = s.videos
          if (videoSources.length) {
            await fetch(`${Deno.env.get('SUPABASE_URL')}/functions/v1/import-clinic-videos`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify({ clinicId: clinic.id, videos: videoSources }),
            }).catch((e) => console.error('video hand-off failed', clinic.id, e))
          }

          // Google Business: never allowed to sink the clinic. A lookup error or
          // an unsure match just leaves the link for the panel's own button.
          let google: 'linked' | 'no_match' | 'error' = 'no_match'
          let googleReviews = 0
          try {
            const place = await findGoogleBusiness(s.name, locality)
            if (place) {
              const reviews = toReviews(place.reviews)
              googleReviews = reviews.length
              await admin.from('clinics').update({
                google_place_id: place.id,
                rating: place.rating ?? null,
                review_count: place.userRatingCount ?? null,
                google_reviews: reviews,
                google_rating_synced_at: new Date().toISOString(),
                website: place.websiteUri ?? null,
                // The source's number wins when it has one; Google fills the gap.
                // whatclinic never publishes one, so there it is Google or none.
                phone: s.phone ?? place.internationalPhoneNumber ?? null,
              }).eq('id', clinic.id)
              if (reviews.length) translateReviewsLater(admin, clinic.id, reviews)
              google = 'linked'
            }
          } catch (e) {
            console.error('google lookup failed', s.name, e)
            google = 'error'
          }

          const previewToken = makeToken()
          const { error: approvalError } = await admin.from('clinic_approvals').insert({
            clinic_id: clinic.id,
            status: 'pending',
            preview_token: previewToken,
            invite_locale: inviteLocale,
            expires_at: new Date(Date.now() + DRAFT_LIFETIME_DAYS * 86_400_000).toISOString(),
          })
          if (approvalError) {
            await admin.from('clinics').delete().eq('id', clinic.id)
            throw approvalError
          }

          created++
          results.push({
            slug,
            name: clinic.name,
            status: 'created',
            clinicId: clinic.id,
            previewToken,
            inviteLocale,
            treatments: mapped.length,
            images: s.images.length,
            doctors: s.doctors.length,
            beforeAfter: s.beforeAfter.length,
            videos: videoSources.length,
            languages: s.languages.length,
            facilities: s.facilities.length,
            google,
            googleReviews,
            unmappedTreatments: unmapped,
          })
        } catch (err) {
          results.push({ slug, status: 'failed', reason: (err as Error)?.message ?? 'unknown error' })
        }
      }
    }

    if (!visitedCount) return json({ error: 'No clinics found on that page.', results: [] }, 200)

    return json({ found: visitedCount, created, stoppedEarly, results })
  } catch (error) {
    console.error('collect-clinics failed:', error)
    return json({ error: (error as Error)?.message ?? 'Collection failed' }, 500)
  }
})
