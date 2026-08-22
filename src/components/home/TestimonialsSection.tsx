import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { withLocalePrefix } from "@/lib/localePath";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma node 2:69 — four review cards, ~177x116 at 863. Five stars, the quote,
 * then an avatar with the name and country. The reference shows photo avatars;
 * there are none in the repo, so initials on a tinted disc stand in.
 */

type Testimonial = { name: string; location: string; quote: string };

const initials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

export const TestimonialsSection = () => {
  const { t } = useTranslation("home");
  const { lang } = useParams();

  const list = (t("testimonials.list", { returnObjects: true }) as Testimonial[]) || [];
  if (list.length === 0) return null;

  return (
    <SectionShell className="pt-10">
      <SectionHeading
        title={t("testimonials.title")}
        subtitle={t("testimonials.subtitle")}
        actionLabel={t("testimonials.viewAll")}
        actionTo={withLocalePrefix("/clinic-listing", lang)}
      />

      {/* Same drifting track as TrendingSearches: four copies so half the
          track clears a viewport, paused while the pointer is over it. */}
      <div data-fid="testimonials.grid" className="relative mt-6 overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-background to-transparent" />
        <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-background to-transparent" />

        <div className="flex w-max animate-marquee gap-5 hover:[animation-play-state:paused] motion-reduce:animate-none">
        {Array.from({ length: 4 }).flatMap((_, copy) => list.slice(0, 4).map((item) => (
          <figure
            key={`${copy}-${item.name}`}
            aria-hidden={copy > 0}
            className="flex w-[300px] shrink-0 flex-col rounded-2xl border border-border bg-white p-5"
          >
            <div className="flex gap-0.5" aria-label="5 / 5">
              {Array.from({ length: 5 }).map((_, i) => (
                <Star key={i} className="h-4 w-4 fill-amber-400 text-amber-400" aria-hidden="true" />
              ))}
            </div>

            <blockquote className="mt-4 flex-1 text-sm leading-relaxed text-brand-navy">
              “{item.quote}”
            </blockquote>

            <figcaption className="mt-5 flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-primary/10 text-xs font-semibold text-primary">
                {initials(item.name)}
              </span>
              <span className="min-w-0">
                <span className="block truncate text-sm font-semibold text-brand-navy">
                  {item.name}
                </span>
                <span className="block truncate text-xs text-nav-muted">{item.location}</span>
              </span>
            </figcaption>
          </figure>
        )))}
        </div>
      </div>
    </SectionShell>
  );
};
