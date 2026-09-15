// Client-side half of the outreach tools: default message texts, the invite
// link, and filling a template for one clinic. The edge functions fill the
// same {{clinic}} / {{link}} placeholders when they send.
import { supabase } from '@/integrations/supabase/client'

export type InviteLocale = 'tr' | 'en'
export type OutreachChannel = 'email' | 'whatsapp' | 'email_reminder'

export interface OutreachTemplate { subject: string; body: string }
export type TemplateSet = Record<InviteLocale, OutreachTemplate>

export interface DraftApproval {
  id: string
  preview_token: string | null
  expires_at: string | null
  status: string
  invite_locale: InviteLocale | null
  contact_email: string | null
  contact_email_source: string | null
  whatsapp_phone: string | null
  whatsapp_source: string | null
  contacts_checked_at: string | null
  invite_sent_at: string | null
  invite_reminder_sent_at: string | null
  invite_reminder_count: number | null
  invite_send_error: string | null
}

export interface OutreachDraft {
  id: string
  name: string
  display_name: string | null
  created_at: string
  email: string | null
  website: string | null
  phone: string | null
  clinic_approvals: DraftApproval[]
}

export const DRAFT_SELECT =
  'id, name, display_name, created_at, email, website, phone, clinic_approvals ( id, preview_token, expires_at, status, invite_locale, contact_email, contact_email_source, whatsapp_phone, whatsapp_source, contacts_checked_at, invite_sent_at, invite_reminder_sent_at, invite_reminder_count, invite_send_error )'

export const approvalOf = (d: OutreachDraft): DraftApproval | undefined =>
  d.clinic_approvals?.find((a) => a.status === 'pending') ?? d.clinic_approvals?.[0]

export const localeOf = (d: OutreachDraft): InviteLocale => (approvalOf(d)?.invite_locale === 'en' ? 'en' : 'tr')

export const clinicLabel = (d: OutreachDraft) => d.display_name || d.name

// Same shape as the edge functions' inviteUrl: a Turkish invite opens the
// Turkish site. The origin is the live site, not wherever the panel runs.
export const inviteLink = (token: string, locale: InviteLocale) =>
  `https://dentaloria.com${locale === 'tr' ? '/tr' : ''}/p/${token}`

export const fillTemplate = (text: string, vars: { clinic: string; link: string }) =>
  text.split('{{clinic}}').join(vars.clinic).split('{{link}}').join(vars.link)

