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

const defaultImages = [clinic1, clinic2, clinic3, clinic4, clinic5, clinic6, clinic7, clinic8, clinic9, clinic10];

const isUUID = (val: string) =>
  /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$/.test(val);

const ImageCarousel = ({ images, alt }: { images: string[], alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [touchStart, setTouchStart] = useState(0);
  const [touchEnd, setTouchEnd] = useState(0);

  const nextImage = () => setCurrentIndex((prev) => (prev + 1) % images.length);
  const prevImage = () => setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);

  const handleTouchStart = (e: React.TouchEvent) => { setTouchEnd(0); setTouchStart(e.targetTouches[0].clientX); };
  const handleTouchMove = (e: React.TouchEvent) => { setTouchEnd(e.targetTouches[0].clientX); };
  const handleTouchEnd = () => {
    if (!touchStart || !touchEnd) return;
    const d = touchStart - touchEnd;
    if (d > 50 && images.length > 1) nextImage();
    if (d < -50 && images.length > 1) prevImage();
  };

  return (
    <div className="relative w-full h-full group select-none"
      onTouchStart={handleTouchStart} onTouchMove={handleTouchMove} onTouchEnd={handleTouchEnd}>
      <img src={images[currentIndex]} alt={alt} className="w-full h-full object-cover transition-opacity duration-300 pointer-events-none" draggable={false} />
      {images.length > 1 && (
        <>
          <button onClick={(e) => { e.stopPropagation(); prevImage(); }}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-foreground/50 hover:bg-foreground/70 text-background p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10">
            <ChevronLeft className="h-3.5 w-3.5" />
          </button>
          <button onClick={(e) => { e.stopPropagation(); nextImage(); }}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-foreground/50 hover:bg-foreground/70 text-background p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-all z-10">
            <ChevronRight className="h-3.5 w-3.5" />
          </button>
          <div className="absolute bottom-2 left-1/2 -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button key={index} onClick={(e) => { e.stopPropagation(); setCurrentIndex(index); }}
                className={`w-1.5 h-1.5 rounded-full transition-all ${index === currentIndex ? 'bg-background scale-125' : 'bg-background/50'}`} />
            ))}
          </div>
        </>
      )}
    </div>
  );
};

