// Admin "Clinic invites" screen, in three tabs:
//   collect  — read a listing into draft pages, each with its secret link
//   email    — find each clinic's address and send the invitation mail
//   whatsapp — ready-to-send WhatsApp text and number, sent by hand
//
// The tab lives in the URL next to ?section=, so a reload or a trip to another
// browser tab comes back to the same place.
import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { supabase } from '@/integrations/supabase/client'
import { withLocalePrefix } from '@/lib/localePath'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { Copy, ExternalLink, Loader2, Link2, Download, CheckCircle2, AlertTriangle, MinusCircle, Mail, MessageCircle } from 'lucide-react'
import {
  DRAFT_SELECT, approvalOf, inviteLink, localeOf, type InviteLocale, type OutreachDraft,
} from '@/lib/outreach'
import OutreachEmail from './OutreachEmail'
import OutreachWhatsApp from './OutreachWhatsApp'

type OutreachTab = 'collect' | 'email' | 'whatsapp'

const daysLeft = (iso: string | null) => {
  if (!iso) return null
  return Math.ceil((new Date(iso).getTime() - Date.now()) / 86_400_000)
}

const LOCALE_KEY = 'dentaloria_invite_locale'

export default function OutreachDrafts() {
  const { t } = useTranslation('admin')
  const [params, setParams] = useSearchParams()
  const tab = (params.get('tab') as OutreachTab) || 'collect'
  const setTab = (next: string) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p, { replace: true })
  }

  const [drafts, setDrafts] = useState<OutreachDraft[]>([])
  const [loading, setLoading] = useState(true)

  const loadDrafts = useCallback(async () => {
    const { data } = await supabase
      .from('clinics')
      .select(DRAFT_SELECT)
      .eq('page_status', 'awaiting_clinic_approval')
      .order('created_at', { ascending: false })
    setDrafts((data ?? []) as any)
    setLoading(false)
  }, [])

  useEffect(() => { loadDrafts() }, [loadDrafts])

  return (
    <Tabs value={tab} onValueChange={setTab} className="space-y-6">
      <TabsList className="h-auto flex-wrap">
        <TabsTrigger value="collect"><Download className="w-4 h-4 mr-1.5" />{t('outreach.tabs.collect')}</TabsTrigger>
        <TabsTrigger value="email"><Mail className="w-4 h-4 mr-1.5" />{t('outreach.tabs.email')}</TabsTrigger>
        <TabsTrigger value="whatsapp"><MessageCircle className="w-4 h-4 mr-1.5" />{t('outreach.tabs.whatsapp')}</TabsTrigger>
      </TabsList>

      <TabsContent value="collect" className="space-y-6 mt-0">
        <CollectTab drafts={drafts} loading={loading} reload={loadDrafts} />
      </TabsContent>
      <TabsContent value="email" className="mt-0">
        <OutreachEmail drafts={drafts} loading={loading} reload={loadDrafts} />
      </TabsContent>
      <TabsContent value="whatsapp" className="mt-0">
        <OutreachWhatsApp drafts={drafts} loading={loading} reload={loadDrafts} />
      </TabsContent>
    </Tabs>
  )
}

export const InviteLocaleSelect = ({
  value, onChange, className = 'w-[130px]',
}: { value: InviteLocale; onChange: (v: InviteLocale) => void; className?: string }) => {
  const { t } = useTranslation('admin')
  return (
    <Select value={value} onValueChange={(v) => onChange(v as InviteLocale)}>
      <SelectTrigger className={className}><SelectValue /></SelectTrigger>
      <SelectContent>
        <SelectItem value="tr">{t('outreach.langTr')}</SelectItem>
        <SelectItem value="en">{t('outreach.langEn')}</SelectItem>
      </SelectContent>
    </Select>
  )
}

