// Single shared entry point for every transactional email in the clinic
// application/approval lifecycle. Called from register-clinic and from the
// admin panel's approval actions. Kept as one function + a `type` switch so
// there is one place that owns the Resend API key and the email templates.
//
// Clinic-facing emails (application received/approved/rejected, page
// approved/rejected) are sent in whichever site locale the clinic was
// browsing in when they registered (clinics.locale, captured at signup —
// see register-clinic). Admin-facing emails (new application / page ready
// for review) always stay in English regardless of the applicant's locale,
// since they're read internally by site staff.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.0'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

const SITE_URL = 'https://dentaloria.com'
const FROM_ADDRESS = 'Dentaloria <noreply@mail.dentaloria.com>'

type NotificationType =
  | 'application_received'
  | 'admin_new_application'
  | 'application_approved'
  | 'application_rejected'
  | 'page_submitted'
  | 'page_approved'
  | 'page_rejected'

type ClinicFacingType =
  | 'application_received'
  | 'application_approved'
  | 'application_rejected'
  | 'page_approved'
  | 'page_rejected'

type EmailLocale = 'en' | 'tr'
const SUPPORTED_EMAIL_LOCALES: EmailLocale[] = ['en', 'tr']

interface RequestBody {
  type: NotificationType
  clinicId: string
  rejectionReason?: string
  revisionNotes?: string
}

interface ClinicTemplate {
  subject: string
  heading: string
  greeting: string // "Hi {{name}}," — {{name}} substituted with the clinic label
  body: string
  buttonLabel?: string
  reasonLabel?: string // application_rejected only
  closing?: string // application_rejected only
  notesLabel?: string // page_rejected only
}

const CLINIC_TEMPLATES: Record<EmailLocale, Record<ClinicFacingType, ClinicTemplate>> = {
  en: {
    application_received: {
      subject: 'We’ve got your application!',
      heading: 'We’ve got your application!',
      greeting: 'Hi {{name}},',
      body: 'Thanks for applying to Dentaloria. Our team is reviewing your documents now — we’ll email you within a day or two.',
    },
    application_approved: {
      subject: 'You’re approved!',
      heading: 'You’re approved!',
      greeting: 'Hi {{name}},',
      body: 'Great news — you’re approved. One last step: fill in your clinic’s page (photos, treatments, doctors) so patients can find you.',
      buttonLabel: 'Complete your page',
    },
    application_rejected: {
      subject: 'About your application',
      heading: 'About your application',
      greeting: 'Hi {{name}},',
      body: 'Thanks for your interest in Dentaloria. After reviewing your application, we’re not able to approve it right now.',
      reasonLabel: 'Reason:',
      closing: 'Feel free to reach out if you have questions.',
    },
    page_approved: {
      subject: 'You’re live!',
      heading: 'You’re live!',
      greeting: 'Hi {{name}},',
      body: 'Your clinic page is approved and now live on Dentaloria — patients can find and contact you starting today.',
      buttonLabel: 'View your page',
    },
    page_rejected: {
      subject: 'A couple of small changes',
      heading: 'A couple of small changes',
      greeting: 'Hi {{name}},',
      body: 'We reviewed your page — it just needs a couple of tweaks before it can go live.',
      notesLabel: 'Notes from our team:',
      buttonLabel: 'Edit your page',
    },
  },
  tr: {
    application_received: {
      subject: 'Başvurunuzu aldık!',
      heading: 'Başvurunuzu aldık!',
      greeting: 'Merhaba {{name}},',
      body: 'Dentaloria’ya başvurduğunuz için teşekkür ederiz. Ekibimiz belgelerinizi inceliyor — bir iki gün içinde size e-posta göndereceğiz.',
    },
    application_approved: {
      subject: 'Onaylandınız!',
      heading: 'Onaylandınız!',
      greeting: 'Merhaba {{name}},',
      body: 'Harika haber — onaylandınız. Son bir adım kaldı: hastaların sizi bulabilmesi için klinik sayfanızı doldurun (fotoğraflar, tedaviler, doktorlar).',
      buttonLabel: 'Sayfanızı tamamlayın',
    },
    application_rejected: {
      subject: 'Başvurunuz hakkında',
      heading: 'Başvurunuz hakkında',
      greeting: 'Merhaba {{name}},',
      body: 'Dentaloria’ya gösterdiğiniz ilgi için teşekkür ederiz. Başvurunuzu inceledikten sonra şu an onaylayamıyoruz.',
      reasonLabel: 'Neden:',
      closing: 'Sorularınız varsa bizimle iletişime geçmekten çekinmeyin.',
    },
    page_approved: {
      subject: 'Yayındasınız!',
      heading: 'Yayındasınız!',
      greeting: 'Merhaba {{name}},',
      body: 'Klinik sayfanız onaylandı ve artık Dentaloria’da yayında — hastalar bugünden itibaren sizi bulup iletişime geçebilir.',
      buttonLabel: 'Sayfanızı görüntüleyin',
    },
    page_rejected: {
      subject: 'Birkaç küçük değişiklik',
      heading: 'Birkaç küçük değişiklik',
      greeting: 'Merhaba {{name}},',
      body: 'Sayfanızı inceledik — yayına girmeden önce sadece birkaç küçük düzeltme gerekiyor.',
      notesLabel: 'Ekibimizden notlar:',
      buttonLabel: 'Sayfanızı düzenleyin',
    },
  },
}

