import { useEffect, useMemo, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Loader2, Send } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { type Clinic, getCountries, getCities, updateClinic, type Country, type City } from "@/lib/services";
import ClinicImagesManager from "./ClinicImagesManager";
import ClinicTreatmentsManager, { type ClinicTreatmentsHandle } from "./ClinicTreatmentsManager";
import ClinicDoctorsManager from "./ClinicDoctorsManager";
import ClinicBeforeAfterManager from "./ClinicBeforeAfterManager";
import ClinicVideosManager from "./ClinicVideosManager";
import GoogleBusinessLink from "./GoogleBusinessLink";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { LANGUAGES, FACILITIES } from "@/lib/clinicMeta";
import { cn } from "@/lib/utils";

interface ClinicInfoTabProps {
  clinic: Clinic;
  onUpdated?: (updated: Clinic) => void;
  pageStatus?: "incomplete" | "pending_page_approval" | "live";
  isAdminUser?: boolean;
  submittingPage?: boolean;
  onSubmitForApproval?: () => void;
}

export default function ClinicInfoTab({ clinic, onUpdated, pageStatus, isAdminUser, submittingPage, onSubmitForApproval }: ClinicInfoTabProps) {
  const { t } = useTranslation('clinicInfoTab');
  const { t: tCommon } = useTranslation('common');
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
    address: clinic.address || "",
    description: clinic.description || "",
  });

  const [languages, setLanguages] = useState<string[]>(
    Array.isArray((clinic as any).languages) ? (clinic as any).languages : []
  );
  const [facilities, setFacilities] = useState<string[]>(
    Array.isArray((clinic as any).facilities) ? (clinic as any).facilities : []
  );

  const toggleInArray = (arr: string[], val: string) =>
    arr.includes(val) ? arr.filter((x) => x !== val) : [...arr, val];

  const [countries, setCountries] = useState<Country[]>([]);
  const [cities, setCities] = useState<City[]>([]);
  const [countryId, setCountryId] = useState<string | undefined>(clinic.cities?.countries?.id);
  const [cityId, setCityId] = useState<string>(clinic.city_id);

  const [saving, setSaving] = useState(false);
  const treatmentsRef = useRef<ClinicTreatmentsHandle>(null);
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
      const updates: Partial<Clinic> & { display_name?: string } = {
        // We intentionally do NOT update `name` (legal name) from this form —
        // it can only be changed via the registration data.
        email: form.email,
        phone: form.phone,
        website: form.website,
        address: form.address,
        description: form.description,
        city_id: cityId || clinic.city_id,
        // @ts-ignore
        display_name: form.display_name.trim() || null,
        // @ts-ignore
        languages,
        // @ts-ignore
        facilities,
      };
      const updated = await updateClinic(clinic.id, updates as any);
      // Persist treatments alongside the main form
      try {
        await treatmentsRef.current?.save();
      } catch (e) {
        // toast already handled inside the manager
      }
      toast({ title: t('toasts.successTitle'), description: t('toasts.successDesc') });
      onUpdated?.(updated);

      // Translate the description in the background — never blocks the save
      // above. Only re-translates when the text actually changed, to avoid
      // burning OpenAI calls on saves that only touch other fields.
      if (form.description && form.description !== clinic.description) {
        supabase.functions
          .invoke("translate-content", { body: { text: form.description, isHtml: true } })
          .then(({ data, error }) => {
            if (error || !data?.translations) return;
            const sanitized: Record<string, string> = {};
            for (const [locale, html] of Object.entries(data.translations as Record<string, string>)) {
              sanitized[locale] = sanitizeRichText(html);
            }
            return updateClinic(clinic.id, {
              // @ts-ignore
              description_translations: sanitized,
              // @ts-ignore
              description_translated_at: new Date().toISOString(),
            } as any);
          })
          .then((patched) => {
            if (patched) onUpdated?.(patched);
          })
          .catch((e) => console.error("Background description translation failed:", e));
      }
    } catch (e: any) {
      console.error("Could not update clinic:", e);
      toast({ title: t('toasts.errorTitle'), description: t('toasts.errorDesc'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('title')}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Legal name (read-only) + Display name (required, public-facing) */}
        <div className="rounded-lg border border-border/60 bg-muted/30 p-4 space-y-4">
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('legalName.label')} <span className="text-xs text-muted-foreground font-normal">{t('legalName.hint')}</span>
            </label>
            <Input value={form.name} readOnly disabled className="bg-background/60" />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">
              {t('displayName.label')} <span className="text-destructive">*</span>{" "}
              <span className="text-xs text-muted-foreground font-normal">{t('displayName.hint')}</span>
            </label>
            <Input
              value={form.display_name}
              onChange={(e) => onChange("display_name", e.target.value)}
              placeholder={t('displayName.placeholder')}
              required
            />
            {!form.display_name.trim() && (
              <p className="text-xs text-destructive mt-1">
                {t('displayName.requiredError')}
              </p>
            )}
          </div>
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('emailLabel')}</label>
            <Input value={form.email} onChange={(e) => onChange("email", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('phoneLabel')}</label>
            <Input value={form.phone} onChange={(e) => onChange("phone", e.target.value)} />
          </div>
          <div>
            <label className="text-sm font-medium mb-2 block">{t('websiteLabel')}</label>
            <Input value={form.website} onChange={(e) => onChange("website", e.target.value)} />
          </div>
          <div>
            <GoogleBusinessLink clinic={clinic} onUpdated={onUpdated} />
          </div>
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">{t('addressLabel')}</label>
          <Textarea value={form.address} onChange={(e) => onChange("address", e.target.value)} />
        </div>

        <div>
          <label className="text-sm font-medium mb-2 block">{t('description.label')}</label>
          <RichTextEditor
            value={form.description}
            onChange={(html) => onChange("description", sanitizeRichText(html))}
            placeholder={t('description.placeholder')}
          />
          <p
            className="text-xs text-muted-foreground mt-1"
            dangerouslySetInnerHTML={{ __html: t('description.hint') }}
          />
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <label className="text-sm font-medium mb-2 block">{t('countryLabel')}</label>
            {loadingLoc ? (
              <div className="text-sm text-muted-foreground">{t('loading')}</div>
            ) : (
              <select
                className="w-full px-3 py-2 border border-border rounded-md bg-background"
                value={countryId || ""}
                onChange={(e) => handleCountryChange(e.target.value)}
              >
                <option value="" disabled>
                  {t('selectCountry')}
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
            <label className="text-sm font-medium mb-2 block">{t('cityLabel')}</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-md bg-background"
              value={cityId}
              onChange={(e) => setCityId(e.target.value)}
            >
              <option value="" disabled>
                {t('selectCity')}
              </option>
              {cities.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
            <div className="text-xs text-muted-foreground mt-1">
              {t('selectedLabel', { country: selectedCountryName, city: selectedCityName })}
            </div>
          </div>
        </div>

        {/* Supported Languages */}
        <div>
          <label className="text-sm font-medium mb-2 block">{t('supportedLanguages.label')}</label>
          <p className="text-xs text-muted-foreground mb-3">
            {t('supportedLanguages.hint')}
          </p>
          <div className="flex flex-wrap gap-2">
            {LANGUAGES.map((l) => {
              const active = languages.includes(l.code);
              return (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => setLanguages((cur) => toggleInArray(cur, l.code))}
                  className={cn(
                    "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border text-sm transition",
                    active
                      ? "bg-primary text-primary-foreground border-primary"
                      : "bg-background border-border hover:border-primary/50"
                  )}
                >
                  <span aria-hidden>{l.flag}</span>
                  <span>{tCommon(`languageNames.${l.code}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Facilities & Amenities */}
        <div>
          <label className="text-sm font-medium mb-2 block">{t('facilities.label')}</label>
          <p className="text-xs text-muted-foreground mb-3">
            {t('facilities.hint')}
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
            {FACILITIES.map((f) => {
              const Icon = f.icon;
              const active = facilities.includes(f.key);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setFacilities((cur) => toggleInArray(cur, f.key))}
                  className={cn(
                    "inline-flex items-center gap-2 px-3 py-2 rounded-lg border text-sm text-left transition",
                    active
                      ? "bg-primary/10 border-primary text-primary"
                      : "bg-background border-border hover:border-primary/50"
                  )}
                >
                  <Icon className="w-4 h-4 shrink-0" />
                  <span className="truncate">{tCommon(`facilityLabels.${f.key}`)}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Advanced sections — order matches public clinic page:
            Images → Treatments → Before & After → Doctors */}
        <div className="border-t mt-6 pt-6 space-y-6">
          {/* Images */}
          <ClinicImagesManager
            clinicId={clinic.id}
            images={(clinic.clinic_images as any) || []}
            onChanged={() => onUpdated?.(clinic)}
          />

          {/* Treatments */}
          <ClinicTreatmentsManager
            ref={treatmentsRef}
            clinicId={clinic.id}
            selections={
              ((clinic.clinic_treatments as any) || []).map((ct: any) => ({
                treatment_id: ct.treatment_id,
                starting_price_euro: ct.starting_price_euro ?? ct.price ?? 0,
              }))
            }
            onChanged={() => onUpdated?.(clinic)}
          />

          {/* Before & After Photos */}
          <ClinicBeforeAfterManager clinicId={clinic.id} />

          {/* Videos */}
          <ClinicVideosManager
            clinicId={clinic.id}
            videos={((clinic as any).clinic_videos as any) || []}
            onChanged={() => onUpdated?.(clinic)}
          />


          {/* Doctors */}
          <ClinicDoctorsManager
            clinicId={clinic.id}
            doctors={(clinic.doctors as any) || []}
            onChanged={() => onUpdated?.(clinic)}
          />
        </div>

        {/* Single Save button at the bottom — saves all clinic info together */}
        <div className="border-t mt-6 pt-6 flex justify-end">
          <Button
            onClick={handleSave}
            disabled={saving}
            size="lg"
            className="bg-gradient-primary hover:opacity-90"
          >
            {saving ? t('saving') : t('saveButton')}
          </Button>
        </div>

        {/* Submit for Approval — only for clinic owners (not Super Admins) and only when the page can still be submitted */}
        {!isAdminUser && onSubmitForApproval && pageStatus === "incomplete" && (() => {
          const hasDisplayName = !!form.display_name.trim();
          const savedDisplayName = !!(clinic as any).display_name;
          const canSubmit = hasDisplayName && savedDisplayName;
          return (
            <div className="border-t mt-6 pt-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{t('readyToGoLive.title')}</p>
                <p className="text-sm text-muted-foreground">
                  {t('readyToGoLive.description')}
                </p>
                {!canSubmit && (
                  <p className="text-xs text-destructive mt-2">
                    {!hasDisplayName
                      ? t('readyToGoLive.needsDisplayNameError')
                      : t('readyToGoLive.saveFirstError')}
                  </p>
                )}
              </div>
              <Button onClick={onSubmitForApproval} disabled={!!submittingPage || !canSubmit}>
                {submittingPage ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Send className="w-4 h-4 mr-2" />}
                {t('readyToGoLive.submitButton')}
              </Button>
            </div>
          );
        })()}
        {!isAdminUser && pageStatus === "pending_page_approval" && (
          <div className="border-t mt-6 pt-6 text-sm text-muted-foreground">
            {t('pendingApprovalNote')}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
