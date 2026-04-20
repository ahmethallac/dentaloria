import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { getClinicByIdPrivate, type Clinic } from "@/lib/services";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import ApplicationsTab from "@/components/clinic-panel/ApplicationsTab";
import ClinicInfoTab from "@/components/clinic-panel/ClinicInfoTab";
import {
  Building2, Users, Settings, BarChart3, Shield, LayoutDashboard, Loader2,
} from "lucide-react";
import AdminShell, { ShellSection } from "@/components/layout/AdminShell";

type PanelSection = 'overview' | 'patients' | 'info' | 'settings';

const ClinicPanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { userRole } = useAuth();

  const section = (searchParams.get('section') as PanelSection) || 'overview';
  const setSection = (s: PanelSection) => {
    const next = new URLSearchParams(searchParams);
    next.set('section', s);
    setSearchParams(next);
  };

  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchasedLeads: 0, pendingLeads: 0 });

  const [billingType, setBillingType] = useState<string>('paid');
  const [isPublished, setIsPublished] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const isAdminUser = userRole === 'admin' || userRole === 'sub_admin';

  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({ title: "Payment Successful!", description: "Lead contacts have been unlocked." });
    } else if (payment === 'cancelled') {
      toast({ title: "Payment Cancelled", description: "No leads were unlocked.", variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClinic = async () => {
    if (!id) return;
    try {
      const data = await getClinicByIdPrivate(id);
      if (!data) {
        toast({ title: "Not Found", description: "Clinic not found.", variant: "destructive" });
        navigate(isAdminUser ? "/admin" : "/dashboard");
        return;
      }
      setClinic(data);
      setIsPublished((data as any).is_published || false);
      setIsVerified((data as any).is_verified || false);
      setIsFeatured((data as any).is_featured || false);
      setApprovalStatus((data as any).approval_status || 'pending');

      const [leadsRes, purchasesRes, billingRes] = await Promise.all([
        supabase.from('contact_requests').select('id', { count: 'exact' }).eq('clinic_id', id),
        supabase.from('lead_purchases').select('id', { count: 'exact' }).eq('clinic_id', id),
        supabase.from('clinic_billing_settings').select('billing_type').eq('clinic_id', id).single(),
      ]);
      const totalLeads = leadsRes.count || 0;
      const purchasedLeads = purchasesRes.count || 0;
      setStats({ totalLeads, purchasedLeads, pendingLeads: totalLeads - purchasedLeads });
      setBillingType(billingRes.data?.billing_type || 'paid');
    } catch (e: any) {
      console.error("Could not load clinic:", e);
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
      navigate(isAdminUser ? "/admin" : "/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) { navigate("/dashboard"); return; }
    loadClinic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  const handleSaveAdminSettings = async () => {
    if (!id || !clinic) return;
    setSavingAdmin(true);
    try {
      const { error: clinicError } = await supabase.from('clinics')
        .update({ is_published: isPublished, is_verified: isVerified, is_featured: isFeatured, approval_status: approvalStatus })
        .eq('id', id);
      if (clinicError) throw clinicError;
      const { error: billingError } = await supabase.from('clinic_billing_settings')
        .update({ billing_type: billingType, updated_by: null, updated_at: new Date().toISOString() })
        .eq('clinic_id', id);
      if (billingError) throw billingError;
      toast({ title: "Saved", description: "Admin settings updated successfully." });
      loadClinic();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAdmin(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!clinic) return <div className="min-h-screen flex items-center justify-center">Clinic not found.</div>;

  const sectionLabels: Record<PanelSection, string> = {
    overview: 'Overview',
    patients: 'Patients',
    info: 'Clinic Information',
    settings: 'Admin Settings',
  };

  const sections: ShellSection[] = [
    {
      label: 'Clinic',
      items: [
        { id: 'overview', label: 'Overview', icon: LayoutDashboard, onClick: () => setSection('overview'), active: section === 'overview' },
        { id: 'patients', label: 'Patients', icon: Users, onClick: () => setSection('patients'), active: section === 'patients', badge: stats.totalLeads },
        { id: 'info', label: 'Clinic Information', icon: Building2, onClick: () => setSection('info'), active: section === 'info' },
      ],
    },
    {
      label: 'Administration',
      items: [
        { id: 'settings', label: 'Admin Settings', icon: Shield, onClick: () => setSection('settings'), active: section === 'settings', hidden: !isAdminUser },
      ],
    },
  ];

  const breadcrumbs = isAdminUser
    ? [{ label: 'Admin', to: '/admin' }, { label: clinic.name }, { label: sectionLabels[section] }]
    : [{ label: 'Dashboard', to: '/dashboard' }, { label: clinic.name }, { label: sectionLabels[section] }];

  return (
    <AdminShell
      sections={sections}
      title={`${clinic.name} — ${sectionLabels[section]}`}
      breadcrumbs={breadcrumbs}
      headerExtra={
        <Badge variant={(clinic as any).approval_status === 'approved' ? 'default' : 'secondary'}>
          {(clinic as any).approval_status || 'pending'}
        </Badge>
      }
    >
      {section === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div><p className="text-2xl font-bold">{stats.totalLeads}</p><p className="text-sm text-muted-foreground">Total Patients</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div><p className="text-2xl font-bold">{stats.purchasedLeads}</p><p className="text-sm text-muted-foreground">Unlocked Leads</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <Settings className="w-8 h-8 text-orange-500" />
              <div><p className="text-2xl font-bold">{stats.pendingLeads}</p><p className="text-sm text-muted-foreground">Pending Leads</p></div>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>Welcome to your clinic panel</CardTitle>
              <CardDescription>Use the sidebar to manage patients and clinic information.</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button onClick={() => setSection('patients')}><Users className="w-4 h-4 mr-1" /> View patients</Button>
              <Button variant="outline" onClick={() => setSection('info')}><Building2 className="w-4 h-4 mr-1" /> Edit clinic info</Button>
            </CardContent>
          </Card>
        </div>
      )}

      {section === 'patients' && (
        <Card><CardContent className="pt-6"><ApplicationsTab clinicId={clinic.id} /></CardContent></Card>
      )}

      {section === 'info' && (
        <Card><CardContent className="pt-6"><ClinicInfoTab clinic={clinic} onUpdated={() => loadClinic()} /></CardContent></Card>
      )}

      {section === 'settings' && isAdminUser && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" /> Admin Settings
            </CardTitle>
            <CardDescription>Platform-level controls. Visible to Super Admins and Sub-Admins only.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>Billing Type</Label>
                <Select value={billingType} onValueChange={setBillingType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="paid">Paid ($25/lead)</SelectItem>
                    <SelectItem value="free">Free (100% Discount)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Approval Status</Label>
                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">Pending</SelectItem>
                    <SelectItem value="approved">Approved</SelectItem>
                    <SelectItem value="rejected">Rejected</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">Published</Label>
                  <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="verified">Verified</Label>
                  <Switch id="verified" checked={isVerified} onCheckedChange={setIsVerified} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">Featured</Label>
                  <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveAdminSettings} disabled={savingAdmin}>
                {savingAdmin ? 'Saving…' : 'Save admin settings'}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
};

export default ClinicPanel;
