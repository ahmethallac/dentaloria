import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import ClinicImagesManager from "@/components/clinic-panel/ClinicImagesManager";
import ClinicDoctorsManager from "@/components/clinic-panel/ClinicDoctorsManager";
import ClinicBeforeAfterManager from "@/components/clinic-panel/ClinicBeforeAfterManager";
import ClinicVideosManager, { type ClinicVideo } from "@/components/clinic-panel/ClinicVideosManager";
import type { Clinic } from "@/lib/services";

interface Props {
  clinicId: string;
  initialClinic: Clinic | null;
  onBack: () => void;
  onDone: () => void;
}

// Optional sections (before/after photos, videos) start collapsed behind an
// "Add now" prompt with a matching "I'll do this later" toggle once opened —
// they're not required to move on, so they shouldn't visually compete with
// the core photos/doctors sections above.
function OptionalSection({
  title,
  hint,
  addNowLabel,
  doLaterLabel,
  children,
}: {
  title: string;
  hint: string;
  addNowLabel: string;
  doLaterLabel: string;
  children: React.ReactNode;
}) {
  const [expanded, setExpanded] = useState(false);

  if (!expanded) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-border p-4">
        <div>
          <p className="text-sm font-medium">{title}</p>
          <p className="text-xs text-muted-foreground">{hint}</p>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => setExpanded(true)}>
          {addNowLabel}
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {children}
      <Button type="button" variant="ghost" size="sm" onClick={() => setExpanded(false)}>
        {doLaterLabel}
      </Button>
    </div>
  );
}

export default function StepTeamMedia({ clinicId, initialClinic, onBack, onDone }: Props) {
  const { t } = useTranslation("registerClinic");

  // ClinicImagesManager and ClinicVideosManager are prop-driven (no internal
  // list state, unlike the doctors manager, which tracks its own list after
  // each add/remove) — they rely entirely on onChanged to get the freshly
  // saved row back, otherwise the grid never reflects what was just added.
  const [images, setImages] = useState<any[]>((initialClinic?.clinic_images as any) || []);
  const [videos, setVideos] = useState<ClinicVideo[]>(((initialClinic as any)?.clinic_videos as any) || []);

  const refetchImages = async () => {
    const { data } = await supabase
      .from("clinic_images")
      .select("id, image_url, is_primary")
      .eq("clinic_id", clinicId)
      .order("created_at");
    setImages(data || []);
  };

  const refetchVideos = async () => {
    const { data } = await supabase
      .from("clinic_videos")
      .select("id, video_url, provider, provider_id, thumbnail_url, sort_order")
      .eq("clinic_id", clinicId)
      .order("sort_order");
    setVideos((data as any) || []);
  };

  return (
    <Card className="shadow-lg border-border/60 backdrop-blur-sm bg-card/95">
      <CardHeader className="text-center">
        <CardTitle className="text-2xl font-bold">{t("teamMedia.title")}</CardTitle>
        <CardDescription>{t("teamMedia.subtitle")}</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <ClinicImagesManager clinicId={clinicId} images={images} onChanged={refetchImages} />

        <OptionalSection
          title={t("teamMedia.beforeAfterTitle")}
          hint={t("teamMedia.optionalHint")}
          addNowLabel={t("teamMedia.addNow")}
          doLaterLabel={t("teamMedia.doLater")}
        >
          <ClinicBeforeAfterManager clinicId={clinicId} />
        </OptionalSection>

        <OptionalSection
          title={t("teamMedia.videosTitle")}
          hint={t("teamMedia.optionalHint")}
          addNowLabel={t("teamMedia.addNow")}
          doLaterLabel={t("teamMedia.doLater")}
        >
          <ClinicVideosManager clinicId={clinicId} videos={videos} onChanged={refetchVideos} />
        </OptionalSection>

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
