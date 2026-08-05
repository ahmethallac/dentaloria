import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { Loader2, Upload, CheckCircle, FileText } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  clinicId: string;
  onBack: () => void;
  onSubmitted: () => void;
}

export default function StepDocuments({ clinicId, onBack, onSubmitted }: Props) {
  const { t } = useTranslation("registerClinic");
  const { toast } = useToast();

  const healthInputRef = useRef<HTMLInputElement>(null);
  const agencyInputRef = useRef<HTMLInputElement>(null);

  const [loadingExisting, setLoadingExisting] = useState(true);
  const [existingHealthUrl, setExistingHealthUrl] = useState<string | null>(null);
  const [existingAgencyUrl, setExistingAgencyUrl] = useState<string | null>(null);
  const [approvalRowId, setApprovalRowId] = useState<string | null>(null);

  const [healthTourismDoc, setHealthTourismDoc] = useState<File | null>(null);
  const [agencyCertificate, setAgencyCertificate] = useState<File | null>(null);
  const [isHealthcareFacility, setIsHealthcareFacility] = useState(false);
  const [agree, setAgree] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("clinic_approvals")
        .select("id, health_tourism_doc_url, tax_certificate_url, applied_as_healthcare_facility")
        .eq("clinic_id", clinicId)
        .maybeSingle();
      if (data) {
        setApprovalRowId(data.id);
        setExistingHealthUrl(data.health_tourism_doc_url);
        setExistingAgencyUrl(data.tax_certificate_url);
        setIsHealthcareFacility(!!data.applied_as_healthcare_facility);
      }
      setLoadingExisting(false);
    })();
  }, [clinicId]);

  const uploadDoc = async (file: File, name: string) => {
    const ext = file.name.split(".").pop();
    const folder = `pending/${clinicId}`;
    const path = `${folder}/${name}-${Date.now()}.${ext}`;
    const { error } = await supabase.storage.from("clinic-documents").upload(path, file);
    if (error) throw error;
    return path;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!healthTourismDoc && !existingHealthUrl) {
      toast({ title: t("errors.title"), description: t("errors.healthDocRequired"), variant: "destructive" });
      return;
    }
    if (!agree) {
      toast({ title: t("errors.title"), description: t("errors.agreeRequired"), variant: "destructive" });
      return;
    }

    setSubmitting(true);
    try {
      const healthUrl = healthTourismDoc ? await uploadDoc(healthTourismDoc, "health-tourism-doc") : existingHealthUrl;
      const agencyUrl = isHealthcareFacility
        ? null
        : agencyCertificate
          ? await uploadDoc(agencyCertificate, "agency-certificate")
          : existingAgencyUrl;

      const approvalPayload = {
        clinic_id: clinicId,
        status: "pending",
        health_tourism_doc_url: healthUrl,
        tax_certificate_url: agencyUrl,
        applied_as_healthcare_facility: isHealthcareFacility,
        rejection_reason: null,
        reviewed_at: null,
      };

      if (approvalRowId) {
        const { error } = await supabase.from("clinic_approvals").update(approvalPayload).eq("id", approvalRowId);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("clinic_approvals").insert(approvalPayload);
        if (error) throw error;
      }

      const { error: clinicError } = await supabase
        .from("clinics")
        .update({ page_status: "pending_page_approval", page_revision_notes: null })
        .eq("id", clinicId);
      if (clinicError) throw clinicError;

      supabase.functions.invoke("send-clinic-notification", {
        body: { type: "application_received", clinicId },
      }).catch(() => {});
      supabase.functions.invoke("send-clinic-notification", {
        body: { type: "admin_new_application", clinicId },
      }).catch(() => {});

      onSubmitted();
    } catch (err: any) {
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  if (loadingExisting) {
    return (
      <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
        <CardContent className="py-16 flex justify-center">
          <Loader2 className="w-6 h-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("documents.title")}</CardTitle>
        <CardDescription>{t("documents.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-5">
          <div className="space-y-4 p-4 bg-muted rounded-lg">
            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("documents.healthTourismDocLabel")}
                <span className="text-destructive">*</span>
              </Label>
              <input
                ref={healthInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setHealthTourismDoc(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button type="button" variant="outline" size="sm" onClick={() => healthInputRef.current?.click()}>
                  <Upload className="w-4 h-4 mr-1" /> {t("documents.uploadFile")}
                </Button>
                {healthTourismDoc ? (
                  <span className="text-sm flex items-center gap-1 text-green-600 truncate">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[260px]">{healthTourismDoc.name}</span>
                  </span>
                ) : existingHealthUrl ? (
                  <span className="text-sm flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {t("documents.alreadyUploaded")}
                  </span>
                ) : null}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm flex items-center gap-2">
                <FileText className="w-4 h-4" />
                {t("documents.agencyCertificateLabel")}
                <span className="text-muted-foreground font-normal">({t("documents.optional")})</span>
              </Label>
              <input
                ref={agencyInputRef}
                type="file"
                className="hidden"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={(e) => setAgencyCertificate(e.target.files?.[0] || null)}
              />
              <div className="flex items-center gap-3 flex-wrap">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => agencyInputRef.current?.click()}
                  disabled={isHealthcareFacility}
                >
                  <Upload className="w-4 h-4 mr-1" /> {t("documents.uploadFile")}
                </Button>
                {!isHealthcareFacility && (agencyCertificate ? (
                  <span className="text-sm flex items-center gap-1 text-green-600 truncate">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    <span className="truncate max-w-[260px]">{agencyCertificate.name}</span>
                  </span>
                ) : existingAgencyUrl ? (
                  <span className="text-sm flex items-center gap-1 text-green-600">
                    <CheckCircle className="w-4 h-4 shrink-0" />
                    {t("documents.alreadyUploaded")}
                  </span>
                ) : null)}
              </div>

              <div className="flex items-start gap-2 pt-2">
                <Checkbox
                  id="healthcare"
                  checked={isHealthcareFacility}
                  onCheckedChange={(v) => {
                    setIsHealthcareFacility(!!v);
                    if (v) setAgencyCertificate(null);
                  }}
                />
                <Label htmlFor="healthcare" className="text-sm text-muted-foreground leading-snug">
                  {t("documents.healthcareFacilityCheckbox")}
                </Label>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-2">
            <Checkbox id="agree" checked={agree} onCheckedChange={(v) => setAgree(!!v)} />
            <Label htmlFor="agree" className="text-sm text-muted-foreground leading-snug">
              {t("documents.agreeCheckbox")}
            </Label>
          </div>

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
              {t("wizard.backButton")}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("documents.submitButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
