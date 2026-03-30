import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import {
  SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarGroupLabel,
  SidebarGroupContent, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarTrigger
} from '@/components/ui/sidebar'
import {
  Building2, Users, Clock, Shield, CheckCircle, XCircle, FileCheck,
  BarChart3, Loader2, DollarSign, UserPlus, Trash2, ExternalLink
} from 'lucide-react'

type AdminTab = 'clinics' | 'approvals' | 'patients' | 'admins'

const Admin = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [activeTab, setActiveTab] = useState<AdminTab>('clinics')
  const [clinics, setClinics] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [patients, setPatients] = useState<any[]>([])
  const [admins, setAdmins] = useState<any[]>([])
  const [stats, setStats] = useState({ totalClinics: 0, pendingApprovals: 0, totalPatients: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [addingAdmin, setAddingAdmin] = useState(false)

  const isMainAdmin = userRole === 'admin'

  useEffect(() => {
    if (!authLoading && (!user || (userRole !== 'admin' && userRole !== 'sub_admin'))) {
      navigate('/')
      return
    }
    if (user && (userRole === 'admin' || userRole === 'sub_admin')) {
      loadAllData()
    }
  }, [user, userRole, authLoading])

  const loadAllData = async () => {
    setLoading(true)
    try {
      const [clinicsRes, approvalsRes, leadsRes, purchasesRes, rolesRes] = await Promise.all([
        supabase.from('clinics').select('*, clinic_approvals(*), clinic_billing_settings(*)').order('created_at', { ascending: false }),
        supabase.from('clinic_approvals').select('*, clinics(name, email)').eq('status', 'pending').order('created_at', { ascending: false }),
        supabase.from('contact_requests').select('*', { count: 'exact' }).order('created_at', { ascending: false }).limit(500),
        supabase.from('lead_purchases').select('amount_cents'),
        supabase.from('user_roles').select('*').in('role', ['admin', 'sub_admin'] as any)
      ])

      const totalRevenue = (purchasesRes.data || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)

      setClinics(clinicsRes.data || [])
      setPendingApprovals(approvalsRes.data || [])
      setAdmins(rolesRes.data || [])

      // Group patients by email with submission count
      const leadsData = leadsRes.data || []
      const patientMap = new Map<string, { name: string; email: string; phone: string | null; count: number; lastDate: string }>()
      leadsData.forEach(l => {
        const existing = patientMap.get(l.email)
        if (existing) {
          existing.count++
          if (l.created_at > existing.lastDate) {
            existing.lastDate = l.created_at
            existing.name = l.name
          }
        } else {
          patientMap.set(l.email, { name: l.name, email: l.email, phone: l.phone, count: 1, lastDate: l.created_at })
        }
      })
      setPatients(Array.from(patientMap.values()).sort((a, b) => b.count - a.count))

      setStats({
        totalClinics: clinicsRes.data?.length || 0,
        pendingApprovals: approvalsRes.data?.length || 0,
        totalPatients: patientMap.size,
        totalRevenue: totalRevenue / 100
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
          reviewed_by: user?.id, reviewed_at: new Date().toISOString()
        }).eq('clinic_id', clinicId),
        supabase.from('clinics').update({ approval_status: newStatus, is_published: action === 'approve' }).eq('id', clinicId)
      ])
      toast({ title: 'Success', description: `Clinic ${newStatus}` })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) return
    setAddingAdmin(true)
    try {
      // Look up user by email in profiles — but profiles don't store email directly
      // We need to find user_id. Let's search by checking auth metadata via a workaround:
      // Since we can't query auth.users, let's check if there's a profile with matching info
      // Actually, let's look at clinics or contact info, or use the user_roles approach
      // The simplest: ask user to provide user ID, or search by clinic email
      
      // Try to find a user via their clinic email or profile
      const { data: clinicUser } = await supabase
        .from('clinics')
        .select('user_id')
        .eq('email', newAdminEmail.trim())
        .single()

      let userId = clinicUser?.user_id

      if (!userId) {
        // Try profiles table - but it doesn't have email. Let's check if this is a known user
        toast({ title: 'Error', description: 'No user found with that email. The user must have an account first.', variant: 'destructive' })
        setAddingAdmin(false)
        return
      }

      // Check if already admin
      const { data: existing } = await supabase
        .from('user_roles')
        .select('id')
        .eq('user_id', userId)
        .in('role', ['admin', 'sub_admin'] as any)

      if (existing && existing.length > 0) {
        toast({ title: 'Info', description: 'This user already has admin access.' })
        setAddingAdmin(false)
        return
      }

      const { error } = await supabase
        .from('user_roles')
        .insert({ user_id: userId, role: 'sub_admin' as any, created_by: user?.id })

      if (error) throw error
      toast({ title: 'Success', description: 'Sub-admin access granted.' })
      setNewAdminEmail('')
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    } finally {
      setAddingAdmin(false)
    }
  }

  const handleRemoveAdmin = async (roleId: string, roleType: string) => {
    if (roleType === 'admin') {
      toast({ title: 'Error', description: 'Cannot remove the main admin.', variant: 'destructive' })
      return
    }
    try {
      const { error } = await supabase.from('user_roles').delete().eq('id', roleId)
      if (error) throw error
      toast({ title: 'Success', description: 'Admin access removed.' })
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

  if (userRole !== 'admin' && userRole !== 'sub_admin') return null

  const menuItems = [
    { id: 'clinics' as AdminTab, label: 'Clinics', icon: Building2, badge: stats.totalClinics },
    { id: 'approvals' as AdminTab, label: 'Pending Approvals', icon: Clock, badge: stats.pendingApprovals },
    { id: 'patients' as AdminTab, label: 'All Patients', icon: Users, badge: stats.totalPatients },
    { id: 'admins' as AdminTab, label: 'Admins', icon: Shield, badge: admins.length },
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <Sidebar collapsible="icon">
          <SidebarContent>
            <SidebarGroup>
              <SidebarGroupLabel className="flex items-center gap-2">
                <Shield className="w-4 h-4" />
                <span>Admin Panel</span>
              </SidebarGroupLabel>
              <SidebarGroupContent>
                <SidebarMenu>
                  {menuItems.map(item => (
                    <SidebarMenuItem key={item.id}>
                      <SidebarMenuButton
                        onClick={() => setActiveTab(item.id)}
                        isActive={activeTab === item.id}
                        tooltip={item.label}
                      >
                        <item.icon className="w-4 h-4" />
                        <span>{item.label}</span>
                        {item.badge > 0 && (
                          <Badge variant="secondary" className="ml-auto text-xs">{item.badge}</Badge>
                        )}
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  ))}
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>

            <SidebarGroup>
              <SidebarGroupContent>
                <SidebarMenu>
                  <SidebarMenuItem>
                    <SidebarMenuButton onClick={() => navigate('/')} tooltip="Back to Site">
                      <ExternalLink className="w-4 h-4" />
                      <span>Back to Site</span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                </SidebarMenu>
              </SidebarGroupContent>
            </SidebarGroup>
          </SidebarContent>
        </Sidebar>

        <div className="flex-1 flex flex-col">
          <header className="h-14 flex items-center border-b px-4 gap-4 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
            <SidebarTrigger />
            <h1 className="text-lg font-semibold">
              {menuItems.find(m => m.id === activeTab)?.label}
            </h1>
          </header>

          <main className="flex-1 p-6 overflow-auto">
            {/* Stats Row */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8">
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Building2 className="w-8 h-8 text-primary" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalClinics}</p>
                      <p className="text-sm text-muted-foreground">Total Clinics</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Clock className="w-8 h-8 text-yellow-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.pendingApprovals}</p>
                      <p className="text-sm text-muted-foreground">Pending</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <Users className="w-8 h-8 text-blue-500" />
                    <div>
                      <p className="text-2xl font-bold">{stats.totalPatients}</p>
                      <p className="text-sm text-muted-foreground">Total Patients</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-6">
                  <div className="flex items-center gap-3">
                    <DollarSign className="w-8 h-8 text-green-500" />
                    <div>
                      <p className="text-2xl font-bold">${stats.totalRevenue.toFixed(2)}</p>
                      <p className="text-sm text-muted-foreground">Revenue</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Clinics Tab */}
            {activeTab === 'clinics' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Clinics</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {clinics.map(clinic => (
                      <div key={clinic.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <h3 className="font-semibold">{clinic.name}</h3>
                            <Badge variant={clinic.approval_status === 'approved' ? 'default' : clinic.approval_status === 'pending' ? 'secondary' : 'destructive'}>
                              {clinic.approval_status}
                            </Badge>
                            {clinic.is_published && <Badge className="bg-green-600 text-white">Published</Badge>}
                            <Badge variant="outline">
                              {clinic.clinic_billing_settings?.[0]?.billing_type === 'free' ? '🆓 Free' : '💰 Paid'}
                            </Badge>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{clinic.email} • {clinic.phone || 'No phone'}</p>
                        </div>
                        <Button size="sm" onClick={() => navigate(`/clinic/${clinic.id}/panel`)}>
                          Manage
                        </Button>
                      </div>
                    ))}
                    {clinics.length === 0 && <p className="text-center text-muted-foreground py-6">No clinics registered yet.</p>}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Approvals Tab */}
            {activeTab === 'approvals' && (
              <Card>
                <CardHeader>
                  <CardTitle>Pending Approvals</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {pendingApprovals.map(approval => (
                      <div key={approval.id} className="p-4 border rounded-lg">
                        <div className="flex items-center justify-between mb-3">
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

            {/* Patients Tab */}
            {activeTab === 'patients' && (
              <Card>
                <CardHeader>
                  <CardTitle>All Patients</CardTitle>
                  <CardDescription>Patients grouped by email with lead submission count</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead>
                        <tr className="border-b">
                          <th className="text-left py-2 px-3">Name</th>
                          <th className="text-left py-2 px-3">Email</th>
                          <th className="text-left py-2 px-3">Phone</th>
                          <th className="text-left py-2 px-3">Submissions</th>
                          <th className="text-left py-2 px-3">Last Submission</th>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((p, i) => (
                          <tr key={i} className="border-b hover:bg-muted/50">
                            <td className="py-2 px-3 font-medium">{p.name}</td>
                            <td className="py-2 px-3">{p.email}</td>
                            <td className="py-2 px-3">{p.phone || '-'}</td>
                            <td className="py-2 px-3">
                              <Badge variant="secondary">{p.count}</Badge>
                            </td>
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

            {/* Admins Tab */}
            {activeTab === 'admins' && (
              <Card>
                <CardHeader>
                  <CardTitle>Admin Users</CardTitle>
                  <CardDescription>
                    {isMainAdmin ? 'Add or remove sub-admin users' : 'View admin users (read-only for sub-admins)'}
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                  {/* Add admin - only for main admin */}
                  {isMainAdmin && (
                    <div className="p-4 border rounded-lg space-y-3">
                      <Label>Add Sub-Admin by Clinic Email</Label>
                      <div className="flex gap-2">
                        <Input
                          placeholder="clinic@example.com"
                          value={newAdminEmail}
                          onChange={e => setNewAdminEmail(e.target.value)}
                          onKeyDown={e => e.key === 'Enter' && handleAddAdmin()}
                        />
                        <Button onClick={handleAddAdmin} disabled={addingAdmin}>
                          {addingAdmin ? <Loader2 className="w-4 h-4 animate-spin" /> : <UserPlus className="w-4 h-4 mr-1" />}
                          Add
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        The user must have an existing account. They will be assigned the sub-admin role.
                      </p>
                    </div>
                  )}

                  {/* Admin list */}
                  <div className="space-y-3">
                    {admins.map(admin => (
                      <div key={admin.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <Shield className="w-4 h-4 text-primary" />
                            <span className="font-medium">{admin.user_id}</span>
                            <Badge variant={admin.role === 'admin' ? 'default' : 'secondary'}>
                              {admin.role === 'admin' ? 'Main Admin' : 'Sub-Admin'}
                            </Badge>
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">
                            Added: {new Date(admin.created_at).toLocaleDateString()}
                          </p>
                        </div>
                        {isMainAdmin && admin.role !== 'admin' && (
                          <Button size="sm" variant="destructive" onClick={() => handleRemoveAdmin(admin.id, admin.role)}>
                            <Trash2 className="w-4 h-4 mr-1" /> Remove
                          </Button>
                        )}
                      </div>
                    ))}
                    {admins.length === 0 && <p className="text-center text-muted-foreground py-6">No admin users found.</p>}
                  </div>
                </CardContent>
              </Card>
            )}
          </main>
        </div>
      </div>
    </SidebarProvider>
  )
}

export default Admin