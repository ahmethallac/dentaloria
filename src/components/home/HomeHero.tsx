import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { BadgeCheck, ChevronRight, Globe, Languages, Search, Sparkles, Stethoscope, Tag, Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AISearchBar } from "@/components/home/AISearchBar";
import heroImage from "@/assets/hero-home.webp";

/*
 * Built from the Figma reference, node 2:2 (see .claude/skills/dentaloria-ui-fidelity).
 *
 * That file is a screenshot traced into vectors, not a design source: it has no
 * variables, no auto-layout, and its frame is 863px wide. Every measurement below
 * is the traced value scaled by 1440/863 and snapped to the 4px grid — the
 * derivation lives in the skill's SKILL.md. Where the trace disagreed with itself
 * (six different greys for six nav links, a 3px card misalignment) the design
 * intent won.
 */

type Option = { id: string; name: string };

interface HomeHeroProps {
  treatments: Option[];
  countries: Option[];
  selectedTreatment: string;
  onTreatmentChange: (value: string) => void;
  selectedCountry: string;
  onCountryChange: (value: string) => void;
  /** Optional third filter, mobile reference node 1:402. */
  languages: Option[];
  selectedLanguage: string;
  onLanguageChange: (value: string) => void;
  onSearch: () => void;
}

/** Trust markers under the subtitle. 27px apart at 863 -> 44px here. */
const TRUST_BADGES = [
  { icon: BadgeCheck, key: "hero.badgeVerified" },
  { icon: Tag, key: "hero.badgeTransparent" },
  { icon: Star, key: "hero.badgeReviews" },
] as const;


