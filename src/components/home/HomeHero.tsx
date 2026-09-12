import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import {
  ChevronRight,
  Gem,
  Heart,
  Languages,
  MapPin,
  MessageSquareText,
  Plane,
  Search,
  Sparkles,
  Tag,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISearchBar } from "@/components/home/AISearchBar";
import heroImage from "@/assets/hero-home.webp";

/*
 * Home hero, built to the design comp the client supplied (a 1935px-wide
 * screenshot of a ~1655px viewport, so comp px / 1.17 = CSS px).
 *
 * Two things carry the layout:
 *  - the content column is 1264px, the same one the header uses, so the
 *    eyebrow, headline, card and stats all line up with the logo;
 *  - the photo is a full-bleed band whose bottom edge is an ellipse, which is
 *    what lifts the white page into the two bottom corners.
 */

type Option = { id: string; name: string };

/**
 * A chip under the search card. `label` is translated; `treatment` and `city`
 * are canonical English names that the click resolves against the loaded data,
 * so a chip filters for real rather than just reading like a link.
 */
export type PopularSearch = { label: string; treatment?: string; city?: string };

interface HomeHeroProps {
  treatments: Option[];
  countries: Option[];
  selectedTreatment: string;
  onTreatmentChange: (value: string) => void;
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  languages: Option[];
  selectedLanguage: string;
  onLanguageChange: (value: string) => void;
  onSearch: () => void;
  onPopularSearch: (item: PopularSearch) => void;
}

/** lucide has no tooth glyph, so this is drawn to match its 24/2/round style. */
const ToothIcon = ({ className }: { className?: string }) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth={2}
    strokeLinecap="round"
    strokeLinejoin="round"
    className={className}
    aria-hidden="true"
  >
    <path d="M12 5.5c-1.4-1.2-3-1.8-4.6-1.5C5.2 4.4 4 6.3 4 8.8c0 2 .4 3.6.9 5.4.4 1.4.6 2.7.8 4.2.1 1.1.9 1.9 1.8 1.9.8 0 1.5-.6 1.7-1.5l.9-3.6c.2-.8.8-1.3 1.6-1.3h.6c.8 0 1.4.5 1.6 1.3l.9 3.6c.2.9.9 1.5 1.7 1.5.9 0 1.7-.8 1.8-1.9.2-1.5.4-2.8.8-4.2.5-1.8.9-3.4.9-5.4 0-2.5-1.2-4.4-3.4-4.8-1.6-.3-3.2.3-4.6 1.5Z" />
  </svg>
);

/** The first trust badge is a solid shield in the comp, not an outline. */
const ShieldSolid = ({ className }: { className?: string }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true">
    <path
      d="M12 2.2 4.4 5.6v5.7c0 4.9 3.2 9.4 7.6 10.5 4.4-1.1 7.6-5.6 7.6-10.5V5.6L12 2.2Z"
      fill="currentColor"
    />
    <path
      d="m8.6 11.9 2.4 2.4 4.4-4.5"
      fill="none"
      stroke="#fff"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    />
  </svg>
);

const TRUST_BADGES = [
  { Icon: ShieldSolid, key: "hero.badgeVerified" },
  { Icon: Tag, key: "hero.badgeTransparent" },
  { Icon: Users, key: "hero.badgeReviews" },
] as const;

const STATS = [
  { Icon: Users, valueKey: "stats.clinicsValue", labelKey: "stats.clinicsLabel" },
  { Icon: Heart, valueKey: "stats.patientsValue", labelKey: "stats.patientsLabel" },
  { Icon: Gem, valueKey: "stats.priceValue", labelKey: "stats.priceLabel" },
  { Icon: MessageSquareText, valueKey: "stats.reviewsValue", labelKey: "stats.reviewsLabel" },
] as const;

/*
 * Scroll parallax between the photo and the search card.
 *
 * The photo is translated DOWN as the page scrolls, so it drifts upward more
 * slowly than the page — the classic lag. It needs no extra image height: the
 * strip it uncovers at the band's top is `scrollY * PHOTO_RATE` tall, which
 * with a rate below 1 always stays above the fold, and the bottom is clipped
 * by the band's overflow. The card gets a small negative rate so it runs
 * slightly ahead, widening the gap between the two layers.
 *
 * Only `transform` is written, so this stays on the compositor. Updates are
 * coalesced into one rAF per frame and clamped once the hero has scrolled
 * past, and the whole thing is skipped for readers who ask for reduced motion
 * — drifting layers are a common vestibular trigger.
 */
