import { useEffect, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { getClinicByIdPrivate, type Clinic } from "@/lib/services";
import { supabase } from "@/integrations/supabase/client";
import ApplicationsTab from "@/components/clinic-panel/ApplicationsTab";
import ClinicInfoTab from "@/components/clinic-panel/ClinicInfoTab";
import { Building2, Users, Settings, BarChart3, ArrowLeft } from "lucide-react";

const ClinicPanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({ totalLeads: 0, purchasedLeads: 0, pendingLeads: 0 });

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
        navigate("/dashboard");
        return;
      }
      setClinic(data);
      
      // Load stats
      const [leadsRes, purchasesRes] = await Promise.all([
        supabase.from('contact_requests').select('id', { count: 'exact' }).eq('clinic_id', id),
        supabase.from('lead_purchases').select('id', { count: 'exact' }).eq('clinic_id', id),
      ]);
      
      const totalLeads = leadsRes.count || 0;
      const purchasedLeads = purchasesRes.count || 0;
      setStats({ totalLeads, purchasedLeads, pendingLeads: totalLeads - purchasedLeads });
    } catch (e: any) {
      console.error("Could not load clinic:", e);
      toast({ title: "Error", description: "An error occurred.", variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) { navigate("/dashboard"); return; }
    loadClinic();
  }, [id]);

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
              <Button variant="ghost" size="sm" onClick={() => navigate('/')}>
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

      {/* Stats */}
      <div className="container mx-auto px-4 py-6">
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
