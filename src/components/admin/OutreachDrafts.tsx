// Admin screen for building outreach drafts by hand: fill in a clinic, get the
// secret link, send it yourself.
//
// This is the manual half of the flow that the collector will later automate.
// Everything downstream — the clinic's preview page, approval, signup and
// publishing — already works, so drafts made here are the real thing.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { withLocalePrefix } from '@/lib/localePath'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { Copy, ExternalLink, Loader2, Plus, Link2, Download, CheckCircle2, AlertTriangle, MinusCircle } from 'lucide-react'

interface City { id: string; name: string }

interface Draft {
  id: string
  name: string
  created_at: string
  email: string | null
  clinic_approvals: { preview_token: string | null; expires_at: string | null; status: string }[]
}

const draftUrl = (token: string) => `${window.location.origin}/p/${token}`

const daysLeft = (iso: string | null) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

export default function OutreachDrafts() {
  const { t } = useTranslation('admin')
  const { lang } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [cities, setCities] = useState<City[]>([])
  const [drafts, setDrafts] = useState<Draft[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [form, setForm] = useState({
    name: '', cityId: '', website: '', email: '', phone: '', description: '',
  })

  const [listUrl, setListUrl] = useState('')
  const [count, setCount] = useState('5')
  const [collecting, setCollecting] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)

  const collect = async () => {
    setCollecting(true)
    setResults(null)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('collect-clinics', {
        body: { listUrl, limit: Number(count) },
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      const payload = (data ?? {}) as any
      if (payload?.error && !payload?.results) throw new Error(payload.error)
      if (error && !payload?.results) throw error
      setResults(payload.results ?? [])
      loadDrafts()
    } catch (err: any) {
      toast({ title: t('outreach.collectFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setCollecting(false)
    }
  }

  const loadDrafts = useCallback(async () => {
    const { data } = await supabase
      .from('clinics')
      .select('id, name, created_at, email, clinic_approvals ( preview_token, expires_at, status )')
      .eq('page_status', 'awaiting_clinic_approval')
      .order('created_at', { ascending: false })
    setDrafts((data ?? []) as any)
    setLoading(false)
  }, [])

  useEffect(() => {
    supabase.from('cities').select('id, name').order('name').then(({ data }) => setCities((data ?? []) as City[]))
    loadDrafts()
  }, [loadDrafts])

  const copy = async (token: string) => {
    await navigator.clipboard.writeText(draftUrl(token))
    toast({ title: t('outreach.copied') })
  }

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)
    try {
      const { data: { session } } = await supabase.auth.getSession()
      const { data, error } = await supabase.functions.invoke('create-clinic-draft', {
        body: form,
        headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
      })
      // The suppression refusal is the one error worth reading out loud — it
      // means this clinic already said no and must be left alone.
      const payload = (data ?? {}) as any
      if (payload?.suppressed) {
        toast({ title: t('outreach.suppressed'), description: payload.error, variant: 'destructive' })
        return
      }
      if (error || !payload?.previewToken) throw error ?? new Error(payload?.error ?? 'failed')

      await copy(payload.previewToken)
      toast({ title: t('outreach.created'), description: t('outreach.createdHint') })
      setForm({ name: '', cityId: '', website: '', email: '', phone: '', description: '' })
      loadDrafts()
    } catch (err: any) {
      toast({ title: t('outreach.createFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setSaving(false)
    }
  }

  const set = (k: keyof typeof form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setForm((f) => ({ ...f, [k]: e.target.value }))

  const created = results?.filter((r) => r.status === 'created') ?? []

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" /> {t('outreach.collectTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('outreach.collectHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_140px_auto] sm:items-end">
            <div>
              <Label htmlFor="oc-url">{t('outreach.listUrl')}</Label>
              <Input
                id="oc-url"
                value={listUrl}
                onChange={(e) => setListUrl(e.target.value)}
                placeholder="https://www.booking.dentist/dental-clinics/turkey/antalya"
              />
            </div>
            <div>
              <Label htmlFor="oc-count">{t('outreach.howMany')}</Label>
              <Input id="oc-count" type="number" min={1} max={20} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <Button onClick={collect} disabled={collecting || !listUrl.trim()}>
              {collecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('outreach.collect')}
            </Button>
          </div>
          {collecting && <p className="text-sm text-muted-foreground">{t('outreach.collecting')}</p>}

          {results && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">{t('outreach.collectDone', { created: created.length, total: results.length })}</p>
              {results.map((r) => (
                <div key={r.slug} className="flex flex-wrap items-center justify-between gap-2 border rounded-lg p-3 text-sm">
                  <div className="flex items-start gap-2 min-w-0">
                    {r.status === 'created' && <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />}
                    {r.status === 'skipped' && <MinusCircle className="w-4 h-4 text-muted-foreground mt-0.5 shrink-0" />}
                    {r.status === 'failed' && <AlertTriangle className="w-4 h-4 text-destructive mt-0.5 shrink-0" />}
                    <div className="min-w-0">
                      <div className="font-medium truncate">{r.name ?? r.slug}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.status === 'created'
                          ? t('outreach.createdSummary', { treatments: r.treatments, images: r.images, doctors: r.doctors ?? 0, beforeAfter: r.beforeAfter ?? 0, languages: r.languages ?? 0 })
                          : r.reason}
                        {r.status === 'created' && (
                          <> · {r.google === 'linked'
                            ? t('outreach.googleLinked', { count: r.googleReviews ?? 0 })
                            : r.google === 'error' ? t('outreach.googleError') : t('outreach.googleNoMatch')}</>
                        )}
                        {r.unmappedTreatments?.length > 0 && (
                          <> · {t('outreach.unmapped', { count: r.unmappedTreatments.length })}</>
                        )}
                      </div>
                    </div>
                  </div>
                  {r.previewToken && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => copy(r.previewToken)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> {t('outreach.copyLink')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(draftUrl(r.previewToken), '_blank')}>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Plus className="w-4 h-4" /> {t('outreach.newTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('outreach.newHint')}</p>
        </CardHeader>
        <CardContent>
          <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
            <div>
              <Label htmlFor="od-name">{t('outreach.name')} *</Label>
              <Input id="od-name" required value={form.name} onChange={set('name')} />
            </div>
            <div>
              <Label htmlFor="od-city">{t('outreach.city')} *</Label>
              <select
                id="od-city"
                required
                value={form.cityId}
                onChange={(e) => setForm((f) => ({ ...f, cityId: e.target.value }))}
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              >
                <option value="">—</option>
                {cities.map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
              </select>
            </div>
            <div>
              <Label htmlFor="od-website">{t('outreach.website')}</Label>
              <Input id="od-website" value={form.website} onChange={set('website')} placeholder="https://" />
              <p className="text-xs text-muted-foreground mt-1">{t('outreach.websiteHint')}</p>
            </div>
            <div>
              <Label htmlFor="od-email">{t('outreach.email')}</Label>
              <Input id="od-email" type="email" value={form.email} onChange={set('email')} />
            </div>
            <div>
              <Label htmlFor="od-phone">{t('outreach.phone')}</Label>
              <Input id="od-phone" value={form.phone} onChange={set('phone')} />
            </div>
            <div className="sm:col-span-2">
              <Label htmlFor="od-desc">{t('outreach.description')}</Label>
              <Textarea id="od-desc" rows={4} value={form.description} onChange={set('description')} />
            </div>
            <div className="sm:col-span-2">
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                {t('outreach.create')}
              </Button>
            </div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Link2 className="w-4 h-4" /> {t('outreach.listTitle', { count: drafts.length })}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('outreach.listHint')}</p>
        </CardHeader>
        <CardContent>
          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : drafts.length === 0 ? (
            <p className="text-sm text-muted-foreground">{t('outreach.empty')}</p>
          ) : (
            <div className="space-y-3">
              {drafts.map((d) => {
                const approval = d.clinic_approvals?.[0]
                const left = daysLeft(approval?.expires_at ?? null)
                return (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {d.email || t('outreach.noEmail')}
                        {left !== null && <> · {t('outreach.expiresIn', { count: left })}</>}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!approval?.preview_token && <Badge variant="secondary">{t('outreach.noLink')}</Badge>}
                      {approval?.preview_token && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => copy(approval.preview_token!)}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> {t('outreach.copyLink')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(draftUrl(approval.preview_token!), '_blank')}>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </Button>
                        </>
                      )}
                      <Button size="sm" onClick={() => navigate(withLocalePrefix(`/clinic/${d.id}/panel`, lang))}>
                        {t('outreach.editDetails')}
                      </Button>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