const PHOTO_RATE = 0.25;
const CARD_RATE = -0.05;
const HERO_RANGE = 900;

const useHeroParallax = () => {
  const photoRef = useRef<HTMLImageElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    let raf = 0;

    const paint = () => {
      raf = 0;
      const y = Math.min(window.scrollY, HERO_RANGE);
      if (photoRef.current) {
        photoRef.current.style.transform = `translate3d(0, ${y * PHOTO_RATE}px, 0)`;
      }
      if (cardRef.current) {
        cardRef.current.style.transform = `translate3d(0, ${y * CARD_RATE}px, 0)`;
      }
    };

    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };

    const reset = () => {
      if (photoRef.current) photoRef.current.style.transform = "";
      if (cardRef.current) cardRef.current.style.transform = "";
    };

    const sync = () => {
      window.removeEventListener("scroll", onScroll);
      if (query.matches) {
        reset();
        return;
      }
      window.addEventListener("scroll", onScroll, { passive: true });
      paint();
    };

    sync();
    query.addEventListener("change", sync);
    return () => {
      query.removeEventListener("change", sync);
      window.removeEventListener("scroll", onScroll);
      if (raf) cancelAnimationFrame(raf);
    };
  }, []);

  return { photoRef, cardRef };
};

export const HomeHero = ({
  treatments,
  countries,
  selectedTreatment,
  onTreatmentChange,
  selectedCountry,
  onCountryChange,
  languages,
  selectedLanguage,
  onLanguageChange,
  onSearch,
  onPopularSearch,
}: HomeHeroProps) => {
  const { t } = useTranslation("home");
  const [tab, setTab] = useState<"filters" | "ai">("filters");
  const { photoRef, cardRef } = useHeroParallax();

  const selectClass = "h-[50px] flex-1 rounded-xl border-border/70 bg-white text-sm";
  const tabClass = (on: boolean) =>
    `flex shrink-0 items-center gap-2 whitespace-nowrap border-b-2 pb-3 text-[13px] transition-colors lg:text-[15px] ${
      on
        ? "border-primary font-semibold text-primary"
        : "border-transparent font-normal text-nav-muted hover:text-primary"
    }`;

  return (
    <section data-fid="hero" className="relative bg-background">
      {/* Photo band. Starts under the header and ends on an ellipse — the
          `50% / 46px` radius is what curves the white page up into the bottom
          two corners instead of cutting the photo off on a straight line.

          Below lg it steps out of the backdrop and becomes a banner in the
          flow: the headline is three lines on a phone and would otherwise land
          on the subject's face, which no gradient makes readable. */}
      <div
        data-fid="hero.photo"
        className="relative h-[210px] w-full overflow-hidden rounded-b-[28px] lg:absolute lg:inset-x-0 lg:-top-20 lg:h-[612px] lg:rounded-b-none"
      >
        <img
          ref={photoRef}
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[68%_center] will-change-transform lg:object-[center_22%]"
        />
        {/* Dissolve the left edge into the page instead of ending on a line. */}
        <div className="absolute inset-y-0 left-0 hidden w-[55%] bg-gradient-to-r from-background via-background/70 to-transparent lg:block" />

        {/* The page's white lifted into an arc: highest behind the card and
            falling away to either side, so the photo runs LOWER at the two
            edges than it does in the middle.

            It has to be a white shape with cut TOP corners rather than a photo
            with cut BOTTOM corners — a bottom radius shortens the band at the
            corners, which curves the arc the other way up. And the ellipse is
            written as arbitrary properties, not `rounded-t-[…]`: a `/` inside
            a Tailwind arbitrary value is read as the opacity separator, so the
            two-radius form silently compiles to nothing. */}
        <div className="absolute inset-x-0 bottom-0 hidden h-[46px] bg-background lg:block lg:[border-top-left-radius:50%_46px] lg:[border-top-right-radius:50%_46px]" />
      </div>

      <div className="relative mx-auto w-full max-w-[1264px] px-5 pb-10 pt-10 sm:px-6 lg:pb-6 lg:pt-11 xl:px-0">
        <div className="max-w-[620px]">
          <p
            data-fid="hero.eyebrow"
            className="flex items-center gap-4 text-[11px] font-semibold uppercase tracking-[0.17em] text-brand-navy lg:text-[12px]"
          >
            {t("hero.eyebrow")}
            <span className="hidden h-px w-9 bg-brand-navy/30 sm:block" />
          </p>

          <h1
            data-fid="hero.title"
            className="mt-5 text-[34px]/[1.1] font-bold tracking-[-0.015em] sm:text-[42px]/[1.08] lg:mt-7 lg:text-[50px]/[1.0]"
          >
            <span className="block text-brand-navy">{t("hero.titleLine1")}</span>
            <span className="block text-brand-blue-bright">{t("hero.titleLine2")}</span>
          </h1>

          <p
            data-fid="hero.subtitle"
            className="mt-4 max-w-[400px] text-[15px]/[1.5] text-hero-subtitle lg:mt-4 lg:max-w-none lg:text-[16px]/[1.3]"
          >
            {t("hero.subtitle")}
          </p>

          <ul
            data-fid="hero.badges"
            className="mt-6 flex flex-wrap items-center gap-x-5 gap-y-3 lg:mt-6 lg:gap-x-6"
          >
            {TRUST_BADGES.map(({ Icon, key }, i) => (
              <li
                key={key}
                className={`flex items-center gap-2.5 ${
                  /* Dividers only where the row cannot wrap; a wrapped row
                     would otherwise start with a stray rule. */
                  i > 0 ? "lg:border-l lg:border-border lg:pl-6" : ""
                }`}
              >
                <Icon className="h-[22px] w-[22px] shrink-0 text-primary" />
                {/* Narrow on purpose: the comp breaks every label after its
                    first word, onto two lines. */}
                <span className="max-w-[92px] text-[13px] font-medium leading-[1.25] text-brand-navy">
                  {t(key)}
                </span>
              </li>
            ))}
          </ul>
        </div>

        {/* Search card — sits over the lower half of the photo band. */}
        <div
          ref={cardRef}
          data-fid="hero.card"
          className="mt-6 w-full rounded-[16px] bg-white shadow-[0_14px_38px_-16px_rgba(9,87,251,0.20)] will-change-transform lg:mx-auto lg:mt-10 lg:max-w-[1120px]"
        >
          <div className="flex items-center gap-5 overflow-x-auto px-5 pt-4 sm:px-9 lg:gap-10">
            <button
              type="button"
              onClick={() => setTab("filters")}
              aria-pressed={tab === "filters"}
              className={tabClass(tab === "filters")}
            >
              <Search className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("hero.tabByTreatment")}
            </button>
            <button
              type="button"
              onClick={() => setTab("ai")}
              aria-pressed={tab === "ai"}
              className={tabClass(tab === "ai")}
            >
              <Sparkles className="h-[18px] w-[18px]" aria-hidden="true" />
              {t("hero.tabAiSearch")}
              <span className="rounded-full bg-primary px-2.5 py-0.5 text-[11px] font-semibold text-primary-foreground">
                {t("hero.badgeNew")}
              </span>
            </button>
          </div>

          {tab === "ai" ? (
            /* Reuses the already-wired AI search; it just needed a home. */
            <div className="px-5 py-7 sm:px-9">
              <AISearchBar />
            </div>
          ) : (
            <div>
              <div className="flex flex-col gap-3 px-5 pt-5 sm:px-9 lg:flex-row lg:items-center lg:gap-[18px]">
                <Select value={selectedTreatment} onValueChange={onTreatmentChange}>
                  <SelectTrigger data-fid="hero.treatment" className={selectClass}>
                    <span className="!flex items-center gap-2.5">
                      <ToothIcon className="h-[18px] w-[18px] shrink-0 text-primary" />
                      <SelectValue placeholder={t("hero.selectTreatment")} />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((treatment) => (
                      <SelectItem key={treatment.id} value={treatment.id}>
                        {treatment.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedCountry} onValueChange={onCountryChange}>
                  <SelectTrigger data-fid="hero.country" className={selectClass}>
                    <span className="!flex items-center gap-2.5">
                      <MapPin className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
                      <SelectValue placeholder={t("hero.selectCountry")} />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Select value={selectedLanguage} onValueChange={onLanguageChange}>
                  <SelectTrigger data-fid="hero.language" className={selectClass}>
                    <span className="!flex items-center gap-2.5">
                      <Languages className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
                      <SelectValue placeholder={t("hero.selectLanguage")} />
                    </span>
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((language) => (
                      <SelectItem key={language.id} value={language.id}>
                        {language.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                <Button
                  data-fid="hero.search"
                  onClick={onSearch}
                  className="h-[50px] w-full justify-between rounded-xl bg-primary px-5 text-[15px] font-semibold text-primary-foreground hover:bg-primary/90 lg:w-[277px]"
                >
                  <span className="flex items-center gap-2.5">
                    <Search className="h-[18px] w-[18px]" aria-hidden="true" />
                    {t("hero.searchClinics")}
                  </span>
                  <ChevronRight className="h-[18px] w-[18px] opacity-80" aria-hidden="true" />
                </Button>
              </div>

              <div className="flex items-center gap-2 px-5 pb-5 pt-5 sm:px-9 lg:gap-2.5">
                <span className="hidden h-px w-4 shrink-0 bg-border lg:block" />
                <span className="shrink-0 text-[13px] text-nav-muted">
                  {t("hero.popularSearches")}
                </span>

                {/* The chips drift sideways. Four copies so half the track
                    clears the card at every width — the loop point is at -50%,
                    so an odd count would show a seam. */}
                <div className="relative min-w-0 flex-1 overflow-hidden">
                  <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-12 bg-gradient-to-l from-white to-transparent" />
                  <div className="flex w-max animate-marquee gap-2 hover:[animation-play-state:paused] motion-reduce:animate-none lg:gap-2.5">
                    {Array.from({ length: 4 }).flatMap((_, copy) =>
                      (t("hero.popularSearchItems", { returnObjects: true }) as PopularSearch[]).map(
                        (item) => (
                          <button
                            key={`${copy}-${item.label}`}
                            type="button"
                            /* Only the first copy is real to a screen reader;
                               the rest exist to make the loop seamless. */
                            aria-hidden={copy > 0}
                            tabIndex={copy > 0 ? -1 : 0}
                            onClick={() => onPopularSearch(item)}
                            className="shrink-0 whitespace-nowrap rounded-[9px] border border-border/70 px-3 py-1.5 text-[11px] leading-snug text-brand-navy transition-colors hover:border-primary/50 hover:bg-primary/5 hover:text-primary lg:text-[13px]"
                          >
                            {item.label}
                          </button>
                        ),
                      ),
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Stats strip closing the hero. */}
        <div
          data-fid="hero.stats"
          className="mt-7 grid grid-cols-2 gap-x-4 gap-y-6 lg:grid-cols-4"
        >
          {STATS.map(({ Icon, valueKey, labelKey }, i) => (
            <div
              key={valueKey}
              className={`flex items-center gap-3 lg:gap-4 ${
                i > 0 ? "lg:border-l lg:border-border lg:pl-8" : ""
              }`}
            >
              <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full bg-primary/10 lg:h-[50px] lg:w-[50px]">
                <Icon className="h-5 w-5 text-primary lg:h-6 lg:w-6" aria-hidden="true" />
              </span>
              <div className="min-w-0">
                <div className="text-sm font-bold leading-snug text-brand-navy lg:text-[20px]">
                  {t(valueKey)}
                </div>
                <div className="text-[11px] leading-snug text-nav-muted lg:text-sm">
                  {t(labelKey)}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Floating marker over the photo. Drifts a few millimetres up and down —
          slow enough to read as ambient rather than as motion. Lives in the
          right gutter, outside the 1264 column, so it only appears once there
          is gutter for it. */}
      <div
        data-fid="hero.worldwide"
        className="absolute right-12 top-[280px] hidden w-[128px] animate-float rounded-[17px] bg-white px-4 py-[19px] shadow-card motion-reduce:animate-none xl:flex xl:items-start xl:gap-3"
      >
        <span className="flex flex-col items-center gap-2 pt-0.5">
          <Plane className="h-[18px] w-[18px] shrink-0 text-primary" aria-hidden="true" />
          <span className="h-px w-4 bg-border" />
        </span>
        <span className="text-[13px] font-semibold leading-[1.35] text-brand-navy">
          {t("hero.worldwide")}
        </span>
      </div>
    </section>
  );
};
