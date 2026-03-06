import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ClinicCard } from "@/components/ui/clinic-card";
import { Button } from "@/components/ui/button";
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
import { Star, Search, Stethoscope, UserCheck, CheckCircle, ArrowRight, Sparkles, Anchor, Layers, Crown, Zap, Grid3X3, Brush, Minus, Circle, Smile, Shield, Users, Award } from "lucide-react";
import { getFeaturedClinics, getTreatments, getPopularTreatments, type Clinic, type Treatment } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";

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
  return Stethoscope;
};

const COUNTRIES = ["Turkey", "USA", "UK"];
const POPULAR_CITIES = [{
  name: "Istanbul",
  image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
  description: "Turkey's largest city"
}, {
  name: "Antalya",
  image: "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png",
  description: "Pearl of the Mediterranean"
}, {
  name: "Izmir",
  image: "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png",
  description: "Shining star of the Aegean"
}];

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

  useEffect(() => {
    const loadFeaturedClinics = async () => {
      try {
        const clinics = await getFeaturedClinics(6);
        setFeaturedClinics(clinics);
      } catch (error) {
        console.error('Failed to load featured clinics:', error);
        toast({ title: "Error", description: "Failed to load featured clinics", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    };
    loadFeaturedClinics();
  }, [toast]);

  useEffect(() => {
    const loadTreatments = async () => {
      try {
        const [allTreats, popular] = await Promise.all([getTreatments(), getPopularTreatments(6)]);
        setTreatments(allTreats);
        setPopularTreatments(popular);
      } catch (e) {
        console.error('Failed to load treatments', e);
      }
    };
    loadTreatments();
  }, []);

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTreatment) params.set('treatment', selectedTreatment);
    if (selectedCountry) params.set('country', selectedCountry);
    navigate(`/clinic-listing?${params.toString()}`);
  };

  const handleCityClick = (cityName: string) => navigate(`/clinic-listing?city=${cityName}`);
  const handleTreatmentClick = (treatmentName: string) => navigate(`/clinic-listing?treatment=${treatmentName}`);

  useHeadMeta({
    title: "Dentaloria | Find the Best Dental Clinic for You",
    description: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews — making it easy to choose the best clinic abroad with confidence.",
    ogTitle: "Dentaloria | Find the Best Dental Clinic for You",
    ogDescription: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews.",
    twitterTitle: "Dentaloria | Find the Best Dental Clinic for You",
    twitterDescription: "Dentaloria helps you compare dental clinics by price, treatment options, location, and patient reviews."
  });

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <section className="relative overflow-hidden">
        {/* Video Background */}
        <div className="absolute inset-0">
          <video autoPlay muted loop playsInline className="w-full h-full object-cover">
            <source src="https://videos.pexels.com/video-files/4490548/4490548-uhd_2560_1440_25fps.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-b from-[hsl(220_47%_8%/0.85)] via-[hsl(220_47%_12%/0.80)] to-[hsl(220_47%_8%/0.90)]" />
        </div>
        
        <div className="relative z-10 container mx-auto px-6 pt-20 pb-24 md:pt-28 md:pb-32">
          <div className="max-w-3xl mx-auto text-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/10 text-primary-foreground/80 text-sm mb-6 animate-fade-in">
              <Shield className="w-3.5 h-3.5" />
              Trusted by 10,000+ patients worldwide
            </div>
            
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-extrabold text-primary-foreground mb-5 leading-[1.1] animate-fade-in">
              Find Your Perfect{" "}
              <span className="bg-gradient-to-r from-[hsl(172_66%_50%)] to-[hsl(205_85%_55%)] bg-clip-text text-transparent">
                Dental Clinic
              </span>
            </h1>
            
            <p className="text-lg md:text-xl text-primary-foreground/70 mb-10 max-w-xl mx-auto animate-fade-in">
              Compare world-class dental clinics by price, quality, and patient reviews
            </p>
            
            {/* Search */}
            <div className="bg-background rounded-2xl p-4 md:p-5 shadow-elegant max-w-2xl mx-auto animate-scale-in">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                  <SelectTrigger className="h-11 border-border/50 bg-muted/50">
                    <SelectValue placeholder="Select treatment" />
                  </SelectTrigger>
                  <SelectContent>
                    {treatments.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="h-11 border-border/50 bg-muted/50">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map(country => (
                      <SelectItem key={country} value={country}>{country}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <Button onClick={handleSearch} className="w-full h-11 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl">
                <Search className="h-4 w-4 mr-2" />
                Search Clinics
              </Button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-3 gap-6 mt-14 max-w-lg mx-auto">
              {[
                { value: "500+", label: "Verified Clinics" },
                { value: "10K+", label: "Happy Patients" },
                { value: "4.8", label: "Avg Rating", icon: true },
              ].map((stat) => (
                <div key={stat.label} className="text-center">
                  <div className="text-2xl md:text-3xl font-bold text-primary-foreground flex items-center justify-center gap-1">
                    {stat.value}
                    {stat.icon && <Star className="w-4 h-4 fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]" />}
                  </div>
                  <div className="text-xs md:text-sm text-primary-foreground/50 mt-1">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Popular Clinics */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="flex items-end justify-between mb-10">
            <div>
              <h2 className="text-2xl md:text-3xl font-bold">Popular Clinics</h2>
              <p className="text-muted-foreground mt-1">Highest-rated and most trusted dental clinics</p>
            </div>
            <Button variant="ghost" className="hidden md:flex text-primary" onClick={() => navigate('/clinic-listing')}>
              View All <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
          
          <div className="relative px-8 md:px-12">
            <Carousel opts={{ align: "start", loop: true }} className="w-full">
              <CarouselContent className="-ml-3 md:-ml-4">
                {loading ? (
                  Array.from({ length: 5 }).map((_, index) => (
                    <CarouselItem key={index} className="pl-3 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5">
                      <Card className="animate-pulse h-full border-border/50">
                        <div className="h-44 bg-muted rounded-t-lg"></div>
                        <CardContent className="p-4">
                          <div className="h-4 bg-muted rounded mb-2 w-3/4"></div>
                          <div className="h-3 bg-muted rounded mb-4 w-1/2"></div>
                          <div className="h-8 bg-muted rounded w-full"></div>
                        </CardContent>
                      </Card>
                    </CarouselItem>
                  ))
                ) : featuredClinics.length > 0 ? (
                  featuredClinics.map((clinic, index) => (
                    <CarouselItem 
                      key={clinic.id} 
                      className="pl-3 md:pl-4 basis-1/2 md:basis-1/3 lg:basis-1/4 xl:basis-1/5 animate-fade-in"
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
                    <Card className="h-40 flex items-center justify-center border-border/50">
                      <CardContent className="text-center">
                        <p className="text-muted-foreground">No clinics available yet</p>
                      </CardContent>
                    </Card>
                  </CarouselItem>
                )}
              </CarouselContent>
              <CarouselPrevious className="-left-2 md:left-0 h-9 w-9 bg-background border-border shadow-sm hover:bg-muted" />
              <CarouselNext className="-right-2 md:right-0 h-9 w-9 bg-background border-border shadow-sm hover:bg-muted" />
            </Carousel>
          </div>
          
          <div className="text-center mt-8 md:hidden">
            <Button variant="outline" onClick={() => navigate('/clinic-listing')}>
              View All Clinics <ArrowRight className="w-4 h-4 ml-1" />
            </Button>
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-14">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">How It Works</h2>
            <p className="text-muted-foreground max-w-md mx-auto">Find your perfect clinic in 3 simple steps</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-3xl mx-auto">
            {[
              { icon: Search, step: "01", title: "Compare", desc: "Compare clinics by price, quality, and reviews" },
              { icon: UserCheck, step: "02", title: "Choose", desc: "Pick the clinic that best suits your needs" },
              { icon: CheckCircle, step: "03", title: "Book", desc: "Book your appointment and start your journey" },
            ].map((item) => (
              <div key={item.step} className="text-center group">
                <div className="relative inline-flex mb-5">
                  <div className="w-16 h-16 rounded-2xl bg-primary/10 flex items-center justify-center group-hover:bg-primary/15 transition-colors">
                    <item.icon className="w-7 h-7 text-primary" />
                  </div>
                  <span className="absolute -top-2 -right-2 text-xs font-bold text-primary bg-primary/10 rounded-full w-6 h-6 flex items-center justify-center">{item.step}</span>
                </div>
                <h3 className="text-lg font-semibold mb-2">{item.title}</h3>
                <p className="text-sm text-muted-foreground">{item.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Popular Cities */}
      <section className="py-20">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Popular Destinations</h2>
            <p className="text-muted-foreground">Explore the most preferred cities for dental tourism</p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {POPULAR_CITIES.map((city) => (
              <div 
                key={city.name} 
                className="group relative overflow-hidden rounded-2xl cursor-pointer aspect-[4/3]"
                onClick={() => handleCityClick(city.name)}
              >
                <img src={city.image} alt={city.name} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                <div className="absolute inset-0 bg-gradient-to-t from-foreground/70 via-foreground/20 to-transparent" />
                <div className="absolute bottom-5 left-5">
                  <h3 className="text-xl font-bold text-primary-foreground mb-0.5">{city.name}</h3>
                  <p className="text-sm text-primary-foreground/70">{city.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Treatments */}
      <section className="py-20 bg-muted/30">
        <div className="container mx-auto px-6">
          <div className="text-center mb-10">
            <h2 className="text-2xl md:text-3xl font-bold mb-3">Treatment Options</h2>
            <p className="text-muted-foreground">Discover the most popular dental treatments</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4 max-w-3xl mx-auto">
            {popularTreatments.map((treatment) => {
              const IconComponent = getTreatmentIcon(treatment.name);
              return (
                <Card 
                  key={treatment.id} 
                  className="group cursor-pointer hover:shadow-[var(--shadow-card-hover)] transition-all duration-300 hover:-translate-y-1 border-border/50"
                  onClick={() => handleTreatmentClick(treatment.name)}
                >
                  <CardContent className="p-5 text-center">
                    <div className="w-12 h-12 rounded-xl bg-primary/8 flex items-center justify-center mx-auto mb-3 group-hover:bg-primary/12 transition-colors">
                      <IconComponent className="h-6 w-6 text-primary" />
                    </div>
                    <h3 className="text-sm font-semibold mb-1">{treatment.name}</h3>
                    <p className="text-xs text-muted-foreground line-clamp-2">{treatment.description || 'Explore clinics for this treatment'}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>
      </section>

      {/* Trust Section */}
      <section className="py-16 border-t border-border">
        <div className="container mx-auto px-6">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-8 max-w-3xl mx-auto text-center">
            {[
              { icon: Shield, label: "Verified Clinics", value: "500+" },
              { icon: Users, label: "Happy Patients", value: "10K+" },
              { icon: Award, label: "Top Rated", value: "4.8/5" },
              { icon: CheckCircle, label: "Success Rate", value: "98%" },
            ].map((item) => (
              <div key={item.label}>
                <item.icon className="w-6 h-6 text-primary mx-auto mb-2" />
                <div className="text-xl font-bold">{item.value}</div>
                <div className="text-xs text-muted-foreground mt-0.5">{item.label}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 bg-primary">
        <div className="container mx-auto px-6 text-center">
          <div className="max-w-2xl mx-auto">
            <h2 className="text-3xl md:text-4xl font-bold text-primary-foreground mb-4">
              Start Your Perfect Smile Journey
            </h2>
            <p className="text-lg text-primary-foreground/70 mb-8">
              Thousands of patients found their dream smile through our platform
            </p>
            <Button 
              size="lg" 
              className="bg-background text-foreground hover:bg-background/90 font-semibold px-8 rounded-xl shadow-lg"
              onClick={() => navigate('/clinic-listing')}
            >
              Get Started
              <ArrowRight className="h-4 w-4 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