export default function ClinicListing() {
  const [searchParams] = useSearchParams();
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [treatmentCategories, setTreatmentCategories] = useState<any[]>([]);
  const [filterDataLoading, setFilterDataLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "all");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "all");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [sortBy, setSortBy] = useState("rating");
  const [page, setPage] = useState(1);

  const { data: clinicData, isLoading: clinicsLoading, isFetching: clinicsFetching } = useClinicSearch({
    treatmentId: selectedTreatment, countryId: selectedCountry, cityId: selectedCity, page, limit: 12,
  });

  const clinics = clinicData?.clinics || [];
  const totalClinics = clinicData?.total || 0;
  const showSkeleton = clinicsLoading && !clinicData;

  useEffect(() => {
    const loadData = async () => {
      try {
        setFilterDataLoading(true);
        const [countriesData, treatmentsData, treatmentCategoriesData] = await Promise.all([
          getCountries(), getTreatments(), getTreatmentCategories()
        ]);
        setCountries(countriesData); setTreatments(treatmentsData); setTreatmentCategories(treatmentCategoriesData);
      } catch (err) {
        setError('Failed to load data. Please try again.'); console.error(err);
      } finally { setFilterDataLoading(false); }
    };
    loadData();
  }, []);

  useEffect(() => {
    if (!countries.length && !treatments.length) return;
    const countryParam = searchParams.get('country');
    const treatmentParam = searchParams.get('treatment');
    if (countryParam && countryParam !== 'all' && !isUUID(countryParam)) {
      const match = countries.find((c) => c.name?.toLowerCase() === countryParam.toLowerCase() || c.code?.toLowerCase() === countryParam.toLowerCase());
      setSelectedCountry(match?.id || 'all');
    } else if (countryParam && isUUID(countryParam)) setSelectedCountry(countryParam);
    if (treatmentParam && treatmentParam !== 'all' && !isUUID(treatmentParam)) {
      const normalizedParam = treatmentParam.toLowerCase().trim();
      const match = treatments.find((t) => {
        const n = t.name?.toLowerCase().trim();
        if (n === normalizedParam) return true;
        const mappings: Record<string, string[]> = {
          "all-on-6": ["all-on-6 dental implants"], "all-on-4": ["all-on-4 dental implants"],
          "hollywood smile": ["porcelain veneers"], "implants": ["single tooth implant", "multiple tooth implants"],
          "crowns": ["dental crown"], "root canal": ["root canal treatment"],
          "veneers": ["porcelain veneers"], "whitening": ["teeth whitening"]
        };
        for (const [key, values] of Object.entries(mappings)) {
          if (normalizedParam === key && values.includes(n)) return true;
        }
        return n?.includes(normalizedParam) || normalizedParam.includes(n);
      });
      setSelectedTreatment(match?.id || 'all');
    } else if (treatmentParam && isUUID(treatmentParam)) setSelectedTreatment(treatmentParam);
  }, [countries, treatments, searchParams]);

  useEffect(() => {
    const loadCities = async () => {
      if (selectedCountry && selectedCountry !== "all" && isUUID(selectedCountry)) {
        try {
          const citiesData = await getCities(selectedCountry);
          setCities(citiesData);
        } catch (err) { console.error(err); }
      } else { setCities([]); }
    };
    loadCities();
  }, [selectedCountry]);

  useEffect(() => {
    const cityParam = searchParams.get('city');
    if (!cityParam || cityParam === 'all') return;
    if (isUUID(cityParam)) { setSelectedCity(cityParam); return; }
    const match = cities.find((c) => c.name?.toLowerCase() === cityParam.toLowerCase());
    setSelectedCity(match?.id || 'all');
  }, [cities, searchParams]);

  const clearFilters = () => { setSelectedTreatment("all"); setSelectedCountry("all"); setSelectedCity("all"); setPage(1); };

  useHeadMeta({
    title: "Dental Clinics | Dentaloria",
    description: "Browse and compare dental clinics worldwide.",
    ogTitle: "Dental Clinics | Dentaloria",
    ogDescription: "Browse and compare dental clinics worldwide."
  });

  const getClinicImages = (clinic: any): string[] => {
    if (clinic.clinic_images && clinic.clinic_images.length > 0) return clinic.clinic_images.map((img: any) => img.image_url);
    return [defaultImages[0]];
  };

  const getClinicPrice = (clinic: any): string => {
    if (clinic.clinic_treatments && clinic.clinic_treatments.length > 0) {
      if (selectedTreatment !== "all") {
        const match = clinic.clinic_treatments.find((ct: any) => ct.treatment_id === selectedTreatment);
        if (match?.starting_price_euro) return `€${match.starting_price_euro}`;
      }
      const prices = clinic.clinic_treatments.map((ct: any) => ct.starting_price_euro).filter((p: number) => p > 0);
      if (prices.length > 0) return `€${Math.min(...prices)}`;
    }
    return "Contact for pricing";
  };

  const getClinicLocation = (clinic: any): string => `${clinic.cities?.name || 'Unknown'}, ${clinic.cities?.countries?.name || 'Unknown'}`;

  const selectedTreatmentName = selectedTreatment !== "all" ? treatments.find((t) => t.id === selectedTreatment)?.name : undefined;

  if (error) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[50vh]">
        <div className="text-center">
          <p className="text-destructive mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </div>
      </div>
      <Footer />
    </div>
  );

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Header */}
      <div className="bg-muted/30 border-b border-border/50 py-10 px-6">
        <div className="max-w-7xl mx-auto text-center">
          <h1 className="text-2xl md:text-3xl font-bold mb-2">Browse Dental Clinics</h1>
          <p className="text-sm text-muted-foreground max-w-lg mx-auto">
            Find your perfect healthcare solution with expert doctors and modern technology
          </p>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="lg:hidden mb-6">
          <MobileFilterDrawer treatments={treatments} countries={countries} cities={cities}
            selectedTreatment={selectedTreatment} selectedCountry={selectedCountry} selectedCity={selectedCity}
            setSelectedTreatment={setSelectedTreatment} setSelectedCountry={setSelectedCountry} setSelectedCity={setSelectedCity}
            clearFilters={clearFilters} />
        </div>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <div className="hidden lg:block lg:w-72">
            <div className="bg-background rounded-xl p-5 border border-border/50 sticky top-24">
              <FilterContent treatments={treatments} countries={countries} cities={cities}
                selectedTreatment={selectedTreatment} selectedCountry={selectedCountry} selectedCity={selectedCity}
                setSelectedTreatment={setSelectedTreatment} setSelectedCountry={setSelectedCountry} setSelectedCity={setSelectedCity}
                clearFilters={clearFilters} />
            </div>
          </div>

          {/* Main */}
          <div className="flex-1">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-6">
              <div>
                <h2 className="text-lg font-semibold flex items-center gap-2">
                  {showSkeleton ? (
                    <><Loader2 className="h-4 w-4 animate-spin" /> Loading...</>
                  ) : (
                    <>{totalClinics} Clinics Found {clinicsFetching && !showSkeleton && <Loader2 className="h-3.5 w-3.5 animate-spin text-muted-foreground" />}</>
                  )}
                </h2>
              </div>
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-40 h-9 text-sm border-border/50"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="rating">By Rating</SelectItem>
                    <SelectItem value="price">By Price</SelectItem>
                    <SelectItem value="experience">By Experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {showSkeleton && <ClinicCardSkeletonGrid count={6} />}

            {!showSkeleton && clinics.length > 0 && (
              <div className="space-y-4">
                {clinics.map((clinic: any, index: number) => (
                  <Card key={clinic.id}
                    className={`overflow-hidden border-border/50 hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 animate-fade-in ${clinic.is_featured ? 'ring-1 ring-primary/20' : ''}`}
                    style={{ animationDelay: `${index * 60}ms` }}>
                    <CardContent className="p-0">
                      {/* Desktop */}
                      <div className="hidden lg:flex h-44 relative">
                        <div className="w-56 h-full relative shrink-0">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />
                          {clinic.is_featured && (
                            <Badge className="absolute top-2.5 left-2.5 bg-primary text-primary-foreground border-0 text-[11px] z-10">Featured</Badge>
                          )}
                        </div>
                        <div className="flex-1 p-4 pr-24">
                          <div className="flex flex-col h-full">
                            <div className="mb-2">
                              <h3 className="text-base font-semibold mb-1">{clinic.name}</h3>
                              <div className="flex items-center gap-3 text-xs text-muted-foreground">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{getClinicLocation(clinic)}</span>
                                <span className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />
                                  {clinic.rating} ({clinic.review_count})
                                </span>
                                {clinic.is_verified && <span className="flex items-center gap-1"><CheckCircle className="h-3 w-3 text-[hsl(var(--medical-green))]" />Verified</span>}
                              </div>
                            </div>
                            <div className="flex-1">
                              {clinic.clinic_treatments?.length > 0 && (
                                <div className="flex flex-wrap gap-1 mt-1">
                                  {clinic.clinic_treatments.slice(0, 3).map((ct: any) => (
                                    <Badge key={ct.id} variant="secondary" className="text-[11px] font-normal">
                                      {ct.treatments?.name}{ct.starting_price_euro ? ` · €${ct.starting_price_euro}` : ''}
                                    </Badge>
                                  ))}
                                  {clinic.clinic_treatments.length > 3 && (
                                    <Badge variant="outline" className="text-[11px] font-normal">+{clinic.clinic_treatments.length - 3}</Badge>
                                  )}
                                </div>
                              )}
                            </div>
                          </div>
                          <div className="absolute right-16 top-1/2 -translate-y-1/2 text-right">
                            <div className="text-xs text-muted-foreground">Starting</div>
                            <div className="text-lg font-bold text-primary">{getClinicPrice(clinic)}</div>
                          </div>
                        </div>
                        <Link to={`/clinic/${clinic.id}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`}
                          className="absolute right-0 top-0 bottom-0 w-12 bg-primary hover:bg-primary/90 flex items-center justify-center transition-colors">
                          <ChevronRight className="w-5 h-5 text-primary-foreground" />
                        </Link>
                      </div>

                      {/* Mobile */}
                      <div className="lg:hidden">
                        <div className="relative h-40">
                          <ImageCarousel images={getClinicImages(clinic)} alt={clinic.name} />
                          <div className="absolute top-2.5 left-2.5 right-2.5 flex justify-between items-start z-10">
                            {clinic.is_featured ? <Badge className="bg-primary text-primary-foreground border-0 text-[11px]">Featured</Badge> : <div />}
                            {clinic.is_verified && (
                              <div className="flex items-center gap-1 bg-background/90 backdrop-blur-sm px-2 py-0.5 rounded-full">
                                <CheckCircle className="h-3 w-3 text-[hsl(var(--medical-green))]" />
                                <span className="text-[11px] font-medium">Verified</span>
                              </div>
                            )}
                          </div>
                          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-foreground/60 to-transparent pt-8 pb-2.5 px-3">
                            <div className="flex items-center gap-1 text-primary-foreground text-xs">
                              <MapPin className="h-3 w-3" />{getClinicLocation(clinic)}
                            </div>
                          </div>
                        </div>
                        <div className="p-4 space-y-3">
                          <div className="flex items-start justify-between gap-2">
                            <h3 className="text-sm font-semibold leading-tight flex-1">{clinic.name}</h3>
                            <div className="flex items-center gap-1 bg-[hsl(var(--trust-gold)/0.1)] px-2 py-0.5 rounded-md shrink-0">
                              <Star className="h-3 w-3 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />
                              <span className="text-xs font-semibold">{clinic.rating || '0'}</span>
                            </div>
                          </div>
                          {clinic.clinic_treatments?.length > 0 && (
                            <div className="flex flex-wrap gap-1">
                              {clinic.clinic_treatments.slice(0, 3).map((ct: any) => (
                                <Badge key={ct.id} variant="secondary" className="text-[11px] font-normal">{ct.treatments?.name}</Badge>
                              ))}
                            </div>
                          )}
                          <div className="h-px bg-border/50" />
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="text-xs text-muted-foreground">Starting from</div>
                              <div className="text-lg font-bold text-primary">{getClinicPrice(clinic)}</div>
                            </div>
                            <Link to={`/clinic/${clinic.id}${selectedTreatmentName ? `?treatment=${encodeURIComponent(selectedTreatmentName)}` : ""}`}>
                              <Button size="sm" className="bg-primary hover:bg-primary/90 text-sm">
                                View Clinic <ChevronRight className="h-3.5 w-3.5 ml-1" />
                              </Button>
                            </Link>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {!showSkeleton && clinics.length === 0 && (
              <div className="text-center py-16">
                <div className="max-w-sm mx-auto">
                  <div className="text-5xl mb-4">🔍</div>
                  <h3 className="text-lg font-semibold mb-2">No Clinics Found</h3>
                  <p className="text-sm text-muted-foreground mb-6">Try adjusting your filters.</p>
                  <Button onClick={clearFilters} className="bg-primary hover:bg-primary/90">Clear Filters</Button>
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
