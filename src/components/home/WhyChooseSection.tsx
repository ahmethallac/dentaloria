import { useTranslation } from "react-i18next";
import { MessagesSquare, ShieldCheck, Sparkles, Tag } from "lucide-react";
import { SectionShell } from "./SectionShell";

/*
 * Figma node 2:120 — a single navy panel, 754x81 at 863 (1258x135 here), with
 * the heading top-left and four features in a row separated by hairlines
 * (dividers 2:127 / 2:125 / 2:123).
 */

const FEATURES = [
  { icon: ShieldCheck, key: "verified" },
  { icon: Tag, key: "pricing" },
  { icon: Sparkles, key: "aiMatch" },
  { icon: MessagesSquare, key: "directContact" },
] as const;

export const WhyChooseSection = () => {
  const { t } = useTranslation("home");

  return (
    <SectionShell className="pt-10">
      <div data-fid="why" className="rounded-xl bg-stats-navy px-8 py-6 lg:px-10">
        <h2 className="text-xl font-bold text-primary-foreground">{t("whyDentaloria.title")}</h2>

        <div className="mt-5 grid grid-cols-1 gap-y-6 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, key }, i) => (
            <div
              key={key}
              className={`flex items-start gap-4 ${
                i > 0 ? "lg:border-l lg:border-white/15 lg:pl-8" : ""
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-white/95 text-primary">
                <Icon className="h-5 w-5" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-primary-foreground">
                  {t(`whyDentaloria.${key}.title`)}
                </h3>
                <p className="mt-1 text-xs leading-relaxed text-primary-foreground/70">
                  {t(`whyDentaloria.${key}.description`)}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionShell>
  );
};
