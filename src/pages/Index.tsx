import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ClinicCard } from "@/components/ui/clinic-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { useIsMobile } from "@/hooks/use-mobile";
import { Star, Users, Award, CheckCircle, MapPin, Search, Stethoscope, UserCheck, Smile, Crown, Activity, ArrowRight, Play, Sparkles, Anchor, Layers, Zap, Grid3X3, Brush, Minus, Circle } from "lucide-react";
import { getFeaturedClinics, getTreatments, getPopularTreatments, getCountries, getCities, type Clinic, type Treatment } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import FeaturedClinicsSection from "@/components/home/FeaturedClinicsSection";

// Helper function to map clinic data for ClinicCard component
const mapClinicForCard = (clinic: Clinic) => ({
  id: clinic.id,
  name: clinic.name,
  location: clinic.address || '',
  city: clinic.cities?.name || '',
  country: clinic.cities?.countries?.name || '',
  rating: clinic.rating || 0,
  reviewCount: clinic.review_count || 0,
  image: clinic.clinic_images?.find(img => img.is_primary)?.image_url || 
         clinic.clinic_images?.[0]?.image_url || 
         "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
  specialties: clinic.clinic_treatments?.slice(0, 3).map(ct => ct.treatments?.name).filter(Boolean) || [],
  priceRange: "$$",
  experience: clinic.experience_years || 0,
  patientCount: clinic.patient_count || 0,
  isVerified: clinic.is_verified || false
});

// Helper function to get treatment-specific icons
const getTreatmentIcon = (treatmentName: string) => {
  const name = treatmentName.toLowerCase();
  
  if (name.includes('implant') || name.includes('all-on')) return Anchor;
  if (name.includes('whitening') || name.includes('bleach')) return Sparkles;
  if (name.includes('veneer') || name.includes('laminate')) return Layers;
  if (name.includes('crown') || name.includes('cap')) return Crown;
  if (name.includes('root canal') || name.includes('endodontic')) return Zap;
  if (name.includes('orthodontic') || name.includes('braces') || name.includes('invisalign')) return Grid3X3;
  if (name.includes('cleaning') || name.includes('hygiene') || name.includes('prophylaxis')) return Brush;
  if (name.includes('extraction') || name.includes('removal')) return Minus;
  if (name.includes('filling') || name.includes('restoration')) return Circle;
  if (name.includes('smile') || name.includes('makeover')) return Smile;
  
  // Default icon for general treatments
  return Stethoscope;
};

// Treatment and location data

