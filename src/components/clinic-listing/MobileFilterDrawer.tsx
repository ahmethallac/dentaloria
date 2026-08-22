import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Filter, SlidersHorizontal } from "lucide-react";
import { FilterContent } from "./FilterContent";

interface MobileFilterDrawerProps {
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
}

export const MobileFilterDrawer = ({
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
}: MobileFilterDrawerProps) => {
  const { t } = useTranslation("clinicListing");
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    selectedTreatment !== "all",
    selectedCountry !== "all",
    selectedCity !== "all",
    selectedLanguages.length > 0,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex h-11 items-center gap-2 rounded-xl border-border bg-white px-4"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="font-medium">{t("filters.title")}</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full ml-1">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl border-t border-border bg-white">
        <SheetHeader className="pb-4 border-b border-border/20">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            <span className="font-semibold text-brand-navy">
              {t("filters.filterClinics")}
            </span>
          </SheetTitle>
        </SheetHeader>
        <div className="py-4 overflow-y-auto h-[calc(100%-80px)]">
          <FilterContent
            treatments={treatments}
            countries={countries}
            cities={cities}
            selectedTreatment={selectedTreatment}
            selectedCountry={selectedCountry}
            selectedCity={selectedCity}
            selectedLanguages={selectedLanguages}
            setSelectedTreatment={setSelectedTreatment}
            setSelectedCountry={setSelectedCountry}
            setSelectedCity={setSelectedCity}
            setSelectedLanguages={setSelectedLanguages}
            clearFilters={() => {
              clearFilters();
            }}
            onApply={() => setOpen(false)}
            showHeader={false}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
