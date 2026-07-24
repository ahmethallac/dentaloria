import { useEffect, useState } from "react";
import { useParams, useSearchParams, Navigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getClinicById } from "@/lib/services";
import { withLocalePrefix, clinicPath } from "@/lib/localePath";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import ClinicDetail from "./ClinicDetail";

// Handles the old /clinic/:id links (bookmarks, indexed pages, shared links)
// now that the canonical URL is /clinic/:citySlug/:clinicSlug. Admin preview
// links (?preview=1) keep rendering ClinicDetail directly by id, unchanged.
export default function ClinicLegacyRedirect({ id }: { id: string }) {
  const { lang } = useParams();
  const [searchParams] = useSearchParams();
  const isPreview = searchParams.get("preview") === "1";
  const { t } = useTranslation("common");
  // undefined = still resolving, null = no slug available (render by id instead)
  const [target, setTarget] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (isPreview || !id) return;

    let mounted = true;
    (async () => {
      const clinic = await getClinicById(id).catch(() => null);
      if (!mounted) return;
      setTarget(clinic?.slug && clinic.cities?.slug ? clinicPath(clinic) : null);
    })();
    return () => {
      mounted = false;
    };
  }, [id, isPreview]);

  if (isPreview) {
    return <ClinicDetail idProp={id} />;
  }

  if (target) {
    return <Navigate to={withLocalePrefix(target, lang)} replace />;
  }

  if (target === null) {
    // No slug resolvable (e.g. unpublished/deleted clinic) — fall back to the
    // id-based lookup so the existing not-found behavior still applies.
    return <ClinicDetail idProp={id} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      <div className="flex-1 flex items-center justify-center">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          <span>{t("common.redirecting")}</span>
        </div>
      </div>
      <Footer />
    </div>
  );
}
