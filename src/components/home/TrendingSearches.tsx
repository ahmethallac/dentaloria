import { useTranslation } from "react-i18next";
import { useNavigate, useParams } from "react-router-dom";
import { Flame } from "lucide-react";
import { withLocalePrefix } from "@/lib/localePath";
import { SectionShell } from "./SectionShell";

/*
 * Figma node 2:341 plus the five pills (2:338 … 2:326).
 *
 * The pills drift leftwards continuously and stop while the pointer is over
 * them. The `marquee` keyframe translates the track by -50%, so the row is
 * rendered COPIES times and the loop point sits exactly halfway — with an even
 * count that seam is invisible. Half a track has to be at least a viewport
 * wide or a gap appears before it wraps, hence four copies of five short pills.
 */

const COPIES = 4;

export const TrendingSearches = () => {
  const { t } = useTranslation("home");
  const { lang } = useParams();
  const navigate = useNavigate();

  const items = t("trending.items", { returnObjects: true }) as string[];

  return (
    <SectionShell className="pt-10">
      <div data-fid="trending" className="flex items-center gap-6">
        <span className="inline-flex shrink-0 items-center gap-2 text-sm font-medium text-brand-navy">
          <Flame className="h-4 w-4 text-amber-500" aria-hidden="true" />
          {t("trending.label")}
        </span>

        <div className="relative min-w-0 flex-1 overflow-hidden">
          {/* soften both ends so pills enter and leave rather than pop */}
          <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-10 bg-gradient-to-r from-background to-transparent" />
          <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-10 bg-gradient-to-l from-background to-transparent" />

          <div className="flex w-max animate-marquee gap-3 hover:[animation-play-state:paused] motion-reduce:animate-none">
            {Array.from({ length: COPIES }).flatMap((_, copy) =>
              items.map((label) => (
                <button
                  key={`${copy}-${label}`}
                  type="button"
                  // only the first pass is real content for assistive tech
                  aria-hidden={copy > 0}
                  tabIndex={copy > 0 ? -1 : 0}
                  onClick={() =>
                    navigate(
                      withLocalePrefix(`/clinic-listing?q=${encodeURIComponent(label)}`, lang),
                    )
                  }
                  className="h-11 shrink-0 rounded-[6px] bg-muted/60 px-5 text-sm text-brand-navy transition-colors hover:bg-muted"
                >
                  {label}
                </button>
              )),
            )}
          </div>
        </div>
      </div>
    </SectionShell>
  );
};
