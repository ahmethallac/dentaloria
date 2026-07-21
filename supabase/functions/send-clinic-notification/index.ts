// Single shared entry point for every transactional email in the clinic
// application/approval lifecycle. Called from register-clinic and from the
// admin panel's approval actions. Kept as one function + a `type` switch so
// there is one place that owns the Resend API key and the email templates.
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

interface RequestBody {
  type: NotificationType
  clinicId: string
  rejectionReason?: string
  revisionNotes?: string
}

const wrap = (title: string, bodyHtml: string) => `
  <div style="font-family: -apple-system, Helvetica, Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 32px 24px; color: #1f2937;">
    <h1 style="font-size: 22px; margin: 0 0 4px; color: #2563eb;">Dentaloria</h1>
    <h2 style="font-size: 18px; margin: 24px 0 12px;">${title}</h2>
    ${bodyHtml}
    <p style="margin-top: 32px; font-size: 12px; color: #9ca3af;">Dentaloria — Dental Clinic Comparison Platform</p>
  </div>
`

const button = (href: string, label: string) => `
  <a href="${href}" style="display: inline-block; margin-top: 16px; background: #2563eb; color: #ffffff; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: 600;">${label}</a>
`

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
      .select('id, name, display_name, email')
      .eq('id', clinicId)
      .single()
    if (clinicErr || !clinic) throw new Error(`Clinic not found: ${clinicErr?.message}`)

    const clinicLabel = clinic.display_name || clinic.name
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
        await sendEmail(
          clinic.email,
          'We’ve received your application — Dentaloria',
          wrap(
            'Application received',
            `<p>Hi ${clinicLabel},</p>
             <p>Thanks for applying to join Dentaloria. Your documents are now being reviewed by our team.</p>
             <p>We’ll email you as soon as a decision is made — usually within a day or two.</p>`
          ),
          apiKey
        )
        break
      }

      case 'admin_new_application': {
        const admins = await getAdminEmails()
        if (admins.length === 0) break
        await sendEmail(
          admins,
          `New clinic application: ${clinicLabel}`,
          wrap(
            'New application to review',
            `<p><strong>${clinicLabel}</strong> just applied to join Dentaloria.</p>
             <p>Please review their documents in the admin panel.</p>
             ${button(adminUrl, 'Review application')}`
          ),
          apiKey
        )
        break
      }

      case 'application_approved': {
        await sendEmail(
          clinic.email,
          'You’re approved — complete your clinic page',
          wrap(
            'Application approved!',
            `<p>Hi ${clinicLabel},</p>
             <p>Good news — your application has been approved. The only thing left is to fill in your clinic’s public page: photos, treatments, doctors and more.</p>
             ${button(panelUrl, 'Complete your clinic page')}`
          ),
          apiKey
        )
        break
      }

      case 'application_rejected': {
        await sendEmail(
          clinic.email,
          'Update on your Dentaloria application',
          wrap(
            'Application not approved',
            `<p>Hi ${clinicLabel},</p>
             <p>After reviewing your application, we’re unable to approve it at this time.</p>
             ${rejectionReason ? `<p><strong>Reason:</strong> ${rejectionReason}</p>` : ''}
             <p>If you believe this is a mistake or have updated documents, feel free to reach out to us.</p>`
          ),
          apiKey
        )
        break
      }

      case 'page_submitted': {
        const admins = await getAdminEmails()
        if (admins.length === 0) break
        await sendEmail(
          admins,
          `${clinicLabel} submitted their page for review`,
          wrap(
            'Clinic page ready for review',
            `<p><strong>${clinicLabel}</strong> finished filling in their clinic page and submitted it for approval.</p>
             ${button(adminUrl, 'Review page')}`
          ),
          apiKey
        )
        break
      }

      case 'page_approved': {
        await sendEmail(
          clinic.email,
          'Great news — your clinic is now live!',
          wrap(
            'Your clinic page is live!',
            `<p>Hi ${clinicLabel},</p>
             <p>Great news — your clinic page has been approved and is now live on Dentaloria for patients to find.</p>
             ${button(publicUrl, 'View your live page')}`
          ),
          apiKey
        )
        break
      }

      case 'page_rejected': {
        await sendEmail(
          clinic.email,
          'Your clinic page needs a few changes',
          wrap(
            'A few changes needed',
            `<p>Hi ${clinicLabel},</p>
             <p>We reviewed your clinic page and it needs a few changes before it can go live.</p>
             ${revisionNotes ? `<p><strong>Notes from our team:</strong> ${revisionNotes}</p>` : ''}
             ${button(panelUrl, 'Edit your clinic page')}`
          ),
          apiKey
        )
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
