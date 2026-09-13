// Shared plumbing for the outreach functions: admin check, the invite link,
// template filling, and finding a clinic's email / WhatsApp on its website.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.53.0'

export const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

export const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  })

export const serviceClient = () =>
  createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

/** Returns an error response for anyone who is not an admin, null otherwise. */
export const rejectNonAdmin = async (req: Request, admin: any): Promise<Response | null> => {
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'Not signed in' }, 401)
  const { data: userData } = await admin.auth.getUser(jwt)
  if (!userData?.user) return json({ error: 'Not signed in' }, 401)
  const { data: isAdmin } = await admin.rpc('has_role', { _user_id: userData.user.id, _role: 'admin' })
  return isAdmin ? null : json({ error: 'Admins only' }, 403)
}

export type InviteLocale = 'tr' | 'en'

export const SITE_URL = 'https://dentaloria.com'

// A Turkish invite opens the Turkish site, so the clinic's page reads in the
// same language as the approval bar under it.
export const inviteUrl = (token: string, locale: InviteLocale) =>
  `${SITE_URL}${locale === 'tr' ? '/tr' : ''}/p/${token}`

export const fillTemplate = (text: string, vars: { clinic: string; link: string }) =>
  text.replaceAll('{{clinic}}', vars.clinic).replaceAll('{{link}}', vars.link)

export const hostnameOf = (url: string | null | undefined): string | null => {
  if (!url) return null
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase()
  } catch {
    return null
  }
}

// ── Website contact discovery ─────────────────────────────────────────────
// Clinic sites are small and mostly server-rendered, so a plain fetch of the
// home page and one or two contact pages finds the address far faster (and
// cheaper) than a headless-browser scraper would.

const UA = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36'
const PAGE_TIMEOUT_MS = 8000

const fetchHtml = async (url: string): Promise<string | null> => {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), PAGE_TIMEOUT_MS)
  try {
    const res = await fetch(url, {
      headers: { 'User-Agent': UA, Accept: 'text/html', 'Accept-Language': 'tr,en;q=0.8' },
      redirect: 'follow',
      signal: ctrl.signal,
    })
    if (!res.ok || !(res.headers.get('content-type') ?? '').includes('html')) return null
    return (await res.text()).slice(0, 1_500_000)
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

// Cloudflare's "email protection" swaps addresses for a hex blob keyed by its
// first byte; many clinic sites sit behind it.
const decodeCfEmail = (hex: string): string => {
  const key = parseInt(hex.slice(0, 2), 16)
  let out = ''
  for (let i = 2; i < hex.length; i += 2) out += String.fromCharCode(parseInt(hex.slice(i, i + 2), 16) ^ key)
  return out
}

const EMAIL_RE = /[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}/gi
// Separate, non-global copy for .test(): a /g regex keeps lastIndex between
// calls and would reject every other valid address.
const IS_EMAIL = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,24}$/i
const JUNK_EMAIL = /(\.(png|jpe?g|gif|webp|svg|css|js)$)|example\.|sentry|wixpress|domain\.com|email\.com|yourname|youremail|@sentry|godaddy|@2x|u00/i

const emailsIn = (html: string): { email: string; viaMailto: boolean }[] => {
  const decoded = html.replace(/&#64;|&#x40;|\[at\]|\(at\)/gi, '@').replace(/&#46;|\[dot\]|\(dot\)/gi, '.')
  const found = new Map<string, boolean>()
  for (const m of decoded.matchAll(/mailto:([^"'?>\s]+)/gi)) {
    try { found.set(decodeURIComponent(m[1]).toLowerCase(), true) } catch { /* malformed */ }
  }
  for (const m of decoded.matchAll(/data-cfemail="([0-9a-f]+)"/gi)) found.set(decodeCfEmail(m[1]).toLowerCase(), true)
  for (const m of decoded.matchAll(EMAIL_RE)) {
    const e = m[0].toLowerCase()
    if (!found.has(e)) found.set(e, false)
  }
  return [...found]
    .filter(([e]) => IS_EMAIL.test(e) && !JUNK_EMAIL.test(e))
    .map(([email, viaMailto]) => ({ email, viaMailto }))
}

const whatsappIn = (html: string): string | null => {
  const m = html.match(/(?:wa\.me\/|api\.whatsapp\.com\/send\/?\?phone=|whatsapp:\/\/send\/?\?phone=)(\+?\d[\d\s-]{7,})/i)
  return m ? m[1].replace(/\D/g, '') : null
}

const CONTACT_LINK = /(iletisim|iletişim|contact|bize-ulas|ulasin|kontakt|randevu|appointment)/i
const PREFERRED_LOCAL = /^(info|iletisim|contact|hello|merhaba|randevu|appointment|clinic|klinik|office|reception)\b/

const rankEmail = (email: string, viaMailto: boolean, siteHost: string | null) => {
  const domain = email.split('@')[1] ?? ''
  const root = siteHost?.split('.').slice(-2).join('.') ?? ''
  let score = 0
  if (root && domain.endsWith(root)) score += 4
  if (PREFERRED_LOCAL.test(email)) score += 2
  if (viaMailto) score += 1
  return score
}

export interface ContactScan {
  email: string | null
  emailSource: 'website' | 'website_contact_page' | null
  whatsapp: string | null
}

export const scanWebsite = async (website: string): Promise<ContactScan> => {
  const base = website.startsWith('http') ? website : `https://${website}`
  const host = hostnameOf(base)
  const home = await fetchHtml(base)
  if (!home) return { email: null, emailSource: null, whatsapp: null }

  const candidates = emailsIn(home).map((e) => ({ ...e, source: 'website' as const }))
  let whatsapp = whatsappIn(home)

  // Contact pages linked from the home page, same site only; fall back to the
  // two paths clinics most often use when the menu is built in JavaScript.
  const links = [...home.matchAll(/href="([^"#]+)"/gi)]
    .map((m) => { try { return new URL(m[1], base).toString() } catch { return null } })
    .filter((u): u is string => !!u && hostnameOf(u) === host && CONTACT_LINK.test(u))
  const pages = [...new Set(links)].slice(0, 2)
  const hasOwnDomainEmail = () => candidates.some((c) => rankEmail(c.email, c.viaMailto, host) >= 4)
  if (!pages.length && !hasOwnDomainEmail()) {
    pages.push(new URL('/iletisim', base).toString(), new URL('/contact', base).toString())
  }

  for (const page of pages) {
    if (hasOwnDomainEmail() && whatsapp) break
    const html = await fetchHtml(page)
    if (!html) continue
    candidates.push(...emailsIn(html).map((e) => ({ ...e, source: 'website_contact_page' as const })))
    whatsapp ??= whatsappIn(html)
  }

  const best = candidates.sort((a, b) => rankEmail(b.email, b.viaMailto, host) - rankEmail(a.email, a.viaMailto, host))[0]
  return { email: best?.email ?? null, emailSource: best?.source ?? null, whatsapp }
}

/**
 * International digits for wa.me, from whatever the phone field holds.
 * Turkish national numbers ("0532 …") gain their 90 country code.
 */
export const toWhatsappDigits = (phone: string | null | undefined): string | null => {
  if (!phone) return null
  let d = phone.replace(/\D/g, '')
  if (d.startsWith('00')) d = d.slice(2)
  if (d.length === 11 && d.startsWith('0')) d = `90${d.slice(1)}`
  if (d.length === 10 && d.startsWith('5')) d = `90${d}`
  return d.length >= 10 ? d : null
}
