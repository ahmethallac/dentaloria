import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import {
  Building2, Users, Clock, CheckCircle, XCircle, FileCheck,
  Loader2, DollarSign, LayoutDashboard, UserCog,
  Trash2, RotateCcw, Trash, X, Power, PowerOff, Download, FileSpreadsheet,
  ChevronDown, CalendarIcon,
} from 'lucide-react'
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { Calendar } from '@/components/ui/calendar'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import type { DateRange } from 'react-day-picker'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import AdminShell, { ShellSection } from '@/components/layout/AdminShell'
import UsersManager from '@/components/admin/UsersManager'
import * as XLSX from 'xlsx'
import { withLocalePrefix } from '@/lib/localePath'

type AdminSection = 'dashboard' | 'clinics' | 'approvals' | 'patients' | 'users'

const Admin = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { lang } = useParams()
  const { t } = useTranslation('admin')
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const section = (params.get('section') as AdminSection) || 'dashboard'

  const [clinics, setClinics] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [pendingPageApprovals, setPendingPageApprovals] = useState<any[]>([])
  const [approvalsTab, setApprovalsTab] = useState<'application' | 'page'>('application')
  const [patients, setPatients] = useState<any[]>([])
  const [stats, setStats] = useState({ totalClinics: 0, pendingApprovals: 0, totalPatients: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)

  const isMainAdmin = userRole === 'admin'

  // Trash + bulk-delete state
  const [clinicView, setClinicView] = useState<'active' | 'trash'>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmHardDelete, setConfirmHardDelete] = useState<{ ids: string[]; emptyAll?: boolean } | null>(null)

  // Send-back modal state
  const [sendBackTarget, setSendBackTarget] = useState<{ id: string; name: string } | null>(null)
  const [sendBackNotes, setSendBackNotes] = useState('')
  const [sendBackBusy, setSendBackBusy] = useState(false)

  // Filters (clinics)
  const [countries, setCountries] = useState<{ id: string; name: string }[]>([])
  const [cities, setCities] = useState<{ id: string; name: string; country_id: string }[]>([])
  const [filterSearch, setFilterSearch] = useState('')
  const [filterCountry, setFilterCountry] = useState<string>('all')
  const [filterCity, setFilterCity] = useState<string>('all')
  const [filterStatus, setFilterStatus] = useState<string>('all')
  const [bulkStatus, setBulkStatus] = useState<string>('')

  // Filters (patients)
  const [patientFilterCountry, setPatientFilterCountry] = useState<string>('all')
  const [patientFilterCity, setPatientFilterCity] = useState<string>('all')
  const [patientFilterLanguage, setPatientFilterLanguage] = useState<string>('all')
  const [patientSearch, setPatientSearch] = useState('')
  type DatePreset = 'today' | 'yesterday' | 'last2weeks' | 'lastMonth' | 'thisYear' | 'lastYear' | 'all' | 'custom'
  const [patientDateRange, setPatientDateRange] = useState<DatePreset>('all')
  const [patientCustomRange, setPatientCustomRange] = useState<DateRange | undefined>(undefined)
  const [selectedPatients, setSelectedPatients] = useState<Set<string>>(new Set())

  useEffect(() => {
    if (!authLoading && (!user || userRole !== 'admin')) {
      navigate(withLocalePrefix('/', lang))
      return
    }
    if (user && userRole === 'admin') {
      loadAllData()
    }
  }, [user, userRole, authLoading])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [clinicsRes, approvalsRes, pageApprovalsRes, leadsRes, purchasesRes, countriesRes, citiesRes] = await Promise.all([
        supabase.from('clinics').select('*, clinic_approvals(*), cities(id, name, country_id, countries(id, name))').order('created_at', { ascending: false }),
        supabase.from('clinic_approvals').select('*, clinics(name, email, phone, website, created_at, cities(name, countries(name)))').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('clinics')
          .select('id, name, email, phone, website, page_status, updated_at, cities(name, countries(name))')
          .eq('approval_status', 'approved')
          .eq('page_status', 'pending_page_approval')
          .is('deleted_at', null)
          .order('updated_at', { ascending: false }),
        supabase.from('contact_requests')
          .select('*, clinics(id, name, display_name, languages, cities(id, name, countries(id, name)))', { count: 'exact' })
          .order('created_at', { ascending: false }).limit(2000),
        supabase.from('lead_purchases').select('amount_cents'),
        supabase.from('countries').select('id, name').order('name'),
        supabase.from('cities').select('id, name, country_id').order('name'),
      ])
      setCountries(countriesRes.data || [])
      setCities(citiesRes.data || [])

      const totalRevenue = (purchasesRes.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)
      setClinics(clinicsRes.data || [])
      setPendingApprovals(approvalsRes.data || [])
      setPendingPageApprovals(pageApprovalsRes.data || [])

      const leadsData = leadsRes.data || []
      // Group submissions by patient email and keep the per-clinic context
      // so we can filter patients by city/country/language of the clinics they applied to.
      const patientMap = new Map<string, {
        name: string; email: string; phone: string | null; count: number; lastDate: string;
        dates: string[];
        clinicNames: Set<string>;
        cityIds: Set<string>;
        countryIds: Set<string>;
        languages: Set<string>;
        cityNames: Set<string>;
        countryNames: Set<string>;
      }>()
      leadsData.forEach((l: any) => {
        const c = l.clinics || {}
        const cityId = c.cities?.id
        const cityName = c.cities?.name
        const countryId = c.cities?.countries?.id
        const countryName = c.cities?.countries?.name
        const langs: string[] = Array.isArray(c.languages) ? c.languages : []
        const clinicLabel = c.display_name || c.name
        const existing = patientMap.get(l.email)
        if (existing) {
          existing.count++
          existing.dates.push(l.created_at)
          if (l.created_at > existing.lastDate) { existing.lastDate = l.created_at; existing.name = l.name }
          if (clinicLabel) existing.clinicNames.add(clinicLabel)
          if (cityId) existing.cityIds.add(cityId)
          if (cityName) existing.cityNames.add(cityName)
          if (countryId) existing.countryIds.add(countryId)
          if (countryName) existing.countryNames.add(countryName)
          langs.forEach(x => existing.languages.add(x))
        } else {
          patientMap.set(l.email, {
            name: l.name, email: l.email, phone: l.phone, count: 1, lastDate: l.created_at,
            dates: [l.created_at],
            clinicNames: new Set(clinicLabel ? [clinicLabel] : []),
            cityIds: new Set(cityId ? [cityId] : []),
            cityNames: new Set(cityName ? [cityName] : []),
            countryIds: new Set(countryId ? [countryId] : []),
            countryNames: new Set(countryName ? [countryName] : []),
            languages: new Set(langs),
          })
        }
      })
      setPatients(Array.from(patientMap.values()).sort((a, b) => b.count - a.count))

      setStats({
        totalClinics: clinicsRes.data?.length || 0,
        pendingApprovals: (approvalsRes.data?.length || 0) + (pageApprovalsRes.data?.length || 0),
        totalPatients: patientMap.size,
        totalRevenue: totalRevenue / 100,
      })
    } catch (e: any) {
      console.error('Error loading admin data:', e)
      toast({ title: t('toasts.errorTitle'), description: t('toasts.loadErrorDesc'), variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleApproval = async (clinicId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      // On application approval the clinic becomes approved + published, but the public page only goes live
      // once page_status is set to 'live' (via the Page Approvals tab).
      const clinicUpdate: any = { approval_status: newStatus, is_published: action === 'approve' }
      if (action === 'approve') clinicUpdate.page_status = 'incomplete'
      await Promise.all([
        supabase.from('clinic_approvals').update({
          status: newStatus, rejection_reason: reason,
          reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
        }).eq('clinic_id', clinicId),
        supabase.from('clinics').update(clinicUpdate).eq('id', clinicId),
      ])
      toast({ title: t('toasts.successTitle'), description: t('toasts.applicationStatusDesc', { status: newStatus }) })
      loadAllData()
      supabase.functions.invoke('send-clinic-notification', {
        body: {
          type: action === 'approve' ? 'application_approved' : 'application_rejected',
          clinicId,
          rejectionReason: reason,
        },
      }).catch(() => {})
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    }
  }

  const handlePageApproval = async (clinicId: string, action: 'approve' | 'reject', notes?: string) => {
    try {
      const update: any = action === 'approve'
        ? { page_status: 'live', page_revision_notes: null }
        : { page_status: 'incomplete', page_revision_notes: notes || null }
      const { error } = await supabase
        .from('clinics')
        .update(update)
        .eq('id', clinicId)
      if (error) throw error
      toast({
        title: action === 'approve' ? t('toasts.pageApprovedTitle') : t('toasts.sentBackTitle'),
        description: action === 'approve' ? t('toasts.pageApprovedDesc') : t('toasts.sentBackDesc'),
      })
      loadAllData()
      supabase.functions.invoke('send-clinic-notification', {
        body: {
          type: action === 'approve' ? 'page_approved' : 'page_rejected',
          clinicId,
          revisionNotes: notes,
        },
      }).catch(() => {})
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    }
  }

  const submitSendBack = async () => {
    if (!sendBackTarget) return
    if (!sendBackNotes.trim()) {
      toast({ title: t('toasts.requiredTitle'), description: t('toasts.requiredDesc'), variant: 'destructive' })
      return
    }
    setSendBackBusy(true)
    try {
      await handlePageApproval(sendBackTarget.id, 'reject', sendBackNotes.trim())
      setSendBackTarget(null)
      setSendBackNotes('')
    } finally {
      setSendBackBusy(false)
    }
  }

  const openDocument = async (path: string | null | undefined) => {
    if (!path) return
    // Open the tab synchronously so the browser keeps the user-gesture context
    // (otherwise the second click in a row often gets popup-blocked).
    const win = window.open('about:blank', '_blank')
    try {
      const { data, error } = await supabase.storage
        .from('clinic-documents')
        .createSignedUrl(path, 60 * 10) // 10 minutes
      if (error || !data?.signedUrl) throw error || new Error('Could not create signed URL')
      if (win) {
        win.location.href = data.signedUrl
      } else {
        // Popup blocked — fall back to same-tab navigation
        window.location.href = data.signedUrl
      }
    } catch (e: any) {
      try { win?.close() } catch (_) { /* noop */ }
      toast({ title: t('toasts.errorTitle'), description: e.message || t('toasts.documentErrorDesc'), variant: 'destructive' })
    }
  }

  // ---- Trash actions ----
  const trashClinics = async (ids: string[]) => {
    if (!ids.length) return
    setBulkBusy(true)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ deleted_at: new Date().toISOString(), deleted_by: user?.id, is_published: false })
        .in('id', ids)
      if (error) throw error
      toast({ title: t('toasts.movedToTrashTitle'), description: t('toasts.movedToTrashDesc', { count: ids.length }) })
      setSelectedIds(new Set())
      loadAllData()
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  const restoreClinics = async (ids: string[]) => {
    if (!ids.length) return
    setBulkBusy(true)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ deleted_at: null, deleted_by: null })
        .in('id', ids)
      if (error) throw error
      toast({ title: t('toasts.restoredTitle'), description: t('toasts.restoredDesc', { count: ids.length }) })
      setSelectedIds(new Set())
      loadAllData()
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  const hardDeleteClinics = async (ids: string[]) => {
    if (!ids.length) return
    setBulkBusy(true)
    try {
      const { data, error } = await supabase.functions.invoke('admin-delete-clinics', {
        body: { clinicIds: ids },
      })
      if (error) throw error
      if (data?.error) throw new Error(data.error)
      const errs = (data?.errors as string[] | undefined) || []
      toast({
        title: t('toasts.permanentlyDeletedTitle'),
        description: t('toasts.permanentlyDeletedDesc', { clinics: data?.deletedClinics ?? ids.length, images: data?.deletedImages ?? 0, docs: data?.deletedDocs ?? 0 })
          + (errs.length ? t('toasts.warningsLabel', { warnings: errs.join('; ') }) : ''),
      })
      setSelectedIds(new Set())
      setConfirmHardDelete(null)
      loadAllData()
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  // Bulk activate / deactivate. "Active" maps to is_published = true.
  const setClinicsActive = async (ids: string[], active: boolean) => {
    if (!ids.length) return
    setBulkBusy(true)
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ is_published: active })
        .in('id', ids)
      if (error) throw error
      toast({
        title: active ? t('toasts.activatedTitle') : t('toasts.deactivatedTitle'),
        description: t('toasts.statusDesc', { count: ids.length, status: active ? t('toasts.statusActive') : t('toasts.statusInactive') }),
      })
      setSelectedIds(new Set())
      setBulkStatus('')
      loadAllData()
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' })
    } finally {
      setBulkBusy(false)
    }
  }

  if (authLoading || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    )
  }

  if (userRole !== 'admin') return null

  const setSection = (s: AdminSection) => setParams({ section: s })

  const sections: ShellSection[] = [
    {
      label: t('sidebar.workspaceGroup'),
      items: [
        { id: 'dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, onClick: () => setSection('dashboard'), active: section === 'dashboard' },
        { id: 'clinics', label: t('sidebar.clinics'), icon: Building2, onClick: () => setSection('clinics'), active: section === 'clinics', badge: stats.totalClinics },
        { id: 'approvals', label: t('sidebar.approvals'), icon: Clock, onClick: () => setSection('approvals'), active: section === 'approvals', badge: stats.pendingApprovals },
        { id: 'patients', label: t('sidebar.patients'), icon: Users, onClick: () => setSection('patients'), active: section === 'patients', badge: stats.totalPatients },
      ],
    },
    {
      label: t('sidebar.administrationGroup'),
      items: [
        { id: 'users', label: t('sidebar.users'), icon: UserCog, onClick: () => setSection('users'), active: section === 'users', hidden: !isMainAdmin },
      ],
    },
  ]

  const titles: Record<AdminSection, string> = {
    dashboard: t('titles.dashboard'),
    clinics: t('titles.clinics'),
    approvals: t('titles.approvals'),
    patients: t('titles.patients'),
    users: t('titles.users'),
  }

  return (
    <AdminShell
      sections={sections}
      title={titles[section]}
      breadcrumbs={[{ label: t('breadcrumbs.admin'), to: withLocalePrefix('/admin', lang) }, { label: titles[section] }]}
    >
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label={t('dashboard.totalClinics')} value={stats.totalClinics} accent="text-primary" />
            <StatCard icon={Clock} label={t('dashboard.pendingApprovals')} value={stats.pendingApprovals} accent="text-yellow-500" />
            <StatCard icon={Users} label={t('dashboard.totalPatients')} value={stats.totalPatients} accent="text-blue-500" />
            <StatCard icon={DollarSign} label={t('dashboard.revenue')} value={`$${stats.totalRevenue.toFixed(2)}`} accent="text-green-500" />
          </div>
          <Card>
            <CardHeader><CardTitle>{t('dashboard.recentClinics')}</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {clinics.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">{c.display_name || c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(withLocalePrefix(`/clinic/${c.id}/panel`, lang))}>{t('dashboard.manage')}</Button>
                </div>
              ))}
              {clinics.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">{t('dashboard.noClinics')}</p>}
            </CardContent>
          </Card>
        </div>
      )}

      {section === 'clinics' && (() => {
        const activeClinics = clinics.filter(c => !c.deleted_at)
        const trashedClinics = clinics.filter(c => !!c.deleted_at)
        const baseList = clinicView === 'active' ? activeClinics : trashedClinics

        // Apply filters
        const search = filterSearch.trim().toLowerCase()
        const list = baseList.filter(c => {
          if (search) {
            const haystack = `${c.display_name || ''} ${c.name || ''} ${c.email || ''}`.toLowerCase()
            if (!haystack.includes(search)) return false
          }
          if (filterCountry !== 'all' && c.cities?.country_id !== filterCountry) return false
          if (filterCity !== 'all' && c.city_id !== filterCity) return false
          if (filterStatus !== 'all' && c.approval_status !== filterStatus) return false
          return true
        })

        const visibleCities = filterCountry === 'all'
          ? cities
          : cities.filter(ci => ci.country_id === filterCountry)
        const filtersActive = !!search || filterCountry !== 'all' || filterCity !== 'all' || filterStatus !== 'all'

        const allSelected = list.length > 0 && list.every(c => selectedIds.has(c.id))
        const someSelected = selectedIds.size > 0
        const toggleAll = () => {
          if (allSelected) setSelectedIds(new Set())
          else setSelectedIds(new Set(list.map(c => c.id)))
        }
        const toggleOne = (id: string) => {
          const next = new Set(selectedIds)
          if (next.has(id)) next.delete(id)
          else next.add(id)
          setSelectedIds(next)
        }
        const selectedArray = Array.from(selectedIds).filter(id => list.some(c => c.id === id))

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>{t('clinics.title')}</CardTitle>
                <CardDescription className="mt-1">
                  {clinicView === 'active'
                    ? t('clinics.activeDesc')
                    : t('clinics.trashDesc')}
                </CardDescription>
              </div>
              <div className="inline-flex rounded-md border p-1 bg-muted">
                <Button
                  variant={clinicView === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setClinicView('active'); setSelectedIds(new Set()) }}
                >
                  {t('clinics.activeTab', { count: activeClinics.length })}
                </Button>
                <Button
                  variant={clinicView === 'trash' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setClinicView('trash'); setSelectedIds(new Set()) }}
                >
                  <Trash className="w-3.5 h-3.5 mr-1" /> {t('clinics.trashTab', { count: trashedClinics.length })}
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                <Input
                  placeholder={t('clinics.searchPlaceholder')}
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="lg:col-span-2"
                />
                <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterCity('all') }}>
                  <SelectTrigger><SelectValue placeholder={t('clinics.countryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('clinics.allCountries')}</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity} disabled={filterCountry === 'all'}>
                  <SelectTrigger><SelectValue placeholder={filterCountry === 'all' ? t('clinics.pickCountryFirst') : t('clinics.cityPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('clinics.allCities')}</SelectItem>
                    {visibleCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder={t('clinics.statusPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('clinics.allStatuses')}</SelectItem>
                    <SelectItem value="pending">{t('clinics.statusPending')}</SelectItem>
                    <SelectItem value="approved">{t('clinics.statusApproved')}</SelectItem>
                    <SelectItem value="rejected">{t('clinics.statusRejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtersActive && (
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                  <span>{t('clinics.showingOf', { shown: list.length, total: baseList.length })}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilterSearch(''); setFilterCountry('all'); setFilterCity('all'); setFilterStatus('all') }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> {t('clinics.clearFilters')}
                  </Button>
                </div>
              )}

              {/* Bulk action bar */}
              {(someSelected || clinicView === 'trash') && (
                <div className="flex items-center justify-between gap-3 mb-3 p-2 rounded-md border bg-muted/30 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span>{t('clinics.selectedOf', { selected: selectedArray.length, total: list.length })}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {clinicView === 'active' ? (
                      <>
                        <Select
                          value={bulkStatus}
                          onValueChange={(v) => {
                            setBulkStatus(v)
                            if (!selectedArray.length) return
                            setClinicsActive(selectedArray, v === 'active')
                          }}
                          disabled={!selectedArray.length || bulkBusy}
                        >
                          <SelectTrigger className="h-9 w-[180px]">
                            <SelectValue placeholder={t('clinics.setStatusPlaceholder')} />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <span className="inline-flex items-center gap-2"><Power className="w-3.5 h-3.5 text-green-600" /> {t('clinics.activeOption')}</span>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <span className="inline-flex items-center gap-2"><PowerOff className="w-3.5 h-3.5 text-muted-foreground" /> {t('clinics.inactiveOption')}</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!selectedArray.length || bulkBusy}
                          onClick={() => trashClinics(selectedArray)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> {t('clinics.moveToTrashCount', { count: selectedArray.length })}
                        </Button>
                      </>
                    ) : (
                      <>
                        <Button
                          size="sm"
                          variant="outline"
                          disabled={!selectedArray.length || bulkBusy}
                          onClick={() => restoreClinics(selectedArray)}
                        >
                          <RotateCcw className="w-4 h-4 mr-1" /> {t('clinics.restoreCount', { count: selectedArray.length })}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!selectedArray.length || bulkBusy}
                          onClick={() => setConfirmHardDelete({ ids: selectedArray })}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> {t('clinics.deletePermanently')}
                        </Button>
                        {trashedClinics.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={bulkBusy}
                            onClick={() => setConfirmHardDelete({ ids: trashedClinics.map(c => c.id), emptyAll: true })}
                          >
                            {t('clinics.emptyTrash')}
                          </Button>
                        )}
                      </>
                    )}
                  </div>
                </div>
              )}

              <div className="space-y-3">
                {list.map(clinic => (
                  <div
                    key={clinic.id}
                    className={`p-4 border rounded-lg flex items-center justify-between gap-3 hover:bg-muted/50 transition-colors ${
                      clinic.deleted_at ? 'opacity-70 bg-muted/20' : ''
                    }`}
                  >
                    <div className="flex items-center gap-3 min-w-0 flex-1">
                      <Checkbox
                        checked={selectedIds.has(clinic.id)}
                        onCheckedChange={() => toggleOne(clinic.id)}
                      />
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h3 className="font-semibold truncate">{clinic.display_name || clinic.name}</h3>
                          {clinic.deleted_at ? (
                            <Badge variant="outline" className="text-destructive border-destructive">{t('clinics.inTrash')}</Badge>
                          ) : (
                            <>
                              {clinic.is_published ? (
                                <Badge className="bg-green-600 text-white hover:bg-green-700">{t('clinics.activeBadge')}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                                  {t('clinics.inactiveBadge')}
                                </Badge>
                              )}
                              {clinic.page_status === 'live' ? (
                                <Badge variant="secondary">{t('clinics.liveBadge')}</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                                  {t('clinics.notLiveBadge')}
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {clinic.email} • {clinic.phone || t('clinics.noPhone')}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {clinic.deleted_at ? (
                        <>
                          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => restoreClinics([clinic.id])}>
                            <RotateCcw className="w-4 h-4 mr-1" /> {t('clinics.restore')}
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            disabled={bulkBusy}
                            onClick={() => setConfirmHardDelete({ ids: [clinic.id] })}
                            title={t('clinics.deletePermanentlyTitle')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => navigate(withLocalePrefix(`/clinic/${clinic.id}/panel`, lang))}>{t('clinics.manage')}</Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            disabled={bulkBusy}
                            onClick={() => trashClinics([clinic.id])}
                            title={t('clinics.moveToTrashTitle')}
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                ))}
                {list.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    {clinicView === 'active' ? t('clinics.noActiveClinics') : t('clinics.trashEmpty')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      <AlertDialog open={!!confirmHardDelete} onOpenChange={(open) => !open && setConfirmHardDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {confirmHardDelete?.emptyAll ? t('hardDeleteDialog.emptyTitle') : t('hardDeleteDialog.deleteTitle')}
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('hardDeleteDialog.description', { count: confirmHardDelete?.ids.length ?? 0 })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>{t('hardDeleteDialog.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmHardDelete && hardDeleteClinics(confirmHardDelete.ids)}
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              {t('hardDeleteDialog.deleteForever')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!sendBackTarget} onOpenChange={(open) => { if (!open) { setSendBackTarget(null); setSendBackNotes('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{t('sendBackDialog.title')}</DialogTitle>
            <DialogDescription>
              {sendBackTarget ? t('sendBackDialog.description', { name: sendBackTarget.name }) : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              rows={6}
              placeholder={t('sendBackDialog.placeholder')}
              value={sendBackNotes}
              onChange={(e) => setSendBackNotes(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendBackTarget(null); setSendBackNotes('') }} disabled={sendBackBusy}>
              {t('sendBackDialog.cancel')}
            </Button>
            <Button variant="destructive" onClick={submitSendBack} disabled={sendBackBusy || !sendBackNotes.trim()}>
              {sendBackBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              {t('sendBackDialog.sendBack')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {section === 'approvals' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>{t('approvals.title')}</CardTitle>
              <CardDescription className="mt-1">
                {t('approvals.description')}
              </CardDescription>
            </div>
            <div className="inline-flex rounded-md border p-1 bg-muted">
              <Button
                variant={approvalsTab === 'application' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApprovalsTab('application')}
              >
                {t('approvals.applicationTab', { count: pendingApprovals.length })}
              </Button>
              <Button
                variant={approvalsTab === 'page' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApprovalsTab('page')}
              >
                {t('approvals.pageTab', { count: pendingPageApprovals.length })}
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {approvalsTab === 'application' && (
              <div className="space-y-4">
                {pendingApprovals.map(approval => {
                  const c = approval.clinics || {}
                  const country = c.cities?.countries?.name
                  const city = c.cities?.name
                  return (
                    <div key={approval.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{c.name || t('approvals.unknownName')}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[country, city].filter(Boolean).join(' • ') || '—'}
                          </p>
                          <div className="text-sm mt-1 space-y-0.5">
                            <p><span className="text-muted-foreground">{t('approvals.emailLabel')}</span> {c.email || '—'}</p>
                            <p><span className="text-muted-foreground">{t('approvals.phoneLabel')}</span> {c.phone || '—'}</p>
                            <p>
                              <span className="text-muted-foreground">{t('approvals.websiteLabel')}</span>{' '}
                              {c.website ? (
                                <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                  {c.website}
                                </a>
                              ) : '—'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            {t('approvals.appliedLabel', { date: new Date(approval.created_at).toLocaleDateString() })}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={() => openDocument(approval.health_tourism_doc_url)} disabled={!approval.health_tourism_doc_url}>
                          <FileCheck className="w-4 h-4 mr-1" /> {t('approvals.healthDoc')}
                        </Button>
                        {approval.applied_as_healthcare_facility ? (
                          <Badge variant="secondary" className="self-center">{t('approvals.healthcareFacilityBadge')}</Badge>
                        ) : approval.tax_certificate_url ? (
                          <Button size="sm" variant="outline" onClick={() => openDocument(approval.tax_certificate_url)}>
                            <FileCheck className="w-4 h-4 mr-1" /> {t('approvals.agencyDoc')}
                          </Button>
                        ) : (
                          <Badge variant="outline" className="self-center">{t('approvals.noAgencyDoc')}</Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(approval.clinic_id, 'approve')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> {t('approvals.approve')}
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          const reason = window.prompt(t('approvals.rejectPrompt'))
                          if (reason) handleApproval(approval.clinic_id, 'reject', reason)
                        }}>
                          <XCircle className="w-4 h-4 mr-1" /> {t('approvals.reject')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {pendingApprovals.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">{t('approvals.noApplications')}</p>
                )}
              </div>
            )}

            {approvalsTab === 'page' && (
              <div className="space-y-4">
                {pendingPageApprovals.map(c => {
                  const country = c.cities?.countries?.name
                  const city = c.cities?.name
                  return (
                    <div key={c.id} className="p-4 border rounded-lg space-y-3">
                      <div className="flex items-start justify-between gap-3 flex-wrap">
                        <div className="min-w-0">
                          <h3 className="font-semibold">{c.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[country, city].filter(Boolean).join(' • ') || '—'}
                          </p>
                          <p className="text-sm"><span className="text-muted-foreground">{t('approvals.emailLabel')}</span> {c.email || '—'}</p>
                        </div>
                        <Badge variant="secondary">{t('approvals.pendingPageBadge')}</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={withLocalePrefix(`/clinic/${c.id}?preview=1`, lang)}>{t('approvals.reviewPage')}</Link>
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handlePageApproval(c.id, 'approve')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> {t('approvals.approveGoLive')}
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSendBackTarget({ id: c.id, name: c.name }); setSendBackNotes('') }}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> {t('approvals.sendBack')}
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {pendingPageApprovals.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">{t('approvals.noPages')}</p>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {section === 'patients' && (() => {
        // Build language options from all clinics
        const languageSet = new Set<string>()
        clinics.forEach(c => (c.languages || []).forEach((l: string) => l && languageSet.add(l)))
        const allLanguages = Array.from(languageSet).sort()

        // Date bounds
        const getDateBounds = (): { from: Date; to: Date } | null => {
          const now = new Date()
          const startOfDay = (d: Date) => { const x = new Date(d); x.setHours(0, 0, 0, 0); return x }
          const endOfDay = (d: Date) => { const x = new Date(d); x.setHours(23, 59, 59, 999); return x }
          switch (patientDateRange) {
            case 'today': return { from: startOfDay(now), to: endOfDay(now) }
            case 'yesterday': {
              const y = new Date(now); y.setDate(y.getDate() - 1)
              return { from: startOfDay(y), to: endOfDay(y) }
            }
            case 'last2weeks': {
              const f = new Date(now); f.setDate(f.getDate() - 14)
              return { from: startOfDay(f), to: endOfDay(now) }
            }
            case 'lastMonth': {
              const f = new Date(now); f.setMonth(f.getMonth() - 1)
              return { from: startOfDay(f), to: endOfDay(now) }
            }
            case 'thisYear': return { from: new Date(now.getFullYear(), 0, 1), to: endOfDay(now) }
            case 'lastYear': {
              const y = now.getFullYear() - 1
              return { from: new Date(y, 0, 1), to: new Date(y, 11, 31, 23, 59, 59, 999) }
            }
            case 'custom': {
              if (!patientCustomRange?.from) return null
              const to = patientCustomRange.to ?? patientCustomRange.from
              return { from: startOfDay(patientCustomRange.from), to: endOfDay(to) }
            }
            default: return null
          }
        }
        const dateBounds = getDateBounds()

        const search = patientSearch.trim().toLowerCase()
        const filtered = patients.filter(p => {
          if (search) {
            const hay = `${p.name || ''} ${p.email || ''} ${p.phone || ''}`.toLowerCase()
            if (!hay.includes(search)) return false
          }
          if (patientFilterCountry !== 'all' && !p.countryIds.has(patientFilterCountry)) return false
          if (patientFilterCity !== 'all' && !p.cityIds.has(patientFilterCity)) return false
          if (patientFilterLanguage !== 'all' && !p.languages.has(patientFilterLanguage)) return false
          if (dateBounds) {
            const fromMs = dateBounds.from.getTime()
            const toMs = dateBounds.to.getTime()
            const hasMatch = (p.dates as string[]).some(d => {
              const t = new Date(d).getTime()
              return t >= fromMs && t <= toMs
            })
            if (!hasMatch) return false
          }
          return true
        })

        const visiblePatientCities = patientFilterCountry === 'all'
          ? cities
          : cities.filter(ci => ci.country_id === patientFilterCountry)

        const filtersActive = !!search
          || patientFilterCountry !== 'all'
          || patientFilterCity !== 'all'
          || patientFilterLanguage !== 'all'
          || patientDateRange !== 'all'

        // Selection helpers — selection is keyed by email
        const filteredEmails = filtered.map(p => p.email)
        const exportTargets = selectedPatients.size > 0
          ? filtered.filter(p => selectedPatients.has(p.email))
          : filtered
        const selectedVisibleCount = filteredEmails.filter(e => selectedPatients.has(e)).length
        const allFilteredSelected = filtered.length > 0 && selectedVisibleCount === filtered.length
        const someFilteredSelected = selectedVisibleCount > 0 && !allFilteredSelected

        const toggleSelectAll = () => {
          const next = new Set(selectedPatients)
          if (allFilteredSelected) {
            filteredEmails.forEach(e => next.delete(e))
          } else {
            filteredEmails.forEach(e => next.add(e))
          }
          setSelectedPatients(next)
        }
        const toggleOne = (email: string) => {
          const next = new Set(selectedPatients)
          if (next.has(email)) next.delete(email); else next.add(email)
          setSelectedPatients(next)
        }

        const buildExportRows = () => exportTargets.map(p => ({
          [t('patients.exportName')]: p.name,
          [t('patients.exportEmail')]: p.email,
          [t('patients.exportPhone')]: p.phone || '',
          [t('patients.exportSubmissions')]: p.count,
          [t('patients.exportLastSubmission')]: new Date(p.lastDate).toISOString().slice(0, 10),
          [t('patients.exportClinics')]: Array.from(p.clinicNames).join('; '),
          [t('patients.exportCities')]: Array.from(p.cityNames).join('; '),
          [t('patients.exportCountries')]: Array.from(p.countryNames).join('; '),
          [t('patients.exportLanguages')]: Array.from(p.languages).join('; '),
        }))

        const downloadCsv = () => {
          const rows = buildExportRows()
          const ws = XLSX.utils.json_to_sheet(rows)
          const csv = XLSX.utils.sheet_to_csv(ws)
          const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
          const url = URL.createObjectURL(blob)
          const a = document.createElement('a')
          a.href = url
          a.download = `patients-${new Date().toISOString().slice(0, 10)}.csv`
          a.click()
          URL.revokeObjectURL(url)
        }

        const downloadXlsx = () => {
          const rows = buildExportRows()
          const ws = XLSX.utils.json_to_sheet(rows)
          const wb = XLSX.utils.book_new()
          XLSX.utils.book_append_sheet(wb, ws, 'Patients')
          XLSX.writeFile(wb, `patients-${new Date().toISOString().slice(0, 10)}.xlsx`)
        }

        const clearAll = () => {
          setPatientSearch('')
          setPatientFilterCountry('all')
          setPatientFilterCity('all')
          setPatientFilterLanguage('all')
          setPatientDateRange('all')
          setPatientCustomRange(undefined)
          setSelectedPatients(new Set())
        }

        const dateLabel: Record<DatePreset, string> = {
          today: t('patients.dateToday'),
          yesterday: t('patients.dateYesterday'),
          last2weeks: t('patients.dateLast2Weeks'),
          lastMonth: t('patients.dateLastMonth'),
          thisYear: t('patients.dateThisYear'),
          lastYear: t('patients.dateLastYear'),
          all: t('patients.dateAllTime'),
          custom: t('patients.dateCustom'),
        }

        const selectionLabel = (() => {
          if (selectedPatients.size === 0) return t('patients.selectionNone')
          if (allFilteredSelected) {
            return filtersActive
              ? t('patients.selectionAllFiltered', { count: filtered.length })
              : t('patients.selectionAllPatients', { count: patients.length })
          }
          return t('patients.selectionPartial', { selected: selectedVisibleCount, total: filtered.length })
        })()

        return (
          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>{t('patients.title')}</CardTitle>
                <CardDescription className="mt-1">
                  {t('patients.description')}
                </CardDescription>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" variant="outline" disabled={!exportTargets.length}>
                    <Download className="w-4 h-4 mr-1" /> {t('patients.export')}
                    <ChevronDown className="w-3.5 h-3.5 ml-1" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end">
                  <DropdownMenuItem onClick={downloadCsv}>
                    <Download className="w-4 h-4 mr-2" /> {t('patients.downloadCsv')}
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={downloadXlsx}>
                    <FileSpreadsheet className="w-4 h-4 mr-2" /> {t('patients.downloadXlsx')}
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                <Input
                  placeholder={t('patients.searchPlaceholder')}
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <Select
                  value={patientFilterCountry}
                  onValueChange={(v) => { setPatientFilterCountry(v); setPatientFilterCity('all') }}
                >
                  <SelectTrigger><SelectValue placeholder={t('patients.countryPlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('patients.allCountries')}</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={patientFilterCity}
                  onValueChange={setPatientFilterCity}
                  disabled={patientFilterCountry === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={patientFilterCountry === 'all' ? t('patients.pickCountryFirst') : t('patients.cityPlaceholder')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('patients.allCities')}</SelectItem>
                    {visiblePatientCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={patientFilterLanguage} onValueChange={setPatientFilterLanguage}>
                  <SelectTrigger><SelectValue placeholder={t('patients.languagePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('patients.allLanguages')}</SelectItem>
                    {allLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={patientDateRange}
                  onValueChange={(v) => {
                    setPatientDateRange(v as DatePreset)
                    if (v !== 'custom') setPatientCustomRange(undefined)
                  }}
                >
                  <SelectTrigger><SelectValue placeholder={t('patients.datePlaceholder')} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="today">{t('patients.dateToday')}</SelectItem>
                    <SelectItem value="yesterday">{t('patients.dateYesterday')}</SelectItem>
                    <SelectItem value="last2weeks">{t('patients.dateLast2Weeks')}</SelectItem>
                    <SelectItem value="lastMonth">{t('patients.dateLastMonth')}</SelectItem>
                    <SelectItem value="thisYear">{t('patients.dateThisYear')}</SelectItem>
                    <SelectItem value="lastYear">{t('patients.dateLastYear')}</SelectItem>
                    <SelectItem value="all">{t('patients.dateAllTime')}</SelectItem>
                    <SelectItem value="custom">{t('patients.dateCustom')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              {patientDateRange === 'custom' && (
                <div className="mb-4">
                  <Popover>
                    <PopoverTrigger asChild>
                      <Button
                        variant="outline"
                        size="sm"
                        className={cn('justify-start text-left font-normal', !patientCustomRange?.from && 'text-muted-foreground')}
                      >
                        <CalendarIcon className="mr-2 h-4 w-4" />
                        {patientCustomRange?.from ? (
                          patientCustomRange.to ? (
                            <>{format(patientCustomRange.from, 'LLL d, yyyy')} – {format(patientCustomRange.to, 'LLL d, yyyy')}</>
                          ) : (
                            format(patientCustomRange.from, 'LLL d, yyyy')
                          )
                        ) : (
                          <span>{t('patients.pickDateRange')}</span>
                        )}
                      </Button>
                    </PopoverTrigger>
                    <PopoverContent className="w-auto p-0" align="start">
                      <Calendar
                        mode="range"
                        defaultMonth={patientCustomRange?.from}
                        selected={patientCustomRange}
                        onSelect={setPatientCustomRange}
                        numberOfMonths={2}
                        className={cn('p-3 pointer-events-auto')}
                      />
                    </PopoverContent>
                  </Popover>
                </div>
              )}

              <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground gap-2 flex-wrap">
                <div className="flex items-center gap-3">
                  <span>{t('patients.showingOf', { shown: filtered.length, total: patients.length })}</span>
                  <span className="font-medium text-foreground">{selectionLabel}</span>
                  <Badge variant="outline" className="font-normal">{dateLabel[patientDateRange]}</Badge>
                </div>
                <Button variant="ghost" size="sm" onClick={clearAll}>
                  <X className="w-3.5 h-3.5 mr-1" /> {t('patients.clear')}
                </Button>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="py-2 px-3 w-8">
                        <Checkbox
                          checked={allFilteredSelected ? true : someFilteredSelected ? 'indeterminate' : false}
                          onCheckedChange={toggleSelectAll}
                          aria-label="Select all"
                        />
                      </th>
                      <th className="text-left py-2 px-3">{t('patients.tableName')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableEmail')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tablePhone')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableSubmissions')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableClinics')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableCities')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableCountries')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableLanguages')}</th>
                      <th className="text-left py-2 px-3">{t('patients.tableLastSubmission')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50 align-top">
                        <td className="py-2 px-3">
                          <Checkbox
                            checked={selectedPatients.has(p.email)}
                            onCheckedChange={() => toggleOne(p.email)}
                            aria-label={`Select ${p.email}`}
                          />
                        </td>
                        <td className="py-2 px-3 font-medium">{p.name}</td>
                        <td className="py-2 px-3">{p.email}</td>
                        <td className="py-2 px-3">{p.phone || '-'}</td>
                        <td className="py-2 px-3"><Badge variant="secondary">{p.count}</Badge></td>
                        <td className="py-2 px-3 text-muted-foreground max-w-[200px] truncate" title={Array.from(p.clinicNames).join(', ')}>
                          {Array.from(p.clinicNames).join(', ') || '-'}
                        </td>
                        <td className="py-2 px-3 text-muted-foreground">{Array.from(p.cityNames).join(', ') || '-'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{Array.from(p.countryNames).join(', ') || '-'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{Array.from(p.languages).join(', ') || '-'}</td>
                        <td className="py-2 px-3 text-muted-foreground">{new Date(p.lastDate).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                {filtered.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">
                    {patients.length === 0 ? t('patients.noPatientsYet') : t('patients.noPatientsMatch')}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {section === 'users' && isMainAdmin && <UsersManager />}
      {section === 'users' && !isMainAdmin && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">{t('users.onlyAdmins')}</CardContent></Card>
      )}
    </AdminShell>
  )
}

function StatCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string | number; accent: string }) {
  return (
    <Card>
      <CardContent className="pt-6 flex items-center gap-3">
        <Icon className={`w-8 h-8 ${accent}`} />
        <div>
          <p className="text-2xl font-bold">{value}</p>
          <p className="text-sm text-muted-foreground">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

export default Admin
