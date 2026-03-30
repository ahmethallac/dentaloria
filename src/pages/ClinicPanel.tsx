import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Building2, Users, Settings, BarChart3, ArrowLeft, Shield } from "lucide-react";

const ClinicPanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { userRole } = useAuth();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchasedLeads: 0, pendingLeads: 0 });

  // Admin settings state
  const [billingType, setBillingType] = useState<string>('paid');
  const [isPublished, setIsPublished] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [savingAdmin, setSavingAdmin] = useState(false);

  const isAdminUser = userRole === 'admin' || userRole === 'sub_admin';

  // Handle payment callback
  useEffect(() => {
    const payment = searchParams.get('payment');
    if (payment === 'success') {
      toast({ title: "Payment Successful!", description: "Lead contacts have been unlocked." });
    } else if (payment === 'cancelled') {
      toast({ title: "Payment Cancelled", description: "No leads were unlocked.", variant: "destructive" });
    }
  }, [searchParams]);

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

      // Load billing + stats
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
  }, [id]);

  const handleSaveAdminSettings = async () => {
    if (!id || !clinic) return;
    setSavingAdmin(true);
    try {
      // Update clinic fields
      const { error: clinicError } = await supabase
        .from('clinics')
        .update({
          is_published: isPublished,
          is_verified: isVerified,
          is_featured: isFeatured,
          approval_status: approvalStatus,
        })
        .eq('id', id);

      if (clinicError) throw clinicError;

      // Update billing
      const { error: billingError } = await supabase
        .from('clinic_billing_settings')
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
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Clinic not found.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="sm" onClick={() => navigate(isAdminUser ? '/admin' : '/')}>
                <ArrowLeft className="w-4 h-4 mr-1" /> Back
              </Button>
              <div>
                <h1 className="text-xl md:text-2xl font-bold flex items-center gap-2">
                  <Building2 className="w-5 h-5 text-primary" />
                  {clinic.name}
                </h1>
                <p className="text-sm text-muted-foreground">Clinic Management Panel</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant={(clinic as any).approval_status === 'approved' ? 'default' : 'secondary'}>
                {(clinic as any).approval_status || 'pending'}
              </Badge>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-6">
        {/* Admin Settings Section - only for admin/sub_admin */}
        {isAdminUser && (
          <Card className="mb-6 border-primary/30">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-primary">
                <Shield className="w-5 h-5" />
                Admin Settings
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {/* Billing Type */}
                <div className="space-y-2">
                  <Label>Billing Type</Label>
                  <Select value={billingType} onValueChange={setBillingType}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="paid">💰 Paid ($25/lead)</SelectItem>
                      <SelectItem value="free">🆓 Free (100% Discount)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Approval Status */}
                <div className="space-y-2">
                  <Label>Approval Status</Label>
                  <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="pending">Pending</SelectItem>
                      <SelectItem value="approved">Approved</SelectItem>
                      <SelectItem value="rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                {/* Toggles */}
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

              <div className="mt-4 flex justify-end">
                <Button onClick={handleSaveAdminSettings} disabled={savingAdmin}>
                  {savingAdmin ? 'Saving...' : 'Save Admin Settings'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Users className="w-8 h-8 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{stats.totalLeads}</p>
                <p className="text-sm text-muted-foreground">Total Patients</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{stats.purchasedLeads}</p>
                <p className="text-sm text-muted-foreground">Unlocked Leads</p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="pt-6 flex items-center gap-3">
              <Settings className="w-8 h-8 text-orange-500" />
              <div>
                <p className="text-2xl font-bold">{stats.pendingLeads}</p>
                <p className="text-sm text-muted-foreground">Pending Leads</p>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Tabs */}
        <Card className="p-4">
          <Tabs defaultValue="patients" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="patients">Patients</TabsTrigger>
              <TabsTrigger value="clinic-info">Clinic Information</TabsTrigger>
            </TabsList>

            <TabsContent value="patients">
              <ApplicationsTab clinicId={clinic.id} />
            </TabsContent>

            <TabsContent value="clinic-info">
              <ClinicInfoTab clinic={clinic} onUpdated={() => loadClinic()} />
            </TabsContent>
          </Tabs>
        </Card>
      </div>
    </div>
  );
};

export default ClinicPanel;