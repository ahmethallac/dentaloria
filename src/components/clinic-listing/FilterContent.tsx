import { useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Filter, RotateCcw, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/clinicMeta";

/*
 * Sidebar filters. Sections collapse, long lists cut off after VISIBLE items
 * behind a "Show more", and the whole thing is a single column of radio-style
 * rows.
 *
 * Treatment / Country / City are single-select, so they get radio circles.
 * Language is multi-select — the reference draws the same circle for it, but a
 * radio that accepts several answers is a lie, so it gets a check mark
 * instead. Same size and position; only the glyph differs.
 */

const VISIBLE = 4;

interface FilterContentProps {
  treatments: any[];
  countries: any[];
  cities: any[];
  selectedTreatment: string;
  selectedCountry: string;
  selectedCity: string;
  selectedLanguages: string[];
  setSelectedTreatment: (value: string) => void;
  setSelectedCountry: (value: string) => void;
  setSelectedCity: (value: string) => void;
  setSelectedLanguages: (value: string[]) => void;
  clearFilters: () => void;
  onApply?: () => void;
  showHeader?: boolean;
}

const Section = ({ title, children }: { title: string; children: ReactNode }) => {
  const [open, setOpen] = useState(true);
  return (
    <div className="border-b border-border pb-5 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between py-1 text-left"
      >
        <span className="text-sm font-semibold text-brand-navy">{title}</span>
        <ChevronDown
          className={`h-4 w-4 text-nav-muted transition-transform ${open ? "" : "-rotate-90"}`}
          aria-hidden="true"
        />
      </button>
      {open && <div className="mt-3 space-y-1">{children}</div>}
    </div>
  );
};

const Option = ({
  selected,
  multi,
  onSelect,
  children,
}: {
  selected: boolean;
  multi?: boolean;
  onSelect: () => void;
  children: ReactNode;
}) => (
  <button
    type="button"
    onClick={onSelect}
    role={multi ? "checkbox" : "radio"}
    aria-checked={selected}
    className="flex w-full items-center gap-3 rounded-lg py-1.5 text-left transition-colors hover:text-primary"
  >
    <span
      className={`flex h-4 w-4 shrink-0 items-center justify-center border transition-colors ${
        multi ? "rounded-[4px]" : "rounded-full"
      } ${selected ? "border-primary bg-primary" : "border-nav-muted/50 bg-white"}`}
      aria-hidden="true"
    >
      {selected &&
        (multi ? (
          <Check className="h-3 w-3 text-primary-foreground" strokeWidth={3} />
        ) : (
          <span className="h-1.5 w-1.5 rounded-full bg-primary-foreground" />
        ))}
    </span>
    <span className={`text-sm ${selected ? "font-medium text-primary" : "text-nav-muted"}`}>
      {children}
    </span>
  </button>
);

/** Renders the first VISIBLE children, the rest behind a "Show more" toggle. */
const Collapsed = ({ children }: { children: ReactNode[] }) => {
  const { t } = useTranslation("clinicListing");
  const [expanded, setExpanded] = useState(false);
  const items = children.filter(Boolean);
  if (items.length <= VISIBLE) return <>{items}</>;
  return (
    <>
      {expanded ? items : items.slice(0, VISIBLE)}
      <button
        type="button"
        onClick={() => setExpanded((v) => !v)}
        className="pt-1 text-sm font-medium text-primary hover:underline"
      >
        {expanded ? t("filters.showLess") : t("filters.showMore")}
      </button>
    </>
  );
};

export const FilterContent = ({
  treatments,
  countries,
  cities,
  selectedTreatment,
  selectedCountry,
  selectedCity,
  selectedLanguages,
  setSelectedTreatment,
  setSelectedCountry,
  setSelectedCity,
  setSelectedLanguages,
  clearFilters,
  onApply,
  showHeader = true,
}: FilterContentProps) => {
  const { t } = useTranslation("clinicListing");
  const { t: tCommon } = useTranslation("common");

  const toggleLanguage = (code: string) =>
    setSelectedLanguages(
      selectedLanguages.includes(code)
        ? selectedLanguages.filter((c) => c !== code)
        : [...selectedLanguages, code],
    );

  return (
    <div className="space-y-5">
      {showHeader && (
        <div className="flex items-center justify-between border-b border-border pb-4">
          <span className="flex items-center gap-2 text-base font-bold text-brand-navy">
            <Filter className="h-4 w-4 text-primary" aria-hidden="true" />
            {t("filters.title")}
          </span>
          <button
            type="button"
            onClick={clearFilters}
            className="flex items-center gap-1.5 text-sm font-medium text-primary hover:underline"
          >
            {t("filters.clearAll")}
            <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
          </button>
        </div>
      )}

      <Section title={t("filters.treatments")}>
        <Collapsed>
          {[
            <Option
              key="all"
              selected={selectedTreatment === "all"}
              onSelect={() => setSelectedTreatment("all")}
            >
              {t("filters.allTreatments")}
            </Option>,
            ...treatments.map((treatment) => (
              <Option
                key={treatment.id}
                selected={selectedTreatment === treatment.id}
                onSelect={() => setSelectedTreatment(treatment.id)}
              >
                {treatment.name}
              </Option>
            )),
          ]}
        </Collapsed>
      </Section>

      <Section title={t("filters.countries")}>
        <Collapsed>
          {[
            <Option
              key="all"
              selected={selectedCountry === "all"}
              onSelect={() => {
                setSelectedCountry("all");
                setSelectedCity("all");
              }}
            >
              {t("filters.allCountries")}
            </Option>,
            ...countries.map((country) => (
              <Option
                key={country.id}
                selected={selectedCountry === country.id}
                onSelect={() => {
                  setSelectedCountry(country.id);
                  setSelectedCity("all");
                }}
              >
                {country.name}
              </Option>
            )),
          ]}
        </Collapsed>
      </Section>

      {/* Cities are loaded per country, so this only has anything to show once
          a country is picked. */}
      {selectedCountry !== "all" && cities.length > 0 && (
        <Section title={t("filters.cities")}>
          <Collapsed>
            {[
              <Option
                key="all"
                selected={selectedCity === "all"}
                onSelect={() => setSelectedCity("all")}
              >
                {t("filters.allCities")}
              </Option>,
              ...cities.map((city) => (
                <Option
                  key={city.id}
                  selected={selectedCity === city.id}
                  onSelect={() => setSelectedCity(city.id)}
                >
                  {city.name}
                </Option>
              )),
            ]}
          </Collapsed>
        </Section>
      )}

      <Section title={t("filters.languages")}>
        <Collapsed>
          {[
            <Option
              key="all"
              selected={selectedLanguages.length === 0}
              onSelect={() => setSelectedLanguages([])}
            >
              {t("filters.allLanguages")}
            </Option>,
            ...LANGUAGES.map((language) => (
              <Option
                key={language.code}
                multi
                selected={selectedLanguages.includes(language.code)}
                onSelect={() => toggleLanguage(language.code)}
              >
                <span className="flex items-center gap-2">
                  {tCommon(`languageNames.${language.code}`)}
                  <span aria-hidden="true">{language.flag}</span>
                </span>
              </Option>
            )),
          ]}
        </Collapsed>
      </Section>

      <Button
        onClick={onApply}
        className="h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
      >
        {t("filters.applyFilters")}
        <SlidersHorizontal className="ml-2 h-4 w-4" aria-hidden="true" />
      </Button>
    </div>
  );
};
