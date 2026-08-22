import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { withLocalePrefix } from "@/lib/localePath";
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
import { HOMEPAGE_SHOWCASE_TREATMENTS, getTreatmentImage } from "@/lib/treatmentMeta";

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

// Treatment and location data

// Image + translation-key pairing; the description text itself lives in
// home.json under popularCities.<key> so it's translated per locale.
const POPULAR_CITIES_META: Record<string, { image: string; key: string }> = {
  "Istanbul": { image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80", key: "istanbul" },
  "Antalya": { image: "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png", key: "antalya" },
  "Izmir": { image: "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png", key: "izmir" },
};

// Why Dentaloria — core value props of the comparison platform itself.
// Title/description text lives in home.json under whyDentaloria.<key>.
const WHY_DENTALORIA = [
  { icon: Grid3X3, key: "compare" },
  { icon: ShieldCheck, key: "verified" },
  { icon: Tag, key: "pricing" },
  { icon: Send, key: "application" },
];

const getInitials = (name: string) =>
  name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const Index = () => {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("home");
  const testimonials = t("testimonials.list", { returnObjects: true }) as {
    name: string;
    location: string;
    quote: string;
  }[];
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
    navigate(withLocalePrefix(`/clinic-listing?${params.toString()}`, lang));
  };
  const handleCityClick = (cityId: string, countryId: string) => {
    navigate(withLocalePrefix(`/clinic-listing?city=${cityId}&country=${countryId}`, lang));
  };
  const handleTreatmentClick = (treatmentId: string) => {
    navigate(withLocalePrefix(`/clinic-listing?treatment=${treatmentId}`, lang));
  };

  useHeadMeta({
    title: t("meta.title"),
    description: t("meta.description"),
    ogTitle: t("meta.title"),
    ogDescription: t("meta.description"),
    twitterTitle: t("meta.title"),
    twitterDescription: t("meta.description"),
  });
  return <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section */}
      <HeroSection treatments={treatments} countries={countries} />


      {/* Admin-curated Featured Clinics (Homepage Showcase) */}
      <FeaturedClinicsSection />

      {/* Popular Clinics */}
      <section className="py-16 bg-gradient-to-br from-medical-light/50 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("popularClinics.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("popularClinics.subtitle")}
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
                <p className="text-muted-foreground">{t("popularClinics.empty")}</p>
              </CardContent>
            </Card>
          )}
        </div>

      </section>

      {/* Popular Cities */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("popularCities.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("popularCities.subtitle")}
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
                    <p className="text-white/90">{t(`popularCities.${city.key}`)}</p>
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
            <h2 className="text-3xl font-bold mb-4">{t("howItWorks.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("howItWorks.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8 max-w-4xl mx-auto">
            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <Search className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("howItWorks.step1Title")}</h3>
              <p className="text-muted-foreground">{t("howItWorks.step1Desc")}</p>
            </div>

            <div className="text-center group relative">
              <ArrowRight className="hidden md:block absolute -left-8 top-8 h-6 w-6 text-muted-foreground" />
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <UserCheck className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("howItWorks.step2Title")}</h3>
              <p className="text-muted-foreground">{t("howItWorks.step2Desc")}</p>
              <ArrowRight className="hidden md:block absolute -right-8 top-8 h-6 w-6 text-muted-foreground" />
            </div>

            <div className="text-center group">
              <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                <CheckCircle className="h-8 w-8" />
              </div>
              <h3 className="text-xl font-semibold mb-2">{t("howItWorks.step3Title")}</h3>
              <p className="text-muted-foreground">{t("howItWorks.step3Desc")}</p>
            </div>
          </div>
        </div>
      </section>

      {/* Treatments Section */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("treatmentOptions.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("treatmentOptions.subtitle")}
            </p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
            {treatments.filter((treatment) => HOMEPAGE_SHOWCASE_TREATMENTS.includes(treatment.name)).map((treatment, index) => (
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
                  <p className="text-sm text-muted-foreground">{treatment.description || t("treatmentOptions.defaultDescription")}</p>
                </CardContent>
              </Card>))}
          </div>
        </div>
      </section>

      {/* Why Dentaloria */}
      <section className="py-16">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">{t("whyDentaloria.badge")}</Badge>
            <h2 className="text-3xl font-bold mb-4">{t("whyDentaloria.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("whyDentaloria.subtitle")}
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
            {WHY_DENTALORIA.map((item, index) => (
              <div
                key={item.key}
                className="text-center group animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="bg-gradient-to-br from-primary to-blue-600 text-white rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:scale-110 transition-transform duration-300">
                  <item.icon className="h-8 w-8" />
                </div>
                <h3 className="text-lg font-semibold mb-2">{t(`whyDentaloria.${item.key}.title`)}</h3>
                <p className="text-muted-foreground text-sm">{t(`whyDentaloria.${item.key}.description`)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-16 bg-gradient-to-br from-medical-light/30 to-background">
        <div className="container mx-auto px-4">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold mb-4">{t("testimonials.title")}</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              {t("testimonials.subtitle")}
            </p>
          </div>

          <div className="relative overflow-hidden">
            <div className="pointer-events-none absolute inset-y-0 left-0 w-16 md:w-32 bg-gradient-to-r from-medical-light/30 to-transparent z-10" />
            <div className="pointer-events-none absolute inset-y-0 right-0 w-16 md:w-32 bg-gradient-to-l from-medical-light/30 to-transparent z-10" />

            <div className="flex w-max gap-6 animate-marquee hover:[animation-play-state:paused]">
              {[...testimonials, ...testimonials].map((testimonial, i) => (
                <Card
                  key={`${testimonial.name}-${i}`}
                  className="w-80 shrink-0 border-primary/10 bg-gradient-to-br from-white to-primary/5 shadow-card hover:shadow-elegant transition-shadow duration-300"
                >
                  <CardContent className="p-6 flex flex-col h-full">
                    <div className="flex gap-1 mb-4">
                      {Array.from({ length: 5 }).map((_, idx) => (
                        <Star key={idx} className="h-4 w-4 fill-amber-400 text-amber-400" />
                      ))}
                    </div>
                    <p className="text-muted-foreground mb-6 flex-1">"{testimonial.quote}"</p>
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-blue-600 text-white flex items-center justify-center text-sm font-semibold shrink-0">
                        {getInitials(testimonial.name)}
                      </div>
                      <div>
                        <div className="font-semibold text-sm">{testimonial.name}</div>
                        <div className="text-xs text-muted-foreground">{testimonial.location}</div>
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
              {t("cta.title")}
            </h2>
            <p className="text-xl mb-8 text-white/90">
              {t("cta.subtitle")}
            </p>
            <Button size="lg" variant="secondary" className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3" onClick={() => navigate(withLocalePrefix('/clinic-listing', lang))}>
              {t("cta.getStarted")}
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>;
};
export default Index;