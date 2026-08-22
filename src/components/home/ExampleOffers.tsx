import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import clinic1 from "@/assets/clinic-1.jpg";
import clinic2 from "@/assets/clinic-2.jpg";
import clinic3 from "@/assets/clinic-3.jpg";
import { SectionShell } from "./SectionShell";

/*
 * Figma node 1:184 (mobile) — the strip under the request form showing what a
 * set of returned offers looks like.
 *
 * These are NOT real offers and no clinic quoted them. The design is explicit
 * about that and this keeps every part of it: the heading says
 * "(Illustration)", the rows are dimmed under a "Sample" watermark, and the
 * footnote repeats it. Prices are the single most consequential number on a
 * medical-tourism page, so the labelling is load-bearing, not decoration —
 * do not quietly restyle it away, and swap the block for real data rather
 * than un-dimming these.
 */

const EXAMPLES = [
  { image: clinic1, nameKey: "exampleOffers.clinic1", rating: "5.0", reviews: 320, price: "€4,950" },
  { image: clinic2, nameKey: "exampleOffers.clinic2", rating: "4.9", reviews: 280, price: "€5,200" },
  { image: clinic3, nameKey: "exampleOffers.clinic3", rating: "4.8", reviews: 210, price: "€4,600" },
] as const;

export const ExampleOffers = () => {
  const { t } = useTranslation("home");

  return (
    <SectionShell className="pt-10">
      <h2 className="text-lg font-bold text-brand-navy lg:text-xl">
        {t("exampleOffers.title")}
      </h2>

      <div
        data-fid="example.offers"
        className="relative mt-4 overflow-hidden rounded-2xl border border-border"
      >
        {/* Watermark — decorative, and the disclaimer below carries the meaning
            for anyone who cannot see it. */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 z-10 flex items-center justify-center text-5xl font-bold uppercase tracking-widest text-nav-muted/15 -rotate-12 select-none"
        >
          {t("exampleOffers.watermark")}
        </span>

        <ul className="divide-y divide-border opacity-70">
          {EXAMPLES.map(({ image, nameKey, rating, reviews, price }) => (
            <li key={nameKey} className="flex items-center gap-4 p-4">
              <img
                src={image}
                alt=""
                aria-hidden="true"
                className="h-14 w-14 shrink-0 rounded-xl object-cover grayscale"
              />

              <div className="min-w-0 flex-1">
                <div className="truncate text-sm font-semibold text-brand-navy">
                  {t(nameKey)}
                </div>
                <div className="mt-0.5 flex items-center gap-1.5 text-xs text-nav-muted">
                  <Star className="h-3.5 w-3.5 shrink-0 fill-amber-400 text-amber-400" aria-hidden="true" />
                  <span className="font-medium text-brand-navy">{rating}</span>
                  <span className="truncate">({reviews} {t("popularClinics.reviews")})</span>
                </div>
                <div className="mt-0.5 truncate text-xs text-nav-muted">
                  {t("exampleOffers.treatment")}
                </div>
              </div>

              <div className="shrink-0 text-sm font-bold text-brand-navy">{price}</div>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-3 text-center text-xs font-medium text-primary">
        {t("exampleOffers.disclaimer")}
      </p>
    </SectionShell>
  );
};
