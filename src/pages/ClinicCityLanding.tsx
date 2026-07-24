import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getCityBySlug } from "@/lib/services";
import { withLocalePrefix } from "@/lib/localePath";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import NotFound from "./NotFound";

// Direct pretty link to the city-filtered listing page, e.g. /clinic/antalya.
// Resolves the slug to a city id and hands off to the existing (fast,
// query-param-driven) /clinic-listing filtering — no changes made there.
export default function ClinicCityLanding({ citySlug }: { citySlug: string }) {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("common");
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    if (!citySlug) return;
    let mounted = true;
    (async () => {
      try {
        const city = await getCityBySlug(citySlug);
        if (!mounted) return;
        if (city) {
          navigate(withLocalePrefix(`/clinic-listing?city=${city.id}`, lang), { replace: true });
        } else {
          setNotFound(true);
        }
      } catch {
        if (mounted) setNotFound(true);
      }
    })();
    return () => {
      mounted = false;
    };
  }, [citySlug, lang, navigate]);

  if (notFound) return <NotFound />;

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
