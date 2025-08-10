
import { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { getClinicById, type Clinic } from "@/lib/services";
import ApplicationsTab from "@/components/clinic-panel/ApplicationsTab";
import ClinicInfoTab from "@/components/clinic-panel/ClinicInfoTab";

const ClinicPanel = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [clinic, setClinic] = useState<Clinic | null>(null);
  const [loading, setLoading] = useState(true);

  const loadClinic = async () => {
    if (!id) return;
    try {
      const data = await getClinicById(id);
      if (!data) {
        toast({ title: "Bulunamadı", description: "Klinik bulunamadı.", variant: "destructive" });
        navigate("/dashboard");
        return;
      }
      setClinic(data);
    } catch (e: any) {
      console.error("Klinik yüklenemedi:", e);
      toast({ title: "Hata", description: "Klinik bilgileri yüklenirken bir hata oluştu.", variant: "destructive" });
      navigate("/dashboard");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!id) {
      navigate("/dashboard");
      return;
    }
    loadClinic();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Yükleniyor...</div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Klinik bulunamadı.</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="border-b border-border/50 bg-card/50 backdrop-blur-sm sticky top-0 z-40">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold">{clinic.name} - Yönetim Paneli</h1>
              <p className="text-muted-foreground">Başvurularınızı ve klinik bilgilerinizi yönetin.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <Card className="p-4">
          <Tabs defaultValue="applications" className="space-y-6">
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="applications">Başvurular</TabsTrigger>
              <TabsTrigger value="clinic-info">Klinik Bilgileri</TabsTrigger>
            </TabsList>

            <TabsContent value="applications">
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
