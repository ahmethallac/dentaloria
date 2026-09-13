import { useTranslation } from "react-i18next";
import { CalendarCheck, Search, Users } from "lucide-react";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Centred heading, then three steps as a centred sequence: haloed icon, label,
 * copy, joined by a short dashed rule. The rule runs down between stacked
 * steps on a phone and across, level with the icons, from lg up — the same
 * look at every width.
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
        className="mt-9 flex flex-col items-center lg:mt-10 lg:flex-row lg:items-start lg:justify-center"
      >
        {STEPS.map(({ icon: Icon, titleKey, descKey }, i) => (
          <div key={titleKey} className="flex flex-col items-center lg:flex-row lg:items-start">
            <div className="flex flex-col items-center gap-4 text-center lg:w-[300px]">
              <span className="flex h-14 w-14 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground ring-[7px] ring-primary/10">
                <Icon className="h-6 w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <h3 className="text-base font-semibold text-brand-navy">{t(titleKey)}</h3>
                <p className="mx-auto mt-1.5 max-w-[280px] text-sm leading-relaxed text-nav-muted">
                  {t(descKey)}
                </p>
              </div>
            </div>

            {i < STEPS.length - 1 && (
              <span
                className="my-5 h-9 border-l-2 border-dashed border-primary/25 lg:mx-2 lg:my-0 lg:mt-7 lg:h-0 lg:w-20 lg:border-l-0 lg:border-t-2"
                aria-hidden="true"
              />
            )}
          </div>
        ))}
      </div>
    </SectionShell>
  );
};
