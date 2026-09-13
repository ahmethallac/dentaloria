import { useTranslation } from "react-i18next";
import { ArrowRight, CalendarCheck, Search, Users } from "lucide-react";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma node 2:213 (lower half). Centred heading, then three steps laid out
 * horizontally with a small arrow between them (nodes 2:224 and 2:219).
 * Each step is a filled circular icon with the label and copy to its right.
 *
 * Below lg the steps stack as a centred sequence instead: haloed icon, label,
 * copy, and a short dashed rule leading down to the next step.
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
        className="mt-9 flex flex-col items-center lg:mt-8 lg:flex-row lg:items-center lg:justify-center lg:gap-4"
      >
        {STEPS.map(({ icon: Icon, titleKey, descKey }, i) => (
          <div key={titleKey} className="flex flex-col items-center lg:flex-1 lg:flex-row lg:gap-4">
            <div className="flex flex-col items-center gap-4 text-center lg:flex-row lg:items-start lg:text-left">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[7px] ring-primary/10 lg:ring-0">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-brand-navy lg:text-sm">{t(titleKey)}</h3>
                <p className="mx-auto mt-1.5 max-w-[280px] text-sm leading-relaxed text-nav-muted lg:mx-0 lg:mt-1 lg:max-w-none lg:leading-normal">
                  {t(descKey)}
                </p>
              </div>
            </div>

            {i < STEPS.length - 1 && (
              <span className="my-5 h-9 border-l-2 border-dashed border-primary/25 lg:hidden" aria-hidden="true" />
            )}

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