/*
 * Scroll parallax between the hero photo and the search card.
 *
 * The photo is translated DOWN as the page scrolls, so it drifts upward more
 * slowly than the page — the classic lag. It needs no extra image height: the
 * strip it uncovers at the container's top is `scrollY * PHOTO_RATE` tall,
 * which with a rate below 1 is always above the fold, and the bottom is
 * clipped by the container's overflow. The card gets a small negative rate so
 * it runs slightly ahead, widening the gap between the two layers.
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
    // below lg the photo box starts under the header, where the uncovered
    // strip would be visible — so parallax is desktop-only
    const query = window.matchMedia("(prefers-reduced-motion: reduce), (max-width: 1023px)");
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
}: HomeHeroProps) => {
  const { t } = useTranslation("home");
  const [tab, setTab] = useState<"filters" | "ai">("filters");
  const { photoRef, cardRef } = useHeroParallax();

  return (
    <section data-fid="hero" className="relative">
      {/* The photo runs up behind the sticky header, as it does in the design
          (the image node spans the full 415px band, header included). */}
      {/* Full-bleed behind everything on desktop; on mobile it is anchored to
          the right beside the headline instead.

          It cannot stay full-bleed at 375px: the box is 375x875 while the
          source is 863x415, so object-cover scales it 2.1x to fill the height
          and crops 1445px horizontally — only the middle 20% survives, and the
          subject is in the right third, so she disappears entirely. Anchoring
          the box to the right at roughly her own aspect keeps her in frame.

          Both variants start 80px above the section so the parallax never
          exposes a gap: the strip it uncovers is scrollY * PHOTO_RATE tall,
          which with a rate below 1 always sits above the fold. */}
      <div className="absolute right-0 top-0 h-[240px] w-[58%] overflow-hidden lg:-top-20 lg:inset-x-0 lg:bottom-0 lg:h-auto lg:w-auto">
        <img
          ref={photoRef}
          src={heroImage}
          alt=""
          aria-hidden="true"
          className="h-full w-full object-cover object-[91%_center] will-change-transform lg:object-center"
        />
        {/* Feather the cut edges into the page rather than ending on a line. */}
        <div className="absolute inset-y-0 left-0 w-2/5 bg-gradient-to-r from-background via-background/60 to-transparent lg:hidden" />
        <div className="absolute inset-x-0 bottom-0 h-16 bg-gradient-to-b from-transparent to-background lg:h-40" />
        {/* Desktop only — there the photo does sit under the headline. */}
        <div className="absolute inset-0 hidden bg-gradient-to-r from-white/55 via-white/20 to-transparent lg:block" />
      </div>

      <div className="relative mx-auto w-full max-w-[1100px] px-5 pb-14 pt-12 sm:px-8 lg:pt-16">
        <h1 data-fid="hero.title" className="text-3xl/[1.12] font-bold tracking-tight sm:text-4xl/[1.12] lg:text-5xl/[1.12]">
          {/* The break moves between widths: below lg the noun drops to line two
              ("Your Perfect / Smile Starts Here"), at lg it stays up
              ("Your Perfect Smile / Starts Here"). Hence three parts rather
              than two — the split point is chosen per locale in home.json, so
              the word that drops is the natural one in each language. */}
          <span className="text-brand-navy">{t("hero.titleLead")}</span>
          <br className="lg:hidden" />{" "}
          <span className="text-brand-navy">{t("hero.titleWord")}</span>
          <br className="hidden lg:inline" />{" "}
          <span className="text-brand-blue-bright">{t("hero.titleLine2")}</span>
        </h1>

        <p
          data-fid="hero.subtitle"
          className="mt-4 max-w-[420px] text-base/relaxed text-hero-subtitle lg:text-lg/relaxed"
        >
          {t("hero.subtitle")}
        </p>

        <ul data-fid="hero.badges" className="mt-16 grid grid-cols-3 gap-2 lg:mt-5 lg:flex lg:flex-wrap lg:items-center lg:gap-x-11">
          {TRUST_BADGES.map(({ icon: Icon, key }) => (
            <li key={key} className="flex items-start gap-1.5 border-l border-border pl-3 first:border-0 first:pl-0 lg:items-center lg:gap-2 lg:border-0 lg:pl-0">
              <Icon className="mt-0.5 h-4 w-4 shrink-0 text-primary lg:mt-0" aria-hidden="true" />
              <span className="text-[11px] leading-tight text-brand-navy lg:text-sm">{t(key)}</span>
            </li>
          ))}
        </ul>

        {/* Search card — 622x142 at 863 -> 1036x236 here. */}
        <div
          ref={cardRef}
          data-fid="hero.card"
          className="mt-8 w-full rounded-2xl bg-white shadow-card will-change-transform"
        >
          <div className="flex items-center gap-3 overflow-x-auto border-b border-border px-4 pt-6 sm:px-10 lg:gap-8 lg:pt-7">
            <button
              type="button"
              onClick={() => setTab("filters")}
              aria-pressed={tab === "filters"}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 text-[11px] transition-colors lg:gap-2 lg:text-sm ${
                tab === "filters"
                  ? "border-primary font-medium text-primary"
                  : "border-transparent font-normal text-nav-muted hover:text-primary"
              }`}
            >
              <Search className="h-4 w-4" aria-hidden="true" />
              {t("hero.tabFindBy")}
            </button>
            <button
              type="button"
              onClick={() => setTab("ai")}
              aria-pressed={tab === "ai"}
              className={`flex shrink-0 items-center gap-1.5 whitespace-nowrap border-b-2 pb-3 text-[11px] transition-colors lg:gap-2 lg:text-sm ${
                tab === "ai"
                  ? "border-primary font-medium text-primary"
                  : "border-transparent font-normal text-nav-muted hover:text-primary"
              }`}
            >
              <Sparkles className="h-4 w-4" aria-hidden="true" />
              {t("hero.tabAiSearch")}
              <span className="rounded-md bg-primary px-1.5 py-0.5 text-[10px] font-medium text-primary-foreground lg:px-2 lg:text-xs">
                {t("hero.badgeNew")}
              </span>
            </button>
          </div>

          {tab === "filters" ? (
            <>
            <div className="flex flex-col gap-4 px-4 py-6 sm:px-10 md:flex-row md:items-center lg:py-8">
              <Select value={selectedTreatment} onValueChange={onTreatmentChange}>
                <SelectTrigger data-fid="hero.treatment" className="h-12 flex-1 rounded-xl">
                  <span className="!flex items-center gap-3">
                    <Stethoscope className="h-4 w-4 text-primary" aria-hidden="true" />
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
                <SelectTrigger data-fid="hero.country" className="h-12 flex-1 rounded-xl">
                  <span className="!flex items-center gap-3">
                    <Globe className="h-4 w-4 text-primary" aria-hidden="true" />
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
                <SelectTrigger data-fid="hero.language" className="h-12 flex-1 rounded-xl">
                  <span className="!flex items-center gap-3">
                    <Languages className="h-4 w-4 text-primary" aria-hidden="true" />
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
                className="h-12 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90 lg:w-[220px]"
              >
                <Search className="mr-2 h-4 w-4" aria-hidden="true" />
                {t("hero.searchClinics")}
              </Button>
            </div>

            <div className="px-4 pb-8 sm:px-10">
              <span className="text-sm text-nav-muted">{t("hero.popularSearches")}</span>
              <div className="mt-2 grid grid-cols-2 gap-2 lg:mt-0 lg:flex lg:flex-wrap lg:items-center lg:gap-3">
              {(t("hero.popularSearchItems", { returnObjects: true }) as string[]).map((label) => (
                <span
                  key={label}
                  className="rounded-[6px] border border-border px-2 py-1.5 text-center text-[11px] leading-snug text-brand-navy lg:px-3 lg:text-left lg:text-xs"
                >
                  {label}
                </span>
              ))}
                <ChevronRight className="hidden h-4 w-4 text-primary lg:block" aria-hidden="true" />
              </div>
            </div>
            </>
          ) : (
            /* The AI tab reuses the existing, already-wired AISearchBar —
               no new backend, it just needed somewhere to render. */
            <div className="px-5 py-8 sm:px-10">
              <AISearchBar />
            </div>
          )}
        </div>
      </div>
    </section>
  );
};
