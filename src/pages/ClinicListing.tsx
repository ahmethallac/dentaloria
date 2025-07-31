import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, XCircle, MapPin, Users, ArrowUpDown, Filter, Search, Circle, CheckCircle2, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { getClinics, getCountries, getCities, getTreatments, getTreatmentCategories } from "@/lib/services";
// Types will be imported from services file

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
  
  // State
  const [clinics, setClinics] = useState<any[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [cities, setCities] = useState<any[]>([]);
  const [treatments, setTreatments] = useState<any[]>([]);
  const [treatmentCategories, setTreatmentCategories] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // Filters
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "all");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "all");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [sortBy, setSortBy] = useState("rating");
  const [showAllTreatments, setShowAllTreatments] = useState(false);
  
  const [page, setPage] = useState(1);
  const [totalClinics, setTotalClinics] = useState(0);

  // Load initial data
  useEffect(() => {
    const loadData = async () => {
      try {
        setLoading(true);
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
        setLoading(false);
      }
    };

    loadData();
  }, []);

  // Load cities when country changes
  useEffect(() => {
    const loadCities = async () => {
      if (selectedCountry && selectedCountry !== "all") {
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

  // Load clinics when filters change
  useEffect(() => {
    const loadClinics = async () => {
      try {
        setLoading(true);
        
        const filters: any = {
          page,
          limit: 12
        };

        if (selectedCountry !== "all") {
          filters.countryId = selectedCountry;
        }
        
        if (selectedCity !== "all") {
          filters.cityId = selectedCity;
        }
        
        if (selectedTreatment !== "all") {
          filters.searchQuery = selectedTreatment;
        }
        

        const { clinics: clinicsData, total } = await getClinics(filters);
        
        // Add default images to clinics without images
        const clinicsWithImages = clinicsData.map((clinic, index) => ({
          ...clinic,
          clinic_images: clinic.clinic_images?.length 
            ? clinic.clinic_images 
            : [{ 
                id: `default-${clinic.id}`, 
                clinic_id: clinic.id, 
                image_url: defaultImages[index % defaultImages.length], 
                is_primary: true, 
                created_at: clinic.created_at 
              }]
        }));
        
        setClinics(clinicsWithImages);
        setTotalClinics(total);
      } catch (err) {
        setError('Failed to load clinics. Please try again.');
        console.error('Error loading clinics:', err);
      } finally {
        setLoading(false);
      }
    };

    loadClinics();
  }, [selectedTreatment, selectedCountry, selectedCity, sortBy, page]);

  const clearFilters = () => {
    setSelectedTreatment("all");
    setSelectedCountry("all");
    setSelectedCity("all");
    setPage(1);
  };

  const getClinicImages = (clinic: any): string[] => {
    if (clinic.clinic_images && clinic.clinic_images.length > 0) {
      return clinic.clinic_images.map(img => img.image_url);
    }
    return [defaultImages[0]]; // Return at least one default image
  };

  const getClinicPrice = (clinic: any): string => {
    if (clinic.clinic_treatments && clinic.clinic_treatments.length > 0) {
      const treatment = clinic.clinic_treatments[0];
      if (treatment.price_from) {
        return `${treatment.currency} ${treatment.price_from}`;
      }
    }
    return "Contact for pricing";
  };

  const getClinicLocation = (clinic: any): string => {
    return `${clinic.cities?.name || 'Unknown'}, ${clinic.cities?.countries?.name || 'Unknown'}`;
  };

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
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar Filters */}
          <div className="lg:w-80">
            <div className="bg-white/80 backdrop-blur-glass rounded-2xl p-6 shadow-card border border-white/20 sticky top-8">
              <div className="flex items-center gap-2 mb-6">
                <Filter className="h-5 w-5 text-primary" />
                <h3 className="text-lg font-semibold bg-gradient-primary bg-clip-text text-transparent">
                  Filters
                </h3>
              </div>


              <div className="space-y-6">
                {/* Treatments Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground/80">Treatments</h4>
                  <div className="space-y-3">
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
                        All
                      </span>
                    </div>
                     {["All-on-6", "All-on-4", "Hollywood Smile", "Implants", "Crowns", "Root Canal"].map((treatmentName) => (
                       <div
                         key={treatmentName}
                         onClick={() => setSelectedTreatment(treatmentName)}
                         className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                       >
                         <div className="relative">
                           {selectedTreatment === treatmentName ? (
                             <CheckCircle2 className="h-5 w-5 text-primary" />
                           ) : (
                             <Circle className="h-5 w-5 text-muted-foreground" />
                           )}
                         </div>
                         <span className={`text-sm ${selectedTreatment === treatmentName ? "text-primary font-medium" : "text-foreground/70"}`}>
                           {treatmentName}
                         </span>
                       </div>
                     ))}
                    {treatments.length > 7 && (
                      <button
                        onClick={() => setShowAllTreatments(!showAllTreatments)}
                        className="text-primary text-sm hover:underline ml-8"
                      >
                        {showAllTreatments ? "Show Less" : "Show All"}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Countries Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground/80">Countries</h4>
                  <div className="space-y-3">
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
                        All
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
                    <div className="space-y-3">
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
                          All
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

                {/* Clear Filters */}
                <Button 
                  onClick={clearFilters}
                  variant="outline"
                  className="w-full bg-white/50 border-white/30 hover:bg-white/70 rounded-xl"
                >
                  Clear Filters
                </Button>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="flex-1">
            {/* Header */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-8">
              <div>
                <h2 className="text-2xl font-bold text-foreground mb-2">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Loading...
                    </div>
                  ) : (
                    `${totalClinics} Clinics Found`
                  )}
                </h2>
                <p className="text-foreground/70">Discover the best medical clinics worldwide</p>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-foreground/70" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-white/80 border-white/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-glass border-white/30">
                    <SelectItem value="rating">By Rating</SelectItem>
                    <SelectItem value="price">By Price</SelectItem>
                    <SelectItem value="experience">By Experience</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Loading State */}
            {loading && (
              <div className="flex justify-center items-center py-16">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            )}

            {/* Clinic Cards */}
            {!loading && (
              <div className="space-y-6">
                {clinics.map((clinic, index) => (
                  <Card 
                    key={clinic.id} 
                    className={`overflow-hidden bg-white/80 backdrop-blur-glass border-white/30 rounded-2xl shadow-card hover:shadow-elegant transition-all duration-500 hover:scale-[1.02] animate-fade-in ${
                      clinic.is_featured ? 'ring-2 ring-primary/20 shadow-colored' : ''
                    }`}
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <CardContent className="p-0">
                      <div className="flex flex-col lg:flex-row h-auto lg:h-48 relative">
                        {/* Image Section */}
                        <div className="lg:w-64 h-48 lg:h-full relative">
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

                        {/* Content Section */}
                        <div className="flex-1 p-4 pr-20 lg:pr-28">
                          <div className="flex flex-col h-full">
                            {/* Header */}
                            <div className="mb-3">
                              <div className="flex justify-between items-start">
                                <div>
                                  <h3 className="text-lg font-bold text-foreground mb-1">{clinic.name}</h3>
                                  <div className="flex items-center gap-3 text-xs text-foreground/70">
                                    <div className="flex items-center gap-1">
                                      <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                      <span className="font-semibold">{clinic.rating}</span>
                                      <span>({clinic.review_count})</span>
                                    </div>
                                    {clinic.is_verified && (
                                      <div className="flex items-center gap-1">
                                        <CheckCircle className="h-3 w-3 text-green-500" />
                                        <span>Verified</span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Price - Centered */}
                            <div className="absolute right-20 top-1/2 transform -translate-y-1/2 text-right">
                              <div className="text-xs text-foreground/70 mb-1">Starting</div>
                              <div className="text-lg font-bold text-primary">
                                {getClinicPrice(clinic)}
                              </div>
                            </div>

                            {/* Treatments */}
                            <div className="flex-1">
                              {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
                                <div className="flex flex-wrap gap-1">
                                  {clinic.clinic_treatments.slice(0, 2).map((clinicTreatment) => (
                                    <Badge 
                                      key={clinicTreatment.id} 
                                      variant="secondary" 
                                      className="bg-muted text-foreground/80 border-0 px-2 py-1 rounded-full text-xs"
                                    >
                                      {clinicTreatment.treatments?.name}
                                      {clinicTreatment.price_from && ` - ${clinicTreatment.currency} ${clinicTreatment.price_from}`}
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

                        {/* Action Button - Right Edge Vertical */}
                        <div className="absolute right-0 top-0 bottom-0 w-12 bg-gradient-to-b from-primary to-primary/90 hover:from-primary/90 hover:to-primary rounded-r-2xl flex items-center justify-center transition-all duration-300 hover:w-16 group cursor-pointer">
                          <div className="text-white text-xs font-medium transform -rotate-90 whitespace-nowrap group-hover:rotate-0 transition-transform duration-300">
                            <span className="group-hover:hidden">View</span>
                            <div className="hidden group-hover:block text-center leading-tight">
                              <div>View</div>
                              <div>Clinic</div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}

            {/* No Results */}
            {!loading && clinics.length === 0 && (
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