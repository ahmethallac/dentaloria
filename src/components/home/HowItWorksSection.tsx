import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck, Search, Users } from "lucide-react";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma node 2:213 (lower half). Centred heading, then three steps laid out
 * horizontally with a small arrow between them (nodes 2:224 and 2:219).
 * Each step is a filled circular icon with the label and copy to its right.
 */

const STEPS = [
  { icon: Search, titleKey: "howItWorks.step1Title", descKey: "howItWorks.step1Desc" },
  { icon: Users, titleKey: "howItWorks.step2Title", descKey: "howItWorks.step2Desc" },
  { icon: CalendarCheck, titleKey: "howItWorks.step3Title", descKey: "howItWorks.step3Desc" },
] as const;

export const HowItWorksSection = () => {
  const { t } = useTranslation("home");

  return (
    <SectionShell id="how-it-works" className="pt-10">
      <SectionHeading
        align="center"
        title={t("howItWorks.title")}
        subtitle={t("howItWorks.subtitle")}
      />

      <div
        data-fid="howitworks.steps"
        className="mt-8 flex flex-col items-stretch gap-6 lg:flex-row lg:items-center lg:justify-center lg:gap-4"
      >
        {STEPS.map(({ icon: Icon, titleKey, descKey }, i) => (
          <div key={titleKey} className="flex items-center gap-4 lg:flex-1">
            <div className="flex items-start gap-4">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-sm font-semibold text-brand-navy">{t(titleKey)}</h3>
                <p className="mt-1 text-sm text-nav-muted">{t(descKey)}</p>
              </div>
            </div>

            {i < STEPS.length - 1 && (
              <ArrowRight
                className="hidden h-5 w-5 shrink-0 text-primary lg:block"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
};