const LOGO_URL = 'https://dentaloria.com/lovable-uploads/3cf7c960-f1c2-47ee-afa2-077677baed1e.png'

const wrap = (bodyHtml: string) => `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
    <img src="${LOGO_URL}" alt="Dentaloria" style="height: 28px; margin-bottom: 28px;" />
    ${bodyHtml}
    <p style="margin-top: 32px; padding-top: 16px; border-top: 1px solid #e5e7eb; font-size: 12px; color: #9ca3af;">Dentaloria — Compare dental clinics with confidence.</p>
  </div>
`

const button = (href: string, label: string) => `
  <a href="${href}" style="display: inline-block; margin-top: 16px; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${label}</a>
`

// Renders a clinic-facing template in the clinic's own locale, falling back
// to English for the (rare) case a locale value doesn't match a known key.
function renderClinicEmail(
  locale: string,
  type: ClinicFacingType,
  clinicLabel: string,
  extra?: { reasonOrNotes?: string; buttonHref?: string }
): { subject: string; html: string } {
  const resolvedLocale = (SUPPORTED_EMAIL_LOCALES as string[]).includes(locale) ? (locale as EmailLocale) : 'en'
  const tpl = CLINIC_TEMPLATES[resolvedLocale][type]
  const greeting = tpl.greeting.replace('{{name}}', clinicLabel)

  let html = `<h2 style="font-size: 18px; margin: 0 0 12px;">${tpl.heading}</h2>
    <p>${greeting}</p>
    <p>${tpl.body}</p>`

  if (type === 'application_rejected' && extra?.reasonOrNotes) {
    html += `<p><strong>${tpl.reasonLabel}</strong> ${extra.reasonOrNotes}</p>`
  }
  if (tpl.closing) {
    html += `<p>${tpl.closing}</p>`
  }
  if (type === 'page_rejected' && extra?.reasonOrNotes) {
    html += `<p><strong>${tpl.notesLabel}</strong> ${extra.reasonOrNotes}</p>`
  }
  if (tpl.buttonLabel && extra?.buttonHref) {
    html += button(extra.buttonHref, tpl.buttonLabel)
  }

  return { subject: tpl.subject, html: wrap(html) }
}

