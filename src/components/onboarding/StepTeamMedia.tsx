import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import ClinicImagesManager from "@/components/clinic-panel/ClinicImagesManager";
import ClinicDoctorsManager from "@/components/clinic-panel/ClinicDoctorsManager";
import type { Clinic } from "@/lib/services";

interface Props {
  clinicId: string;
  initialClinic: Clinic | null;
  onBack: () => void;
  onDone: () => void;
}

export default function StepTeamMedia({ clinicId, initialClinic, onBack, onDone }: Props) {
  const { t } = useTranslation("registerClinic");

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("teamMedia.title")}</CardTitle>
        <CardDescription>{t("teamMedia.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ClinicImagesManager clinicId={clinicId} images={(initialClinic?.clinic_images as any) || []} />
        <ClinicDoctorsManager clinicId={clinicId} doctors={(initialClinic?.doctors as any) || []} />

        <div className="flex gap-3 pt-2">
          <Button type="button" variant="outline" className="flex-1" onClick={onBack}>
            {t("wizard.backButton")}
          </Button>
          <Button type="button" className="flex-1 bg-gradient-primary hover:opacity-90" onClick={onDone}>
            {t("wizard.nextButton")}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
