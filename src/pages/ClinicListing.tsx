import { useState, useEffect } from "react";
import { useSearchParams, Link } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, MapPin, ArrowUpDown, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { FilterContent } from "@/components/clinic-listing/FilterContent";
import { MobileFilterDrawer } from "@/components/clinic-listing/MobileFilterDrawer";
import { ClinicCardSkeletonGrid } from "@/components/clinic-listing/ClinicCardSkeleton";
import { getCountries, getCities, getTreatments, getTreatmentCategories } from "@/lib/services";
import { useClinicSearch } from "@/hooks/useClinicSearch";
import { GoogleRating } from "@/components/ui/google-rating";
import { LANGUAGES, FACILITIES, getLanguage, getFacility, sortFacilitiesForCard } from "@/lib/clinicMeta";

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
  const [searchParams] = useSearchParams();
  
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

    if (countryParam && countryParam !== 'all') {
      setSelectedCountry(countryParam);
    }
    if (treatmentParam && treatmentParam !== 'all') {
      setSelectedTreatment(treatmentParam);
    }
    if (cityParam && cityParam !== 'all') {
      setSelectedCity(cityParam);
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
    title: "Dental Clinics | Dentaloria",
    description: "Browse and compare dental clinics worldwide. Find the perfect clinic for your treatment with verified reviews and transparent pricing.",
    ogTitle: "Dental Clinics | Dentaloria",
    ogDescription: "Browse and compare dental clinics worldwide. Find the perfect clinic for your treatment with verified reviews and transparent pricing."
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
    return "Contact for pricing";
  };

  const getClinicLocation = (clinic: any): string => {
    return `${clinic.cities?.name || 'Unknown'}, ${clinic.cities?.countries?.name || 'Unknown'}`;
  };

  const selectedTreatmentName = selectedTreatment !== "all"
    ? treatments.find((t) => t.id === selectedTreatment)?.name
    : undefined;

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-mesh">
        <Navbar />
        <div className="flex items-center justify-center min-h-[50vh]">
          <div className="text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </div>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/20 to-accent/20 py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-white/30"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 animate-fade-in text-foreground">
            World's Best Medical Clinics
          </h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto animate-slide-up text-foreground/80">
            Find your perfect healthcare solution with expert doctors, modern technology and reliable service
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Mobile Filter Button */}
        <div className="lg:hidden mb-6">
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
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters - Desktop Only */}
          <div className="hidden lg:block lg:w-80">
            <div className="bg-white/80 backdrop-blur-glass rounded-2xl p-6 shadow-card border border-white/20 sticky top-8">
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
              />
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {showSkeleton ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    <span className="flex items-center gap-2">
                      {`${totalClinics} Clinics Found`}
                      {clinicsFetching && !showSkeleton && (
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      )}
                    </span>
                  )}
                </h2>
                <p className="text-foreground/70">Discover the best medical clinics worldwide</p>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-foreground/70" />
                <Select value={sortBy} onValueChange={(v) => setSortBy(v as typeof sortBy)}>
                  <SelectTrigger className="w-56 bg-white/80 border-white/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-glass border-white/30">
                    <SelectItem value="balance">Recommended</SelectItem>
                    <SelectItem value="rating">Highest Rated</SelectItem>
                    <SelectItem value="price_asc">Price: Low to High</SelectItem>
                    <SelectItem value="price_desc">Price: High to Low</SelectItem>
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
                    className={`overflow-hidden bg-white/80 backdrop-blur-glass border-white/30 rounded-2xl shadow-card hover:shadow-elegant transition-all duration-500 lg:hover:scale-[1.02] animate-fade-in ${
                      clinic.is_featured ? 'ring-2 ring-primary/20 shadow-colored' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-0">
                      {/* Desktop Layout */}
                      <div className="hidden lg:flex lg:flex-row h-48 relative">
                        {/* Image Section - Desktop */}
                        <div className="w-64 h-full relative">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />
                          {clinic.is_featured && (
                            <Badge className="absolute top-3 left-3 bg-primary text-white border-0 px-2 py-1 rounded-full text-xs z-10">
                              Featured
                            </Badge>
                          )}
                          <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white z-10">
                            <MapPin className="h-3 w-3" />
                            <span className="text-xs font-medium">{getClinicLocation(clinic)}</span>
                          </div>
                        </div>

                        {/* Content Section - Desktop */}
                        <div className="flex-1 p-4 pr-28">
                          <div className="flex flex-col h-full">
                            <div className="mb-2">
                              <h3 className="text-lg font-bold text-foreground mb-1">{clinic.name}</h3>
                              <div className="flex items-center gap-3 text-xs text-foreground/70 flex-wrap">
                                <GoogleRating rating={clinic.rating} variant="prominent" />
                                {clinic.is_verified && (
                                  <div className="flex items-center gap-1">
                                    <CheckCircle className="h-3 w-3 text-green-500" />
                                    <span>Verified</span>
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* Languages — single line, no wrap */}
                            {Array.isArray(clinic.languages) && clinic.languages.length > 0 && (
                              <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-foreground/70 mb-1 min-w-0">
                                {clinic.languages.slice(0, 4).map((code: string) => {
                                  const l = getLanguage(code);
                                  if (!l) return null;
                                  return (
                                    <span key={code} className="inline-flex items-center gap-1 shrink-0">
                                      <span aria-hidden>{l.flag}</span>
                                      <span>{l.name}</span>
                                    </span>
                                  );
                                })}
                                {clinic.languages.length > 4 && (
                                  <span className="text-primary shrink-0">+{clinic.languages.length - 4}</span>
                                )}
                              </div>
                            )}

                            {/* Facilities — single line, no wrap */}
                            {Array.isArray(clinic.facilities) && clinic.facilities.length > 0 && (
                              <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-foreground/70 mb-2 min-w-0">
                                {sortFacilitiesForCard(clinic.facilities).slice(0, 4).map((key: string) => {
                                  const f = getFacility(key);
                                  if (!f) return null;
                                  const Icon = f.icon;
                                  return (
                                    <span key={key} className="inline-flex items-center gap-1 shrink-0">
                                      <Icon className="w-3 h-3 text-primary" />
                                      <span>{f.label}</span>
                                    </span>
                                  );
                                })}
                                {clinic.facilities.length > 4 && (
                                  <span className="text-primary shrink-0">+{clinic.facilities.length - 4}</span>
                                )}
                              </div>
                            )}

                            <div className="absolute right-20 top-1/2 transform -translate-y-1/2 text-right">
                              <div className="text-xs text-foreground/70 mb-1">Starting</div>
                              <div className="text-lg font-bold text-primary">
                                {getClinicPrice(clinic)}
                              </div>
                            </div>

                            <div className="flex-1">
                              {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {clinic.clinic_treatments.slice(0, 2).map((clinicTreatment: any) => (
                                    <Badge 
                                      key={clinicTreatment.id} 
                                      variant="secondary" 
                                      className="bg-muted text-foreground/80 border-0 px-2 py-1 rounded-full text-xs"
                                    >
                                      {clinicTreatment.treatments?.name}
                                      {clinicTreatment.starting_price_euro && ` - €${clinicTreatment.starting_price_euro}`}
                                    </Badge>
                                  ))}
                                  {clinic.clinic_treatments.length > 2 && (
                                    <Badge 
                                      variant="outline" 
                                      className="border-primary/20 text-primary bg-white/50 px-2 py-1 rounded-full text-xs"
                                    >
                                      +{clinic.clinic_treatments.length - 2}
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Action Button - Desktop */}
                        <Link
                          to={`/clinic/${clinic.id}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`}
                          className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-b from-primary to-primary/90 hover:from-primary/90 hover:to-primary rounded-r-2xl flex items-center justify-center transition-all duration-300 hover:w-16 group"
                        >
                          <div className="text-white text-xs font-medium transform -rotate-90 whitespace-nowrap group-hover:rotate-0 transition-transform duration-300">
                            <span className="group-hover:hidden">View</span>
                            <div className="hidden group-hover:block text-center leading-tight">
                              <div>View</div>
                              <div>Clinic</div>
                            </div>
                          </div>
                        </Link>
                      </div>

                      {/* Mobile Layout - Modern Card Design */}
                      <div className="lg:hidden">
                        {/* Image with overlay info */}
                        <div className="relative h-44">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />
                          
                          {/* Top badges */}
                          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
                            {clinic.is_featured ? (
                              <Badge className="bg-primary text-white border-0 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg">
                                Featured
                              </Badge>
                            ) : <div />}
                            
                            {clinic.is_verified && (
                              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                                <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                                <span className="text-xs font-medium text-foreground/80">Verified</span>
                              </div>
                            )}
                          </div>

                          {/* Bottom gradient overlay with location */}
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-8 pb-3 px-3">
                            <div className="flex items-center gap-1.5 text-white">
                              <MapPin className="h-3.5 w-3.5" />
                              <span className="text-sm font-medium">{getClinicLocation(clinic)}</span>
                            </div>
                          </div>
                        </div>

                        {/* Card Content */}
                        <div className="p-4 space-y-3">
                          {/* Header Row: Name + Rating */}
                          <div className="flex items-start justify-between gap-3">
                            <h3 className="text-base font-bold text-foreground leading-tight flex-1">
                              {clinic.name}
                            </h3>
                            <div className="bg-amber-50 px-2 py-1 rounded-lg shrink-0 text-amber-700 text-sm">
                              <GoogleRating rating={clinic.rating} starClassName="h-3.5 w-3.5" />
                            </div>
                          </div>

                          {/* Treatments */}
                          {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
                            <div className="flex flex-wrap gap-1.5">
                              {clinic.clinic_treatments.slice(0, 3).map((clinicTreatment: any) => (
                                <Badge 
                                  key={clinicTreatment.id} 
                                  variant="secondary" 
                                  className="bg-muted/80 text-foreground/70 border-0 px-2 py-1 rounded-lg text-xs"
                                >
                                  {clinicTreatment.treatments?.name}
                                </Badge>
                              ))}
                              {clinic.clinic_treatments.length > 3 && (
                                <Badge 
                                  variant="outline" 
                                  className="border-primary/20 text-primary bg-primary/5 px-2 py-1 rounded-lg text-xs"
                                >
                                  +{clinic.clinic_treatments.length - 3} more
                                </Badge>
                              )}
                            </div>
                          )}

                          {/* Divider */}
                          <div className="h-px bg-border/50" />

                          {/* Price + CTA Row */}
                          <div className="flex items-center justify-between gap-3">
                            <div className="flex flex-col">
                              <span className="text-xs text-muted-foreground">Starting from</span>
                              <span className="text-xl font-bold text-primary">{getClinicPrice(clinic)}</span>
                            </div>
                            
                            <Link
                              to={`/clinic/${clinic.id}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`}
                              className="flex items-center gap-2 bg-gradient-to-r from-primary to-primary/90 text-white px-5 py-2.5 rounded-xl font-medium text-sm shadow-lg shadow-primary/25 active:scale-95 transition-transform"
                            >
                              View Clinic
                              <ChevronRight className="h-4 w-4" />
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {!showSkeleton && clinics.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white/80 backdrop-blur-glass rounded-2xl p-8 shadow-card border border-white/20 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">No Clinics Found</h3>
                  <p className="text-foreground/70 mb-6">
                    No clinics match your selected criteria. Try changing your filters.
                  </p>
                  <Button 
                    onClick={clearFilters}
                    className="bg-gradient-primary hover:opacity-90 text-white border-0 rounded-xl px-6 py-2"
                  >
                    Clear Filters
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}
