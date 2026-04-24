import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { type Clinic, getCountries, getCities, updateClinic, type Country, type City } from "@/lib/services";
import ClinicImagesManager from "./ClinicImagesManager";
import ClinicTreatmentsManager from "./ClinicTreatmentsManager";
import ClinicDoctorsManager from "./ClinicDoctorsManager";

interface ClinicInfoTabProps {
  clinic: Clinic;
  onUpdated?: (updated: Clinic) => void;
  pageStatus?: "incomplete" | "pending_page_approval" | "live";
  isAdminUser?: boolean;
  submittingPage?: boolean;
  onSubmitForApproval?: () => void;
}

export default function ClinicInfoTab({ clinic, onUpdated, pageStatus, isAdminUser, submittingPage, onSubmitForApproval }: ClinicInfoTabProps) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    // `name` here is the official LEGAL company name from registration.
    // It stays read-only on this page and is never shown on the public site.
    name: clinic.name || "",
    // `display_name` is the short, commonly-known name. Required before the
    // page can be submitted for approval. Used everywhere the clinic is shown.
    display_name: (clinic as any).display_name || "",
    email: clinic.email || "",
    phone: clinic.phone || "",
    website: clinic.website || "",
    trustpilot_url: (clinic as any).trustpilot_url || "",
    address: clinic.address || "",
    description: clinic.description || "",
  });

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryId, setCountryId] = useState<string | undefined>(clinic.cities?.countries?.id);
  const [cityId, setCityId] = useState<string>(clinic.city_id);

  const [saving, setSaving] = useState(false);
  const [loadingLoc, setLoadingLoc] = useState(true);

  useEffect(() => {
    const init = async () => {
      setLoadingLoc(true);
      try {
        const cs = await getCountries();
        setCountries(cs);
        const cid = clinic.cities?.countries?.id;
        if (cid) {
          const _cities = await getCities(cid);
          setCities(_cities);
        }
      } catch (e) {
        console.error("Could not load location data:", e);
      } finally {
        setLoadingLoc(false);
      }
    };
    init();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinic.id]);

  const selectedCountryName = useMemo(
    () => countries.find((c) => c.id === countryId)?.name || clinic.cities?.countries?.name || "",
    [countries, countryId, clinic.cities?.countries?.name]
  );

  const selectedCityName = useMemo(
    () => cities.find((c) => c.id === cityId)?.name || clinic.cities?.name || "",
    [cities, cityId, clinic.cities?.name]
  );

  const onChange = (key: keyof typeof form, value: string) => setForm((f) => ({ ...f, [key]: value }));

  const handleCountryChange = async (id: string) => {
    setCountryId(id);
    setCityId("");
    try {
      const _cities = await getCities(id);
      setCities(_cities);
    } catch (e) {
      console.error("Could not load cities:", e);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updates: Partial<Clinic> & { trustpilot_url?: string } = {
        name: form.name,
        email: form.email,
        phone: form.phone,
        website: form.website,
        address: form.address,
        description: form.description,
        city_id: cityId || clinic.city_id,
        // @ts-ignore
        trustpilot_url: form.trustpilot_url,
      };
      const updated = await updateClinic(clinic.id, updates as any);
      toast({ title: "Başarılı", description: "Klinik bilgileri güncellendi." });
      onUpdated?.(updated);
    } catch (e: any) {
      console.error("Klinik güncellenemedi:", e);
      toast({ title: "Hata", description: "Klinik bilgileri güncellenirken bir hata oluştu.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Clinic Information</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Clinic Name</label>
            <Input value={form.name} onChange={(e) => onChange("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Email</label>
            <Input value={form.email} onChange={(e) => onChange("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Phone</label>
            <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Website</label>
            <Input value={form.website} onChange={(e) => onChange("website", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Trustpilot URL</label>
            <Input value={form.trustpilot_url} onChange={(e) => onChange("trustpilot_url", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Address</label>
          <Textarea value={form.address} onChange={(e) => onChange("address", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Description</label>
          <Textarea rows={4} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Country</label>
            {loadingLoc ? (
              <div className="text-sm text-muted-foreground">Loading...</div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={countryId || ""}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                <option value="" disabled>
                  Select Country
                </option>
                {countries.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">City</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="" disabled>
                Select City
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              Selected: {selectedCountryName} / {selectedCityName}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary hover:opacity-90">
            {saving ? "Saving..." : "Update Information"}
          </Button>
        </div>

        {/* Advanced sections */}
        <div className="border-t mt-6 pt-6 space-y-6">
          {/* Images */}
          <ClinicImagesManager
            clinicId={clinic.id}
            images={(clinic.clinic_images as any) || []}
            onChanged={() => onUpdated?.(clinic)}
          />

          {/* Treatments */}
          <ClinicTreatmentsManager
            clinicId={clinic.id}
            selections={
              ((clinic.clinic_treatments as any) || []).map((ct: any) => ({
                treatment_id: ct.treatment_id,
                starting_price_euro: ct.starting_price_euro ?? ct.price ?? 0,
              }))
            }
            onChanged={() => onUpdated?.(clinic)}
          />

          {/* Doctors */}
          <ClinicDoctorsManager
            clinicId={clinic.id}
            doctors={(clinic.doctors as any) || []}
            onChanged={() => onUpdated?.(clinic)}
          />
        </div>

        {/* Submit for Approval — only for clinic owners (not Super Admins) and only when the page can still be submitted */}
        {!isAdminUser && onSubmitForApproval && pageStatus === "incomplete" && (
          <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <p className="font-semibold">Ready to go live?</p>
              <p className="text-sm text-muted-foreground">
                Once you've added your photos, doctors, treatments and description, submit your page for Super Admin approval.
              </p>
            </div>
            <Button onClick={onSubmitForApproval} disabled={!!submittingPage}>
              {submittingPage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
              Submit for Approval
            </Button>
          </div>
        )}
        {!isAdminUser && pageStatus === "pending_page_approval" && (
          <div className="border-t mt-6 pt-6 text-sm text-muted-foreground">
            Your page is awaiting Super Admin approval. You can keep editing — it will go live once approved.
          </div>
        )}
      </CardContent>
    </Card>
  );
}
