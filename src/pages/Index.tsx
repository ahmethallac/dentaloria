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
import { useIsMobile } from "@/hooks/use-mobile";
import { Star, Users, Award, CheckCircle, MapPin, Search, UserCheck, Activity, ArrowRight, Play, Grid3X3, ShieldCheck, Tag, Send } from "lucide-react";
import { getFeaturedClinics, getTreatments, getCountries, getCities, type Clinic, type Treatment } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import FeaturedClinicsSection, { ShowcaseCard } from "@/components/home/FeaturedClinicsSection";
import { AISearchBar } from "@/components/home/AISearchBar";
import allOn4Image from "@/assets/treatments/all-on-4.jpeg";
import allOn6Image from "@/assets/treatments/all-on-6.webp";
import singleImplantImage from "@/assets/treatments/single-implant.jpeg";
import compositeBondingImage from "@/assets/treatments/composite-bonding.webp";
import laminateVeneerImage from "@/assets/treatments/laminate-veneer.webp";
import zirconiumCrownImage from "@/assets/treatments/zirconium-crown.jpeg";

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

// Real photos representing each treatment category, shown inside the circle
// avatars on the homepage Treatment Options section. The implant/bonding/
// veneer/crown photos are the exact ones Ahmet picked; whitening/braces/
// wisdom stay as the previously-verified free-license Unsplash photos.
const TREATMENT_IMAGES = {
  allOn4: allOn4Image,
  allOn6: allOn6Image,
  singleImplant: singleImplantImage,
  bonding: compositeBondingImage,
  laminateVeneer: laminateVeneerImage,
  zirconiumCrown: zirconiumCrownImage,
  whitening: "https://images.unsplash.com/photo-1677026010083-78ec7f1b84ed?w=200&h=200&fit=crop&q=80",
  porcelainVeneer: "https://images.unsplash.com/photo-1660737217679-6ddd9768654a?w=200&h=200&fit=crop&q=80",
  invisalign: "https://images.unsplash.com/photo-1694675236489-d73651370688?w=200&h=200&fit=crop&q=80",
  braces: "https://images.unsplash.com/photo-1598256989809-394fa4f6cd26?w=200&h=200&fit=crop&q=80",
  wisdom: "https://images.unsplash.com/photo-1522849696084-818b29dfe210?w=200&h=200&fit=crop&q=80",
} as const;

// Helper function to get a treatment-specific real photo
const getTreatmentImage = (treatmentName: string): string => {
  const name = treatmentName.toLowerCase();

  if (name.includes('invisalign') || name.includes('aligner')) return TREATMENT_IMAGES.invisalign;
  if (name.includes('brace') || name.includes('orthodontic')) return TREATMENT_IMAGES.braces;
  if (name.includes('all-on-4')) return TREATMENT_IMAGES.allOn4;
  if (name.includes('all-on-6')) return TREATMENT_IMAGES.allOn6;
  if (name.includes('single tooth') || name.includes('single implant')) return TREATMENT_IMAGES.singleImplant;
  if (name.includes('implant')) return TREATMENT_IMAGES.allOn4;
  if (name.includes('whitening') || name.includes('bleach')) return TREATMENT_IMAGES.whitening;
  if (name.includes('laminate')) return TREATMENT_IMAGES.laminateVeneer;
  if (name.includes('veneer') || name.includes('smile') || name.includes('makeover')) return TREATMENT_IMAGES.porcelainVeneer;
  if (name.includes('zirconium') || name.includes('crown') || name.includes('cap') || name.includes('filling') || name.includes('restoration')) return TREATMENT_IMAGES.zirconiumCrown;
  if (name.includes('wisdom') || name.includes('extraction') || name.includes('removal')) return TREATMENT_IMAGES.wisdom;
  if (name.includes('bonding') || name.includes('root canal') || name.includes('endodontic')) return TREATMENT_IMAGES.bonding;
  if (name.includes('cleaning') || name.includes('hygiene') || name.includes('prophylaxis')) return TREATMENT_IMAGES.whitening;

  // Default for anything else
  return TREATMENT_IMAGES.zirconiumCrown;
};

// Treatment and location data

