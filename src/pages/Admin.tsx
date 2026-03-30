import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '@/contexts/AuthContext'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'
import { 
  Building2, Users, FileCheck, DollarSign, Settings, 
  CheckCircle, XCircle, Clock, Eye, Edit, Loader2,
  BarChart3, Shield
} from 'lucide-react'

const Admin = () => {
  const { user, userRole, loading: authLoading } = useAuth()
  const navigate = useNavigate()
  const { toast } = useToast()

  const [clinics, setClinics] = useState<any[]>([])
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([])
  const [allLeads, setAllLeads] = useState<any[]>([])
  const [stats, setStats] = useState({ totalClinics: 0, pendingApprovals: 0, totalLeads: 0, totalRevenue: 0 })
  const [loading, setLoading] = useState(true)
  const [editingClinic, setEditingClinic] = useState<any>(null)
  const [editForm, setEditForm] = useState<any>({})

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
      // Load clinics with approval info
      const { data: clinicsData } = await supabase
        .from('clinics')
        .select(`*, clinic_approvals(*), clinic_billing_settings(*)`)
        .order('created_at', { ascending: false })

      // Load pending approvals
      const { data: approvalsData } = await supabase
        .from('clinic_approvals')
        .select('*, clinics(name, email)')
        .eq('status', 'pending')
        .order('created_at', { ascending: false })

      // Load all leads
      const { data: leadsData, count } = await supabase
        .from('contact_requests')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })
        .limit(50)

      // Load purchase stats
      const { data: purchasesData } = await supabase
        .from('lead_purchases')
        .select('amount_cents')

      const totalRevenue = (purchasesData || []).reduce((sum, p) => sum + (p.amount_cents || 0), 0)

      setClinics(clinicsData || [])
      setPendingApprovals(approvalsData || [])
      setAllLeads(leadsData || [])
      setStats({
        totalClinics: clinicsData?.length || 0,
        pendingApprovals: approvalsData?.length || 0,
        totalLeads: count || 0,
        totalRevenue: totalRevenue / 100
      })
    } catch (e: any) {
      console.error('Error loading admin data:', e)
      toast({ title: 'Error', description: 'Failed to load admin data', variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  const handleBillingChange = async (clinicId: string, billingType: string) => {
    try {
      const { error } = await supabase
        .from('clinic_billing_settings')
        .update({ billing_type: billingType, updated_by: user?.id, updated_at: new Date().toISOString() })
        .eq('clinic_id', clinicId)

      if (error) throw error
      toast({ title: 'Success', description: `Billing set to ${billingType}` })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleApproval = async (clinicId: string, action: 'approve' | 'reject', reason?: string) => {
    try {
      const newStatus = action === 'approve' ? 'approved' : 'rejected'
      
      const { error: approvalError } = await supabase
        .from('clinic_approvals')
        .update({ 
          status: newStatus, 
          rejection_reason: reason,
          reviewed_by: user?.id, 
          reviewed_at: new Date().toISOString() 
        })
        .eq('clinic_id', clinicId)

      const { error: clinicError } = await supabase
        .from('clinics')
        .update({ approval_status: newStatus })
        .eq('id', clinicId)

      if (approvalError || clinicError) throw approvalError || clinicError
      toast({ title: 'Success', description: `Clinic ${newStatus}` })
      loadAllData()
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' })
    }
  }

  const handleEditClinic = async () => {
    if (!editingClinic) return
    try {
      const { error } = await supabase
        .from('clinics')
        .update(editForm)
        .eq('id', editingClinic.id)

      if (error) throw error
      toast({ title: 'Success', description: 'Clinic updated' })
      setEditingClinic(null)
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

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Shield className="w-6 h-6 text-primary" />
            <h1 className="text-2xl font-bold">Admin Panel</h1>
          </div>
          <Link to="/">
            <Button variant="outline" size="sm">Back to Site</Button>
          </Link>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        {/* Stats */}
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
                  <p className="text-sm text-muted-foreground">Pending Approvals</p>
                </div>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6">
              <div className="flex items-center gap-3">
                <Users className="w-8 h-8 text-blue-500" />
                <div>
                  <p className="text-2xl font-bold">{stats.totalLeads}</p>
                  <p className="text-sm text-muted-foreground">Total Leads</p>
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
                  <p className="text-sm text-muted-foreground">Total Revenue</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="clinics" className="space-y-6">
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="clinics">Clinics</TabsTrigger>
            <TabsTrigger value="approvals">
              Approvals {stats.pendingApprovals > 0 && <Badge className="ml-2 bg-yellow-500">{stats.pendingApprovals}</Badge>}
            </TabsTrigger>
            <TabsTrigger value="leads">Patients</TabsTrigger>
            <TabsTrigger value="billing">Billing</TabsTrigger>
          </TabsList>

          {/* Clinics Tab */}
          <TabsContent value="clinics">
            <Card>
              <CardHeader>
                <CardTitle>All Clinics</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clinics.map((clinic) => (
                    <div key={clinic.id} className="p-4 border rounded-lg flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold">{clinic.name}</h3>
                          <Badge variant={clinic.approval_status === 'approved' ? 'default' : clinic.approval_status === 'pending' ? 'secondary' : 'destructive'}>
                            {clinic.approval_status}
                          </Badge>
                          {clinic.is_published && <Badge className="bg-green-500">Published</Badge>}
                          <Badge variant="outline">
                            {clinic.clinic_billing_settings?.[0]?.billing_type === 'free' ? '🆓 Free' : '💰 Paid'}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{clinic.email} • {clinic.phone}</p>
                      </div>
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline" onClick={() => navigate(`/clinic/${clinic.id}/panel`)}>
                          <Eye className="w-4 h-4 mr-1" /> View
                        </Button>
                        <Button size="sm" variant="outline" onClick={() => { setEditingClinic(clinic); setEditForm({ name: clinic.name, email: clinic.email, phone: clinic.phone, description: clinic.description, address: clinic.address }); }}>
                          <Edit className="w-4 h-4 mr-1" /> Edit
                        </Button>
                      </div>
                    </div>
                  ))}
                  {clinics.length === 0 && <p className="text-center text-muted-foreground py-6">No clinics registered yet.</p>}
                </div>
              </CardContent>
            </Card>

            {/* Edit Modal */}
            {editingClinic && (
              <Card className="mt-4">
                <CardHeader>
                  <CardTitle>Edit: {editingClinic.name}</CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <Label>Name</Label>
                      <Input value={editForm.name || ''} onChange={(e) => setEditForm({ ...editForm, name: e.target.value })} />
                    </div>
                    <div>
                      <Label>Email</Label>
                      <Input value={editForm.email || ''} onChange={(e) => setEditForm({ ...editForm, email: e.target.value })} />
                    </div>
                    <div>
                      <Label>Phone</Label>
                      <Input value={editForm.phone || ''} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} />
                    </div>
                    <div>
                      <Label>Address</Label>
                      <Input value={editForm.address || ''} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} />
                    </div>
                  </div>
                  <div>
                    <Label>Description</Label>
                    <Textarea value={editForm.description || ''} onChange={(e) => setEditForm({ ...editForm, description: e.target.value })} rows={3} />
                  </div>
                  <div className="flex gap-2">
                    <Button onClick={handleEditClinic}>Save Changes</Button>
                    <Button variant="outline" onClick={() => setEditingClinic(null)}>Cancel</Button>
                  </div>
                </CardContent>
              </Card>
            )}
          </TabsContent>

          {/* Approvals Tab */}
          <TabsContent value="approvals">
            <Card>
              <CardHeader>
                <CardTitle>Pending Approvals</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {pendingApprovals.map((approval) => (
                    <div key={approval.id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          <h3 className="font-semibold">{approval.clinics?.name || 'Unknown'}</h3>
                          <p className="text-sm text-muted-foreground">{approval.clinics?.email}</p>
                          <p className="text-xs text-muted-foreground">Applied: {new Date(approval.created_at).toLocaleDateString()}</p>
                        </div>
                        <div className="flex items-center gap-2">
                          {approval.tax_certificate_url && (
                            <Badge variant="outline"><FileCheck className="w-3 h-3 mr-1" />Tax Cert</Badge>
                          )}
                          {approval.health_tourism_doc_url && (
                            <Badge variant="outline"><FileCheck className="w-3 h-3 mr-1" />Health Doc</Badge>
                          )}
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
          </TabsContent>

          {/* Leads Tab */}
          <TabsContent value="leads">
            <Card>
              <CardHeader>
                <CardTitle>All Patient Leads</CardTitle>
                <CardDescription>Recent leads across all clinics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead>
                      <tr className="border-b">
                        <th className="text-left py-2 px-3">Name</th>
                        <th className="text-left py-2 px-3">Email</th>
                        <th className="text-left py-2 px-3">Phone</th>
                        <th className="text-left py-2 px-3">Status</th>
                        <th className="text-left py-2 px-3">Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {allLeads.map((lead) => (
                        <tr key={lead.id} className="border-b hover:bg-muted/50">
                          <td className="py-2 px-3 font-medium">{lead.name}</td>
                          <td className="py-2 px-3">{lead.email}</td>
                          <td className="py-2 px-3">{lead.phone || '-'}</td>
                          <td className="py-2 px-3"><Badge variant="outline">{lead.status}</Badge></td>
                          <td className="py-2 px-3 text-muted-foreground">{new Date(lead.created_at).toLocaleDateString()}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  {allLeads.length === 0 && <p className="text-center text-muted-foreground py-6">No leads yet.</p>}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Billing Tab */}
          <TabsContent value="billing">
            <Card>
              <CardHeader>
                <CardTitle>Clinic Billing Settings</CardTitle>
                <CardDescription>Set each clinic as Paid ($25/lead) or Free (100% discount)</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {clinics.map((clinic) => {
                    const billing = clinic.clinic_billing_settings?.[0]
                    return (
                      <div key={clinic.id} className="p-4 border rounded-lg flex items-center justify-between">
                        <div>
                          <h3 className="font-semibold">{clinic.name}</h3>
                          <p className="text-sm text-muted-foreground">
                            Current: <Badge variant={billing?.billing_type === 'free' ? 'secondary' : 'default'}>
                              {billing?.billing_type === 'free' ? 'Free' : `Paid ($${(billing?.price_per_lead_cents || 2500) / 100}/lead)`}
                            </Badge>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant={billing?.billing_type === 'paid' ? 'default' : 'outline'}
                            onClick={() => handleBillingChange(clinic.id, 'paid')}
                          >
                            💰 Paid
                          </Button>
                          <Button 
                            size="sm" 
                            variant={billing?.billing_type === 'free' ? 'default' : 'outline'}
                            onClick={() => handleBillingChange(clinic.id, 'free')}
                          >
                            🆓 Free
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default Admin
