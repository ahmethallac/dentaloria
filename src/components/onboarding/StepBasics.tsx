import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { ArrowRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { getCountries, getCities, type Clinic, type Country, type City } from "@/lib/services";
import GoogleBusinessLink from "@/components/clinic-panel/GoogleBusinessLink";

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

  // Saved clinic is held here (rather than jumping straight to onDone) so we
  // can show the Google Business linking step right after the clinic is
  // created — this is the earliest point a clinic row (and therefore a
  // google_place_id to attach) exists at all.
  const [savedClinic, setSavedClinic] = useState<Clinic | null>(initialClinic && clinicId ? initialClinic : null);

  const [form, setForm] = useState({
    clinicName: initialClinic?.name || "",
    email: initialClinic?.email || user?.email || "",
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
        email: form.email,
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

      setSavedClinic(saved);
    } catch (err: any) {
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (savedClinic) {
    return (
      <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">{t("basics.googleTitle")}</CardTitle>
          <CardDescription>{t("basics.googleSubtitle")}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <GoogleBusinessLink clinic={savedClinic} onUpdated={setSavedClinic} />
          <Button
            type="button"
            className="w-full bg-gradient-primary hover:opacity-90"
            onClick={() => onDone(savedClinic.id, savedClinic)}
          >
            {savedClinic.google_place_id ? t("wizard.nextButton") : t("basics.skipGoogle")}
            <ArrowRight className="ml-2 h-4 w-4" />
          </Button>
        </CardContent>
      </Card>
    );
  }

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
              <Label htmlFor="email">{t("basics.emailLabel")}</Label>
              <Input id="email" type="email" value={form.email} onChange={(e) => upd("email", e.target.value)} required />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="website">{t("basics.websiteLabel")}</Label>
            <Input id="website" placeholder="https://" value={form.website} onChange={(e) => upd("website", e.target.value)} />
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
