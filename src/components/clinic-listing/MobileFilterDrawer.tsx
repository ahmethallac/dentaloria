import { useState } from "react";
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
  setSelectedTreatment: (value: string) => void;
  setSelectedCountry: (value: string) => void;
  setSelectedCity: (value: string) => void;
  clearFilters: () => void;
}

export const MobileFilterDrawer = ({
  treatments,
  countries,
  cities,
  selectedTreatment,
  selectedCountry,
  selectedCity,
  setSelectedTreatment,
  setSelectedCountry,
  setSelectedCity,
  clearFilters,
}: MobileFilterDrawerProps) => {
  const [open, setOpen] = useState(false);

  const activeFiltersCount = [
    selectedTreatment !== "all",
    selectedCountry !== "all",
    selectedCity !== "all",
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        <Button
          variant="outline"
          className="flex items-center gap-2 bg-white/80 backdrop-blur-glass border-white/30 hover:bg-white/90 rounded-xl shadow-card px-4 py-2.5"
        >
          <SlidersHorizontal className="h-4 w-4 text-primary" />
          <span className="font-medium">Filters</span>
          {activeFiltersCount > 0 && (
            <span className="bg-primary text-white text-xs px-2 py-0.5 rounded-full ml-1">
              {activeFiltersCount}
            </span>
          )}
        </Button>
      </SheetTrigger>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-3xl bg-white/95 backdrop-blur-xl border-t border-white/30">
        <SheetHeader className="pb-4 border-b border-border/20">
          <SheetTitle className="flex items-center gap-2 text-lg">
            <Filter className="h-5 w-5 text-primary" />
            <span className="bg-gradient-primary bg-clip-text text-transparent font-semibold">
              Filter Clinics
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
            setSelectedTreatment={setSelectedTreatment}
            setSelectedCountry={setSelectedCountry}
            setSelectedCity={setSelectedCity}
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
