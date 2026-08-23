import { useState, useEffect } from "react";
import { useSearchParams, Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { withLocalePrefix, clinicPath } from "@/lib/localePath";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, BadgeCheck, CheckCircle, MapPin, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { FilterContent } from "@/components/clinic-listing/FilterContent";
import { MobileFilterDrawer } from "@/components/clinic-listing/MobileFilterDrawer";
import { ClinicCardSkeletonGrid } from "@/components/clinic-listing/ClinicCardSkeleton";
import { ResultsPagination } from "@/components/clinic-listing/ResultsPagination";
import { getCountries, getCities, getTreatments, getTreatmentCategories } from "@/lib/services";
import { useClinicSearch } from "@/hooks/useClinicSearch";
import { GoogleRating } from "@/components/ui/google-rating";
import { LANGUAGES, FACILITIES, getLanguage, getFacility, sortFacilitiesForCard } from "@/lib/clinicMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactClinicForm, type ContactClinicSubmittedValues } from "@/components/forms/ContactClinicForm";
import PostFormRecommendationsDialog from "@/components/forms/PostFormRecommendationsDialog";
import { AiSearchPanel } from "@/components/clinic-listing/AiSearchPanel";

// Import clinic images as defaults
import clinic1 from "@/assets/clinic-1.jpg";
import clinic2 from "@/assets/clinic-2.jpg";
import clinic3 from "@/assets/clinic-3.jpg";
import clinic4 from "@/assets/clinic-4.jpg";
import clinic5 from "@/assets/clinic-5.jpg";
import clinic6 from "@/assets/clinic-6.jpg";
import clinic7 from "@/assets/clinic-7.jpg";
import clinic8 from "@/assets/clinic-8.jpg";
import clinic9 from "@/assets/clinic-9.jpg";
import clinic10 from "@/assets/clinic-10.jpg";

// Default images for clinics without images
const defaultImages = [clinic1, clinic2, clinic3, clinic4, clinic5, clinic6, clinic7, clinic8, clinic9, clinic10];

// Helper to check if a string is a valid UUID
const isUUID = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

// Image Carousel Component
const ImageCarousel = ({ images, alt }: { images: string[], alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const nextImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev + 1) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const prevImage = () => {
    if (isTransitioning) return;
    setIsTransitioning(true);
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
    setTimeout(() => setIsTransitioning(false), 300);
  };

  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchEnd(0);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setTouchEnd(0);
    setTouchStart(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (touchStart === 0) return;
    setTouchEnd(e.clientX);
  };

  const handleMouseUp = () => {
    if (!touchStart || !touchEnd) return;
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > 50;
    const isRightSwipe = distance < -50;

    if (isLeftSwipe && images.length > 1) {
      nextImage();
    }
    if (isRightSwipe && images.length > 1) {
      prevImage();
    }
    setTouchStart(0);
    setTouchEnd(0);
  };

  return (
    <div 
      className="relative w-full h-full group cursor-grab active:cursor-grabbing select-none"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover transition-opacity duration-300 pointer-events-none"
        draggable={false}
      />
      
      {images.length > 1 && (
        <>
          <button
            onClick={(e) => {
              e.stopPropagation();
              prevImage();
            }}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={(e) => {
              e.stopPropagation();
              nextImage();
            }}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/60 hover:bg-black/80 text-white p-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:scale-110 z-10"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentIndex(index);
                }}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  index === currentIndex ? 'bg-white scale-125' : 'bg-white/50 hover:bg-white/80'
                }`}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function ClinicListing() {
  const { t } = useTranslation("clinicListing");
  const { t: tCommon } = useTranslation("common");
  const { lang } = useParams();
  const [searchParams, setSearchParams] = useSearchParams();
  
  // State for filter data
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [treatmentCategories, setTreatmentCategories] = useState<any[]>([]);
  const [filterDataLoading, setFilterDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "all");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "all");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [sortBy, setSortBy] = useState<'balance' | 'rating' | 'price_asc' | 'price_desc'>("balance");
  const [page, setPage] = useState(1);
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);
  const [applyOpenForClinicId, setApplyOpenForClinicId] = useState<string | null>(null);
  const [recoOpen, setRecoOpen] = useState(false);
  const [recoValues, setRecoValues] = useState<ContactClinicSubmittedValues | null>(null);

  const handleAISearchResults = (params: URLSearchParams) => {
    setPage(1);
    setSearchParams(params);
  };

  const handleApplySuccess = (values: ContactClinicSubmittedValues) => {
    setApplyOpenForClinicId(null);
    setRecoValues(values);
    setRecoOpen(true);
  };

  // Map UI sort to backend sort. Filters never touch sortBy — only the dropdown does.
  const { 
    data: clinicData, 
    isLoading: clinicsLoading,
    isFetching: clinicsFetching
  } = useClinicSearch({
    treatmentId: selectedTreatment,
    countryId: selectedCountry,
    cityId: selectedCity,
    page,
    limit: 12,
    sortBy,
    languageCodes: selectedLanguages,
  });

  const rawClinics = clinicData?.clinics || [];
  const totalClinics = clinicData?.total || 0;

  // Client-side price sort (DB view doesn't store min treatment price).
  const getMinPrice = (clinic: any): number | null => {
    const cts = clinic?.clinic_treatments || [];
    const prices = cts
      .map((ct: any) => Number(ct?.starting_price_euro))
      .filter((n: number) => Number.isFinite(n) && n > 0);
    return prices.length ? Math.min(...prices) : null;
  };

  const clinics = (sortBy === 'price_asc' || sortBy === 'price_desc')
    ? [...rawClinics].sort((a: any, b: any) => {
        const pa = getMinPrice(a);
        const pb = getMinPrice(b);
        if (pa == null && pb == null) return 0;
        if (pa == null) return 1;  // nulls last
        if (pb == null) return -1;
        return sortBy === 'price_asc' ? pa - pb : pb - pa;
      })
    : rawClinics;

  // Show skeleton only on initial load, not on filter changes (cached data appears instantly)
  const showSkeleton = clinicsLoading && !clinicData;


  // Load initial filter data
  useEffect(() => {
    const loadData = async () => {
      try {
        setFilterDataLoading(true);
        const [countriesData, treatmentsData, treatmentCategoriesData] = await Promise.all([
          getCountries(),
          getTreatments(),
          getTreatmentCategories()
        ]);
        
        setCountries(countriesData);
        setTreatments(treatmentsData);
        setTreatmentCategories(treatmentCategoriesData);
      } catch (err) {
        setError('Failed to load data. Please try again.');
        console.error('Error loading data:', err);
      } finally {
        setFilterDataLoading(false);
      }
    };

    loadData();
  }, []);

  // Sync URL params (always UUIDs now) to state
  useEffect(() => {
    const countryParam = searchParams.get('country');
    const treatmentParam = searchParams.get('treatment');
    const cityParam = searchParams.get('city');
    const languagesParam = searchParams.get('languages');
    const sortParam = searchParams.get('sort');

    if (countryParam && countryParam !== 'all') {
      setSelectedCountry(countryParam);
    }
    if (treatmentParam && treatmentParam !== 'all') {
      setSelectedTreatment(treatmentParam);
    }
    if (cityParam && cityParam !== 'all') {
      setSelectedCity(cityParam);
    }
    if (languagesParam) {
      setSelectedLanguages(languagesParam.split(',').filter(Boolean));
    }
    if (sortParam && ['balance', 'rating', 'price_asc', 'price_desc'].includes(sortParam)) {
      setSortBy(sortParam as 'balance' | 'rating' | 'price_asc' | 'price_desc');
    }
  }, [searchParams]);

  // Load cities when country changes
  useEffect(() => {
    const loadCities = async () => {
      if (selectedCountry && selectedCountry !== "all" && isUUID(selectedCountry)) {
        try {
          const citiesData = await getCities(selectedCountry);
          setCities(citiesData);
        } catch (err) {
          console.error('Error loading cities:', err);
        }
      } else {
        setCities([]);
      }
    };

    loadCities();
  }, [selectedCountry]);

  const clearFilters = () => {
    setSelectedTreatment("all");
    setSelectedCountry("all");
    setSelectedCity("all");
    setSelectedLanguages([]);
    setPage(1);
  };

  useHeadMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    ogTitle: t("meta.title"),
    ogDescription: t("meta.description"),
  });

  const getClinicImages = (clinic: any): string[] => {
    if (clinic.clinic_images && clinic.clinic_images.length > 0) {
      return clinic.clinic_images.map((img: any) => img.image_url);
    }
    return [defaultImages[0]]; // Return at least one default image
  };

  const getClinicPrice = (clinic: any): string => {
    if (clinic.clinic_treatments && clinic.clinic_treatments.length > 0) {
      // If a specific treatment is selected, show that treatment's price
      if (selectedTreatment !== "all") {
        const matchingTreatment = clinic.clinic_treatments.find(
          (ct: any) => ct.treatment_id === selectedTreatment
        );
        if (matchingTreatment?.starting_price_euro) {
          return `€${matchingTreatment.starting_price_euro}`;
        }
      }
      
      // Otherwise, show the minimum price across all treatments
      const prices = clinic.clinic_treatments
        .map((ct: any) => ct.starting_price_euro)
        .filter((p: number) => p > 0);
      
      if (prices.length > 0) {
        const minPrice = Math.min(...prices);
        return `€${minPrice}`;
      }
    }
    return t("contactForPricing");
  };

  const getClinicLocation = (clinic: any): string => {
    return `${clinic.cities?.name || 'Unknown'}, ${clinic.cities?.countries?.name || 'Unknown'}`;
  };

  const selectedTreatmentName = selectedTreatment !== "all"
    ? treatments.find((t) => t.id === selectedTreatment)?.name
    : undefined;

  if (error) {
    return (
      <div className="min-h-screen bg-background">
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>{t("tryAgain")}</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <div className="mx-auto w-full max-w-[1264px] px-5 pt-6 sm:px-8">
        <AiSearchPanel onResults={handleAISearchResults} />
      </div>

      <div className="mx-auto w-full max-w-[1264px] px-5 py-8 sm:px-8">
        {/* Mobile toolbar — the reference puts filters, sort and the count on
            one row and drops the page heading entirely. */}
        <div className="mb-6 flex items-center gap-3 lg:hidden">
          <MobileFilterDrawer
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
            clearFilters={clearFilters}
          />

          <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
            <SelectTrigger className="h-11 min-w-0 flex-1 gap-2 rounded-xl border-border bg-white px-3">
              <ArrowUpDown className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="balance">{t("sort.recommended")}</SelectItem>
              <SelectItem value="rating">{t("sort.highestRated")}</SelectItem>
              <SelectItem value="price_asc">{t("sort.priceLowToHigh")}</SelectItem>
              <SelectItem value="price_desc">{t("sort.priceHighToLow")}</SelectItem>
            </SelectContent>
          </Select>

          <span className="shrink-0 whitespace-nowrap text-right text-sm text-nav-muted">
            <span className="font-bold text-brand-navy">{totalClinics}</span>{" "}
            {t("clinicsFoundShort")}
          </span>
        </div>

        <div className="flex flex-col gap-8 lg:flex-row lg:gap-10">
          {/* Sidebar Filters - Desktop Only */}
          <div className="hidden lg:block lg:w-[300px] lg:shrink-0">
            <div className="sticky top-24 rounded-xl border border-border bg-white p-5">
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
                clearFilters={clearFilters}
                onApply={() =>
                  document
                    .getElementById("clinic-results")
                    ?.scrollIntoView({ behavior: "smooth", block: "start" })
                }
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div id="clinic-results" className="mb-6 hidden scroll-mt-24 flex-col gap-4 lg:flex lg:flex-row lg:items-center lg:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-brand-navy">
                  {showSkeleton ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      {t("loading")}
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {t("clinicsFound", { count: totalClinics })}
                      {clinicsFetching && !showSkeleton && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </span>
                  )}
                </h2>
                <p className="mt-1 text-sm text-nav-muted">{t("discoverSubtitle")}</p>
              </div>

              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-nav-muted" aria-hidden="true" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="h-11 w-56 rounded-xl border-border bg-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="balance">{t("sort.recommended")}</SelectItem>
                    <SelectItem value="rating">{t("sort.highestRated")}</SelectItem>
                    <SelectItem value="price_asc">{t("sort.priceLowToHigh")}</SelectItem>
                    <SelectItem value="price_desc">{t("sort.priceHighToLow")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Skeleton Loading State */}
            {showSkeleton && (
              <div className="space-y-4 lg:space-y-6">
                <ClinicCardSkeletonGrid count={6} />
              </div>
            )}

            {/* Clinic Cards */}
            {!showSkeleton && clinics.length > 0 && (
              <div className="space-y-4 lg:space-y-6">
                {clinics.map((clinic: any, index: number) => (
                  <Card 
                    key={clinic.id} 
                    className={`overflow-hidden rounded-xl border border-border bg-white shadow-none transition-shadow duration-300 hover:shadow-card ${
                      clinic.is_featured ? 'ring-1 ring-primary/30' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-0">
                      {/* Desktop Layout */}
                      <div className="hidden lg:flex lg:flex-row lg:gap-5 lg:p-4">
                        {/* Image Section */}
                        <div className="relative w-56 shrink-0 overflow-hidden rounded-xl">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />
                          {clinic.is_featured && (
                            <Badge className="absolute left-3 top-3 z-10 rounded-full border-0 bg-primary px-2.5 py-1 text-xs font-medium text-white shadow-lg">
                              {t("featured")}
                            </Badge>
                          )}
                        </div>

                        {/* Content + Action */}
                        <div className="flex min-w-0 flex-1 gap-5">
                          <div className="flex min-w-0 flex-1 flex-col gap-2">
                            {/* Header */}
                            <div className="flex items-center gap-2">
                              <h3 className="truncate text-lg font-bold leading-tight text-brand-navy">{clinic.name}</h3>
                              {clinic.is_verified && (
                                <BadgeCheck
                                  className="h-5 w-5 shrink-0 text-primary"
                                  aria-label={t("verified")}
                                />
                              )}
                            </div>

                            <p className="flex items-center gap-1.5 text-sm text-nav-muted">
                              <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                              <span className="truncate">{getClinicLocation(clinic)}</span>
                            </p>

                            {/* Languages */}
                            {Array.isArray(clinic.languages) && clinic.languages.length > 0 && (
                              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
                                {clinic.languages.slice(0, 3).map((code: string) => {
                                  const l = getLanguage(code);
                                  if (!l) return null;
                                  return (
                                    <span
                                      key={code}
                                      className="inline-flex shrink-0 items-center gap-1 font-medium"
                                      title={tCommon(`languageNames.${l.code}`)}
                                    >
                                      <span aria-hidden>{l.flag}</span>
                                      <span>{l.code.toUpperCase()}</span>
                                    </span>
                                  );
                                })}
                                {clinic.languages.length > 3 && (
                                  <span className="text-primary shrink-0">+{clinic.languages.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Facilities */}
                            {Array.isArray(clinic.facilities) && clinic.facilities.length > 0 && (
                              <div className="flex items-center gap-3 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
                                {sortFacilitiesForCard(clinic.facilities).slice(0, 3).map((key: string) => {
                                  const f = getFacility(key);
                                  if (!f) return null;
                                  const Icon = f.icon;
                                  return (
                                    <span key={key} className="inline-flex items-center gap-1 shrink-0">
                                      <Icon className="w-3.5 h-3.5 text-primary" />
                                      <span>{tCommon(`facilityLabels.${f.key}`)}</span>
                                    </span>
                                  );
                                })}
                                {clinic.facilities.length > 3 && (
                                  <span className="text-primary shrink-0">+{clinic.facilities.length - 3}</span>
                                )}
                              </div>
                            )}

                            {/* Treatments — single line, no wrap */}
                            {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0 mt-0.5">
                                {clinic.clinic_treatments.slice(0, 2).map((clinicTreatment: any) => (
                                  <Badge
                                    key={clinicTreatment.id}
                                    variant="secondary"
                                    className="bg-muted/70 text-foreground/80 border-0 px-2.5 py-0.5 rounded-full text-xs font-normal shrink-0 max-w-[160px] truncate"
                                  >
                                    <span className="truncate">
                                      {clinicTreatment.treatments?.name}
                                      {clinicTreatment.starting_price_euro ? ` · €${clinicTreatment.starting_price_euro}` : ''}
                                    </span>
                                  </Badge>
                                ))}
                                {clinic.clinic_treatments.length > 2 && (
                                  <Badge
                                    variant="outline"
                                    className="border-primary/30 text-primary bg-primary/5 px-2.5 py-0.5 rounded-full text-xs shrink-0"
                                  >
                                    +{clinic.clinic_treatments.length - 2}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>

                          {/* Right column: rating, price, then the two actions */}
                          <div className="flex w-48 shrink-0 flex-col justify-center gap-3 border-l border-border pl-5">
                            <div className="flex items-center gap-2">
                              <span className="inline-flex items-center gap-1 rounded-lg border border-border px-2 py-1 text-sm font-semibold text-brand-navy">
                                <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                                {Number(clinic.rating ?? 0).toFixed(1)}
                              </span>
                              <span className="text-xs text-nav-muted">
                                ({clinic.review_count ?? 0})
                              </span>
                            </div>

                            <div>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-nav-muted">
                                {t("startingFrom")}
                              </div>
                              <div className="text-2xl font-bold leading-tight text-primary">
                                {getClinicPrice(clinic)}
                              </div>
                            </div>

                            <Button
                              onClick={() => setApplyOpenForClinicId(clinic.id)}
                              className="h-10 w-full rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              {t("quickApply")}
                            </Button>
                            <Button
                              asChild
                              variant="outline"
                              className="h-10 w-full rounded-xl border-primary/40 text-sm font-semibold text-primary hover:bg-primary/5"
                            >
                              <Link
                                to={withLocalePrefix(`${clinicPath(clinic)}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`, lang)}
                              >
                                {t("viewClinic")}
                              </Link>
                            </Button>
                          </div>
                        </div>
                      </div>

                      {/* Mobile Layout */}
                      <div className="lg:hidden">
                        <div className="relative h-48">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />

                          {/* rating rides the image top-left, as the reference has it */}
                          <div className="absolute left-3 top-3 z-10 flex items-center gap-2">
                            <span className="inline-flex items-center gap-1 rounded-lg bg-white px-2 py-1 text-sm font-semibold text-brand-navy shadow-sm">
                              <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                              {Number(clinic.rating ?? 0).toFixed(1)}
                            </span>
                            {clinic.is_featured && (
                              <Badge className="rounded-lg border-0 bg-primary px-2 py-1 text-xs font-medium text-white shadow-sm">
                                {t("featured")}
                              </Badge>
                            )}
                          </div>
                        </div>

                        <div className="p-4 space-y-3">
                          {/* Name + verified tick, location under it */}
                          <div className="flex items-center gap-2">
                            <h3 className="min-w-0 truncate text-base font-bold leading-tight text-brand-navy">
                              {clinic.name}
                            </h3>
                            {clinic.is_verified && (
                              <BadgeCheck
                                className="h-4 w-4 shrink-0 text-primary"
                                aria-label={t("verified")}
                              />
                            )}
                          </div>

                          <p className="flex items-center gap-1.5 text-sm text-nav-muted">
                            <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                            <span className="truncate">{getClinicLocation(clinic)}</span>
                          </p>

                          {/* Languages */}
                          {Array.isArray(clinic.languages) && clinic.languages.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
                              {clinic.languages.slice(0, 3).map((code: string) => {
                                const l = getLanguage(code);
                                if (!l) return null;
                                return (
                                  <span
                                    key={code}
                                    className="inline-flex shrink-0 items-center gap-1 font-medium"
                                    title={tCommon(`languageNames.${l.code}`)}
                                  >
                                    <span aria-hidden>{l.flag}</span>
                                    <span>{l.code.toUpperCase()}</span>
                                  </span>
                                );
                              })}
                              {clinic.languages.length > 3 && (
                                <span className="text-primary shrink-0">+{clinic.languages.length - 3}</span>
                              )}
                            </div>
                          )}

                          {/* Facilities */}
                          {Array.isArray(clinic.facilities) && clinic.facilities.length > 0 && (
                            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
                              {sortFacilitiesForCard(clinic.facilities).slice(0, 2).map((key: string) => {
                                const f = getFacility(key);
                                if (!f) return null;
                                const Icon = f.icon;
                                return (
                                  <span key={key} className="inline-flex min-w-0 items-center gap-1">
                                    <Icon className="h-3 w-3 shrink-0 text-primary" />
                                    <span className="truncate">{tCommon(`facilityLabels.${f.key}`)}</span>
                                  </span>
                                );
                              })}
                              {clinic.facilities.length > 2 && (
                                <span className="shrink-0 text-primary">+{clinic.facilities.length - 2}</span>
                              )}
                            </div>
                          )}

                          {/* Treatments — single line, no wrap */}
                          {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
                            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0">
                              {clinic.clinic_treatments.slice(0, 3).map((clinicTreatment: any) => (
                                <Badge
                                  key={clinicTreatment.id}
                                  variant="secondary"
                                  className="bg-muted/70 text-foreground/80 border-0 px-2.5 py-1 rounded-full text-xs font-normal shrink-0 max-w-[140px] truncate"
                                >
                                  <span className="truncate">{clinicTreatment.treatments?.name}</span>
                                </Badge>
                              ))}
                              {clinic.clinic_treatments.length > 3 && (
                                <Badge
                                  variant="outline"
                                  className="border-primary/30 text-primary bg-primary/5 px-2.5 py-1 rounded-full text-xs shrink-0"
                                >
                                  +{clinic.clinic_treatments.length - 3}
                                </Badge>
                              )}
                            </div>
                          )}

                          <div className="h-px bg-border/50" />

                          {/* Price on the left, the two actions on the right */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="shrink-0">
                              <div className="text-[11px] font-medium text-nav-muted">
                                {t("startingFrom")}
                              </div>
                              <div className="text-xl font-bold leading-tight text-primary">
                                {getClinicPrice(clinic)}
                              </div>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-end gap-2">
                            <Button
                              asChild
                              variant="outline"
                              className="h-11 flex-1 rounded-xl border-primary/40 text-sm font-semibold text-primary hover:bg-primary/5"
                            >
                              <Link
                                to={withLocalePrefix(`${clinicPath(clinic)}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`, lang)}
                              >
                                {t("viewClinic")}
                              </Link>
                            </Button>
                            <Button
                              onClick={() => setApplyOpenForClinicId(clinic.id)}
                              className="h-11 flex-1 rounded-xl bg-primary text-sm font-semibold text-primary-foreground hover:bg-primary/90"
                            >
                              {t("quickApply")}
                            </Button>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Apply dialog */}
                      <Dialog
                        open={applyOpenForClinicId === clinic.id}
                        onOpenChange={(open) => !open && setApplyOpenForClinicId(null)}
                      >
                        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto" onOpenAutoFocus={(e) => e.preventDefault()}>
                          <DialogHeader>
                            <DialogTitle>{t("applyDialog.titlePrefix")} {clinic.name}</DialogTitle>
                          </DialogHeader>
                          <ContactClinicForm
                            clinicId={clinic.id}
                            initialTreatment={selectedTreatmentName || ""}
                            onSuccess={handleApplySuccess}
                            submitLabel={tCommon("contactForm.sendApplication")}
                          />
                        </DialogContent>
                      </Dialog>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!showSkeleton && clinics.length > 0 && (
              <ResultsPagination page={page} total={totalClinics} perPage={12} onChange={setPage} />
            )}

            {/* No Results */}
            {!showSkeleton && clinics.length === 0 && (
              <div className="text-center py-16">
                <div className="mx-auto max-w-md rounded-xl border border-border bg-white p-8">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">{t("noResults.title")}</h3>
                  <p className="text-foreground/70 mb-6">
                    {t("noResults.description")}
                  </p>
                  <Button
                    onClick={clearFilters}
                    className="h-11 rounded-xl bg-primary px-6 text-primary-foreground hover:bg-primary/90"
                  >
                    {t("noResults.clearFilters")}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />

      <PostFormRecommendationsDialog
        open={recoOpen}
        onOpenChange={setRecoOpen}
        values={recoValues}
      />
    </div>
  );
}
