import { useTranslation } from "react-i18next";
import { ShieldCheck, Tag, Languages as LanguagesIcon, UserCheck, Lock } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { useHeadMeta } from "@/hooks/useHeadMeta";

const WHAT_WE_DO = [
  { icon: ShieldCheck, key: "verifiedClinics" },
  { icon: Tag, key: "transparentPricing" },
  { icon: LanguagesIcon, key: "multilingual" },
  { icon: UserCheck, key: "coordination" },
];

export default function AboutUs() {
  const { t } = useTranslation("aboutUs");

  useHeadMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    ogTitle: t("meta.title"),
    ogDescription: t("meta.description"),
  });

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

      <div className="max-w-3xl mx-auto px-4 py-16 space-y-16">
        <section className="text-center">
          <p className="text-lg leading-relaxed text-foreground/90">{t("intro")}</p>
        </section>

        <section>
          <h2 className="text-2xl font-bold text-center mb-10">{t("whatWeDo.title")}</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHAT_WE_DO.map((item, index) => (
              <div
                key={item.key}
                className="text-center group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(`whatWeDo.${item.key}.title`)}</h3>
                <p className="text-muted-foreground text-sm">{t(`whatWeDo.${item.key}.description`)}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="bg-white/80 backdrop-blur-glass rounded-2xl p-8 shadow-card border border-white/20">
          <div className="flex items-start gap-4">
            <div className="shrink-0 bg-primary/10 text-primary rounded-full w-12 h-12 flex items-center justify-center">
              <Lock className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-xl font-bold mb-2">{t("privacy.title")}</h2>
              <p className="text-foreground/80 leading-relaxed">{t("privacy.description")}</p>
            </div>
          </div>
        </section>

        <section className="text-center text-sm text-muted-foreground">
          {t("operatedBy")}
        </section>
      </div>

      <Footer />
    </div>
  );
}
