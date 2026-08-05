import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";
import RichTextEditor from "@/components/ui/RichTextEditor";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import ClinicTreatmentsManager, { type ClinicTreatmentsHandle } from "@/components/clinic-panel/ClinicTreatmentsManager";
import { updateClinic, type Clinic } from "@/lib/services";

interface Props {
  clinicId: string;
  initialClinic: Clinic | null;
  onBack: () => void;
  onDone: () => void;
}

export default function StepProfile({ clinicId, initialClinic, onBack, onDone }: Props) {
  const { t } = useTranslation("registerClinic");
  const { toast } = useToast();
  const treatmentsRef = useRef<ClinicTreatmentsHandle>(null);
  const [submitting, setSubmitting] = useState(false);

  const [description, setDescription] = useState(initialClinic?.description || "");
  const [address, setAddress] = useState(initialClinic?.address || "");

  const selections = ((initialClinic?.clinic_treatments as any) || []).map((ct: any) => ({
    treatment_id: ct.treatment_id,
    starting_price_euro: ct.starting_price_euro ?? 0,
  }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await updateClinic(clinicId, { description, address } as any);
      try {
        await treatmentsRef.current?.save();
      } catch {
        // toast already handled inside the manager
      }
      onDone();
    } catch (err: any) {
      toast({ title: t("errors.registrationErrorTitle"), description: err.message || t("errors.genericError"), variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("profile.title")}</CardTitle>
        <CardDescription>{t("profile.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label>{t("profile.descriptionLabel")}</Label>
            <RichTextEditor
              value={description}
              onChange={(html) => setDescription(sanitizeRichText(html))}
              placeholder={t("profile.descriptionPlaceholder")}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">{t("profile.addressLabel")}</Label>
            <Textarea id="address" value={address} onChange={(e) => setAddress(e.target.value)} required />
          </div>

          <ClinicTreatmentsManager ref={treatmentsRef} clinicId={clinicId} selections={selections} />

          <div className="flex gap-3 pt-2">
            <Button type="button" variant="outline" className="flex-1" onClick={onBack} disabled={submitting}>
              {t("wizard.backButton")}
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-primary hover:opacity-90" disabled={submitting}>
              {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {t("wizard.nextButton")}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
