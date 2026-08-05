import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
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

  // ClinicImagesManager is prop-driven (no internal list state, unlike the
  // doctors manager, which tracks its own list after each add/remove) — it
  // relies entirely on onChanged to get the freshly uploaded row back,
  // otherwise the grid never reflects what was just added.
  const [images, setImages] = useState<any[]>((initialClinic?.clinic_images as any) || []);

  const refetchImages = async () => {
    const { data } = await supabase
      .from("clinic_images")
      .select("id, image_url, is_primary")
      .eq("clinic_id", clinicId)
      .order("created_at");
    setImages(data || []);
  };

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("teamMedia.title")}</CardTitle>
        <CardDescription>{t("teamMedia.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ClinicImagesManager clinicId={clinicId} images={images} onChanged={refetchImages} />
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
