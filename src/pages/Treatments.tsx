import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Loader2 } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Card, CardContent } from "@/components/ui/card";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { withLocalePrefix } from "@/lib/localePath";
import { getTreatments, type Treatment } from "@/lib/services";
import { HOMEPAGE_SHOWCASE_TREATMENTS, getTreatmentImage, getTreatmentIcon } from "@/lib/treatmentMeta";

const startingPrice = (t: Treatment): number | null =>
  t.min_price != null ? Math.round(t.min_price) : null;

export default function Treatments() {
  const { t } = useTranslation("treatmentsPage");
  const navigate = useNavigate();
  const { lang } = useParams();
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const data = await getTreatments();
        if (mounted) setTreatments(data);
      } catch (e) {
        console.error("[Treatments] failed to load", e);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => {
      mounted = false;
    };
  }, []);

  useHeadMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    ogTitle: t("meta.title"),
    ogDescription: t("meta.description"),
  });

  const handleTreatmentClick = (treatmentId: string) => {
    navigate(withLocalePrefix(`/clinic-listing?treatment=${treatmentId}`, lang));
  };

  const featured = treatments.filter((tr) => HOMEPAGE_SHOWCASE_TREATMENTS.includes(tr.name));
  const rest = treatments.filter((tr) => !HOMEPAGE_SHOWCASE_TREATMENTS.includes(tr.name));

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />

      <div className="relative bg-gradient-to-r from-primary/20 to-accent/20 py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-white/30" />
        <div className="relative max-w-3xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 text-foreground">{t("hero.title")}</h1>
          <p className="text-lg opacity-80 text-foreground/80">{t("hero.subtitle")}</p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-12">
        {loading ? (
          <div className="flex items-center justify-center gap-2 text-muted-foreground py-16">
            <Loader2 className="h-5 w-5 animate-spin" />
            {t("loading")}
          </div>
        ) : (
          <>
            {featured.length > 0 && (
              <section className="mb-14">
                <h2 className="text-2xl font-bold mb-6">{t("featuredSectionTitle")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {featured.map((treatment, index) => (
                    <Card
                      key={treatment.id}
                      className="group cursor-pointer hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                      onClick={() => handleTreatmentClick(treatment.id)}
                    >
                      <CardContent className="p-6 text-center">
                        <div className="rounded-full w-24 h-24 mx-auto mb-4 overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
                          <img
                            src={getTreatmentImage(treatment.name)}
                            alt={treatment.name}
                            className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                          />
                        </div>
                        <h3 className="font-semibold mb-1">{treatment.name}</h3>
                        <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                          {treatment.description || t("defaultDescription")}
                        </p>
                        {startingPrice(treatment) != null && (
                          <span className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
                            {t("priceFrom", { price: startingPrice(treatment) })}
                          </span>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}

            {rest.length > 0 && (
              <section>
                <h2 className="text-2xl font-bold mb-6">{t("moreSectionTitle")}</h2>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-6">
                  {rest.map((treatment, index) => {
                    const Icon = getTreatmentIcon(treatment.name);
                    return (
                      <Card
                        key={treatment.id}
                        className="group cursor-pointer hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in"
                        style={{ animationDelay: `${index * 0.1}s` }}
                        onClick={() => handleTreatmentClick(treatment.id)}
                      >
                        <CardContent className="p-6 text-center">
                          <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-24 h-24 mx-auto mb-4 flex items-center justify-center group-hover:scale-110 transition-transform duration-300">
                            <Icon className="h-9 w-9" />
                          </div>
                          <h3 className="font-semibold mb-1">{treatment.name}</h3>
                          <p className="text-sm text-muted-foreground mb-2 line-clamp-2">
                            {treatment.description || t("defaultDescription")}
                          </p>
                          {startingPrice(treatment) != null && (
                            <span className="inline-block text-xs font-semibold text-primary bg-primary/10 rounded-full px-3 py-1">
                              {t("priceFrom", { price: startingPrice(treatment) })}
                            </span>
                          )}
                        </CardContent>
                      </Card>
                    );
                  })}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      <Footer />
    </div>
  );
}
