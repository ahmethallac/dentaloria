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
import { LANGUAGES } from "@/lib/clinicMeta";
import { HomeHero } from "@/components/home/HomeHero";
import { StatsBar } from "@/components/home/StatsBar";
import { ExampleOffers } from "@/components/home/ExampleOffers";
import { StartJourneyCta } from "@/components/home/StartJourneyCta";
import { TrendingSearches } from "@/components/home/TrendingSearches";
import { PopularClinicsSection } from "@/components/home/PopularClinicsSection";
import { PopularDestinations } from "@/components/home/PopularDestinations";
import { HowItWorksSection } from "@/components/home/HowItWorksSection";
import { GetOffersSection } from "@/components/home/GetOffersSection";
import { PopularTreatmentsSection } from "@/components/home/PopularTreatmentsSection";
import { WhyChooseSection } from "@/components/home/WhyChooseSection";
import { TestimonialsSection } from "@/components/home/TestimonialsSection";

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
  "Bodrum": { image: "https://images.unsplash.com/photo-1596394723269-b2cbca4e6313?w=800&q=80", key: "bodrum" },
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
  const [selectedLanguage, setSelectedLanguage] = useState("");
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
    if (selectedLanguage) params.set('language', selectedLanguage);
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
  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <HomeHero
        treatments={treatments}
        countries={countries}
        selectedTreatment={selectedTreatment}
        onTreatmentChange={setSelectedTreatment}
        selectedCountry={selectedCountry}
        onCountryChange={setSelectedCountry}
        languages={LANGUAGES.map((l) => ({ id: l.code, name: `${l.flag} ${l.name}` }))}
        selectedLanguage={selectedLanguage}
        onLanguageChange={setSelectedLanguage}
        onSearch={handleSearch}
      />
      <StatsBar tone="dark" />

      <TrendingSearches />

      {/* Admin-curated paid placement. Not part of the Figma reference, kept
          because it is a monetised feature; renders null when uncurated. */}
      <FeaturedClinicsSection />

      <PopularClinicsSection clinics={featuredClinics} loading={loading} />

      <PopularDestinations
        cities={popularCities.map((c) => ({
          id: c.id,
          name: c.name,
          image: c.image,
          key: c.key,
          countryId: c.country_id,
        }))}
        onSelect={(cityId, countryId) => handleCityClick(cityId, countryId ?? "")}
      />

      <HowItWorksSection />

      <GetOffersSection />

      <ExampleOffers />

      <PopularTreatmentsSection treatments={treatments} onSelect={handleTreatmentClick} />

      <WhyChooseSection />

      <TestimonialsSection />

      <StartJourneyCta />

      <StatsBar tone="light" />

      <Footer />
    </div>
  );
};

export default Index;
