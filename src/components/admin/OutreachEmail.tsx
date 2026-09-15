// "Mail the clinics": pick drafts, find their addresses on their own websites,
// check the personalised mail, send them all with one button.
//
// Two lists, never one: clinics that have not been written to yet, and clinics
// that were. Collecting a fresh listing drops new drafts straight into the
// first list, so a new batch can be mailed without picking it back out of
// everyone contacted last month. The second list is the opposite — everyone
// there has already had the invitation, so the only thing that can be sent is
// the reminder, and that one can go as many times as it takes.
import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '@/integrations/supabase/client'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { CheckCircle2, Loader2, Mail, Search, Send, AlertTriangle, BellRing, Trash2 } from 'lucide-react'
import {
  approvalOf, clinicLabel, fillTemplate, inviteLink, invokeInBatches, loadTemplates, localeOf, saveTemplates,
  type InviteLocale, type OutreachChannel, type OutreachDraft, type TemplateSet,
} from '@/lib/outreach'

interface Props { drafts: OutreachDraft[]; loading: boolean; reload: () => void }

/** Which half of the outreach list is on screen. */
type View = 'new' | 'sent'

const CHANNEL: Record<View, OutreachChannel> = { new: 'email', sent: 'email_reminder' }

export default function OutreachEmail({ drafts, loading, reload }: Props) {
  const { t, i18n } = useTranslation('admin')
  const { toast } = useToast()

  const [view, setView] = useState<View>('new')
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [templates, setTemplates] = useState<Record<View, TemplateSet | null>>({ new: null, sent: null })
  const [editLocale, setEditLocale] = useState<InviteLocale>('tr')
  const [savingTpl, setSavingTpl] = useState(false)
  const [finding, setFinding] = useState<{ done: number; total: number } | null>(null)
  const [sending, setSending] = useState<{ done: number; total: number } | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [manual, setManual] = useState<Record<string, string>>({})

  useEffect(() => {
    loadTemplates('email').then((tpl) => setTemplates((s) => ({ ...s, new: tpl })))
    loadTemplates('email_reminder').then((tpl) => setTemplates((s) => ({ ...s, sent: tpl })))
  }, [])

  // Only drafts that can still be answered have a link worth mailing.
  const invitable = useMemo(() => drafts.filter((d) => approvalOf(d)?.preview_token), [drafts])
  const [fresh, contacted] = useMemo(() => [
    invitable.filter((d) => !approvalOf(d)?.invite_sent_at),
    invitable.filter((d) => approvalOf(d)?.invite_sent_at),
  ], [invitable])

  const pool = view === 'new' ? fresh : contacted
  const template = templates[view]
  const emailOf = (d: OutreachDraft) => approvalOf(d)?.contact_email || d.email
  const chosen = pool.filter((d) => selected.has(d.id))
  const ready = chosen.filter((d) => emailOf(d))
  const busy = !!finding || !!sending || deleting

  const switchView = (next: View) => { setView(next); setSelected(new Set()) }
  const toggle = (id: string, on: boolean) =>
    setSelected((s) => { const n = new Set(s); on ? n.add(id) : n.delete(id); return n })
  const allOn = pool.length > 0 && pool.every((d) => selected.has(d.id))

  const setTpl = (field: 'subject' | 'body', value: string) =>
    setTemplates((all) => {
      const current = all[view]
      if (!current) return all
      return { ...all, [view]: { ...current, [editLocale]: { ...current[editLocale], [field]: value } } }
    })

  const templatesValid = (tpl: TemplateSet) =>
    (['tr', 'en'] as const).every((l) => tpl[l].subject.trim() && tpl[l].body.includes('{{link}}'))

  const persistTemplates = async () => {
    if (!template) return false
    if (!templatesValid(template)) {
      toast({ title: t('outreach.templateNeedsLink', { link: '{{link}}' }), variant: 'destructive' })
      return false
    }
    await saveTemplates(CHANNEL[view], template)
    return true
  }

  const onSaveTemplates = async () => {
    setSavingTpl(true)
    try {
      if (await persistTemplates()) toast({ title: t('outreach.templateSaved') })
    } catch (err: any) {
      toast({ title: t('outreach.updateFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setSavingTpl(false)
    }
  }

  const findContacts = async () => {
    const ids = chosen.map((d) => d.id)
    setFinding({ done: 0, total: ids.length })
    try {
      const results = await invokeInBatches<any>('outreach-find-contacts', ids, 5, {}, (done) =>
        setFinding({ done, total: ids.length }))
      toast({ title: t('outreach.contacts.foundEmails', { count: results.filter((r) => r.email).length, total: ids.length }) })
    } catch (err: any) {
      toast({ title: t('outreach.contacts.failed'), description: err?.message, variant: 'destructive' })
    } finally {
      setFinding(null)
      reload()
    }
  }

  const send = async () => {
    if (!ready.length || !template) return
    const confirmKey = view === 'new' ? 'outreach.email.sendConfirm' : 'outreach.email.reminderConfirm'
    if (!window.confirm(t(confirmKey, { count: ready.length }))) return
    const ids = ready.map((d) => d.id)
    setSending({ done: 0, total: ids.length })
    try {
      // Saved first, so what went out is what the panel shows next time.
      if (!(await persistTemplates())) return
      const results = await invokeInBatches<any>(
        'outreach-send-invites', ids, 5,
        { templates: template, mode: view === 'new' ? 'invite' : 'reminder' },
        (done) => setSending({ done, total: ids.length }),
      )
      const sent = results.filter((r) => r.status === 'sent').length
      const failed = results.filter((r) => r.status === 'failed').length
      toast({
        title: t(view === 'new' ? 'outreach.email.sentSummary' : 'outreach.email.remindedSummary', { sent, total: ids.length }),
        description: failed ? t('outreach.email.someFailed', { count: failed }) : undefined,
        variant: failed ? 'destructive' : undefined,
      })
      setSelected(new Set())
    } catch (err: any) {
      toast({ title: t('outreach.email.sendFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setSending(null)
      reload()
    }
  }

  // For the clinics we decide not to approach at all. This is the same purge
  // rejection runs, plus the suppression tombstone, so they do not reappear in
  // the next listing run.
  const remove = async () => {
    if (!chosen.length) return
    if (!window.confirm(t('outreach.email.deleteConfirm', { count: chosen.length }))) return
    setDeleting(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-clinics', {
        body: { clinicIds: chosen.map((d) => d.id), suppress: true },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      toast({ title: t('outreach.email.deleted', { count: data?.deletedClinics ?? chosen.length }) })
      setSelected(new Set())
    } catch (err: any) {
      toast({ title: t('outreach.email.deleteFailed'), description: err?.message, variant: 'destructive' })
    } finally {
      setDeleting(false)
      reload()
    }
  }

  const saveManualEmail = async (d: OutreachDraft) => {
    const email = (manual[d.id] ?? '').trim().toLowerCase()
    const approval = approvalOf(d)
    if (!approval || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return
    const { error } = await (supabase as any).from('clinic_approvals')
      .update({ contact_email: email, contact_email_source: 'manual' }).eq('id', approval.id)
    if (error) {
      toast({ title: t('outreach.updateFailed'), description: error.message, variant: 'destructive' })
      return
    }
    if (!d.email) await supabase.from('clinics').update({ email }).eq('id', d.id)
    setManual((m) => { const n = { ...m }; delete n[d.id]; return n })
    reload()
  }

  const previewDraft = chosen.find((d) => localeOf(d) === editLocale) ?? pool.find((d) => localeOf(d) === editLocale)
  const previewVars = previewDraft
    ? { clinic: clinicLabel(previewDraft), link: inviteLink(approvalOf(previewDraft)!.preview_token!, editLocale) }
    : null

  const statusLine = (d: OutreachDraft) => {
    const a = approvalOf(d)
    const email = emailOf(d)
    if (a?.invite_sent_at) {
      const reminders = a.invite_reminder_count ?? 0
      return (
        <span className="inline-flex flex-wrap items-center gap-x-1 gap-y-0.5 text-medical-green">
          <CheckCircle2 className="w-3.5 h-3.5" />
          {t('outreach.email.sentAt', { email, date: new Date(a.invite_sent_at).toLocaleDateString(i18n.language) })}
          {reminders > 0 && (
            <span className="text-muted-foreground">
              · {t('outreach.email.remindedTimes', {
                count: reminders,
                date: a.invite_reminder_sent_at
                  ? new Date(a.invite_reminder_sent_at).toLocaleDateString(i18n.language)
                  : '',
              })}
            </span>
          )}
        </span>
      )
    }
    if (email) {
      const source = a?.contact_email_source ?? 'existing'
      return <span>{email} · {t(`outreach.contacts.source.${source}`, { defaultValue: '' })}</span>
    }
    return <span>{a?.contacts_checked_at ? t('outreach.contacts.notFound') : t('outreach.contacts.notChecked')}</span>
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
      <Card>
        <CardHeader className="space-y-3">
          <div>
            <CardTitle className="text-base flex items-center gap-2"><Mail className="w-4 h-4" /> {t('outreach.email.title')}</CardTitle>
            <p className="text-sm text-muted-foreground mt-1">
              {view === 'new' ? t('outreach.email.hint') : t('outreach.email.reminderHint')}
            </p>
          </div>
          <Tabs value={view} onValueChange={(v) => switchView(v as View)}>
            <TabsList>
              <TabsTrigger value="new">{t('outreach.email.tabNew', { count: fresh.length })}</TabsTrigger>
              <TabsTrigger value="sent">{t('outreach.email.tabSent', { count: contacted.length })}</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={allOn}
                onCheckedChange={(v) => setSelected(v ? new Set(pool.map((d) => d.id)) : new Set())}
                aria-label={t('outreach.selectAll')}
              />
              {t('outreach.selectAll')}
            </label>
            <span className="text-sm text-muted-foreground">{t('outreach.selectedCount', { count: chosen.length })}</span>
            <div className="flex-1" />
            <Button variant="destructive" size="sm" disabled={!chosen.length || busy} onClick={remove}>
              {deleting ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Trash2 className="w-4 h-4 mr-1.5" />}
              {t('outreach.email.deleteSelected', { count: chosen.length })}
            </Button>
            {view === 'new' && (
              <Button variant="outline" size="sm" disabled={!chosen.length || busy} onClick={findContacts}>
                {finding ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" /> : <Search className="w-4 h-4 mr-1.5" />}
                {finding ? t('outreach.contacts.finding', finding) : t('outreach.contacts.find')}
              </Button>
            )}
            <Button size="sm" disabled={!ready.length || busy || !template} onClick={send}>
              {sending
                ? <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />
                : view === 'new' ? <Send className="w-4 h-4 mr-1.5" /> : <BellRing className="w-4 h-4 mr-1.5" />}
              {sending
                ? t('outreach.email.sending', sending)
                : t(view === 'new' ? 'outreach.email.send' : 'outreach.email.sendReminder', { count: ready.length })}
            </Button>
          </div>

          {loading ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : pool.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              {t(view === 'new' ? 'outreach.email.emptyNew' : 'outreach.email.emptySent')}
            </p>
          ) : (
            <div className="divide-y rounded-lg border">
              {pool.map((d) => {
                const a = approvalOf(d)
                const needsManual = !emailOf(d) && a?.contacts_checked_at
                return (
                  <div key={d.id} className="flex items-start gap-3 p-3">
                    <Checkbox
                      className="mt-0.5"
                      checked={selected.has(d.id)}
                      onCheckedChange={(v) => toggle(d.id, !!v)}
                      aria-label={clinicLabel(d)}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium truncate">{clinicLabel(d)}</span>
                        <Badge variant="secondary" className="uppercase text-[10px]">{localeOf(d)}</Badge>
                      </div>
                      <div className="text-xs text-muted-foreground truncate">{statusLine(d)}</div>
                      {a?.invite_send_error && !a.invite_sent_at && (
                        <div className="mt-1 flex items-center gap-1 text-xs text-destructive">
                          <AlertTriangle className="w-3.5 h-3.5" /> {a.invite_send_error}
                        </div>
                      )}
                      {needsManual && (
                        <div className="mt-2 flex gap-2">
                          <Input
                            type="email"
                            className="h-8 text-sm"
                            placeholder={t('outreach.contacts.manualEmail')}
                            value={manual[d.id] ?? ''}
                            onChange={(e) => setManual((m) => ({ ...m, [d.id]: e.target.value }))}
                          />
                          <Button size="sm" variant="outline" className="h-8" onClick={() => saveManualEmail(d)}>
                            {t('outreach.contacts.save')}
                          </Button>
                        </div>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">
            {t(view === 'new' ? 'outreach.email.templateTitle' : 'outreach.email.reminderTemplateTitle')}
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            {t('outreach.templateHint', { clinic: '{{clinic}}', link: '{{link}}' })}
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <Tabs value={editLocale} onValueChange={(v) => setEditLocale(v as InviteLocale)}>
            <TabsList>
              <TabsTrigger value="tr">{t('outreach.langTr')}</TabsTrigger>
              <TabsTrigger value="en">{t('outreach.langEn')}</TabsTrigger>
            </TabsList>
          </Tabs>

          {!template ? (
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          ) : (
            <>
              <div>
                <Label htmlFor="tpl-subject">{t('outreach.email.subject')}</Label>
                <Input id="tpl-subject" value={template[editLocale].subject} onChange={(e) => setTpl('subject', e.target.value)} />
              </div>
              <div>
                <Label htmlFor="tpl-body">{t('outreach.email.body')}</Label>
                <Textarea id="tpl-body" rows={14} value={template[editLocale].body} onChange={(e) => setTpl('body', e.target.value)} />
              </div>
              <Button variant="outline" size="sm" onClick={onSaveTemplates} disabled={savingTpl}>
                {savingTpl && <Loader2 className="w-4 h-4 mr-1.5 animate-spin" />}
                {t('outreach.saveTemplate')}
              </Button>

              <div className="rounded-lg border bg-muted/40 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
                  {previewVars ? t('outreach.previewFor', { clinic: previewVars.clinic }) : t('outreach.preview')}
                </p>
                {previewVars ? (
                  <>
                    <p className="text-sm font-semibold mb-2">{fillTemplate(template[editLocale].subject, previewVars)}</p>
                    <p className="whitespace-pre-wrap text-sm leading-relaxed">{fillTemplate(template[editLocale].body, previewVars)}</p>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">{t('outreach.previewEmpty')}</p>
                )}
              </div>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
