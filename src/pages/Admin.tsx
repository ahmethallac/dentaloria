import { useEffect, useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import {
  Building2, Users, Clock, CheckCircle, XCircle, FileCheck,
  Loader2, DollarSign, LayoutDashboard, UserCog,
  Trash2, RotateCcw, Trash,
} from 'lucide-react'
import { Checkbox } from '@/components/ui/checkbox'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import AdminShell, { ShellSection } from '@/components/layout/AdminShell'
import UsersManager from '@/components/admin/UsersManager'

type AdminSection = 'dashboard' | 'clinics' | 'approvals' | 'patients' | 'users'

const Admin = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()
  const [params, setParams] = useSearchParams()
  const section = (params.get('section') as AdminSection) || 'dashboard'

  const [clinics, setClinics] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [stats, setStats] = useState({ totalClinics: 0, pendingApprovals: 0, totalPatients: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)

  const isMainAdmin = userRole === 'admin'

  // Trash + bulk-delete state
  const [clinicView, setClinicView] = useState<'active' | 'trash'>('active')
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [bulkBusy, setBulkBusy] = useState(false)
  const [confirmHardDelete, setConfirmHardDelete] = useState<{ ids: string[]; emptyAll?: boolean } | null>(null)

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
      const [clinicsRes, approvalsRes, leadsRes, purchasesRes] = await Promise.all([
        supabase.from('clinics').select('*, clinic_approvals(*), clinic_billing_settings(*)').order('created_at', { ascending: false }),
        supabase.from('clinic_approvals').select('*, clinics(name, email)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('contact_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(500),
        supabase.from('lead_purchases').select('amount_cents'),
      ])

      const totalRevenue = (purchasesRes.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)
      setClinics(clinicsRes.data || [])
      setPendingApprovals(approvalsRes.data || [])

      const leadsData = leadsRes.data || []
      const patientMap = new Map<string, { name: string; email: string; phone: string | null; count: number; lastDate: string }>()
      leadsData.forEach(l => {
        const existing = patientMap.get(l.email)
        if (existing) {
          existing.count++
          if (l.created_at > existing.lastDate) { existing.lastDate = l.created_at; existing.name = l.name }
        } else {
          patientMap.set(l.email, { name: l.name, email: l.email, phone: l.phone, count: 1, lastDate: l.created_at })
        }
      })
      setPatients(Array.from(patientMap.values()).sort((a, b) => b.count - a.count))

      setStats({
        totalClinics: clinicsRes.data?.length || 0,
        pendingApprovals: approvalsRes.data?.length || 0,
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
      await Promise.all([
        supabase.from('clinic_approvals').update({
          status: newStatus, rejection_reason: reason,
          reviewed_by: user?.id, reviewed_at: new Date().toISOString(),
        }).eq('clinic_id', clinicId),
        supabase.from('clinics').update({ approval_status: newStatus, is_published: action === 'approve' }).eq('id', clinicId),
      ])
      toast({ title: 'Success', description: `Clinic ${newStatus}` })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
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
                    <div className="font-medium">{c.name}</div>
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

      {section === 'clinics' && (
        <Card>
          <CardHeader><CardTitle>All Clinics</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-3">
              {clinics.map(clinic => (
                <div key={clinic.id} className="p-4 border rounded-lg flex items-center justify-between hover:bg-muted/50 transition-colors">
                  <div>
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-semibold">{clinic.name}</h3>
                      <Badge variant={clinic.approval_status === 'approved' ? 'default' : clinic.approval_status === 'pending' ? 'secondary' : 'destructive'}>
                        {clinic.approval_status}
                      </Badge>
                      {clinic.is_published && <Badge className="bg-green-600 text-white">Published</Badge>}
                      <Badge variant="outline">
                        {clinic.clinic_billing_settings?.[0]?.billing_type === 'free' ? 'Free' : 'Paid'}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{clinic.email} • {clinic.phone || 'No phone'}</p>
                  </div>
                  <Button size="sm" onClick={() => navigate(`/clinic/${clinic.id}/panel`)}>Manage</Button>
                </div>
              ))}
              {clinics.length === 0 && <p className="text-center text-muted-foreground py-6">No clinics registered yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'approvals' && (
        <Card>
          <CardHeader><CardTitle>Pending Approvals</CardTitle></CardHeader>
          <CardContent>
            <div className="space-y-4">
              {pendingApprovals.map(approval => (
                <div key={approval.id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3 flex-wrap gap-2">
                    <div>
                      <h3 className="font-semibold">{approval.clinics?.name || 'Unknown'}</h3>
                      <p className="text-sm text-muted-foreground">{approval.clinics?.email}</p>
                      <p className="text-xs text-muted-foreground">Applied: {new Date(approval.created_at).toLocaleDateString()}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      {approval.tax_certificate_url && <Badge variant="outline"><FileCheck className="w-3 h-3 mr-1" />Tax Cert</Badge>}
                      {approval.health_tourism_doc_url && <Badge variant="outline"><FileCheck className="w-3 h-3 mr-1" />Health Doc</Badge>}
                    </div>
                  </div>
                  <div className="flex gap-2">
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
              ))}
              {pendingApprovals.length === 0 && <p className="text-center text-muted-foreground py-6">No pending approvals.</p>}
            </div>
          </CardContent>
        </Card>
      )}

      {section === 'patients' && (
        <Card>
          <CardHeader>
            <CardTitle>All Patients</CardTitle>
            <CardDescription>Patients grouped by email with submission count</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b">
                  <tr>
                    <th className="text-left py-2 px-3">Name</th>
                    <th className="text-left py-2 px-3">Email</th>
                    <th className="text-left py-2 px-3">Phone</th>
                    <th className="text-left py-2 px-3">Submissions</th>
                    <th className="text-left py-2 px-3">Last submission</th>
                  </tr>
                </thead>
                <tbody>
                  {patients.map((p, i) => (
                    <tr key={i} className="border-b hover:bg-muted/50">
                      <td className="py-2 px-3 font-medium">{p.name}</td>
                      <td className="py-2 px-3">{p.email}</td>
                      <td className="py-2 px-3">{p.phone || '-'}</td>
                      <td className="py-2 px-3"><Badge variant="secondary">{p.count}</Badge></td>
                      <td className="py-2 px-3 text-muted-foreground">{new Date(p.lastDate).toLocaleDateString()}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {patients.length === 0 && <p className="text-center text-muted-foreground py-6">No patients yet.</p>}
            </div>
          </CardContent>
        </Card>
      )}

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
