import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { useTranslation } from "react-i18next";
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
import { withLocalePrefix } from "@/lib/localePath";

type PanelSection = 'overview' | 'patients' | 'info' | 'sponsored' | 'settings';

const ClinicPanel = () => {
  const { id, lang } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation('clinicPanel');
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
      toast({ title: t('toasts.paymentSuccessTitle'), description: t('toasts.paymentSuccessDesc') });
    } else if (payment === 'cancelled') {
      toast({ title: t('toasts.paymentCancelledTitle'), description: t('toasts.paymentCancelledDesc'), variant: "destructive" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const loadClinic = async () => {
    if (!id) return;
    try {
      const data = await getClinicByIdPrivate(id);
      if (!data) {
        toast({ title: t('toasts.notFoundTitle'), description: t('toasts.notFoundDesc'), variant: "destructive" });
        navigate(withLocalePrefix(isAdminUser ? "/admin" : "/dashboard", lang));
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
      toast({ title: t('toasts.errorTitle'), description: t('toasts.genericErrorDesc'), variant: "destructive" });
      navigate(withLocalePrefix(isAdminUser ? "/admin" : "/dashboard", lang));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) { navigate(withLocalePrefix("/dashboard", lang)); return; }
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
      toast({ title: t('toasts.savedTitle'), description: t('toasts.savedDesc') });
      loadClinic();
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: "destructive" });
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
        title: value ? t('toasts.showcaseAddedTitle') : t('toasts.showcaseRemovedTitle'),
        description: value ? t('toasts.showcaseAddedDesc') : t('toasts.showcaseRemovedDesc'),
      });
    } catch (e: any) {
      setHomepageShowcase(previous);
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' });
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
      toast({ title: t('toasts.submittedTitle'), description: t('toasts.submittedDesc') });
      loadClinic();
      supabase.functions.invoke('send-clinic-notification', {
        body: { type: 'page_submitted', clinicId: id },
      }).catch(() => {});
    } catch (e: any) {
      toast({ title: t('toasts.errorTitle'), description: e.message, variant: 'destructive' });
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

  if (!clinic) return <div className="min-h-screen flex items-center justify-center">{t('notFound')}</div>;

  const sectionLabels: Record<PanelSection, string> = {
    overview: t('sections.overview'),
    patients: t('sections.patients'),
    info: t('sections.info'),
    sponsored: t('sections.sponsored'),
    settings: t('sections.settings'),
  };

  const clinicSections: ShellSection[] = [
    {
      label: t('sidebar.clinicGroup'),
      items: [
        { id: 'overview', label: t('sections.overview'), icon: LayoutDashboard, onClick: () => setSection('overview'), active: section === 'overview' },
        { id: 'patients', label: t('sections.patients'), icon: Users, onClick: () => setSection('patients'), active: section === 'patients', badge: stats.totalLeads },
        { id: 'info', label: t('sections.info'), icon: Building2, onClick: () => setSection('info'), active: section === 'info' },
      ],
    },
    {
      label: t('sidebar.administrationGroup'),
      items: [
        { id: 'settings', label: t('sections.settings'), icon: Shield, onClick: () => setSection('settings'), active: section === 'settings', hidden: !isAdminUser },
      ],
    },
  ];

  // For super admin / sub admin: keep the admin sidebar visible at all times
  // and render the clinic management as a sub-page with in-content tabs.
  const adminSections: ShellSection[] = [
    {
      label: t('sidebar.workspaceGroup'),
      items: [
        { id: 'dashboard', label: t('sidebar.dashboard'), icon: LayoutDashboard, onClick: () => navigate(withLocalePrefix('/admin?section=dashboard', lang)) },
        { id: 'clinics', label: t('sidebar.clinics'), icon: Building2, onClick: () => navigate(withLocalePrefix('/admin?section=clinics', lang)), active: true },
        { id: 'approvals', label: t('sidebar.pendingApprovals'), icon: Clock, onClick: () => navigate(withLocalePrefix('/admin?section=approvals', lang)) },
        { id: 'patients', label: t('sidebar.allPatients'), icon: Users, onClick: () => navigate(withLocalePrefix('/admin?section=patients', lang)) },
      ],
    },
    {
      label: t('sidebar.administrationGroup'),
      items: [
        { id: 'users', label: t('sidebar.users'), icon: UserCog, onClick: () => navigate(withLocalePrefix('/admin?section=users', lang)), hidden: userRole !== 'admin' },
      ],
    },
  ];

  const sections = isAdminUser ? adminSections : clinicSections;

  const clinicDisplayName = (clinic as any).display_name || clinic.name;
  const panelRoot = withLocalePrefix(`/clinic/${clinic.id}/panel?section=overview`, lang);
  const breadcrumbs = isAdminUser
    ? [
        { label: t('breadcrumbs.admin'), to: withLocalePrefix('/admin?section=clinics', lang) },
        { label: t('sidebar.clinics'), to: withLocalePrefix('/admin?section=clinics', lang) },
        { label: clinicDisplayName, to: panelRoot },
        { label: sectionLabels[section] },
      ]
    : [
        { label: t('breadcrumbs.dashboard'), to: withLocalePrefix('/dashboard', lang) },
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
          <Button variant="outline" size="sm" onClick={() => navigate(withLocalePrefix('/admin?section=clinics', lang))}>
            <ArrowLeft className="w-4 h-4 mr-1" /> {t('backToAllClinics')}
          </Button>
          <Tabs value={section} onValueChange={(v) => setSection(v as PanelSection)}>
            <TabsList>
              <TabsTrigger value="overview"><LayoutDashboard className="w-4 h-4 mr-1" />{t('sections.overview')}</TabsTrigger>
              <TabsTrigger value="patients"><Users className="w-4 h-4 mr-1" />{t('sections.patients')}</TabsTrigger>
              <TabsTrigger value="info"><Building2 className="w-4 h-4 mr-1" />{t('sections.clinicInfoShort')}</TabsTrigger>
              <TabsTrigger value="sponsored"><Megaphone className="w-4 h-4 mr-1" />{t('sections.sponsored')}</TabsTrigger>
              <TabsTrigger value="settings"><Shield className="w-4 h-4 mr-1" />{t('sections.settings')}</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>
      )}

      {/* Unified review banner: the clinic submitted its full profile + documents
          together via the onboarding wizard and is waiting on a single admin
          review (no separate document-then-content stages anymore). The rest
          of the panel stays fully usable while this is pending. */}
      {approvalStatus === 'pending' && pageStatus === 'pending_page_approval' && (
        <Card className="mb-6 border border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="pt-6 flex flex-col md:flex-row md:items-start justify-between gap-3">
            <div className="space-y-1">
              <p className="font-semibold">{t('pageBanner.applicationPendingTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('pageBanner.applicationPendingDesc')}</p>
            </div>
            <Badge variant="secondary" className="self-start md:self-center">{t('pageBanner.pendingBadge')}</Badge>
          </CardContent>
        </Card>
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
                  ? t('pageBanner.revisionsTitle')
                  : pageStatus === 'pending_page_approval'
                    ? t('pageBanner.pendingTitle')
                    : t('pageBanner.completeTitle')}
              </p>
              {pageRevisionNotes ? (
                <>
                  <p className="text-sm text-muted-foreground">{t('pageBanner.makeCorrections')}</p>
                  <p className="text-sm whitespace-pre-wrap rounded-md border bg-background/60 p-3">
                    {pageRevisionNotes}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {t('pageBanner.editAgainNote')}
                  </p>
                </>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {pageStatus === 'pending_page_approval'
                    ? t('pageBanner.pendingDesc')
                    : t('pageBanner.completeDesc')}
                </p>
              )}
            </div>
            {pageStatus === 'pending_page_approval' && (
              <Badge variant="secondary" className="self-start md:self-center">{t('pageBanner.pendingBadge')}</Badge>
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
              <p className="font-semibold text-destructive">{t('balance.emptyTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('balance.emptyDesc')}</p>
            </div>
            <Link to={withLocalePrefix(`/clinic/${clinic.id}/panel/balance`, lang)}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">{t('balance.addBalance')}</Button>
            </Link>
          </CardContent>
        </Card>
      )}
      {balanceCents > 0 && balanceCents < 5000 && (
        <Card className="mb-6 border border-yellow-500/40 bg-yellow-500/5">
          <CardContent className="pt-6 flex items-start gap-3">
            <Wallet className="w-5 h-5 text-yellow-600 mt-0.5" />
            <div className="flex-1">
              <p className="font-semibold text-yellow-700 dark:text-yellow-400">{t('balance.lowTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('balance.lowDesc', { amount: (balanceCents/100).toFixed(2) })}</p>
            </div>
            <Link to={withLocalePrefix(`/clinic/${clinic.id}/panel/balance`, lang)}>
              <Button size="sm" className="bg-green-600 hover:bg-green-700 text-white">{t('balance.addBalance')}</Button>
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
              <div><p className="text-2xl font-bold">{stats.totalLeads}</p><p className="text-sm text-muted-foreground">{t('overview.totalPatients')}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <BarChart3 className="w-8 h-8 text-green-500" />
              <div><p className="text-2xl font-bold">{stats.purchasedLeads}</p><p className="text-sm text-muted-foreground">{t('overview.unlockedLeads')}</p></div>
            </CardContent></Card>
            <Card><CardContent className="pt-6 flex items-center gap-3">
              <Settings className="w-8 h-8 text-orange-500" />
              <div><p className="text-2xl font-bold">{stats.pendingLeads}</p><p className="text-sm text-muted-foreground">{t('overview.pendingLeads')}</p></div>
            </CardContent></Card>
          </div>
          <Card>
            <CardHeader>
              <CardTitle>{t('overview.welcomeTitle')}</CardTitle>
              <CardDescription>{t('overview.welcomeDesc')}</CardDescription>
            </CardHeader>
            <CardContent className="flex gap-2 flex-wrap">
              <Button onClick={() => setSection('patients')}><Users className="w-4 h-4 mr-1" /> {t('overview.viewPatients')}</Button>
              <Button variant="outline" onClick={() => setSection('info')}><Building2 className="w-4 h-4 mr-1" /> {t('overview.editClinicInfo')}</Button>
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

      {section === 'sponsored' && isAdminUser && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Megaphone className="w-5 h-5" /> {t('sponsored.title')}
            </CardTitle>
            <CardDescription>
              {t('sponsored.description')}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="rounded-lg border border-border bg-card p-4 flex items-start justify-between gap-4">
              <div className="space-y-1">
                <Label htmlFor="homepage_showcase" className="text-base font-semibold">
                  {t('sponsored.showcaseLabel')}
                </Label>
                <p className="text-sm text-muted-foreground max-w-xl">
                  {t('sponsored.showcaseDesc')}
                </p>
              </div>
              <Switch
                id="homepage_showcase"
                checked={homepageShowcase}
                onCheckedChange={handleToggleHomepageShowcase}
                disabled={savingShowcase}
              />
            </div>
          </CardContent>
        </Card>
      )}


      {section === 'settings' && isAdminUser && (
        <Card className="border-primary/30">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-primary">
              <Shield className="w-5 h-5" /> {t('settings.title')}
            </CardTitle>
            <CardDescription>{t('settings.description')}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label>{t('settings.pricingLabel')}</Label>
                <div className="px-3 py-2 rounded-md border border-border bg-muted/40 text-sm">
                  {t('settings.pricingValue')}
                </div>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.approvalStatusLabel')}</Label>
                <Select value={approvalStatus} onValueChange={setApprovalStatus}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="pending">{t('settings.statusPending')}</SelectItem>
                    <SelectItem value="approved">{t('settings.statusApproved')}</SelectItem>
                    <SelectItem value="rejected">{t('settings.statusRejected')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>{t('settings.pageStatusLabel')}</Label>
                <Select value={pageStatus} onValueChange={(v: any) => setPageStatus(v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="incomplete">{t('settings.pageIncomplete')}</SelectItem>
                    <SelectItem value="pending_page_approval">{t('settings.pagePendingApproval')}</SelectItem>
                    <SelectItem value="live">{t('settings.pageLive')}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <Label htmlFor="published">{t('settings.publishedLabel')}</Label>
                  <Switch id="published" checked={isPublished} onCheckedChange={setIsPublished} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="verified">{t('settings.verifiedLabel')}</Label>
                  <Switch id="verified" checked={isVerified} onCheckedChange={setIsVerified} />
                </div>
                <div className="flex items-center justify-between">
                  <Label htmlFor="featured">{t('settings.featuredLabel')}</Label>
                  <Switch id="featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
                </div>
              </div>
            </div>
            <div className="mt-6 flex justify-end">
              <Button onClick={handleSaveAdminSettings} disabled={savingAdmin}>
                {savingAdmin ? t('settings.saving') : t('settings.saveButton')}
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </AdminShell>
  );
};

export default ClinicPanel;
