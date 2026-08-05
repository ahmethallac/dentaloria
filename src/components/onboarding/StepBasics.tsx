import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCountries, getCities, type Clinic, type Country, type City } from "@/lib/services";

interface Props {
  lang?: string;
  clinicId: string | null;
  initialClinic: Clinic | null;
  onDone: (clinicId: string, clinic: Clinic) => void;
}

export default function StepBasics({ lang, clinicId, initialClinic, onDone }: Props) {
  const { t } = useTranslation("registerClinic");
  const { toast } = useToast();
  const { user } = useAuth();

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryId, setCountryId] = useState(initialClinic?.cities?.countries?.id || "");
  const [submitting, setSubmitting] = useState(false);

  const [form, setForm] = useState({
    clinicName: initialClinic?.name || "",
    cityId: initialClinic?.city_id || "",
    phone: initialClinic?.phone || "",
    website: initialClinic?.website || "",
  });

  useEffect(() => {
    (async () => {
      const [c, ct] = await Promise.all([getCountries(), getCities()]);
      setCountries(c);
      setCities(ct);
    })();
  }, []);

  const filteredCities = countryId ? cities.filter((c) => c.country_id === countryId) : [];

  const upd = (k: string, v: string) => setForm((prev) => ({ ...prev, [k]: v }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    if (!form.cityId) {
      toast({ title: t("errors.title"), description: t("errors.cityRequired"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        name: form.clinicName.trim().toUpperCase(),
        display_name: form.clinicName.trim(),
        city_id: form.cityId,
        phone: form.phone,
        website: form.website || null,
      };

      let saved: Clinic;
      if (clinicId) {
        const { data, error } = await supabase.from("clinics").update(payload).eq("id", clinicId).select("*").single();
        if (error) throw error;
        saved = data as Clinic;
      } else {
        const { data, error } = await supabase
          .from("clinics")
          .insert({
            ...payload,
            user_id: user.id,
            email: user.email,
            approval_status: "pending",
            page_status: "incomplete",
            is_published: false,
            locale: lang || "en",
          })
          .select("*")
          .single();
        if (error) throw error;
        saved = data as Clinic;
      }

      onDone(saved.id, saved);
    } catch (err: any) {
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("basics.title")}</CardTitle>
        <CardDescription>{t("basics.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-2">
            <Label htmlFor="clinicName">{t("basics.clinicNameLabel")}</Label>
            <Input id="clinicName" value={form.clinicName} onChange={(e) => upd("clinicName", e.target.value)} required />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label>{t("basics.countryLabel")}</Label>
              <Select value={countryId} onValueChange={(v) => { setCountryId(v); upd("cityId", ""); }}>
                <SelectTrigger><SelectValue placeholder={t("basics.selectCountry")} /></SelectTrigger>
                <SelectContent>
                  {countries.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>{t("basics.cityLabel")}</Label>
              <Select value={form.cityId} onValueChange={(v) => upd("cityId", v)} disabled={!countryId}>
                <SelectTrigger><SelectValue placeholder={countryId ? t("basics.selectCity") : t("basics.selectCountryFirst")} /></SelectTrigger>
                <SelectContent>
                  {filteredCities.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-2">
              <Label htmlFor="phone">{t("basics.phoneLabel")}</Label>
              <Input id="phone" value={form.phone} onChange={(e) => upd("phone", e.target.value)} required />
            </div>
            <div className="space-y-2">
              <Label htmlFor="website">{t("basics.websiteLabel")}</Label>
              <Input id="website" placeholder="https://" value={form.website} onChange={(e) => upd("website", e.target.value)} />
            </div>
          </div>

          <Button type="submit" className="w-full bg-gradient-primary hover:opacity-90" disabled={submitting}>
            {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {t("wizard.nextButton")}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
