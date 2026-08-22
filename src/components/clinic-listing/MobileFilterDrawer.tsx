import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Filter, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTitle, SheetClose } from "@/components/ui/sheet";
import { FilterContent } from "./FilterContent";

/*
 * The filters as a near-full-height sheet on mobile: drag handle, title and a
 * close button, the sections scrolling between them, and Clear All / Apply
 * pinned to the bottom by FilterContent's sheet variant.
 */

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

export const MobileFilterDrawer = (props: MobileFilterDrawerProps) => {
  const { t } = useTranslation("clinicListing");
  const [open, setOpen] = useState(false);

  const activeCount = [
    props.selectedTreatment !== "all",
    props.selectedCountry !== "all",
    props.selectedCity !== "all",
    props.selectedLanguages.length > 0,
  ].filter(Boolean).length;

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <Button
        variant="outline"
        onClick={() => setOpen(true)}
        className="flex h-11 shrink-0 items-center gap-2 rounded-xl border-border bg-white px-4"
      >
        <SlidersHorizontal className="h-4 w-4 text-primary" aria-hidden="true" />
        <span className="text-sm font-medium text-brand-navy">{t("filters.title")}</span>
        {activeCount > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-xs font-semibold text-primary-foreground">
            {activeCount}
          </span>
        )}
      </Button>

      <SheetContent
        side="bottom"
        // the library ships its own close button; this sheet has a styled one
        className="flex h-[92vh] flex-col gap-0 rounded-t-3xl border-t border-border bg-white p-0 [&>button]:hidden"
      >
        <div className="shrink-0 px-5 pt-3">
          <div className="mx-auto h-1.5 w-10 rounded-full bg-border" aria-hidden="true" />
          <div className="flex items-center justify-between py-4">
            <SheetTitle className="flex items-center gap-2 text-lg font-bold text-brand-navy">
              <Filter className="h-5 w-5 text-primary" aria-hidden="true" />
              {t("filters.title")}
            </SheetTitle>
            <SheetClose
              className="flex h-9 w-9 items-center justify-center rounded-full text-nav-muted transition-colors hover:bg-muted hover:text-brand-navy"
              aria-label={t("filters.close")}
            >
              <X className="h-5 w-5" aria-hidden="true" />
            </SheetClose>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5">
          <FilterContent
            {...props}
            variant="sheet"
            showHeader={false}
            onApply={() => setOpen(false)}
          />
        </div>
      </SheetContent>
    </Sheet>
  );
};
