
import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { type Clinic, getCountries, getCities, updateClinic, type Country, type City } from "@/lib/services";
import ClinicImagesManager from "./ClinicImagesManager";
import ClinicTreatmentsManager from "./ClinicTreatmentsManager";
import ClinicDoctorsManager from "./ClinicDoctorsManager";

interface ClinicInfoTabProps {
  clinic: Clinic;
  onUpdated?: (updated: Clinic) => void;
}

export default function ClinicInfoTab({ clinic, onUpdated }: ClinicInfoTabProps) {
  const { toast } = useToast();

  const [form, setForm] = useState({
    name: clinic.name || "",
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
        console.error("Lokasyon verileri yüklenemedi:", e);
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
      console.error("Şehirler yüklenemedi:", e);
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
        <CardTitle>Klinik Bilgileri</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Klinik Adı</label>
            <Input value={form.name} onChange={(e) => onChange("name", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">E-posta</label>
            <Input value={form.email} onChange={(e) => onChange("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Telefon</label>
            <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Web Sitesi</label>
            <Input value={form.website} onChange={(e) => onChange("website", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">Trustpilot URL</label>
            <Input value={form.trustpilot_url} onChange={(e) => onChange("trustpilot_url", e.target.value)} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Adres</label>
          <Textarea value={form.address} onChange={(e) => onChange("address", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">Açıklama</label>
          <Textarea rows={4} value={form.description} onChange={(e) => onChange("description", e.target.value)} />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">Ülke</label>
            {loadingLoc ? (
              <div className="text-sm text-muted-foreground">Yükleniyor...</div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={countryId || ""}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                <option value="" disabled>
                  Ülke seçin
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
            <label className="text-sm font-medium mb-2 block">Şehir</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="" disabled>
                Şehir seçin
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              Seçili: {selectedCountryName} / {selectedCityName}
            </div>
          </div>
        </div>

        <div className="flex justify-end">
          <Button onClick={handleSave} disabled={saving} className="bg-gradient-primary hover:opacity-90">
            {saving ? "Kaydediliyor..." : "Bilgileri Güncelle"}
          </Button>
        </div>

        {/* Advanced sections */}
        <div className="border-t mt-6 pt-6 space-y-6">
          {/* Images */}
          {/* @ts-ignore - lazy import to avoid circular types */}
          <ImagesSection clinicId={clinic.id} onChanged={() => onUpdated?.(clinic)} />

          {/* Treatments */}
          {/* @ts-ignore */}
          <TreatmentsSection clinicId={clinic.id} onChanged={() => onUpdated?.(clinic)} />

          {/* Doctors */}
          {/* @ts-ignore */}
          <DoctorsSection clinicId={clinic.id} onChanged={() => onUpdated?.(clinic)} />
        </div>
      </CardContent>
    </Card>
  );
}
