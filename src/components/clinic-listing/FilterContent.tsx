import { useMemo, useState, type ReactNode } from "react";
import { useTranslation } from "react-i18next";
import { Check, ChevronDown, Filter, RotateCcw, Search, SlidersHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import { LANGUAGES } from "@/lib/clinicMeta";

/*
 * Sidebar filters, and the same filters inside the mobile sheet.
 *
 * The two references differ, so the variant does too:
 *   sidebar — collapsible sections, "Show more" past four, Clear All up top.
 *   sheet   — adds a search box and a Reset per section, and moves Clear All
 *             down into a sticky footer beside Apply.
 *
 * Treatment / Country / City are single-select and get radio circles. Language
 * is multi-select; the reference draws the same circle for it, but a radio that
 * accepts several answers is a lie, so it gets a check mark. Same size and
 * position, different glyph.
 */

const VISIBLE = 4;

type Choice = { id: string; label: ReactNode; searchText: string };

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
  variant?: "sidebar" | "sheet";
}

const Row = ({
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
    className="flex w-full items-center gap-3 rounded-lg py-2 text-left transition-colors hover:text-primary"
  >
    <span
      className={`flex h-[18px] w-[18px] shrink-0 items-center justify-center border-2 transition-colors ${
        multi ? "rounded-[5px]" : "rounded-full"
      } ${selected ? "border-primary" : "border-nav-muted/40"}`}
      aria-hidden="true"
    >
      {selected &&
        (multi ? (
          <Check className="h-3 w-3 text-primary" strokeWidth={3} />
        ) : (
          <span className="h-2 w-2 rounded-full bg-primary" />
        ))}
    </span>
    <span className={`text-sm ${selected ? "font-medium text-primary" : "text-brand-navy"}`}>
      {children}
    </span>
  </button>
);

const Section = ({
  title,
  choices,
  selectedIds,
  multi,
  onSelect,
  onReset,
  variant,
  searchPlaceholder,
}: {
  title: string;
  choices: Choice[];
  selectedIds: string[];
  multi?: boolean;
  onSelect: (id: string) => void;
  onReset: () => void;
  variant: "sidebar" | "sheet";
  searchPlaceholder: string;
}) => {
  const { t } = useTranslation("clinicListing");
  const [open, setOpen] = useState(true);
  const [expanded, setExpanded] = useState(false);
  const [query, setQuery] = useState("");
  const isSheet = variant === "sheet";

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return choices;
    // the "all" row is the way back, so it always stays reachable
    return choices.filter((c, i) => i === 0 || c.searchText.toLowerCase().includes(q));
  }, [choices, query]);

  const shown = expanded || query ? filtered : filtered.slice(0, VISIBLE + 1);
  const hasMore = filtered.length > VISIBLE + 1 && !query;

  return (
    <div className={isSheet ? "border-b border-border py-5 first:pt-0" : "border-b border-border pb-5 last:border-0 last:pb-0"}>
      <div className="flex items-center justify-between">
        {isSheet ? (
          <span className="text-base font-bold text-brand-navy">{title}</span>
        ) : (
          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            className="flex flex-1 items-center justify-between py-1 text-left"
          >
            <span className="text-sm font-semibold text-brand-navy">{title}</span>
            <ChevronDown
              className={`h-4 w-4 text-nav-muted transition-transform ${open ? "" : "-rotate-90"}`}
              aria-hidden="true"
            />
          </button>
        )}
        {isSheet && (
          <button
            type="button"
            onClick={onReset}
            className="text-sm font-medium text-primary hover:underline"
          >
            {t("filters.reset")}
          </button>
        )}
      </div>

      {(open || isSheet) && (
        <>
          {isSheet && (
            <div className="relative mt-3">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-nav-muted"
                aria-hidden="true"
              />
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder={searchPlaceholder}
                aria-label={searchPlaceholder}
                className="h-11 w-full rounded-xl border border-border bg-white pl-9 pr-3 text-sm text-brand-navy placeholder:text-nav-muted focus:border-primary focus:outline-none"
              />
            </div>
          )}

          <div className={isSheet ? "mt-2" : "mt-3"}>
            {shown.map((choice) => (
              <Row
                key={choice.id}
                multi={multi && choice.id !== "all"}
                selected={selectedIds.includes(choice.id)}
                onSelect={() => onSelect(choice.id)}
              >
                {choice.label}
              </Row>
            ))}

            {hasMore && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                className="flex items-center gap-1 pt-1 text-sm font-medium text-primary hover:underline"
              >
                {expanded ? t("filters.showLess") : t("filters.showMore")}
                <ChevronDown
                  className={`h-4 w-4 transition-transform ${expanded ? "rotate-180" : ""}`}
                  aria-hidden="true"
                />
              </button>
            )}
          </div>
        </>
      )}
    </div>
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
  variant = "sidebar",
}: FilterContentProps) => {
  const { t } = useTranslation("clinicListing");
  const { t: tCommon } = useTranslation("common");
  const isSheet = variant === "sheet";

  const activeCount = [
    selectedTreatment !== "all",
    selectedCountry !== "all",
    selectedCity !== "all",
    selectedLanguages.length > 0,
  ].filter(Boolean).length;

  const choices = (all: string, items: { id: string; name: string }[]): Choice[] => [
    { id: "all", label: all, searchText: all },
    ...items.map((i) => ({ id: i.id, label: i.name, searchText: i.name })),
  ];

  return (
    <div className={isSheet ? "" : "space-y-5"}>
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

      <Section
        variant={variant}
        title={t("filters.treatments")}
        searchPlaceholder={t("filters.searchTreatments")}
        choices={choices(t("filters.allTreatments"), treatments)}
        selectedIds={[selectedTreatment]}
        onSelect={setSelectedTreatment}
        onReset={() => setSelectedTreatment("all")}
      />

      <Section
        variant={variant}
        title={t("filters.countries")}
        searchPlaceholder={t("filters.searchCountries")}
        choices={choices(t("filters.allCountries"), countries)}
        selectedIds={[selectedCountry]}
        onSelect={(id) => {
          setSelectedCountry(id);
          setSelectedCity("all");
        }}
        onReset={() => {
          setSelectedCountry("all");
          setSelectedCity("all");
        }}
      />

      {/* Cities load per country, so there is nothing to list before one is picked. */}
      {selectedCountry !== "all" && cities.length > 0 && (
        <Section
          variant={variant}
          title={t("filters.cities")}
          searchPlaceholder={t("filters.searchCities")}
          choices={choices(t("filters.allCities"), cities)}
          selectedIds={[selectedCity]}
          onSelect={setSelectedCity}
          onReset={() => setSelectedCity("all")}
        />
      )}

      <Section
        variant={variant}
        multi
        title={t("filters.languages")}
        searchPlaceholder={t("filters.searchLanguages")}
        choices={[
          { id: "all", label: t("filters.allLanguages"), searchText: t("filters.allLanguages") },
          ...LANGUAGES.map((l) => ({
            id: l.code,
            searchText: tCommon(`languageNames.${l.code}`),
            label: (
              <span className="flex items-center gap-2">
                {tCommon(`languageNames.${l.code}`)}
                <span aria-hidden="true">{l.flag}</span>
              </span>
            ),
          })),
        ]}
        selectedIds={selectedLanguages.length === 0 ? ["all"] : selectedLanguages}
        onSelect={(id) =>
          id === "all"
            ? setSelectedLanguages([])
            : setSelectedLanguages(
                selectedLanguages.includes(id)
                  ? selectedLanguages.filter((c) => c !== id)
                  : [...selectedLanguages, id],
              )
        }
        onReset={() => setSelectedLanguages([])}
      />

      {isSheet ? (
        /* sticky footer, so both actions stay reachable down a long list */
        <div className="sticky bottom-0 -mx-5 flex gap-3 border-t border-border bg-white px-5 py-4">
          <Button
            variant="outline"
            onClick={clearFilters}
            className="h-12 flex-1 rounded-xl border-border text-sm font-medium text-brand-navy"
          >
            {t("filters.clearAll")}
          </Button>
          <Button
            onClick={onApply}
            className="h-12 flex-[1.6] rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
          >
            {t("filters.applyFilters")}
            {activeCount > 0 && (
              <span className="ml-2 flex h-6 min-w-6 items-center justify-center rounded-full bg-white/25 px-1.5 text-xs font-semibold">
                {activeCount}
              </span>
            )}
          </Button>
        </div>
      ) : (
        <Button
          onClick={onApply}
          className="h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          {t("filters.applyFilters")}
          <SlidersHorizontal className="ml-2 h-4 w-4" aria-hidden="true" />
        </Button>
      )}
    </div>
  );
};
