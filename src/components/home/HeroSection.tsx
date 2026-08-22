import { useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import {
  Search,
  ShieldCheck,
  Tag,
  MessageSquare,
  Star,
  Heart,
  BadgeCheck,
  Globe,
  Stethoscope,
  ChevronRight,
  Flame,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AISearchBar } from "@/components/home/AISearchBar";
import { withLocalePrefix } from "@/lib/localePath";
import type { Treatment } from "@/lib/services";
import heroImage from "@/assets/hero-smile.jpg";

interface HeroSectionProps {
  treatments: Treatment[];
  countries: any[];
}

const POPULAR_SEARCHES = [
  "All-on-6 in Istanbul",
  "Hollywood Smile in Antalya",
  "Zirconium Crown in Izmir",
  "Teeth Whitening in Bodrum",
];

const TRENDING_SEARCHES = [
  "All-on-6 Antalya",
  "Hollywood Smile Istanbul",
  "Zirconium Crown Izmir",
  "Teeth Whitening Antalya",
  "Veneers Turkey",
];

export function HeroSection({ treatments, countries }: HeroSectionProps) {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("home");
  const [tab, setTab] = useState<"filters" | "ai">("filters");
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTreatment) params.set("treatment", selectedTreatment);
    if (selectedCountry) params.set("country", selectedCountry);
    navigate(withLocalePrefix(`/clinic-listing?${params.toString()}`, lang));
  };

  const goToQuery = (q: string) => {
    navigate(withLocalePrefix(`/clinic-listing?q=${encodeURIComponent(q)}`, lang));
  };

  const trustChips = [
    { icon: ShieldCheck, label: t("hero.trust.verified", "Verified Clinics") },
    { icon: Tag, label: t("hero.trust.prices", "Transparent Prices") },
    { icon: MessageSquare, label: t("hero.trust.reviews", "Real Patient Reviews") },
  ];

  const stats = [
    { icon: BadgeCheck, value: "500+", label: t("hero.stats.clinics", "Verified Clinics") },
    { icon: Heart, value: "10,000+", label: t("hero.stats.patients", "Happy Patients") },
    {
      icon: Star,
      value: t("hero.stats.priceTitle", "Best Price Guarantee"),
      label: t("hero.stats.priceDesc", "Transparent & Fair"),
      stacked: true,
    },
    {
      icon: MessageSquare,
      value: t("hero.stats.reviewsTitle", "Real Patient Reviews"),
      label: t("hero.stats.reviewsDesc", "See authentic experiences"),
      stacked: true,
    },
  ];

  return (
    <>
      <section className="relative overflow-hidden bg-background">
        {/* Background image (right side) with light wash toward the left */}
        <div className="absolute inset-0">
          <img
            src={heroImage}
            alt={t("hero.imageAlt", "Smiling patient in a seaside dental clinic")}
            width={1600}
            height={1104}
            className="absolute right-0 top-0 h-full w-full object-cover object-[70%_center] md:w-[62%]"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-background via-background/90 to-background/10 md:via-background/70 md:to-transparent" />
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </div>

        <div className="relative container mx-auto px-6 pt-16 pb-28 md:pt-24 md:pb-36">
          <div className="max-w-2xl">
            <h1 className="text-4xl md:text-5xl lg:text-[3.4rem] font-bold leading-[1.08] tracking-tight text-foreground">
              {t("hero.titleLine1")}
              <span className="block text-primary">{t("hero.titleLine2")}</span>
            </h1>
            <p className="mt-5 text-base md:text-lg text-muted-foreground max-w-md">
              {t("hero.subtitle")}
            </p>

            <div className="mt-7 flex flex-wrap items-center gap-x-8 gap-y-3">
              {trustChips.map(({ icon: Icon, label }) => (
                <div key={label} className="flex items-center gap-2 text-sm font-medium text-foreground/80">
                  <Icon className="h-4 w-4 text-primary" />
                  {label}
                </div>
              ))}
            </div>
          </div>

          {/* Search card */}
          <div className="mt-10 max-w-3xl rounded-2xl bg-card shadow-[0_18px_50px_-18px_hsl(var(--primary)/0.35)] border border-border/60">
            {/* Tabs */}
            <div className="flex border-b border-border/70">
              <button
                onClick={() => setTab("filters")}
                className={`flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-colors flex-1 sm:flex-none sm:w-1/2 border-b-2 ${
                  tab === "filters"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Search className="h-4 w-4" />
                {t("hero.tabFilters", "Find by Treatment & Country")}
              </button>
              <button
                onClick={() => setTab("ai")}
                className={`flex items-center justify-center gap-2 px-5 py-4 text-sm font-semibold transition-colors flex-1 sm:flex-none sm:w-1/2 border-b-2 ${
                  tab === "ai"
                    ? "border-primary text-primary"
                    : "border-transparent text-muted-foreground hover:text-foreground"
                }`}
              >
                <Sparkles className="h-4 w-4" />
                {t("hero.tabAi", "AI Search")}
                <span className="rounded-full bg-primary px-2 py-0.5 text-[10px] font-bold uppercase text-primary-foreground">
                  {t("hero.new", "New")}
                </span>
              </button>
            </div>

            <div className="p-5">
              {tab === "filters" ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-[1fr_1fr_auto] gap-3">
                    <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <span className="flex items-center gap-2 text-left">
                          <Stethoscope className="h-4 w-4 text-primary shrink-0" />
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

                    <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                      <SelectTrigger className="h-12 rounded-xl">
                        <span className="flex items-center gap-2 text-left">
                          <Globe className="h-4 w-4 text-primary shrink-0" />
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

                    <Button
                      onClick={handleSearch}
                      className="h-12 rounded-xl px-7 font-semibold md:min-w-[170px]"
                    >
                      <Search className="h-4 w-4 mr-2" />
                      {t("hero.searchClinics")}
                    </Button>
                  </div>

                  <div className="mt-4 flex items-center gap-3">
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {t("hero.popularSearches", "Popular searches:")}
                    </span>
                    <div className="flex-1 flex gap-2 overflow-x-auto scrollbar-hide">
                      {POPULAR_SEARCHES.map((s) => (
                        <button
                          key={s}
                          onClick={() => goToQuery(s)}
                          className="shrink-0 rounded-md bg-muted/60 px-3 py-1.5 text-xs font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors"
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                    <button
                      aria-label="More popular searches"
                      className="hidden sm:flex h-7 w-7 shrink-0 items-center justify-center rounded-full border border-border bg-card text-muted-foreground hover:text-primary transition-colors"
                    >
                      <ChevronRight className="h-4 w-4" />
                    </button>
                  </div>
                </>
              ) : (
                <AISearchBar />
              )}
            </div>
          </div>
        </div>

        {/* Stats bar */}
        <div className="relative container mx-auto px-6 -mt-16 md:-mt-20 pb-10">
          <div className="rounded-2xl bg-[hsl(224_64%_18%)] px-6 py-6 md:px-10 md:py-7 shadow-xl">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-4">
              {stats.map(({ icon: Icon, value, label, stacked }) => (
                <div key={label} className="flex items-center gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/25 text-primary-foreground">
                    <Icon className="h-4 w-4" />
                  </span>
                  <div className="min-w-0">
                    <div
                      className={`text-primary-foreground truncate ${
                        stacked ? "text-sm font-semibold" : "text-lg font-bold"
                      }`}
                    >
                      {value}
                    </div>
                    <div className="text-xs text-primary-foreground/70 truncate">{label}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Trending searches */}
      <section className="container mx-auto px-6 pb-6">
        <div className="flex flex-wrap items-center gap-3">
          <span className="flex items-center gap-2 text-sm font-semibold text-foreground">
            <Flame className="h-4 w-4 text-orange-500" />
            {t("hero.trending", "Trending Searches")}
          </span>
          <div className="flex flex-1 gap-2 overflow-x-auto scrollbar-hide">
            {TRENDING_SEARCHES.map((s) => (
              <button
                key={s}
                onClick={() => goToQuery(s)}
                className="shrink-0 rounded-full bg-muted/60 px-4 py-2 text-xs font-medium text-foreground/70 hover:bg-primary/10 hover:text-primary transition-colors"
              >
                {s}
              </button>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}

export default HeroSection;
