import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { ChevronRight, Search, Sparkles } from "lucide-react";
import { withLocalePrefix } from "@/lib/localePath";
import { AISearchBar } from "@/components/home/AISearchBar";

/*
 * The panel that replaces the old page hero: an AI-search prompt on a tinted
 * gradient, with example queries beneath it.
 *
 * The reference puts a 3D tooth-and-magnifier render on the right. That asset
 * is not in the repo, so the space carries a plain decorative motif instead —
 * drop the real artwork in and delete the <Motif> below when it arrives. It is
 * aria-hidden and lg-only, so nothing depends on it.
 */

const Motif = () => (
  <div
    aria-hidden="true"
    className="pointer-events-none absolute inset-y-0 right-8 hidden w-64 items-center justify-center lg:flex"
  >
    <div className="relative flex h-40 w-40 items-center justify-center rounded-full bg-gradient-to-br from-primary/15 to-accent/25">
      <Search className="h-16 w-16 text-primary/60" strokeWidth={1.5} />
      <Sparkles className="absolute right-4 top-5 h-6 w-6 text-primary/50" />
      <Sparkles className="absolute bottom-6 left-3 h-4 w-4 text-primary/40" />
    </div>
  </div>
);

export const AiSearchPanel = ({
  onResults,
}: {
  onResults?: React.ComponentProps<typeof AISearchBar>["onResults"];
}) => {
  const { t } = useTranslation("clinicListing");
  const { lang } = useParams();
  const navigate = useNavigate();

  const examples = t("aiPanel.examples", { returnObjects: true }) as string[];

  return (
    <section
      data-fid="listing.aipanel"
      className="relative overflow-hidden rounded-xl lg:bg-gradient-to-r lg:from-primary/8 lg:via-accent/10 lg:to-primary/8 lg:p-6"
    >
      <Motif />

      <div className="relative lg:max-w-[74%]">
        {/* On mobile the reference is just the field — no tinted panel, no
            badge, no example chips. */}
        <div className="hidden items-center gap-2 lg:flex">
          <Sparkles className="h-4 w-4 text-primary" aria-hidden="true" />
          <span className="text-sm font-semibold text-brand-navy">{t("aiPanel.badge")}</span>
          <span className="rounded-md bg-primary/10 px-2 py-0.5 text-xs font-medium text-primary">
            {t("aiPanel.new")}
          </span>
        </div>

        <AISearchBar className="lg:mt-3" variant="bare" onResults={onResults} />

        <div className="mt-4 hidden lg:block">
          <span className="text-sm font-medium text-primary">{t("aiPanel.tryExamples")}</span>
          <div className="mt-2 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap sm:items-center sm:gap-2.5">
            {examples.map((label) => (
              <button
                key={label}
                type="button"
                onClick={() =>
                  navigate(
                    withLocalePrefix(`/clinic-listing?q=${encodeURIComponent(label)}`, lang),
                  )
                }
                className="rounded-xl border border-border bg-white px-3 py-2 text-sm text-brand-navy transition-colors hover:border-primary/40 hover:text-primary"
              >
                {label}
              </button>
            ))}
            <span className="hidden h-9 w-9 items-center justify-center rounded-full border border-border bg-white text-primary sm:flex">
              <ChevronRight className="h-4 w-4" aria-hidden="true" />
            </span>
          </div>
        </div>
      </div>
    </section>
  );
};