const POPULAR_CITIES_META: Record<string, { image: string; description: string }> = {
  "Istanbul": { image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80", description: "Turkey's largest city" },
  "Antalya": { image: "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png", description: "Pearl of the Mediterranean" },
  "Izmir": { image: "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png", description: "Shining star of the Aegean" },
};
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [featuredClinics, setFeaturedClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
  const [popularTreatments, setPopularTreatments] = useState<Treatment[]>([]);
  const [countries, setCountries] = useState<any[]>([]);
  const [popularCities, setPopularCities] = useState<any[]>([]);

  useEffect(() => {
    const loadFeaturedClinics = async () => {
      try {
        const clinics = await getFeaturedClinics(6);
        setFeaturedClinics(clinics);
      } catch (error) {
        console.error('Failed to load featured clinics:', error);
        toast({
          title: "Error",
          description: "Failed to load featured clinics",
          variant: "destructive"
        });
      } finally {
        setLoading(false);
      }
    };

    loadFeaturedClinics();
  }, [toast]);

  useEffect(() => {
    const loadData = async () => {
      try {
        const [allTreats, popular, countriesData] = await Promise.all([
          getTreatments(),
          getPopularTreatments(6),
          getCountries(),
        ]);
        setTreatments(allTreats);
        setPopularTreatments(popular);
        setCountries(countriesData);

        // Load cities for popular city cards (find Turkey's cities)
        const turkey = countriesData.find((c: any) => c.name?.toLowerCase().includes('turkey') || c.name?.toLowerCase().includes('türkiye'));
        if (turkey) {
          const citiesData = await getCities(turkey.id);
          // Only show cities that have metadata (image/description)
          const enrichedCities = citiesData
            .filter((c: any) => POPULAR_CITIES_META[c.name])
            .map((c: any) => ({ ...c, ...POPULAR_CITIES_META[c.name] }));
          setPopularCities(enrichedCities);
        }
      } catch (e) {
        console.error('Failed to load data', e);
      }
    };
    loadData();
  }, []);
  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTreatment) params.set('treatment', selectedTreatment);
    if (selectedCountry) params.set('country', selectedCountry);
    navigate(`/clinic-listing?${params.toString()}`);
  };
  const handleCityClick = (cityId: string, countryId: string) => {
    navigate(`/clinic-listing?city=${cityId}&country=${countryId}`);
  };
  const handleTreatmentClick = (treatmentId: string) => {
    navigate(`/clinic-listing?treatment=${treatmentId}`);
  };

  useHeadMeta({
    title: "Dentaloria | Find the Best Dental Clinic for You",
    description: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews — making it easy to choose the best clinic abroad with confidence.",
    ogTitle: "Dentaloria | Find the Best Dental Clinic for You",
    ogDescription: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews — making it easy to choose the best clinic abroad with confidence.",
    twitterTitle: "Dentaloria | Find the Best Dental Clinic for You",
    twitterDescription: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews — making it easy to choose the best clinic abroad with confidence."
  });
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="https://videos.pexels.com/video-files/4490548/4490548-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600/70 via-blue-700/60 to-indigo-800/70"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Find the Best
              <span className="block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-gray-50">
                Dental Clinic
              </span>
            </h1>
            <p className="text-xl text-white/90 mb-12 animate-fade-in">
              World-class dental treatment at your fingertips
            </p>
            
            {/* Search Bar */}
            <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-6 shadow-2xl max-w-2xl mx-auto animate-scale-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select treatment type" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {countries.map((country) => (
                      <SelectItem key={country.id} value={country.id}>
                        {country.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="w-full">
                <Button onClick={handleSearch} className="w-full h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                  <Search className="h-5 w-5 mr-2" />
                  Search Clinics
                </Button>
              </div>
            </div>
            
            {/* Trust Indicators */}
            <div className="grid grid-cols-3 gap-8 mt-16 text-white">
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">500+</div>
                <div className="text-white/80">Verified Clinics</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">10,000+</div>
                <div className="text-white/80">Happy Patients</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold mb-2">4.8/5</div>
                <div className="text-white/80">Average Rating</div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Clinics */}
      <section className="py-16 bg-gradient-to-br from-medical-light/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Popular Clinics</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover the highest-rated and most trusted dental clinics
            </p>
          </div>
          
          {/* Carousel with navigation arrows */}
          <div className="relative px-10 md:px-14">
            <Carousel
              opts={{
                align: "start",
                loop: true,
              }}
              className="w-full"
            >
              <CarouselContent className="-ml-3 md:-ml-4">
                {loading ? (
                  // Loading skeleton - different for mobile vs desktop
                  Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} className="pl-3 md:pl-4 basis-full md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                      <Card className="animate-pulse h-full">
                        {isMobile ? (
                          // Mobile skeleton - horizontal
                          <div className="flex h-32">
                            <div className="w-28 bg-muted shrink-0"></div>
                            <div className="flex-1 p-3">
                              <div className="h-3 bg-muted rounded mb-2 w-3/4"></div>
                              <div className="h-2 bg-muted rounded mb-2 w-1/2"></div>
                              <div className="h-5 bg-muted rounded w-16 mb-2"></div>
                              <div className="h-6 bg-muted rounded w-full mt-auto"></div>
                            </div>
                          </div>
                        ) : (
                          // Desktop skeleton - vertical
                          <>
                            <div className="h-40 bg-muted"></div>
                            <CardContent className="p-4">
                              <div className="h-4 bg-muted rounded mb-2"></div>
                              <div className="h-3 bg-muted rounded mb-4 w-2/3"></div>
                              <div className="flex gap-2">
                                <div className="h-6 bg-muted rounded w-16"></div>
                                <div className="h-6 bg-muted rounded w-16"></div>
                              </div>
                            </CardContent>
                          </>
                        )}
                      </Card>
                    </CarouselItem>
                  ))
                ) : featuredClinics.length > 0 ? (
                  featuredClinics.map((clinic, index) => (
                    <CarouselItem 
                      key={clinic.id} 
                      className="pl-3 md:pl-4 basis-full md:basis-1/3 lg:basis-1/4 xl:basis-1/5 animate-fade-in"
                      style={{ animationDelay: `${index * 0.1}s` }}
                    >
                      <div className="h-full">
                        <ClinicCard 
                          {...mapClinicForCard(clinic)} 
                          onClick={() => navigate(`/clinic/${clinic.id}`)}
                          variant={isMobile ? "compact" : "default"}
                        />
                      </div>
                    </CarouselItem>
                  ))
                ) : (
                  <CarouselItem className="pl-3 md:pl-4 basis-full">
                    <Card className="h-40 flex items-center justify-center">
                      <CardContent className="text-center">
                        <p className="text-muted-foreground">No clinics available yet</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="-left-2 md:left-0 h-8 w-8 md:h-10 md:w-10 bg-background border-border shadow-md hover:bg-accent" />
              <CarouselNext className="-right-2 md:right-0 h-8 w-8 md:h-10 md:w-10 bg-background border-border shadow-md hover:bg-accent" />
            </Carousel>
          </div>
        </div>
      </section>

      {/* Popular Cities */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Popular Cities</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Explore the most preferred destinations
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {popularCities.map((city, index) => <Card key={city.id} className="group relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-elegant animate-fade-in" style={{
            animationDelay: `${index * 0.1}s`
          }} onClick={() => handleCityClick(city.id, city.country_id)}>
                <div className="relative h-64">
                  <img src={city.image} alt={city.name} className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110" />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{city.name}</h3>
                    <p className="text-white/90">{city.description}</p>
                  </div>
                </div>
              </Card>)}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-16 bg-gradient-to-br from-medical-light/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">How It Works?</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Find the perfect clinic in 3 simple steps
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">1. Compare</h3>
              <p className="text-muted-foreground">Compare clinics and find the best option for you</p>
            </div>
            
            <div className="text-center group relative">
              <ArrowRight className="hidden md:block absolute -left-8 top-8 h-6 w-6 text-muted-foreground" />
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">2. Find Perfect Clinic</h3>
              <p className="text-muted-foreground">Choose the clinic that best suits your needs</p>
              <ArrowRight className="hidden md:block absolute -right-8 top-8 h-6 w-6 text-muted-foreground" />
            </div>
            
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">3. Apply</h3>
              <p className="text-muted-foreground">Easily book an appointment and start your treatment</p>
            </div>
          </div>
        </div>
      </section>

      {/* Treatments Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Treatment Options</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover the most popular dental treatments
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {popularTreatments.map((treatment, index) => (
              <Card key={treatment.id} className="group cursor-pointer hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in" style={{
            animationDelay: `${index * 0.1}s`
          }} onClick={() => handleTreatmentClick(treatment.id)}>
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-primary/10 to-blue-600/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:from-primary/20 group-hover:to-blue-600/20 transition-colors duration-300">
                    {(() => {
                      const IconComponent = getTreatmentIcon(treatment.name);
                      return <IconComponent className="h-8 w-8 text-primary" />;
                    })()}
                  </div>
                  <h3 className="font-semibold mb-2">{treatment.name}</h3>
                  <p className="text-sm text-muted-foreground">{treatment.description || 'Click to explore clinics offering this treatment'}</p>
                </CardContent>
              </Card>))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-gradient-to-br from-primary to-blue-600 text-white">
        <div className="container mx-auto px-4 text-center">
          <div className="max-w-3xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold mb-6">
              Start Your Perfect Smile Journey Today!
            </h2>
            <p className="text-xl mb-8 text-white/90">
              Thousands of patients have achieved their dream smile through our platform. It's your turn!
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3" onClick={() => navigate('/clinic-listing')}>
              Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;