function CollectTab({ drafts, loading, reload }: { drafts: OutreachDraft[]; loading: boolean; reload: () => void }) {
  const { t } = useTranslation('admin')
  const { lang } = useParams()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [listUrl, setListUrl] = useState('')
  const [count, setCount] = useState('5')
  const [inviteLocale, setInviteLocale] = useState<InviteLocale>(() => {
    try { return localStorage.getItem(LOCALE_KEY) === 'en' ? 'en' : 'tr' } catch { return 'tr' }
  })
  const [collecting, setCollecting] = useState(false)
  const [results, setResults] = useState<any[] | null>(null)
  // Set when the rounds ended before the number asked for — usually the
  // listing has no more clinics we do not already have.
  const [stoppedEarly, setStoppedEarly] = useState(false)
  // Live count while the rounds run, so a two-minute wait shows movement.
  const [progress, setProgress] = useState<{ created: number; target: number } | null>(null)

  const chooseLocale = (v: InviteLocale) => {
    setInviteLocale(v)
    try { localStorage.setItem(LOCALE_KEY, v) } catch { /* private mode */ }
  }

  const copy = async (token: string, locale: InviteLocale) => {
    await navigator.clipboard.writeText(inviteLink(token, locale))
    toast({ title: t('outreach.copied') })
  }

  // One call stops at its own time budget — around twenty clinics — because a
  // longer request is killed by the platform and then reports nothing at all.
  // So a hundred is asked for in rounds instead of making him press the button
  // five times: each round continues past everything already collected. It
  // gives up when a round adds nobody, which is what an exhausted listing
  // looks like from here, and keeps whatever the earlier rounds made.
  const collect = async () => {
    const target = Math.min(Math.max(Number(count) || 1, 1), 100)
    setCollecting(true)
    setResults(null)
    setStoppedEarly(false)
    setProgress({ created: 0, target })
    const all: any[] = []
    const seen = new Set<string>()
    let created = 0
    try {
      const { data: { session } } = await supabase.auth.getSession()
      for (let round = 0; round < 10 && created < target; round++) {
        const { data, error } = await supabase.functions.invoke('collect-clinics', {
          body: { listUrl, limit: target - created, inviteLocale },
          headers: session ? { Authorization: `Bearer ${session.access_token}` } : undefined,
        })
        const payload = (data ?? {}) as any
        if (payload?.error && !payload?.results) throw new Error(payload.error)
        if (error && !payload?.results) throw error
        const roundResults: any[] = payload.results ?? []
        for (const r of roundResults) {
          if (seen.has(r.slug)) continue
          seen.add(r.slug)
          all.push(r)
        }
        const madeHere = roundResults.filter((r) => r.status === 'created').length
        created += madeHere
        setProgress({ created, target })
        if (!madeHere) break
      }
    } catch (err: any) {
      toast({ title: t('outreach.collectFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setResults(all)
      setStoppedEarly(created < target)
      setProgress(null)
      setCollecting(false)
      reload()
    }
  }

  const changeLocale = async (approvalId: string, locale: InviteLocale) => {
    const { error } = await (supabase as any).from('clinic_approvals').update({ invite_locale: locale }).eq('id', approvalId)
    if (error) {
      toast({ title: t('outreach.updateFailed'), description: error.message, variant: 'destructive' })
      return
    }
    toast({ title: t('outreach.localeUpdated') })
    reload()
  }

  const created = results?.filter((r) => r.status === 'created') ?? []

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Download className="w-4 h-4" /> {t('outreach.collectTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">{t('outreach.collectHint')}</p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-[1fr_110px_150px_auto] sm:items-end">
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
              <Input id="oc-count" type="number" min={1} max={100} value={count} onChange={(e) => setCount(e.target.value)} />
            </div>
            <div>
              <Label>{t('outreach.inviteLanguage')}</Label>
              <InviteLocaleSelect value={inviteLocale} onChange={chooseLocale} className="w-full" />
            </div>
            <Button onClick={collect} disabled={collecting || !listUrl.trim()}>
              {collecting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              {t('outreach.collect')}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">{t('outreach.inviteLanguageHint')}</p>
          {collecting && (
            <p className="text-sm text-muted-foreground">
              {progress && progress.created > 0
                ? t('outreach.collectingProgress', { created: progress.created, target: progress.target })
                : t('outreach.collecting')}
            </p>
          )}

          {results && (
            <div className="space-y-2 pt-2">
              <p className="text-sm font-medium">{t('outreach.collectDone', { created: created.length, total: results.length })}</p>
              {stoppedEarly && (
                <p className="text-sm text-amber-600 dark:text-amber-500">{t('outreach.collectStoppedEarly')}</p>
              )}
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
                          ? t('outreach.createdSummary', { treatments: r.treatments, images: r.images, doctors: r.doctors ?? 0, beforeAfter: r.beforeAfter ?? 0, languages: r.languages ?? 0, videos: r.videos ?? 0 })
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
                      <Button size="sm" variant="outline" onClick={() => copy(r.previewToken, r.inviteLocale ?? inviteLocale)}>
                        <Copy className="w-3.5 h-3.5 mr-1" /> {t('outreach.copyLink')}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => window.open(inviteLink(r.previewToken, r.inviteLocale ?? inviteLocale), '_blank')}>
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
                const approval = approvalOf(d)
                const locale = localeOf(d)
                const left = daysLeft(approval?.expires_at ?? null)
                return (
                  <div key={d.id} className="flex flex-wrap items-center justify-between gap-3 border rounded-lg p-3">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{d.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {approval?.contact_email || d.email || t('outreach.noEmail')}
                        {left !== null && <> · {t('outreach.expiresIn', { count: left })}</>}
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-2">
                      {approval && (
                        <InviteLocaleSelect value={locale} onChange={(v) => changeLocale(approval.id, v)} className="h-9 w-[120px]" />
                      )}
                      {!approval?.preview_token && <Badge variant="secondary">{t('outreach.noLink')}</Badge>}
                      {approval?.preview_token && (
                        <>
                          <Button size="sm" variant="outline" onClick={() => copy(approval.preview_token!, locale)}>
                            <Copy className="w-3.5 h-3.5 mr-1" /> {t('outreach.copyLink')}
                          </Button>
                          <Button size="sm" variant="ghost" onClick={() => window.open(inviteLink(approval.preview_token!, locale), '_blank')}>
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
    </>
  )
}
