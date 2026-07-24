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

type EmailLocale = 'en' | 'tr' | 'ro' | 'pl' | 'ru' | 'de' | 'fr'
const SUPPORTED_EMAIL_LOCALES: EmailLocale[] = ['en', 'tr', 'ro', 'pl', 'ru', 'de', 'fr']

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
  ro: {
    application_received: {
      subject: 'Am primit cererea dvs.!',
      heading: 'Am primit cererea dvs.!',
      greeting: 'Bună {{name}},',
      body: 'Mulțumim că ați aplicat la Dentaloria. Echipa noastră vă analizează documentele acum — vă vom trimite un e-mail în una-două zile.',
    },
    application_approved: {
      subject: 'Ați fost aprobat!',
      heading: 'Ați fost aprobat!',
      greeting: 'Bună {{name}},',
      body: 'Vești bune — ați fost aprobat. Un ultim pas: completați pagina clinicii dvs. (fotografii, tratamente, medici) pentru ca pacienții să vă poată găsi.',
      buttonLabel: 'Completați pagina',
    },
    application_rejected: {
      subject: 'Despre cererea dvs.',
      heading: 'Despre cererea dvs.',
      greeting: 'Bună {{name}},',
      body: 'Vă mulțumim pentru interesul acordat Dentaloria. După analizarea cererii dvs., nu o putem aproba în acest moment.',
      reasonLabel: 'Motiv:',
      closing: 'Nu ezitați să ne contactați dacă aveți întrebări.',
    },
    page_approved: {
      subject: 'Sunteți live!',
      heading: 'Sunteți live!',
      greeting: 'Bună {{name}},',
      body: 'Pagina clinicii dvs. a fost aprobată și este acum activă pe Dentaloria — pacienții vă pot găsi și contacta începând de azi.',
      buttonLabel: 'Vedeți pagina dvs.',
    },
    page_rejected: {
      subject: 'Câteva mici modificări',
      heading: 'Câteva mici modificări',
      greeting: 'Bună {{name}},',
      body: 'Am analizat pagina dvs. — mai are nevoie doar de câteva ajustări înainte de a deveni activă.',
      notesLabel: 'Note de la echipa noastră:',
      buttonLabel: 'Editați pagina',
    },
  },
  pl: {
    application_received: {
      subject: 'Otrzymaliśmy Twoje zgłoszenie!',
      heading: 'Otrzymaliśmy Twoje zgłoszenie!',
      greeting: 'Cześć {{name}},',
      body: 'Dziękujemy za zgłoszenie do Dentaloria. Nasz zespół sprawdza teraz Twoje dokumenty — odezwiemy się mailowo w ciągu dnia lub dwóch.',
    },
    application_approved: {
      subject: 'Zostałeś zatwierdzony!',
      heading: 'Zostałeś zatwierdzony!',
      greeting: 'Cześć {{name}},',
      body: 'Świetna wiadomość — zostałeś zatwierdzony. Ostatni krok: uzupełnij stronę swojej kliniki (zdjęcia, zabiegi, lekarze), aby pacjenci mogli Cię znaleźć.',
      buttonLabel: 'Uzupełnij swoją stronę',
    },
    application_rejected: {
      subject: 'W sprawie Twojego zgłoszenia',
      heading: 'W sprawie Twojego zgłoszenia',
      greeting: 'Cześć {{name}},',
      body: 'Dziękujemy za zainteresowanie Dentaloria. Po przeanalizowaniu Twojego zgłoszenia, obecnie nie możemy go zatwierdzić.',
      reasonLabel: 'Powód:',
      closing: 'Jeśli masz pytania, skontaktuj się z nami.',
    },
    page_approved: {
      subject: 'Jesteś opublikowany!',
      heading: 'Jesteś opublikowany!',
      greeting: 'Cześć {{name}},',
      body: 'Twoja strona kliniki została zatwierdzona i jest teraz aktywna na Dentaloria — pacjenci mogą Cię znaleźć i skontaktować się z Tobą już dziś.',
      buttonLabel: 'Zobacz swoją stronę',
    },
    page_rejected: {
      subject: 'Kilka drobnych zmian',
      heading: 'Kilka drobnych zmian',
      greeting: 'Cześć {{name}},',
      body: 'Sprawdziliśmy Twoją stronę — potrzebuje tylko kilku drobnych poprawek, zanim będzie mogła zostać opublikowana.',
      notesLabel: 'Uwagi od naszego zespołu:',
      buttonLabel: 'Edytuj swoją stronę',
    },
  },
  ru: {
    application_received: {
      subject: 'Мы получили вашу заявку!',
      heading: 'Мы получили вашу заявку!',
      greeting: 'Здравствуйте, {{name}},',
      body: 'Спасибо за подачу заявки в Dentaloria. Наша команда сейчас проверяет ваши документы — мы напишем вам в течение одного-двух дней.',
    },
    application_approved: {
      subject: 'Вы одобрены!',
      heading: 'Вы одобрены!',
      greeting: 'Здравствуйте, {{name}},',
      body: 'Отличные новости — вы одобрены. Остался последний шаг: заполните страницу вашей клиники (фото, услуги, врачи), чтобы пациенты могли вас найти.',
      buttonLabel: 'Заполнить страницу',
    },
    application_rejected: {
      subject: 'О вашей заявке',
      heading: 'О вашей заявке',
      greeting: 'Здравствуйте, {{name}},',
      body: 'Благодарим за интерес к Dentaloria. После рассмотрения вашей заявки мы пока не можем её одобрить.',
      reasonLabel: 'Причина:',
      closing: 'Не стесняйтесь обращаться к нам, если у вас есть вопросы.',
    },
    page_approved: {
      subject: 'Вы опубликованы!',
      heading: 'Вы опубликованы!',
      greeting: 'Здравствуйте, {{name}},',
      body: 'Страница вашей клиники одобрена и теперь опубликована на Dentaloria — пациенты могут найти вас и связаться с вами уже сегодня.',
      buttonLabel: 'Посмотреть страницу',
    },
    page_rejected: {
      subject: 'Несколько небольших изменений',
      heading: 'Несколько небольших изменений',
      greeting: 'Здравствуйте, {{name}},',
      body: 'Мы проверили вашу страницу — перед публикацией нужно внести всего несколько небольших правок.',
      notesLabel: 'Замечания от нашей команды:',
      buttonLabel: 'Редактировать страницу',
    },
  },
  de: {
    application_received: {
      subject: 'Wir haben Ihre Bewerbung erhalten!',
      heading: 'Wir haben Ihre Bewerbung erhalten!',
      greeting: 'Hallo {{name}},',
      body: 'Vielen Dank für Ihre Bewerbung bei Dentaloria. Unser Team prüft gerade Ihre Unterlagen — wir melden uns innerhalb von ein bis zwei Tagen per E-Mail.',
    },
    application_approved: {
      subject: 'Sie sind genehmigt!',
      heading: 'Sie sind genehmigt!',
      greeting: 'Hallo {{name}},',
      body: 'Großartige Neuigkeiten — Sie sind genehmigt. Ein letzter Schritt: Füllen Sie die Seite Ihrer Klinik aus (Fotos, Behandlungen, Ärzte), damit Patienten Sie finden können.',
      buttonLabel: 'Seite vervollständigen',
    },
    application_rejected: {
      subject: 'Zu Ihrer Bewerbung',
      heading: 'Zu Ihrer Bewerbung',
      greeting: 'Hallo {{name}},',
      body: 'Vielen Dank für Ihr Interesse an Dentaloria. Nach Prüfung Ihrer Bewerbung können wir sie derzeit nicht genehmigen.',
      reasonLabel: 'Grund:',
      closing: 'Bei Fragen können Sie sich gerne an uns wenden.',
    },
    page_approved: {
      subject: 'Sie sind live!',
      heading: 'Sie sind live!',
      greeting: 'Hallo {{name}},',
      body: 'Ihre Klinikseite wurde genehmigt und ist jetzt auf Dentaloria live — Patienten können Sie ab heute finden und kontaktieren.',
      buttonLabel: 'Seite ansehen',
    },
    page_rejected: {
      subject: 'Ein paar kleine Änderungen',
      heading: 'Ein paar kleine Änderungen',
      greeting: 'Hallo {{name}},',
      body: 'Wir haben Ihre Seite geprüft — es sind nur noch ein paar kleine Anpassungen nötig, bevor sie live gehen kann.',
      notesLabel: 'Hinweise von unserem Team:',
      buttonLabel: 'Seite bearbeiten',
    },
  },
  fr: {
    application_received: {
      subject: 'Nous avons bien reçu votre candidature !',
      heading: 'Nous avons bien reçu votre candidature !',
      greeting: 'Bonjour {{name}},',
      body: 'Merci d’avoir postulé chez Dentaloria. Notre équipe examine actuellement vos documents — nous vous répondrons par e-mail sous un jour ou deux.',
    },
    application_approved: {
      subject: 'Vous êtes approuvé !',
      heading: 'Vous êtes approuvé !',
      greeting: 'Bonjour {{name}},',
      body: 'Excellente nouvelle — vous êtes approuvé. Une dernière étape : complétez la page de votre clinique (photos, traitements, médecins) pour que les patients puissent vous trouver.',
      buttonLabel: 'Compléter votre page',
    },
    application_rejected: {
      subject: 'À propos de votre candidature',
      heading: 'À propos de votre candidature',
      greeting: 'Bonjour {{name}},',
      body: 'Merci de l’intérêt que vous portez à Dentaloria. Après examen de votre candidature, nous ne sommes pas en mesure de l’approuver pour le moment.',
      reasonLabel: 'Motif :',
      closing: 'N’hésitez pas à nous contacter si vous avez des questions.',
    },
    page_approved: {
      subject: 'Vous êtes en ligne !',
      heading: 'Vous êtes en ligne !',
      greeting: 'Bonjour {{name}},',
      body: 'La page de votre clinique est approuvée et est désormais en ligne sur Dentaloria — les patients peuvent vous trouver et vous contacter dès aujourd’hui.',
      buttonLabel: 'Voir votre page',
    },
    page_rejected: {
      subject: 'Quelques petites modifications',
      heading: 'Quelques petites modifications',
      greeting: 'Bonjour {{name}},',
      body: 'Nous avons examiné votre page — il ne manque que quelques ajustements avant qu’elle puisse être mise en ligne.',
      notesLabel: 'Remarques de notre équipe :',
      buttonLabel: 'Modifier votre page',
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
