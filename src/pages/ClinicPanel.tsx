import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
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
  Building2, Users, Settings, BarChart3, Shield, LayoutDashboard, Loader2, AlertTriangle, Wallet,
  Clock, UserCog, ArrowLeft, Megaphone,
} from "lucide-react";
import AdminShell, { ShellSection } from "@/components/layout/AdminShell";
import BalanceWidget from "@/components/clinic-panel/BalanceWidget";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

type PanelSection = 'overview' | 'patients' | 'info' | 'sponsored' | 'settings';

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

  const [balanceCents, setBalanceCents] = useState(0);
  const [isPublished, setIsPublished] = useState(false);
  const [isVerified, setIsVerified] = useState(false);
  const [isFeatured, setIsFeatured] = useState(false);
  const [homepageShowcase, setHomepageShowcase] = useState(false);
  const [savingShowcase, setSavingShowcase] = useState(false);
  const [approvalStatus, setApprovalStatus] = useState('pending');
  const [pageStatus, setPageStatus] = useState<'incomplete' | 'pending_page_approval' | 'live'>('incomplete');
  const [pageRevisionNotes, setPageRevisionNotes] = useState<string | null>(null);
  const [savingAdmin, setSavingAdmin] = useState(false);
  const [submittingPage, setSubmittingPage] = useState(false);

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
      setHomepageShowcase((data as any).homepage_showcase || false);
      setApprovalStatus((data as any).approval_status || 'pending');
      setPageStatus(((data as any).page_status as any) || 'incomplete');
      setPageRevisionNotes(((data as any).page_revision_notes as string | null) ?? null);

      const [leadsRes, purchasesRes, balanceRes] = await Promise.all([
        supabase.from('contact_requests').select('id', { count: 'exact' }).eq('clinic_id', id),
        supabase.from('lead_purchases').select('id', { count: 'exact' }).eq('clinic_id', id),
        supabase.from('clinic_balances').select('balance_cents').eq('clinic_id', id).maybeSingle(),
      ]);
      const totalLeads = leadsRes.count || 0;
      const purchasedLeads = purchasesRes.count || 0;
      setStats({ totalLeads, purchasedLeads, pendingLeads: totalLeads - purchasedLeads });
      setBalanceCents((balanceRes.data as any)?.balance_cents ?? 0);
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
        .update({ is_published: isPublished, is_verified: isVerified, is_featured: isFeatured, approval_status: approvalStatus, page_status: pageStatus })
        .eq('id', id);
      if (clinicError) throw clinicError;
      // Billing settings table removed - all clinics use the prepaid balance system at €25/lead.
      toast({ title: "Saved", description: "Admin settings updated successfully." });
      loadClinic();
    } catch (e: any) {
      toast({ title: "Error", description: e.message, variant: "destructive" });
    } finally {
      setSavingAdmin(false);
    }
  };

  const handleToggleHomepageShowcase = async (value: boolean) => {
    if (!id) return;
    setSavingShowcase(true);
    const previous = homepageShowcase;
    setHomepageShowcase(value);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ homepage_showcase: value } as any)
        .eq('id', id);
      if (error) throw error;
      toast({
        title: value ? 'Added to Homepage Showcase' : 'Removed from Homepage Showcase',
        description: value
          ? 'This clinic will now appear in the Featured Clinics section on the homepage.'
          : 'This clinic will no longer appear on the homepage.',
      });
    } catch (e: any) {
      setHomepageShowcase(previous);
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSavingShowcase(false);
    }
  };

  const handleSubmitForApproval = async () => {
    if (!id) return;
    setSubmittingPage(true);
    try {
      const { error } = await supabase
        .from('clinics')
        .update({ page_status: 'pending_page_approval', page_revision_notes: null })
        .eq('id', id);
      if (error) throw error;
      toast({ title: 'Submitted', description: 'Your page has been submitted for Super Admin approval.' });
      loadClinic();
    } catch (e: any) {
      toast({ title: 'Error', description: e.message, variant: 'destructive' });
    } finally {
      setSubmittingPage(false);
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
    sponsored: 'Sponsored',
    settings: 'Admin Settings',
  };

  const clinicSections: ShellSection[] = [
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

  // For super admin / sub admin: keep the admin sidebar visible at all times
  // and render the clinic management as a sub-page with in-content tabs.
  const adminSections: ShellSection[] = [
    {
      label: 'Workspace',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard, onClick: () => navigate('/admin?section=dashboard') },
        { id: 'clinics', label: 'Clinics', icon: Building2, onClick: () => navigate('/admin?section=clinics'), active: true },
        { id: 'approvals', label: 'Pending Approvals', icon: Clock, onClick: () => navigate('/admin?section=approvals') },
        { id: 'patients', label: 'All Patients', icon: Users, onClick: () => navigate('/admin?section=patients') },
      ],
    },
    {
      label: 'Administration',
      items: [
        { id: 'users', label: 'Users', icon: UserCog, onClick: () => navigate('/admin?section=users'), hidden: userRole !== 'admin' },
      ],
    },
  ];

  const sections = isAdminUser ? adminSections : clinicSections;

  const clinicDisplayName = (clinic as any).display_name || clinic.name;
  const panelRoot = `/clinic/${clinic.id}/panel?section=overview`;
  const breadcrumbs = isAdminUser
    ? [
        { label: 'Admin', to: '/admin?section=clinics' },
        { label: 'Clinics', to: '/admin?section=clinics' },
        { label: clinicDisplayName, to: panelRoot },
        { label: sectionLabels[section] },
      ]
    : [
        { label: 'Dashboard', to: '/dashboard' },
        { label: clinicDisplayName, to: panelRoot },
        { label: sectionLabels[section] },
      ];

  return (
    <AdminShell
      sections={sections}
      title={`${clinicDisplayName} — ${sectionLabels[section]}`}
      breadcrumbs={breadcrumbs}
      headerExtra={
        <Badge variant={(clinic as any).approval_status === 'approved' ? 'default' : 'secondary'}>
          {(clinic as any).approval_status || 'pending'}
        </Badge>
      }
    >
      {isAdminUser && (
        <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
          <Button variant="outline" size="sm" onClick={() => navigate('/admin?section=clinics')}>
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to all clinics
          </Button>
          <Tabs value={section} onValueChange={(v) => setSection(v as PanelSection)}>
            <TabsList>
              <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1" />Overview</TabsTrigger>
              <TabsTrigger value="patients"><Users className="w-4 h-4 mr-1" />Patients</TabsTrigger>
              <TabsTrigger value="info"><Building2 className="w-4 h-4 mr-1" />Clinic Info</TabsTrigger>
              <TabsTrigger value="sponsored"><Megaphone className="w-4 h-4 mr-1" />Sponsored</TabsTrigger>
              <TabsTrigger value="settings"><Shield className="w-4 h-4 mr-1" />Admin Settings</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Page status banner — informational only. The "Submit for Approval"
          button now lives at the bottom of the Clinic Information editor. */}
      {approvalStatus === 'approved' && pageStatus !== 'live' && (
        <Card
          className={`mb-6 border ${
            pageRevisionNotes
              ? 'border-destructive/50 bg-destructive/5'
              : pageStatus === 'pending_page_approval'
                ? 'border-yellow-500/50 bg-yellow-500/5'
                : 'border-primary/40 bg-primary/5'
          }`}
        >
          <CardContent className="pt-6 flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">
                {pageRevisionNotes
                  ? 'Your page was sent back for revisions'
                  : pageStatus === 'pending_page_approval'
                    ? 'Your page is awaiting Super Admin approval'
                    : 'Complete your clinic page'}
              </p>
              {pageRevisionNotes ? (
                <>
                  <p className="text-sm text-muted-foreground">Please make the following corrections:</p>
                  <p className="text-sm whitespace-pre-wrap rounded-md border bg-background/60 p-3">
                    {pageRevisionNotes}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    Edit your clinic information and submit it again from the Clinic Information page.
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {pageStatus === 'pending_page_approval'
                    ? 'You can keep editing — your clinic will go live once approved.'
                    : 'Add photos, doctors, treatments and a description, then submit your page for approval from the Clinic Information page.'}
                </p>
              )}
            </div>
            {pageStatus === 'pending_page_approval' && (
              <Badge variant="secondary" className="self-start md:self-center">Pending page approval</Badge>
            )}
          </CardContent>
        </Card>
      )}

      {/* Balance banners */}
      {balanceCents === 0 && (
        <Card className="mb-6 border border-destructive/40 bg-destructive/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-destructive mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-destructive">Balance empty</p>
              <p className="text-sm text-muted-foreground">Incoming leads will be locked until you top up.</p>
            </div>
            <Link to={`/clinic/${clinic.id}/panel/balance`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Add Balance</Button>
            </Link>
          </CardContent>
        </Card>
      )}
      {balanceCents > 0 && balanceCents < 5000 && (
        <Card className="mb-6 border border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <Wallet className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">Low balance — top up soon</p>
              <p className="text-sm text-muted-foreground">You have less than 2 leads remaining (€{(balanceCents/100).toFixed(2)}).</p>
            </div>
            <Link to={`/clinic/${clinic.id}/panel/balance`}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">Add Balance</Button>
            </Link>
          </CardContent>
        </Card>
      )}

      {section === 'overview' && (
        <div className="space-y-6">
          <BalanceWidget clinicId={clinic.id} />
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
        <Card><CardContent className="pt-6"><ClinicInfoTab
          clinic={clinic}
          onUpdated={() => loadClinic()}
          pageStatus={pageStatus}
          isAdminUser={isAdminUser}
          submittingPage={submittingPage}
          onSubmitForApproval={handleSubmitForApproval}
        /></CardContent></Card>
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
                <Label>Pricing</Label>
                <div className="px-3 py-2 rounded-md border border-border bg-muted/40 text-sm">
                  Fixed €25 per lead (prepaid balance)
                </div>
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
              <div className="space-y-2">
                <Label>Page Status</Label>
                <Select value={pageStatus} onValueChange={(v: any) => setPageStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incomplete">Incomplete</SelectItem>
                    <SelectItem value="pending_page_approval">Pending Page Approval</SelectItem>
                    <SelectItem value="live">Live</SelectItem>
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
