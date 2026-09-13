// "Market on WhatsApp": no sending from here. For each draft clinic it lays
// out the personalised message and the number, with a wa.me link that opens
// WhatsApp with the text already typed, so the admin sends it from their own
// phone.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { AlertTriangle, Copy, Loader2, MessageCircle, Phone, Search } from 'lucide-react'
import {
  approvalOf, clinicLabel, fillTemplate, inviteLink, invokeInBatches, loadTemplates, localeOf, saveTemplates,
  type InviteLocale, type OutreachDraft, type TemplateSet,
} from '@/lib/outreach'

interface Props { drafts: OutreachDraft[]; loading: boolean; reload: () => void }

/** "905321234567" -> "+90 532 123 45 67"; other countries just get the plus. */
const formatPhone = (digits: string) =>
  digits.startsWith('90') && digits.length === 12
    ? `+90 ${digits.slice(2, 5)} ${digits.slice(5, 8)} ${digits.slice(8, 10)} ${digits.slice(10)}`
    : `+${digits}`

export default function OutreachWhatsApp({ drafts, loading, reload }: Props) {
  const { t } = useTranslation('admin')
  const { toast } = useToast()

  const [templates, setTemplates] = useState<TemplateSet | null>(null)
  const [editLocale, setEditLocale] = useState<InviteLocale>('tr')
  const [savingTpl, setSavingTpl] = useState(false)
  const [finding, setFinding] = useState<{ done: number; total: number } | null>(null)
  const [manual, setManual] = useState<Record<string, string>>({})

  useEffect(() => { loadTemplates('whatsapp').then(setTemplates) }, [])

  const invitable = useMemo(() => drafts.filter((d) => approvalOf(d)?.preview_token), [drafts])
  const unchecked = invitable.filter((d) => !approvalOf(d)?.contacts_checked_at)

  const copy = async (text: string) => {
    await navigator.clipboard.writeText(text)
    toast({ title: t('outreach.copied') })
  }

  const onSaveTemplates = async () => {
    if (!templates) return
    if (!(['tr', 'en'] as const).every((l) => templates[l].body.includes('{{link}}'))) {
      toast({ title: t('outreach.templateNeedsLink', { link: '{{link}}' }), variant: 'destructive' })
      return
    }
    setSavingTpl(true)
    try {
      await saveTemplates('whatsapp', templates)
      toast({ title: t('outreach.templateSaved') })
    } catch (err: any) {
      toast({ title: t('outreach.updateFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setSavingTpl(false)
    }
  }

  const findNumbers = async () => {
    const ids = unchecked.map((d) => d.id)
    setFinding({ done: 0, total: ids.length })
    try {
      const results = await invokeInBatches<any>('outreach-find-contacts', ids, 5, {}, (done) =>
        setFinding({ done, total: ids.length }))
      toast({ title: t('outreach.contacts.foundNumbers', { count: results.filter((r) => r.whatsapp).length, total: ids.length }) })
    } catch (err: any) {
      toast({ title: t('outreach.contacts.failed'), description: err?.message, variant: 'destructive' })
    } finally {
      setFinding(null)
      reload()
    }
  }

  const saveManualPhone = async (d: OutreachDraft) => {
    let digits = (manual[d.id] ?? '').replace(/\D/g, '')
    if (digits.length === 11 && digits.startsWith('0')) digits = `90${digits.slice(1)}`
    if (digits.length === 10 && digits.startsWith('5')) digits = `90${digits}`
    const approval = approvalOf(d)
    if (!approval || digits.length < 10) return
    const { error } = await (supabase as any).from('clinic_approvals')
      .update({ whatsapp_phone: digits, whatsapp_source: 'manual' }).eq('id', approval.id)
    if (error) {
      toast({ title: t('outreach.updateFailed'), description: error.message, variant: 'destructive' })
      return
    }
    setManual((m) => { const n = { ...m }; delete n[d.id]; return n })
    reload()
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2"><MessageCircle className="w-4 h-4" /> {t('outreach.whatsapp.title')}</CardTitle>
          <p className="text-sm text-muted-foreground">{t('outreach.whatsapp.hint')}</p>
        </CardHeader>
        <CardContent className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_280px]">
          <div className="space-y-3">
            <div className="flex items-center justify-between gap-3">
              <Tabs value={editLocale} onValueChange={(v) => setEditLocale(v as InviteLocale)}>
                <TabsList>
                  <TabsTrigger value="tr">{t('outreach.langTr')}</TabsTrigger>
                  <TabsTrigger value="en">{t('outreach.langEn')}</TabsTrigger>
                </TabsList>
              </Tabs>
              <Button variant="outline" size="sm" onClick={onSaveTemplates} disabled={savingTpl || !templates}>
                {savingTpl && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t('outreach.saveTemplate')}
              </Button>
            </div>
            <Label htmlFor="wa-body" className="sr-only">{t('outreach.whatsapp.templateTitle')}</Label>
            {templates ? (
              <Textarea
                id="wa-body"
                rows={7}
                value={templates[editLocale].body}
                onChange={(e) => setTemplates((tpl) => tpl && { ...tpl, [editLocale]: { subject: '', body: e.target.value } })}
              />
            ) : (
              <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
            )}
            <p className="text-xs text-muted-foreground">{t('outreach.templateHint', { clinic: '{{clinic}}', link: '{{link}}' })}</p>
          </div>

          <div className="space-y-2 rounded-lg border bg-muted/40 p-4 text-sm">
            <p>{t('outreach.whatsapp.unchecked', { count: unchecked.length })}</p>
            <Button className="w-full" disabled={!unchecked.length || !!finding} onClick={findNumbers}>
              {finding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
              {finding ? t('outreach.contacts.finding', finding) : t('outreach.whatsapp.findNumbers')}
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading || !templates ? (
        <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
      ) : invitable.length === 0 ? (
        <p className="text-sm text-muted-foreground">{t('outreach.empty')}</p>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {invitable.map((d) => {
            const a = approvalOf(d)!
            const locale = localeOf(d)
            const message = fillTemplate(templates[locale].body, { clinic: clinicLabel(d), link: inviteLink(a.preview_token!, locale) })
            const digits = a.whatsapp_phone
            return (
              <Card key={d.id}>
                <CardContent className="space-y-3 pt-5">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{clinicLabel(d)}</span>
                    <Badge variant="secondary" className="uppercase text-[10px]">{locale}</Badge>
                  </div>

                  <div className="relative rounded-lg bg-muted/60 p-3 pr-11">
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{message}</p>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="absolute right-1.5 top-1.5 h-8 w-8"
                      onClick={() => copy(message)}
                      aria-label={t('outreach.whatsapp.copyMessage')}
                    >
                      <Copy className="w-4 h-4" />
                    </Button>
                  </div>

                  {digits ? (
                    <div className="space-y-2">
                      <div className="flex flex-wrap items-center gap-2 text-sm">
                        <Phone className="w-4 h-4 text-muted-foreground" />
                        <span className="font-medium tabular-nums">{formatPhone(digits)}</span>
                        {a.whatsapp_source === 'website' && (
                          <span className="text-xs text-muted-foreground">· {t('outreach.whatsapp.fromWebsite')}</span>
                        )}
                      </div>
                      {a.whatsapp_source === 'phone_landline' && (
                        <p className="flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5" /> {t('outreach.whatsapp.landline')}
                        </p>
                      )}
                      <div className="flex flex-wrap gap-2">
                        <Button size="sm" asChild>
                          <a href={`https://wa.me/${digits}?text=${encodeURIComponent(message)}`} target="_blank" rel="noopener noreferrer">
                            <MessageCircle className="w-4 h-4 mr-1.5" /> {t('outreach.whatsapp.open')}
                          </a>
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copy(message)}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> {t('outreach.whatsapp.copyMessage')}
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => copy(`+${digits}`)}>
                          <Copy className="w-3.5 h-3.5 mr-1.5" /> {t('outreach.whatsapp.copyNumber')}
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-xs text-muted-foreground">
                        {a.contacts_checked_at ? t('outreach.whatsapp.noNumber') : t('outreach.contacts.notChecked')}
                      </p>
                      <div className="flex gap-2">
                        <Input
                          className="h-8 text-sm"
                          inputMode="tel"
                          placeholder={t('outreach.contacts.manualPhone')}
                          value={manual[d.id] ?? ''}
                          onChange={(e) => setManual((m) => ({ ...m, [d.id]: e.target.value }))}
                        />
                        <Button size="sm" variant="outline" className="h-8" onClick={() => saveManualPhone(d)}>
                          {t('outreach.contacts.save')}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}
    </div>
  )
}
