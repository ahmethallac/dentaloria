// Sends the invitation mail to draft clinics through Resend. Admin-only.
//
// The panel passes the templates as the admin last saved them; each clinic
// gets the one in its invite language with its own name and secret link
// filled in. A clinic is skipped, never guessed at, when it has no address,
// its invite expired or was answered, it was already mailed, or it sits on
// the suppression list.
//
// mode: 'reminder' is the mirror image — it mails *only* clinics that were
// already invited and have not answered, with the reminder text, and can be
// run again as often as the admin likes. It leaves invite_sent_at alone
// (that is the record of first contact) and counts itself separately, so the
// panel can show "reminded twice" without losing when the first mail went.
import {
  corsHeaders, fillTemplate, hostnameOf, inviteUrl, json, rejectNonAdmin, serviceClient,
  type InviteLocale,
} from '../_shared/outreach.ts'

const MAX_PER_CALL = 10
// Resend's default limit is 2 requests a second.
const SEND_GAP_MS = 600

const FROM = Deno.env.get('OUTREACH_FROM_ADDRESS') ?? 'Dentaloria <davet@mail.dentaloria.com>'
const REPLY_TO = Deno.env.get('OUTREACH_REPLY_TO') ?? 'info@dentaloria.com'

type Templates = Record<InviteLocale, { subject: string; body: string }>

const escapeHtml = (s: string) =>
  s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;')

// Deliberately plain: a personal note from a person reads, and delivers,
// better than a designed newsletter.
const toHtml = (text: string) =>
  `<div style="font-family:-apple-system,Segoe UI,Arial,sans-serif;font-size:15px;line-height:1.6;color:#2e385d;max-width:560px">${
    text.split(/\n{2,}/).map((para) =>
      `<p style="margin:0 0 14px">${escapeHtml(para)
        .replace(/(https?:\/\/[^\s<]+)/g, '<a href="$1" style="color:#0957fb">$1</a>')
        .replace(/\n/g, '<br>')}</p>`,
    ).join('')
  }</div>`

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const admin = serviceClient()
    const refused = await rejectNonAdmin(req, admin)
    if (refused) return refused

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

    const { clinicIds, templates, mode } = (await req.json()) as
      { clinicIds: string[]; templates: Templates; mode?: 'invite' | 'reminder' }
    const reminding = mode === 'reminder'
    const ids = (Array.isArray(clinicIds) ? clinicIds : []).slice(0, MAX_PER_CALL)
    if (!ids.length) return json({ error: 'clinicIds is required' }, 400)
    for (const locale of ['tr', 'en'] as const) {
      const tpl = templates?.[locale]
      if (!tpl?.subject?.trim() || !tpl?.body?.includes('{{link}}')) {
        return json({ error: `The ${locale} template needs a subject and a {{link}}` }, 400)
      }
    }

    const { data: approvals, error } = await admin
      .from('clinic_approvals')
      .select('id, clinic_id, status, preview_token, expires_at, invite_locale, contact_email, invite_sent_at, invite_reminder_count, clinics ( name, display_name, email, website )')
      .in('clinic_id', ids)
      .eq('status', 'pending')
    if (error) throw error

    const results: any[] = []
    for (const a of approvals ?? []) {
      const clinic = (a as any).clinics
      const to = (a.contact_email ?? clinic?.email ?? '').trim().toLowerCase()
      const skip = (reason: string) => results.push({ clinicId: a.clinic_id, status: 'skipped', reason })

      if (!a.preview_token) { skip('no link'); continue }
      if (a.expires_at && new Date(a.expires_at) <= new Date()) { skip('invite expired'); continue }
      if (reminding ? !a.invite_sent_at : !!a.invite_sent_at) {
        skip(reminding ? 'never invited' : 'already sent')
        continue
      }
      if (!to) { skip('no email'); continue }

      const domain = hostnameOf(clinic?.website)
      const { data: suppressed } = await admin
        .from('outreach_suppressions')
        .select('id')
        .or([`email.eq.${to}`, domain ? `website_domain.eq.${domain}` : null].filter(Boolean).join(','))
        .limit(1)
      if (suppressed?.length) { skip('clinic asked not to be contacted'); continue }

      const locale: InviteLocale = a.invite_locale === 'en' ? 'en' : 'tr'
      const vars = { clinic: clinic?.display_name || clinic?.name || '', link: inviteUrl(a.preview_token, locale) }
      const subject = fillTemplate(templates[locale].subject, vars)
      const text = fillTemplate(templates[locale].body, vars)

      try {
        const res = await fetch('https://api.resend.com/emails', {
          method: 'POST',
          headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
          body: JSON.stringify({
            from: FROM,
            to,
            reply_to: REPLY_TO,
            subject,
            text,
            html: toHtml(text),
            headers: { 'List-Unsubscribe': `<mailto:${REPLY_TO}?subject=unsubscribe>` },
          }),
        })
        if (!res.ok) throw new Error(`Resend ${res.status}: ${(await res.text()).slice(0, 200)}`)

        await admin.from('clinic_approvals')
          .update(
            reminding
              ? {
                  invite_reminder_sent_at: new Date().toISOString(),
                  invite_reminder_count: ((a as any).invite_reminder_count ?? 0) + 1,
                  invite_send_error: null,
                  contact_email: to,
                }
              : { invite_sent_at: new Date().toISOString(), invite_send_error: null, contact_email: to },
          )
          .eq('id', a.id)
        results.push({ clinicId: a.clinic_id, status: 'sent', to })
      } catch (err) {
        const message = (err as Error)?.message ?? 'send failed'
        await admin.from('clinic_approvals').update({ invite_send_error: message }).eq('id', a.id)
        results.push({ clinicId: a.clinic_id, status: 'failed', reason: message })
      }
      await sleep(SEND_GAP_MS)
    }

    return json({ results })
  } catch (error) {
    console.error('outreach-send-invites failed:', error)
    return json({ error: (error as Error)?.message ?? 'Sending failed' }, 500)
  }
})
