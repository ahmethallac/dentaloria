// Finds the email address and WhatsApp number to invite a draft clinic with.
// Admin-only. Takes a handful of clinic ids per call (the panel sends them in
// small batches so one slow website never runs into the function time limit).
//
// Order of sources:
//   website  — the site Google Business lists for the clinic (collect-clinics
//              stores it); if missing, looked up again from the Google place.
//   email    — best address on the home page or its contact page, preferring
//              one on the clinic's own domain.
//   WhatsApp — a wa.me / WhatsApp button on the site beats the phone number,
//              because a clinic's listed phone is often a landline.
import {
  corsHeaders, json, rejectNonAdmin, scanWebsite, serviceClient, toWhatsappDigits,
} from '../_shared/outreach.ts'

const MAX_PER_CALL = 5

const placeContacts = async (placeId: string) => {
  const apiKey = Deno.env.get('GOOGLE_PLACES_API_KEY')
  if (!apiKey) return null
  const res = await fetch(`https://places.googleapis.com/v1/places/${encodeURIComponent(placeId)}`, {
    headers: { 'X-Goog-Api-Key': apiKey, 'X-Goog-FieldMask': 'websiteUri,internationalPhoneNumber' },
  })
  return res.ok ? await res.json() : null
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response(null, { headers: corsHeaders })

  try {
    const admin = serviceClient()
    const refused = await rejectNonAdmin(req, admin)
    if (refused) return refused

    const { clinicIds } = await req.json()
    const ids: string[] = (Array.isArray(clinicIds) ? clinicIds : []).slice(0, MAX_PER_CALL)
    if (!ids.length) return json({ error: 'clinicIds is required' }, 400)

    const { data: clinics, error } = await admin
      .from('clinics')
      .select('id, name, email, website, phone, google_place_id, clinic_approvals ( id, status, contact_email )')
      .in('id', ids)
    if (error) throw error

    const results = await Promise.all((clinics ?? []).map(async (clinic: any) => {
      const approval = (clinic.clinic_approvals ?? []).find((a: any) => a.status === 'pending')
      if (!approval) return { clinicId: clinic.id, error: 'no pending invite' }

      try {
        let website: string | null = clinic.website
        let phone: string | null = clinic.phone
        if ((!website || !phone) && clinic.google_place_id) {
          const place = await placeContacts(clinic.google_place_id).catch(() => null)
          const patch: Record<string, string> = {}
          if (!website && place?.websiteUri) website = patch.website = place.websiteUri
          if (!phone && place?.internationalPhoneNumber) phone = patch.phone = place.internationalPhoneNumber
          if (Object.keys(patch).length) await admin.from('clinics').update(patch).eq('id', clinic.id)
        }

        const scan = website ? await scanWebsite(website) : { email: null, emailSource: null, whatsapp: null }

        // An address typed in by hand, or already on the clinic, is kept: the
        // scan only fills gaps, it never overwrites someone's correction.
        const email = approval.contact_email ?? clinic.email ?? scan.email
        const emailSource = approval.contact_email
          ? undefined
          : clinic.email ? 'existing' : scan.emailSource

        const fromSite = scan.whatsapp
        const fromPhone = toWhatsappDigits(phone)
        const whatsapp = fromSite ?? fromPhone
        // Turkish mobiles are +90 5xx; anything else from the phone field is
        // most likely a landline with no WhatsApp behind it.
        const whatsappSource = fromSite
          ? 'website'
          : fromPhone ? (fromPhone.startsWith('90') && !fromPhone.startsWith('905') ? 'phone_landline' : 'phone') : null

        await admin.from('clinic_approvals').update({
          ...(emailSource !== undefined ? { contact_email: email, contact_email_source: emailSource } : {}),
          whatsapp_phone: whatsapp,
          whatsapp_source: whatsappSource,
          contacts_checked_at: new Date().toISOString(),
        }).eq('id', approval.id)

        // The clinic row carries the address too, so a later rejection writes
        // it into the suppression list and nobody mails them again.
        if (email && !clinic.email) await admin.from('clinics').update({ email }).eq('id', clinic.id)

        return { clinicId: clinic.id, website, email, emailSource, whatsapp, whatsappSource }
      } catch (err) {
        return { clinicId: clinic.id, error: (err as Error)?.message ?? 'scan failed' }
      }
    }))

    return json({ results })
  } catch (error) {
    console.error('outreach-find-contacts failed:', error)
    return json({ error: (error as Error)?.message ?? 'Contact lookup failed' }, 500)
  }
})