const POPULAR_CITIES_META: Record<string, { image: string; description: string }> = {
  "Istanbul": { image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80", description: "Turkey's largest city" },
  "Antalya": { image: "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png", description: "Pearl of the Mediterranean" },
  "Izmir": { image: "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png", description: "Shining star of the Aegean" },
};

// Why Dentaloria — core value props of the comparison platform itself
const WHY_DENTALORIA = [
  {
    icon: Grid3X3,
    title: "Compare, don't chase",
    description: "See every clinic that matches your treatment and location side by side, instead of messaging each one separately.",
  },
  {
    icon: ShieldCheck,
    title: "Verified clinics only",
    description: "Every clinic on Dentaloria is reviewed before it goes live, so you're never guessing who to trust.",
  },
  {
    icon: Tag,
    title: "Transparent pricing",
    description: "Real prices and real patient ratings upfront — no surprise quotes once you arrive.",
  },
  {
    icon: Send,
    title: "One application, real replies",
    description: "Submit your details once. Only the clinics that actually fit your needs get back to you.",
  },
];

// Testimonials about Dentaloria itself (the comparison platform), not individual clinics
const TESTIMONIALS = [
  {
    name: "Sarah M.",
    location: "United Kingdom",
    quote: "I didn't want to message ten different clinics and repeat my story every time. On Dentaloria I compared everything in one place and only reached out once I knew exactly who I wanted.",
  },
  {
    name: "Michael R.",
    location: "Ireland",
    quote: "What I liked most was not having to negotiate with every clinic myself. I filled in one form and only the clinics that matched what I needed got back to me.",
  },
  {
    name: "Anna K.",
    location: "Germany",
    quote: "I was overwhelmed by how many clinics claim to be the best. Dentaloria let me actually compare prices and reviews side by side instead of guessing.",
  },
  {
    name: "James T.",
    location: "United States",
    quote: "Finding a dental clinic abroad felt risky until I found this site. Seeing verified reviews and real prices upfront made the decision so much easier.",
  },
  {
    name: "Emma L.",
    location: "Netherlands",
    quote: "I found exactly what I was looking for within a day. No back and forth with ten clinics — just one platform that did the comparing for me.",
  },
  {
    name: "David P.",
    location: "United Kingdom",
    quote: "Dentaloria saved me hours of research. I could filter by treatment and language, and the clinic I chose matched everything I needed.",
  },
];

const getInitials = (name: string) =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");
  const [featuredClinics, setFeaturedClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [treatments, setTreatments] = useState<Treatment[]>([]);
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
        const [allTreats, countriesData] = await Promise.all([
          getTreatments(),
          getCountries(),
        ]);
        setTreatments(allTreats);
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

            {/* AI Search Bar */}
            <AISearchBar className="max-w-2xl mx-auto animate-scale-in mb-6" />

            <div className="flex items-center gap-4 max-w-2xl mx-auto mb-6">
              <div className="h-px flex-1 bg-white/30" />
              <span className="text-white/80 text-sm font-medium">or search with filters</span>
              <div className="h-px flex-1 bg-white/30" />
            </div>

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

      {/* Admin-curated Featured Clinics (Homepage Showcase) */}
      <FeaturedClinicsSection />

      {/* Popular Clinics */}
      <section className="py-16 bg-gradient-to-br from-medical-light/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">Popular Clinics</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Discover the highest-rated and most trusted dental clinics
            </p>
          </div>

          {loading ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5">
              {Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-border/60 bg-white"
                >
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <div className="p-3 lg:p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded-xl animate-pulse mt-3" />
                  </div>
                </div>
              ))}
            </div>
          ) : featuredClinics.length > 0 ? (
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5">
              {featuredClinics.map((clinic, idx) => (
                <ShowcaseCard key={clinic.id} clinic={clinic} cardIndex={idx} />
              ))}
            </div>
          ) : (
            <Card className="h-40 flex items-center justify-center">
              <CardContent className="text-center">
                <p className="text-muted-foreground">No clinics available yet</p>
              </CardContent>
            </Card>
          )}
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
            {treatments.filter((treatment) => treatment.name !== 'Porcelain Veneers').map((treatment, index) => (
              <Card key={treatment.id} className="group cursor-pointer hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in" style={{
            animationDelay: `${index * 0.1}s`
          }} onClick={() => handleTreatmentClick(treatment.id)}>
                <CardContent className="p-6 text-center">
                  <div className="rounded-full w-24 h-24 mx-auto mb-4 overflow-hidden ring-2 ring-primary/10 group-hover:ring-primary/30 transition-all duration-300">
                    <img
                      src={getTreatmentImage(treatment.name)}
                      alt={treatment.name}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-300"
                    />
                  </div>
                  <h3 className="font-semibold mb-2">{treatment.name}</h3>
                  <p className="text-sm text-muted-foreground">{treatment.description || 'Click to explore clinics offering this treatment'}</p>
                </CardContent>
              </Card>))}
          </div>
        </div>
      </section>

      {/* Why Dentaloria */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">Why Dentaloria</Badge>
            <h2 className="text-3xl font-bold mb-4">One platform. Every clinic compared.</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Dentaloria replaces messaging clinics one by one with a single place to compare, apply, and hear back.
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY_DENTALORIA.map((item, index) => (
              <div
                key={item.title}
                className="text-center group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-muted-foreground text-sm">{item.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-br from-medical-light/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">What patients say about Dentaloria</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Real feedback from patients who found their clinic through Dentaloria
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-medical-light/30 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-medical-light/30 to-transparent z-10" />

            <div className="flex w-max gap-6 animate-marquee hover:[animation-play-state:paused]">
              {[...TESTIMONIALS, ...TESTIMONIALS].map((t, i) => (
                <Card
                  key={`${t.name}-${i}`}
                  className="w-80 shrink-0 border-primary/10 bg-gradient-to-br from-white to-primary/5 shadow-card hover:shadow-elegant transition-shadow duration-300"
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 flex-1">"{t.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(t.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{t.name}</div>
                        <div className="text-xs text-muted-foreground">{t.location}</div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
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