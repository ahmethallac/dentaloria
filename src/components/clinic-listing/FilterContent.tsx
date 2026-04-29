import { Button } from "@/components/ui/button";
import { Filter, Circle, CheckCircle2 } from "lucide-react";
import { LANGUAGES } from "@/lib/clinicMeta";

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
  const activeFiltersCount = [
    selectedTreatment !== "all",
    selectedCountry !== "all",
    selectedCity !== "all",
    selectedLanguages.length > 0,
  ].filter(Boolean).length;

  const toggleLanguage = (code: string) => {
    if (selectedLanguages.includes(code)) {
      setSelectedLanguages(selectedLanguages.filter((c) => c !== code));
    } else {
      setSelectedLanguages([...selectedLanguages, code]);
    }
  };

  return (
    <div className="space-y-6">
      {showHeader && (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Filter className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
              Filters
            </h3>
          </div>
          {activeFiltersCount > 0 && (
            <span className="text-xs bg-primary text-white px-2 py-1 rounded-full">
              {activeFiltersCount} active
            </span>
          )}
        </div>
      )}

      {/* Treatments Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-4 text-foreground/80">Treatments</h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          <div
            onClick={() => setSelectedTreatment("all")}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <div className="relative">
              {selectedTreatment === "all" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span className={`text-sm ${selectedTreatment === "all" ? "text-primary font-medium" : "text-foreground/70"}`}>
              All Treatments
            </span>
          </div>
          {treatments.map((treatment) => (
            <div
              key={treatment.id}
              onClick={() => setSelectedTreatment(treatment.id)}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <div className="relative">
                {selectedTreatment === treatment.id ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm ${selectedTreatment === treatment.id ? "text-primary font-medium" : "text-foreground/70"}`}>
                {treatment.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Countries Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-4 text-foreground/80">Countries</h4>
        <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
          <div
            onClick={() => {
              setSelectedCountry("all");
              setSelectedCity("all");
            }}
            className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
          >
            <div className="relative">
              {selectedCountry === "all" ? (
                <CheckCircle2 className="h-5 w-5 text-primary" />
              ) : (
                <Circle className="h-5 w-5 text-muted-foreground" />
              )}
            </div>
            <span className={`text-sm ${selectedCountry === "all" ? "text-primary font-medium" : "text-foreground/70"}`}>
              All Countries
            </span>
          </div>
          {countries.map((country) => (
            <div
              key={country.id}
              onClick={() => {
                setSelectedCountry(country.id);
                setSelectedCity("all");
              }}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <div className="relative">
                {selectedCountry === country.id ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm ${selectedCountry === country.id ? "text-primary font-medium" : "text-foreground/70"}`}>
                {country.flag_url} {country.name}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Cities Filter */}
      {selectedCountry !== "all" && cities.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold mb-4 text-foreground/80">Cities</h4>
          <div className="space-y-2 max-h-[150px] overflow-y-auto pr-2">
            <div
              onClick={() => setSelectedCity("all")}
              className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
            >
              <div className="relative">
                {selectedCity === "all" ? (
                  <CheckCircle2 className="h-5 w-5 text-primary" />
                ) : (
                  <Circle className="h-5 w-5 text-muted-foreground" />
                )}
              </div>
              <span className={`text-sm ${selectedCity === "all" ? "text-primary font-medium" : "text-foreground/70"}`}>
                All Cities
              </span>
            </div>
            {cities.map((city) => (
              <div
                key={city.id}
                onClick={() => setSelectedCity(city.id)}
                className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <div className="relative">
                  {selectedCity === city.id ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm ${selectedCity === city.id ? "text-primary font-medium" : "text-foreground/70"}`}>
                  {city.name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Languages Filter */}
      <div>
        <h4 className="text-sm font-semibold mb-4 text-foreground/80">Languages</h4>
        <div className="space-y-2 max-h-[200px] overflow-y-auto pr-2">
          {LANGUAGES.map((lang) => {
            const active = selectedLanguages.includes(lang.code);
            return (
              <div
                key={lang.code}
                onClick={() => toggleLanguage(lang.code)}
                className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
              >
                <div className="relative">
                  {active ? (
                    <CheckCircle2 className="h-5 w-5 text-primary" />
                  ) : (
                    <Circle className="h-5 w-5 text-muted-foreground" />
                  )}
                </div>
                <span className={`text-sm flex items-center gap-2 ${active ? "text-primary font-medium" : "text-foreground/70"}`}>
                  <span aria-hidden>{lang.flag}</span>
                  {lang.name}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* Action Buttons */}
      <div className="space-y-3 pt-2">
        <Button
          onClick={clearFilters}
          variant="outline"
          className="w-full bg-white/50 border-white/30 hover:bg-white/70 rounded-xl"
        >
          Clear Filters
        </Button>
        {onApply && (
          <Button
            onClick={onApply}
            className="w-full bg-gradient-primary hover:opacity-90 text-white border-0 rounded-xl"
          >
            Apply Filters
          </Button>
        )}
      </div>
    </div>
  );
};
