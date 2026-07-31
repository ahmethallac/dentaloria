import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Checkbox } from '@/components/ui/checkbox'
import { useToast } from '@/hooks/use-toast'
import { Loader2, Upload, CheckCircle, Clock, FileText } from 'lucide-react'
import { supabase } from '@/integrations/supabase/client'
import { withLocalePrefix } from '@/lib/localePath'

interface Country { id: string; name: string; code: string }
interface City { id: string; name: string; country_id: string }

const RegisterClinic = () => {
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('registerClinic')
  const { toast } = useToast()
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const [countries, setCountries] = useState<Country[]>([])
  const [cities, setCities] = useState<City[]>([])
  const [countryId, setCountryId] = useState('')

  const healthInputRef = useRef<HTMLInputElement>(null)
  const agencyInputRef = useRef<HTMLInputElement>(null)

  const [form, setForm] = useState({
    clinicName: '',
    email: '',
    password: '',
    confirmPassword: '',
    cityId: '',
    phone: '',
    website: '',
    healthTourismDoc: null as File | null,
    agencyCertificate: null as File | null,
    isHealthcareFacility: false,
    agree: false,
  })

  useEffect(() => {
    (async () => {
      const [{ data: c }, { data: ct }] = await Promise.all([
        supabase.from('countries').select('*').order('name'),
        supabase.from('cities').select('*').order('name'),
      ])
      setCountries(c || [])
      setCities(ct || [])
    })()
  }, [])

  const filteredCities = countryId ? cities.filter(c => c.country_id === countryId) : []

  const upd = (k: string, v: any) => setForm(prev => ({ ...prev, [k]: v }))

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (form.password !== form.confirmPassword) {
      toast({ title: t('errors.title'), description: t('errors.passwordMismatch'), variant: 'destructive' }); return
    }
    if (form.password.length < 6) {
      toast({ title: t('errors.title'), description: t('errors.passwordTooShort'), variant: 'destructive' }); return
    }
    if (!form.healthTourismDoc) {
      toast({ title: t('errors.title'), description: t('errors.healthDocRequired'), variant: 'destructive' }); return
    }
    if (!form.agree) {
      toast({ title: t('errors.title'), description: t('errors.agreeRequired'), variant: 'destructive' }); return
    }

    setSubmitting(true)
    try {
      const folder = `pending/${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
      const uploadDoc = async (file: File, name: string) => {
        const ext = file.name.split('.').pop()
        const path = `${folder}/${name}-${Date.now()}.${ext}`
        const { error } = await supabase.storage.from('clinic-documents').upload(path, file)
        if (error) throw error
        return path
      }

      const healthUrl = await uploadDoc(form.healthTourismDoc!, 'health-tourism-doc')
      const agencyUrl = !form.isHealthcareFacility && form.agencyCertificate
        ? await uploadDoc(form.agencyCertificate, 'agency-certificate')
        : null

      const { data, error } = await supabase.functions.invoke('register-clinic', {
        body: {
          email: form.email,
          password: form.password,
          clinicName: form.clinicName,
          cityId: form.cityId,
          phone: form.phone,
          website: form.website || null,
          healthTourismDocUrl: healthUrl,
          agencyCertificateUrl: agencyUrl,
          appliedAsHealthcareFacility: form.isHealthcareFacility,
          locale: lang || 'en',
        },
      })

      if (error || (data as any)?.error) {
        // supabase-js only puts a generic "Edge Function returned a non-2xx
        // status code" on `error.message` — the real reason we sent back
        // (e.g. "email already registered") is in the raw response body.
        let serverMessage: string | undefined = (data as any)?.error
        if (!serverMessage && error?.context?.json) {
          try {
            const body = await error.context.json()
            serverMessage = body?.error
          } catch {
            // response body wasn't JSON — fall through to the generic message
          }
        }
        // The edge function returns a stable machine key for known cases so
        // we can show a localized, actionable message instead of raw text.
        if (serverMessage === 'email_already_registered') {
          serverMessage = t('errors.emailAlreadyRegistered')
        }
        throw new Error(serverMessage || error?.message || t('errors.registrationFailed'))
      }

      setSubmitted(true)
    } catch (err: any) {
      toast({ title: t('errors.registrationErrorTitle'), description: err.message || t('errors.genericError'), variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted flex items-center justify-center p-4">
        <Card className="max-w-md w-full">
          <CardHeader className="text-center">
            <Clock className="w-12 h-12 mx-auto text-primary mb-2" />
            <CardTitle>{t('submitted.title')}</CardTitle>
            <CardDescription>{t('submitted.subtitle')}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4 text-center">
            <p className="text-sm text-muted-foreground">
              {t('submitted.description')}
            </p>
            <Button className="w-full" onClick={() => navigate(withLocalePrefix('/', lang))}>{t('submitted.backHome')}</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted py-10 px-4">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">{t('form.title')}</CardTitle>
            <CardDescription>
              {t('form.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-5">
              {/* Account */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80">{t('form.accountSection')}</h3>
                <div className="space-y-2">
                  <Label htmlFor="email">{t('form.emailLabel')}</Label>
                  <Input id="email" type="email" value={form.email} onChange={(e) => upd('email', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="password">{t('form.passwordLabel')}</Label>
                    <Input id="password" type="password" value={form.password} onChange={(e) => upd('password', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="confirm">{t('form.confirmPasswordLabel')}</Label>
                    <Input id="confirm" type="password" value={form.confirmPassword} onChange={(e) => upd('confirmPassword', e.target.value)} required />
                  </div>
                </div>
              </div>

              {/* Clinic */}
              <div className="space-y-3">
                <h3 className="text-sm font-semibold text-foreground/80">{t('form.clinicSection')}</h3>
                <div className="space-y-2">
                  <Label htmlFor="clinicName">{t('form.legalNameLabel')}</Label>
                  <Input id="clinicName" value={form.clinicName} onChange={(e) => upd('clinicName', e.target.value)} required />
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label>{t('form.countryLabel')}</Label>
                    <Select value={countryId} onValueChange={(v) => { setCountryId(v); upd('cityId', '') }}>
                      <SelectTrigger><SelectValue placeholder={t('form.selectCountry')} /></SelectTrigger>
                      <SelectContent>
                        {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>{t('form.cityLabel')}</Label>
                    <Select value={form.cityId} onValueChange={(v) => upd('cityId', v)} disabled={!countryId}>
                      <SelectTrigger><SelectValue placeholder={countryId ? t('form.selectCity') : t('form.selectCountryFirst')} /></SelectTrigger>
                      <SelectContent>
                        {filteredCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <Label htmlFor="phone">{t('form.phoneLabel')}</Label>
                    <Input id="phone" value={form.phone} onChange={(e) => upd('phone', e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="website">{t('form.websiteLabel')}</Label>
                    <Input id="website" placeholder="https://" value={form.website} onChange={(e) => upd('website', e.target.value)} />
                  </div>
                </div>
              </div>

              {/* Documents */}
              <div className="space-y-4 p-4 bg-muted rounded-lg">
                <h3 className="text-sm font-semibold">{t('form.documentsSection')}</h3>

                {/* Health Tourism Authorization Certificate — always required */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('form.healthTourismDocLabel')}
                    <span className="text-destructive">*</span>
                  </Label>
                  <input
                    ref={healthInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => upd('healthTourismDoc', e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button type="button" variant="outline" size="sm" onClick={() => healthInputRef.current?.click()}>
                      <Upload className="w-4 h-4 mr-1" /> {t('form.uploadFile')}
                    </Button>
                    {form.healthTourismDoc && (
                      <span className="text-sm flex items-center gap-1 text-green-600 truncate">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[260px]">{form.healthTourismDoc.name}</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Agency Certificate — optional */}
                <div className="space-y-2">
                  <Label className="text-sm flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    {t('form.agencyCertificateLabel')}
                    <span className="text-muted-foreground font-normal">({t('form.optional')})</span>
                  </Label>
                  <input
                    ref={agencyInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,.jpg,.jpeg,.png"
                    onChange={(e) => upd('agencyCertificate', e.target.files?.[0] || null)}
                  />
                  <div className="flex items-center gap-3 flex-wrap">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => agencyInputRef.current?.click()}
                      disabled={form.isHealthcareFacility}
                    >
                      <Upload className="w-4 h-4 mr-1" /> {t('form.uploadFile')}
                    </Button>
                    {form.agencyCertificate && !form.isHealthcareFacility && (
                      <span className="text-sm flex items-center gap-1 text-green-600 truncate">
                        <CheckCircle className="w-4 h-4 shrink-0" />
                        <span className="truncate max-w-[260px]">{form.agencyCertificate.name}</span>
                      </span>
                    )}
                  </div>

                  <div className="flex items-start gap-2 pt-2">
                    <Checkbox
                      id="healthcare"
                      checked={form.isHealthcareFacility}
                      onCheckedChange={(v) => {
                        upd('isHealthcareFacility', !!v)
                        if (v) upd('agencyCertificate', null)
                      }}
                    />
                    <Label htmlFor="healthcare" className="text-sm text-muted-foreground leading-snug">
                      {t('form.healthcareFacilityCheckbox')}
                    </Label>
                  </div>
                </div>
              </div>

              <div className="flex items-start gap-2">
                <Checkbox id="agree" checked={form.agree} onCheckedChange={(v) => upd('agree', !!v)} />
                <Label htmlFor="agree" className="text-sm text-muted-foreground leading-snug">
                  {t('form.agreeCheckbox')}
                </Label>
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {t('form.submitButton')}
              </Button>

              <p className="text-center text-sm text-muted-foreground">
                {t('form.alreadyApproved')} <Link to={withLocalePrefix('/auth', lang)} className="text-primary hover:underline">{t('form.signIn')}</Link>
              </p>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

export default RegisterClinic