export const DEFAULT_TEMPLATES: Record<OutreachChannel, TemplateSet> = {
  email: {
    tr: {
      subject: "{{clinic}} için Dentaloria'da ücretsiz bir sayfa hazırladık",
      body: `Merhaba {{clinic}} ekibi,

Dentaloria, diş tedavisi arayan hastaları doğru kliniklerle buluşturan, yeni kurulan bir platform. Kliniğinizi hastalarımıza tanıtmak istedik ve sizin için ücretsiz bir sayfa hazırladık.

Sayfanız henüz yayında değil. Bu bağlantıyı sizden başka kimse göremiyor:
{{link}}

Göz atıp beğenirseniz tek tıkla onaylayabilirsiniz. Onayladığınız anda sayfa yayına girer; fiyatlarınızdan fotoğraflarınıza kadar her şeyi dilediğiniz gibi düzenleyebilirsiniz. Sizden hiçbir ücret istemiyoruz.

İstemezseniz aynı sayfadaki "Reddet" butonuna basmanız yeterli. Sayfayı ve tüm bilgileri hemen siliyor, size bir daha yazmıyoruz.

Aklınıza takılan bir şey olursa bu e-postayı yanıtlamanız yeterli.

İyi çalışmalar,
Dentaloria Ekibi`,
    },
    en: {
      subject: 'We built {{clinic}} a free page on Dentaloria',
      body: `Hi {{clinic}} team,

Dentaloria is a new platform that connects people looking for dental treatment with the right clinics. We would love to introduce your clinic to our patients, so we put together a free page for you.

Your page is not live yet. Nobody but you can see this link:
{{link}}

Take a look, and if you like it, approve it with one click. It goes live the moment you do, and you can edit everything from your prices to your photos. There is no charge.

If you would rather not, just press "Reject" on the same page. We delete the page and all its data straight away and will not contact you again.

If you have any questions, simply reply to this email.

Best wishes,
The Dentaloria Team`,
    },
  },
  // The nudge, for clinics that were mailed once and never answered. It leads
  // with the reason to look again rather than repeating the first mail.
  email_reminder: {
    tr: {
      subject: '{{clinic}} — hazırladığımız sayfa hâlâ sizi bekliyor',
      body: `Merhaba {{clinic}} ekibi,

Bir süre önce size yazmıştık, gözünüzden kaçmış olabilir diye kısaca hatırlatmak istedik.

Kliniğiniz için hazırladığımız sayfa hâlâ onayınızı bekliyor:
{{link}}

Dentaloria yakında yüksek bütçeli reklam yayınlarına başlıyor. Bu sizin için şu demek: reklam ajanslarına ve reklam bütçelerine ciddi paralar ödemeden, tedavi arayan hastalardan doğrudan kaliteli talepler alabilirsiniz.

Şimdilik herkes için tamamen ücretsiz — komisyon yok, taahhüt yok. Siz de ücretsiz deneyin.

Sayfanıza göz atıp tek tıkla yayına almak için:
{{link}}

İstemiyorsanız aynı sayfadaki "Reddet" butonuna basmanız yeterli; sayfayı ve tüm bilgileri hemen siler, size bir daha yazmayız.

İyi çalışmalar,
Dentaloria Ekibi`,
    },
    en: {
      subject: '{{clinic}} — your page is still waiting for you',
      body: `Hi {{clinic}} team,

We wrote to you a little while ago and thought it might have slipped past you, so here is a short reminder.

The page we prepared for your clinic is still waiting for your approval:
{{link}}

Dentaloria is about to start advertising with serious budgets. For you that means high-quality enquiries from patients looking for treatment — without paying an agency or funding the ad spend yourself.

It is completely free for everyone for now: no commission, no commitment. Try it at no cost.

To take a look and publish it with one click:
{{link}}

If you would rather not, just press "Reject" on that page. We delete the page and all its data straight away and will not write to you again.

Best wishes,
The Dentaloria Team`,
    },
  },
  whatsapp: {
    tr: {
      subject: '',
      body: `Merhaba {{clinic}} ekibi, Dentaloria'dan yazıyorum. Diş tedavisi arayan hastaları kliniklerle buluşturan platformumuzda kliniğiniz için ücretsiz bir sayfa hazırladık. Henüz yayında değil, sadece siz görebiliyorsunuz:
{{link}}

Beğenirseniz tek tıkla onaylayıp yayına alabilir, her şeyi kendiniz düzenleyebilirsiniz. İstemezseniz "Reddet"e basmanız yeterli, sayfayı hemen sileriz.`,
    },
    en: {
      subject: '',
      body: `Hi {{clinic}} team, this is Dentaloria. We connect people looking for dental treatment with clinics, and we built your clinic a free page on our platform. It is not live yet, only you can see it:
{{link}}

If you like it, approve it with one click and edit anything you want. If not, just press "Reject" and we delete it straight away.`,
    },
  },
}

/** The saved templates for a channel, falling back to the defaults above. */
export const loadTemplates = async (channel: OutreachChannel): Promise<TemplateSet> => {
  const { data } = await (supabase as any)
    .from('outreach_templates')
    .select('locale, subject, body')
    .eq('channel', channel)
  const set: TemplateSet = structuredClone(DEFAULT_TEMPLATES[channel])
  for (const row of (data ?? []) as { locale: InviteLocale; subject: string | null; body: string }[]) {
    if (row.locale in set) set[row.locale] = { subject: row.subject ?? '', body: row.body }
  }
  return set
}

export const saveTemplates = async (channel: OutreachChannel, set: TemplateSet) => {
  const { error } = await (supabase as any).from('outreach_templates').upsert(
    (Object.keys(set) as InviteLocale[]).map((locale) => ({
      channel, locale, subject: set[locale].subject, body: set[locale].body, updated_at: new Date().toISOString(),
    })),
  )
  if (error) throw error
}

/** Runs an admin edge function over clinic ids in small batches. */
export const invokeInBatches = async <R,>(
  fn: string,
  ids: string[],
  batchSize: number,
  extraBody: Record<string, unknown>,
  onProgress: (done: number) => void,
): Promise<R[]> => {
  const { data: { session } } = await supabase.auth.getSession()
  const out: R[] = []
  for (let i = 0; i < ids.length; i += batchSize) {
    const batch = ids.slice(i, i + batchSize)
    const { data, error } = await supabase.functions.invoke(fn, {
      body: { clinicIds: batch, ...extraBody },
      headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
    })
    const payload = (data ?? {}) as any
    if (!payload.results) throw error ?? new Error(payload.error ?? `${fn} failed`)
    out.push(...payload.results)
    onProgress(Math.min(i + batch.length, ids.length))
  }
  return out
}
