import { useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { getFeaturedClinics } from "@/lib/services";
import { withLocalePrefix } from "@/lib/localePath";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

export default function FeaturedClinic() {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("common");

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const clinics = await getFeaturedClinics(1);
        if (!mounted) return;
        if (clinics && clinics.length > 0) {
          navigate(withLocalePrefix(`/clinic/${clinics[0].id}`, lang), { replace: true });
        } else {
          navigate(withLocalePrefix('/clinic-listing', lang), { replace: true });
        }
      } catch (e) {
        navigate(withLocalePrefix('/clinic-listing', lang), { replace: true });
      }
    })();
    return () => { mounted = false; };
  }, [navigate, lang]);

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