async function sendEmail(to: string | string[], subject: string, html: string, apiKey: string) {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: { Authorization: `Bearer ${apiKey}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ from: FROM_ADDRESS, to, subject, html }),
  })
  if (!res.ok) {
    const body = await res.text()
    console.error('Resend error:', res.status, body)
    throw new Error(`Resend error ${res.status}: ${body}`)
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const { type, clinicId, rejectionReason, revisionNotes } = (await req.json()) as RequestBody
    if (!type || !clinicId) {
      return new Response(JSON.stringify({ error: 'type and clinicId are required' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const apiKey = Deno.env.get('RESEND_API_KEY')
    if (!apiKey) throw new Error('RESEND_API_KEY is not configured')

    const supabase = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

    const { data: clinic, error: clinicErr } = await supabase
      .from('clinics')
      .select('id, name, display_name, email, locale')
      .eq('id', clinicId)
      .single()
    if (clinicErr || !clinic) throw new Error(`Clinic not found: ${clinicErr?.message}`)

    const clinicLabel = clinic.display_name || clinic.name
    const clinicLocale = clinic.locale || 'en'
    const panelUrl = `${SITE_URL}/clinic/${clinicId}/panel`
    const publicUrl = `${SITE_URL}/clinic/${clinicId}`
    const adminUrl = `${SITE_URL}/admin?section=approvals`

    const getAdminEmails = async (): Promise<string[]> => {
      const { data, error } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin')
      if (error || !data?.length) return []
      const { data: usersData } = await supabase.auth.admin.listUsers({ perPage: 1000 })
      const adminIds = new Set(data.map((r: any) => r.user_id))
      return (usersData?.users || [])
        .filter((u: any) => adminIds.has(u.id) && u.email)
        .map((u: any) => u.email as string)
    }

    switch (type as NotificationType) {
      case 'application_received': {
        const { subject, html } = renderClinicEmail(clinicLocale, 'application_received', clinicLabel)
        await sendEmail(clinic.email, subject, html, apiKey)
        break
      }

      case 'admin_new_application': {
        const admins = await getAdminEmails()
        if (admins.length === 0) break
        await sendEmail(
          admins,
          `New application: ${clinicLabel}`,
          wrap(
            `<h2 style="font-size: 18px; margin: 0 0 12px;">New application waiting</h2>
             <p><strong>${clinicLabel}</strong> just applied to join Dentaloria. Take a look when you get a chance.</p>
             ${button(adminUrl, 'Review application')}`
          ),
          apiKey
        )
        break
      }

      case 'application_approved': {
        const { subject, html } = renderClinicEmail(clinicLocale, 'application_approved', clinicLabel, { buttonHref: panelUrl })
        await sendEmail(clinic.email, subject, html, apiKey)
        break
      }

      case 'application_rejected': {
        const { subject, html } = renderClinicEmail(clinicLocale, 'application_rejected', clinicLabel, { reasonOrNotes: rejectionReason })
        await sendEmail(clinic.email, subject, html, apiKey)
        break
      }

      case 'page_submitted': {
        const admins = await getAdminEmails()
        if (admins.length === 0) break
        await sendEmail(
          admins,
          `${clinicLabel} is ready for review`,
          wrap(
            `<h2 style="font-size: 18px; margin: 0 0 12px;">A page is ready for review</h2>
             <p><strong>${clinicLabel}</strong> finished their clinic page — it’s ready for your review.</p>
             ${button(adminUrl, 'Review page')}`
          ),
          apiKey
        )
        break
      }

      case 'page_approved': {
        const { subject, html } = renderClinicEmail(clinicLocale, 'page_approved', clinicLabel, { buttonHref: publicUrl })
        await sendEmail(clinic.email, subject, html, apiKey)
        break
      }

      case 'page_rejected': {
        const { subject, html } = renderClinicEmail(clinicLocale, 'page_rejected', clinicLabel, { reasonOrNotes: revisionNotes, buttonHref: panelUrl })
        await sendEmail(clinic.email, subject, html, apiKey)
        break
      }

      default:
        return new Response(JSON.stringify({ error: `Unknown type: ${type}` }), {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        })
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch (e: any) {
    console.error('send-clinic-notification error:', e)
    return new Response(JSON.stringify({ error: e?.message || 'Failed to send notification' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})
