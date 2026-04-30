import { useEffect, useMemo, useState } from 'react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
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

type AdminSection = 'dashboard' | 'clinics' | 'approvals' | 'patients' | 'users'

const Admin = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
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
      navigate('/')
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
      toast({ title: 'Error', description: 'Failed to load admin data', variant: 'destructive' })
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
      toast({ title: 'Success', description: `Clinic application ${newStatus}` })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
        title: action === 'approve' ? 'Page approved' : 'Sent back to clinic',
        description: action === 'approve' ? 'Clinic is now live on the site.' : 'The clinic can edit and re-submit.',
      })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const submitSendBack = async () => {
    if (!sendBackTarget) return
    if (!sendBackNotes.trim()) {
      toast({ title: 'Required', description: 'Please write what needs to be corrected.', variant: 'destructive' })
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
      toast({ title: 'Error', description: e.message || 'Could not open document', variant: 'destructive' })
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
      toast({ title: 'Moved to Trash', description: `${ids.length} clinic(s) trashed.` })
      setSelectedIds(new Set())
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
      toast({ title: 'Restored', description: `${ids.length} clinic(s) restored.` })
      setSelectedIds(new Set())
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
        title: 'Permanently deleted',
        description: `${data?.deletedClinics ?? ids.length} clinic(s), ${data?.deletedImages ?? 0} image(s), ${data?.deletedDocs ?? 0} doc(s) removed.${errs.length ? ` Warnings: ${errs.join('; ')}` : ''}`,
      })
      setSelectedIds(new Set())
      setConfirmHardDelete(null)
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
        title: active ? 'Activated' : 'Deactivated',
        description: `${ids.length} clinic(s) marked as ${active ? 'Active' : 'Inactive'}.`,
      })
      setSelectedIds(new Set())
      setBulkStatus('')
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
      label: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, onClick: () => setSection('dashboard'), active: section === 'dashboard' },
        { id: 'clinics', label: 'Clinics', icon: Building2, onClick: () => setSection('clinics'), active: section === 'clinics', badge: stats.totalClinics },
        { id: 'approvals', label: 'Pending Approvals', icon: Clock, onClick: () => setSection('approvals'), active: section === 'approvals', badge: stats.pendingApprovals },
        { id: 'patients', label: 'All Patients', icon: Users, onClick: () => setSection('patients'), active: section === 'patients', badge: stats.totalPatients },
      ],
    },
    {
      label: 'Administration',
      items: [
        { id: 'users', label: 'Users', icon: UserCog, onClick: () => setSection('users'), active: section === 'users', hidden: !isMainAdmin },
      ],
    },
  ]

  const titles: Record<AdminSection, string> = {
    dashboard: 'Dashboard',
    clinics: 'Clinics',
    approvals: 'Pending Approvals',
    patients: 'All Patients',
    users: 'Users & Roles',
  }

  return (
    <AdminShell
      sections={sections}
      title={titles[section]}
      breadcrumbs={[{ label: 'Admin', to: '/admin' }, { label: titles[section] }]}
    >
      {section === 'dashboard' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <StatCard icon={Building2} label="Total Clinics" value={stats.totalClinics} accent="text-primary" />
            <StatCard icon={Clock} label="Pending Approvals" value={stats.pendingApprovals} accent="text-yellow-500" />
            <StatCard icon={Users} label="Total Patients" value={stats.totalPatients} accent="text-blue-500" />
            <StatCard icon={DollarSign} label="Revenue" value={`$${stats.totalRevenue.toFixed(2)}`} accent="text-green-500" />
          </div>
          <Card>
            <CardHeader><CardTitle>Recent Clinics</CardTitle></CardHeader>
            <CardContent className="space-y-2">
              {clinics.slice(0, 5).map(c => (
                <div key={c.id} className="flex items-center justify-between py-2 border-b last:border-0">
                  <div>
                    <div className="font-medium">{c.display_name || c.name}</div>
                    <div className="text-xs text-muted-foreground">{c.email}</div>
                  </div>
                  <Button size="sm" variant="outline" onClick={() => navigate(`/clinic/${c.id}/panel`)}>Manage</Button>
                </div>
              ))}
              {clinics.length === 0 && <p className="text-sm text-muted-foreground py-4 text-center">No clinics yet.</p>}
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
                <CardTitle>All Clinics</CardTitle>
                <CardDescription className="mt-1">
                  {clinicView === 'active'
                    ? 'Active clinics. Move to Trash to hide them from the public site.'
                    : 'Trashed clinics. Restore them or delete permanently.'}
                </CardDescription>
              </div>
              <div className="inline-flex rounded-md border p-1 bg-muted">
                <Button
                  variant={clinicView === 'active' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setClinicView('active'); setSelectedIds(new Set()) }}
                >
                  Active ({activeClinics.length})
                </Button>
                <Button
                  variant={clinicView === 'trash' ? 'default' : 'ghost'}
                  size="sm"
                  onClick={() => { setClinicView('trash'); setSelectedIds(new Set()) }}
                >
                  <Trash className="w-3.5 h-3.5 mr-1" /> Trash ({trashedClinics.length})
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {/* Filters */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2 mb-4">
                <Input
                  placeholder="Search by name…"
                  value={filterSearch}
                  onChange={(e) => setFilterSearch(e.target.value)}
                  className="lg:col-span-2"
                />
                <Select value={filterCountry} onValueChange={(v) => { setFilterCountry(v); setFilterCity('all') }}>
                  <SelectTrigger><SelectValue placeholder="Country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterCity} onValueChange={setFilterCity} disabled={filterCountry === 'all'}>
                  <SelectTrigger><SelectValue placeholder={filterCountry === 'all' ? 'Pick country first' : 'City'} /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {visibleCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger><SelectValue placeholder="Status" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All statuses</SelectItem>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {filtersActive && (
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                  <span>Showing {list.length} of {baseList.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => { setFilterSearch(''); setFilterCountry('all'); setFilterCity('all'); setFilterStatus('all') }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear filters
                  </Button>
                </div>
              )}

              {/* Bulk action bar */}
              {(someSelected || clinicView === 'trash') && (
                <div className="flex items-center justify-between gap-3 mb-3 p-2 rounded-md border bg-muted/30 flex-wrap">
                  <div className="flex items-center gap-2 text-sm">
                    <Checkbox checked={allSelected} onCheckedChange={toggleAll} />
                    <span>{selectedArray.length} of {list.length} selected</span>
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
                            <SelectValue placeholder="Set status…" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="active">
                              <span className="inline-flex items-center gap-2"><Power className="w-3.5 h-3.5 text-green-600" /> Active</span>
                            </SelectItem>
                            <SelectItem value="inactive">
                              <span className="inline-flex items-center gap-2"><PowerOff className="w-3.5 h-3.5 text-muted-foreground" /> Inactive</span>
                            </SelectItem>
                          </SelectContent>
                        </Select>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!selectedArray.length || bulkBusy}
                          onClick={() => trashClinics(selectedArray)}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Move to Trash ({selectedArray.length})
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
                          <RotateCcw className="w-4 h-4 mr-1" /> Restore ({selectedArray.length})
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          disabled={!selectedArray.length || bulkBusy}
                          onClick={() => setConfirmHardDelete({ ids: selectedArray })}
                        >
                          <Trash2 className="w-4 h-4 mr-1" /> Delete Permanently
                        </Button>
                        {trashedClinics.length > 0 && (
                          <Button
                            size="sm"
                            variant="ghost"
                            disabled={bulkBusy}
                            onClick={() => setConfirmHardDelete({ ids: trashedClinics.map(c => c.id), emptyAll: true })}
                          >
                            Empty Trash
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
                            <Badge variant="outline" className="text-destructive border-destructive">In Trash</Badge>
                          ) : (
                            <>
                              {clinic.is_published ? (
                                <Badge className="bg-green-600 text-white hover:bg-green-700">Active</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                                  Inactive
                                </Badge>
                              )}
                              {clinic.page_status === 'live' ? (
                                <Badge variant="secondary">Live</Badge>
                              ) : (
                                <Badge variant="outline" className="text-muted-foreground border-muted-foreground/40">
                                  Not Live
                                </Badge>
                              )}
                            </>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1 truncate">
                          {clinic.email} • {clinic.phone || 'No phone'}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      {clinic.deleted_at ? (
                        <>
                          <Button size="sm" variant="outline" disabled={bulkBusy} onClick={() => restoreClinics([clinic.id])}>
                            <RotateCcw className="w-4 h-4 mr-1" /> Restore
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            disabled={bulkBusy}
                            onClick={() => setConfirmHardDelete({ ids: [clinic.id] })}
                            title="Delete permanently"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button size="sm" onClick={() => navigate(`/clinic/${clinic.id}/panel`)}>Manage</Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-9 w-9 text-destructive hover:text-destructive"
                            disabled={bulkBusy}
                            onClick={() => trashClinics([clinic.id])}
                            title="Move to Trash"
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
                    {clinicView === 'active' ? 'No active clinics.' : 'Trash is empty.'}
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
              {confirmHardDelete?.emptyAll ? 'Empty Trash?' : 'Delete permanently?'}
            </AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete {confirmHardDelete?.ids.length ?? 0} clinic(s) and all related data
              (images, doctors, treatments, leads, billing). This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkBusy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={bulkBusy}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => confirmHardDelete && hardDeleteClinics(confirmHardDelete.ids)}
            >
              {bulkBusy ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Trash2 className="w-4 h-4 mr-2" />}
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <Dialog open={!!sendBackTarget} onOpenChange={(open) => { if (!open) { setSendBackTarget(null); setSendBackNotes('') } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Send Back to Clinic</DialogTitle>
            <DialogDescription>
              {sendBackTarget ? `Tell ${sendBackTarget.name} what needs to be corrected before their page can go live.` : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Textarea
              rows={6}
              placeholder="Describe the corrections needed (missing photos, incomplete description, doctors info, etc.)…"
              value={sendBackNotes}
              onChange={(e) => setSendBackNotes(e.target.value)}
              autoFocus
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setSendBackTarget(null); setSendBackNotes('') }} disabled={sendBackBusy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={submitSendBack} disabled={sendBackBusy || !sendBackNotes.trim()}>
              {sendBackBusy ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <XCircle className="w-4 h-4 mr-2" />}
              Send Back
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>


      {section === 'approvals' && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle>Pending Approvals</CardTitle>
              <CardDescription className="mt-1">
                Review new clinic applications and finished clinic pages waiting to go live.
              </CardDescription>
            </div>
            <div className="inline-flex rounded-md border p-1 bg-muted">
              <Button
                variant={approvalsTab === 'application' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApprovalsTab('application')}
              >
                Clinic Application Approvals ({pendingApprovals.length})
              </Button>
              <Button
                variant={approvalsTab === 'page' ? 'default' : 'ghost'}
                size="sm"
                onClick={() => setApprovalsTab('page')}
              >
                Clinic Page Approvals ({pendingPageApprovals.length})
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
                          <h3 className="font-semibold">{c.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground">
                            {[country, city].filter(Boolean).join(' • ') || '—'}
                          </p>
                          <div className="text-sm mt-1 space-y-0.5">
                            <p><span className="text-muted-foreground">Email:</span> {c.email || '—'}</p>
                            <p><span className="text-muted-foreground">Phone:</span> {c.phone || '—'}</p>
                            <p>
                              <span className="text-muted-foreground">Website:</span>{' '}
                              {c.website ? (
                                <a href={c.website} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">
                                  {c.website}
                                </a>
                              ) : '—'}
                            </p>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Applied: {new Date(approval.created_at).toLocaleDateString()}
                          </p>
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" onClick={() => openDocument(approval.health_tourism_doc_url)} disabled={!approval.health_tourism_doc_url}>
                          <FileCheck className="w-4 h-4 mr-1" /> Health Tourism Authorization Certificate
                        </Button>
                        {approval.applied_as_healthcare_facility ? (
                          <Badge variant="secondary" className="self-center">Applied as healthcare facility</Badge>
                        ) : approval.tax_certificate_url ? (
                          <Button size="sm" variant="outline" onClick={() => openDocument(approval.tax_certificate_url)}>
                            <FileCheck className="w-4 h-4 mr-1" /> Agency Certificate
                          </Button>
                        ) : (
                          <Badge variant="outline" className="self-center">No agency certificate</Badge>
                        )}
                      </div>

                      <div className="flex gap-2 pt-2">
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleApproval(approval.clinic_id, 'approve')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve
                        </Button>
                        <Button size="sm" variant="destructive" onClick={() => {
                          const reason = window.prompt('Rejection reason:')
                          if (reason) handleApproval(approval.clinic_id, 'reject', reason)
                        }}>
                          <XCircle className="w-4 h-4 mr-1" /> Reject
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {pendingApprovals.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No clinic applications waiting.</p>
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
                          <p className="text-sm"><span className="text-muted-foreground">Email:</span> {c.email || '—'}</p>
                        </div>
                        <Badge variant="secondary">Pending page approval</Badge>
                      </div>
                      <div className="flex flex-wrap gap-2 pt-2 border-t">
                        <Button size="sm" variant="outline" asChild>
                          <Link to={`/clinic/${c.id}?preview=1`}>Review Page</Link>
                        </Button>
                        <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handlePageApproval(c.id, 'approve')}>
                          <CheckCircle className="w-4 h-4 mr-1" /> Approve & Go Live
                        </Button>
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => { setSendBackTarget({ id: c.id, name: c.name }); setSendBackNotes('') }}
                        >
                          <XCircle className="w-4 h-4 mr-1" /> Send Back
                        </Button>
                      </div>
                    </div>
                  )
                })}
                {pendingPageApprovals.length === 0 && (
                  <p className="text-center text-muted-foreground py-6">No pages waiting for approval.</p>
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

        const search = patientSearch.trim().toLowerCase()
        const filtered = patients.filter(p => {
          if (search) {
            const hay = `${p.name || ''} ${p.email || ''} ${p.phone || ''}`.toLowerCase()
            if (!hay.includes(search)) return false
          }
          if (patientFilterCountry !== 'all' && !p.countryIds.has(patientFilterCountry)) return false
          if (patientFilterCity !== 'all' && !p.cityIds.has(patientFilterCity)) return false
          if (patientFilterLanguage !== 'all' && !p.languages.has(patientFilterLanguage)) return false
          return true
        })

        const visiblePatientCities = patientFilterCountry === 'all'
          ? cities
          : cities.filter(ci => ci.country_id === patientFilterCountry)

        const filtersActive = !!search
          || patientFilterCountry !== 'all'
          || patientFilterCity !== 'all'
          || patientFilterLanguage !== 'all'

        const buildExportRows = () => filtered.map(p => ({
          Name: p.name,
          Email: p.email,
          Phone: p.phone || '',
          Submissions: p.count,
          'Last Submission': new Date(p.lastDate).toISOString().slice(0, 10),
          'Clinics Applied To': Array.from(p.clinicNames).join('; '),
          Cities: Array.from(p.cityNames).join('; '),
          Countries: Array.from(p.countryNames).join('; '),
          Languages: Array.from(p.languages).join('; '),
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

        return (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
              <div>
                <CardTitle>All Patients</CardTitle>
                <CardDescription className="mt-1">
                  Patients grouped by email. Filter by the city, country, or language of the clinic they applied to.
                </CardDescription>
              </div>
              <div className="flex items-center gap-2">
                <Button size="sm" variant="outline" onClick={downloadCsv} disabled={!filtered.length}>
                  <Download className="w-4 h-4 mr-1" /> CSV
                </Button>
                <Button size="sm" variant="outline" onClick={downloadXlsx} disabled={!filtered.length}>
                  <FileSpreadsheet className="w-4 h-4 mr-1" /> XLSX
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 mb-4">
                <Input
                  placeholder="Search name / email / phone…"
                  value={patientSearch}
                  onChange={(e) => setPatientSearch(e.target.value)}
                />
                <Select
                  value={patientFilterCountry}
                  onValueChange={(v) => { setPatientFilterCountry(v); setPatientFilterCity('all') }}
                >
                  <SelectTrigger><SelectValue placeholder="Clinic country" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All countries</SelectItem>
                    {countries.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select
                  value={patientFilterCity}
                  onValueChange={setPatientFilterCity}
                  disabled={patientFilterCountry === 'all'}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={patientFilterCountry === 'all' ? 'Pick country first' : 'Clinic city'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All cities</SelectItem>
                    {visiblePatientCities.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
                <Select value={patientFilterLanguage} onValueChange={setPatientFilterLanguage}>
                  <SelectTrigger><SelectValue placeholder="Clinic language" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All languages</SelectItem>
                    {allLanguages.map(l => <SelectItem key={l} value={l}>{l}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {filtersActive && (
                <div className="flex items-center justify-between mb-3 text-xs text-muted-foreground">
                  <span>Showing {filtered.length} of {patients.length}</span>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setPatientSearch('')
                      setPatientFilterCountry('all')
                      setPatientFilterCity('all')
                      setPatientFilterLanguage('all')
                    }}
                  >
                    <X className="w-3.5 h-3.5 mr-1" /> Clear filters
                  </Button>
                </div>
              )}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="border-b">
                    <tr>
                      <th className="text-left py-2 px-3">Name</th>
                      <th className="text-left py-2 px-3">Email</th>
                      <th className="text-left py-2 px-3">Phone</th>
                      <th className="text-left py-2 px-3">Submissions</th>
                      <th className="text-left py-2 px-3">Clinics</th>
                      <th className="text-left py-2 px-3">Cities</th>
                      <th className="text-left py-2 px-3">Countries</th>
                      <th className="text-left py-2 px-3">Languages</th>
                      <th className="text-left py-2 px-3">Last submission</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filtered.map((p, i) => (
                      <tr key={i} className="border-b hover:bg-muted/50 align-top">
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
                    {patients.length === 0 ? 'No patients yet.' : 'No patients match the filters.'}
                  </p>
                )}
              </div>
            </CardContent>
          </Card>
        )
      })()}

      {section === 'users' && isMainAdmin && <UsersManager />}
      {section === 'users' && !isMainAdmin && (
        <Card><CardContent className="py-10 text-center text-muted-foreground">Only Super Admins can manage users.</CardContent></Card>
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
