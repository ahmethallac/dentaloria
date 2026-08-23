import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withLocalePrefix } from "@/lib/localePath";
import heroImage from "@/assets/hero-home.webp";
import { SectionShell } from "./SectionShell";

/*
 * Figma node 1:77 (mobile) — the blue card between the reviews and the closing
 * stats. Photo on top, headline, supporting line, one button.
 *
 * The desktop reference has no equivalent, so this only appears from the
 * mobile design. On wide screens the photo moves beside the copy rather than
 * above it, otherwise the card becomes a very tall blue slab.
 */

export const StartJourneyCta = () => {
  const { t } = useTranslation("home");
  const { lang } = useParams();
  const navigate = useNavigate();

  return (
    <SectionShell className="pt-10">
      <div
        data-fid="cta"
        className="grid overflow-hidden rounded-xl bg-gradient-to-br from-primary to-brand-blue-bright lg:grid-cols-2"
      >
        <div className="h-48 w-full lg:h-full lg:min-h-[320px] lg:order-last">
          <img
            src={heroImage}
            alt=""
            aria-hidden="true"
            className="h-full w-full object-cover object-right"
          />
        </div>

        <div className="p-6 lg:flex lg:flex-col lg:justify-center lg:p-10">
          <h2 className="text-2xl/tight font-bold text-primary-foreground lg:text-3xl/tight">
            {t("cta.title")}
          </h2>
          <p className="mt-3 max-w-[420px] text-sm leading-relaxed text-primary-foreground/85 lg:text-base">
            {t("cta.subtitle")}
          </p>

          <Button
            onClick={() => navigate(withLocalePrefix("/clinic-listing", lang))}
            className="mt-6 h-12 w-fit rounded-xl bg-white px-6 text-sm font-semibold text-primary hover:bg-white/90"
          >
            {t("cta.getStarted")}
            <ArrowRight className="ml-2 h-4 w-4" aria-hidden="true" />
          </Button>
        </div>
      </div>
    </SectionShell>
  );
};
