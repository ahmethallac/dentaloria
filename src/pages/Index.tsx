import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ClinicCard } from "@/components/ui/clinic-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Star, Users, Award, CheckCircle, MapPin, Search, Stethoscope, Zap, UserCheck, Smile, Crown, Activity, ArrowRight, Play } from "lucide-react";

// Mock data for clinics
const featuredClinics = [
  {
    id: "1",
    name: "Smile Center Istanbul",
    location: "Levent",
    city: "Istanbul",
    country: "Turkey",
    rating: 4.9,
    reviewCount: 1247,
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
    specialties: ["Implant", "Orthodontics", "Cosmetic Dentistry"],
    priceRange: "$$$",
    experience: 15,
    patientCount: 5000,
    isVerified: true
  },
  {
    id: "2", 
    name: "Dental Plus Antalya",
    location: "Lara",
    city: "Antalya", 
    country: "Turkey",
    rating: 4.8,
    reviewCount: 892,
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
    specialties: ["Veneers", "Whitening", "Implant"],
    priceRange: "$$",
    experience: 12,
    patientCount: 3500,
    isVerified: true
  },
  {
    id: "3",
    name: "Elite Dental Ankara",
    location: "Çankaya",
    city: "Ankara",
    country: "Turkey",
    rating: 4.6,
    reviewCount: 523,
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop",
    specialties: ["Orthodontics", "Pediatric Dentistry", "Surgery"],
    priceRange: "$$",
    experience: 10,
    patientCount: 2800,
    isVerified: true
  }
];

// Treatment and location data
const TREATMENTS = [
  "Full Mouth All-on-4",
  "Full Mouth All-on-6", 
  "Hollywood Smile",
  "Zirconium Crowns",
  "Porcelain Crowns",
  "Lamina Coatings",
  "E-max Skins",
  "Implant",
  "Root Canal",
  "Open Sinus Lift",
  "Closed Sinus Lift",
  "Bone Graft"
];

const COUNTRIES = ["Turkey", "USA", "UK"];

const HOMEPAGE_TREATMENTS = [
  { name: "All-on-6", icon: Smile, description: "Complete denture solution" },
  { name: "All-on-4", icon: UserCheck, description: "Affordable denture option" },
  { name: "Hollywood Smile", icon: Star, description: "Perfect smile makeover" },
  { name: "Implants", icon: Activity, description: "Permanent tooth solution" },
  { name: "Crowns", icon: Crown, description: "Tooth crowns" },
  { name: "Root Canal", icon: Stethoscope, description: "Root canal treatment" }
];

const POPULAR_CITIES = [
  {
    name: "Istanbul",
    image: "https://images.unsplash.com/photo-1541432901042-2d8bd64b4a9b?w=800&q=80",
    description: "Turkey's largest city"
  },
  {
    name: "Antalya", 
    image: "https://images.unsplash.com/photo-1580058572462-c8dd4ea51de4?w=800&q=80",
    description: "Pearl of the Mediterranean"
  },
  {
    name: "Izmir",
    image: "https://images.unsplash.com/photo-1594736797933-d0501ba2fe65?w=800&q=80", 
    description: "Shining star of the Aegean"
  }
];

const Index = () => {
  const navigate = useNavigate();
  const [selectedTreatment, setSelectedTreatment] = useState("");
  const [selectedCountry, setSelectedCountry] = useState("");

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (selectedTreatment) params.set('treatment', selectedTreatment);
    if (selectedCountry) params.set('country', selectedCountry);
    navigate(`/clinic-listing?${params.toString()}`);
  };

  const handleCityClick = (cityName: string) => {
    navigate(`/clinic-listing?city=${cityName}`);
  };

  const handleTreatmentClick = (treatmentName: string) => {
    navigate(`/clinic-listing?treatment=${treatmentName}`);
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Hero Section with Video Background */}
      <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 w-full h-full">
          <video
            autoPlay
            muted
            loop
            playsInline
            className="w-full h-full object-cover"
          >
            <source src="https://assets.mixkit.co/videos/preview/mixkit-dentist-working-on-a-patient-32808-large.mp4" type="video/mp4" />
          </video>
          <div className="absolute inset-0 bg-gradient-to-br from-black/60 via-black/40 to-black/60"></div>
        </div>
        
        {/* Hero Content */}
        <div className="relative z-10 container mx-auto px-4 text-center">
          <div className="max-w-4xl mx-auto">
            <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 animate-fade-in">
              Find the Best
              <span className="block bg-gradient-to-r from-blue-400 to-blue-600 bg-clip-text text-transparent">
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
                    {TREATMENTS.map((treatment) => (
                      <SelectItem key={treatment} value={treatment}>
                        {treatment}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                
                <Select value={selectedCountry} onValueChange={setSelectedCountry}>
                  <SelectTrigger className="h-12">
                    <SelectValue placeholder="Select country" />
                  </SelectTrigger>
                  <SelectContent>
                    {COUNTRIES.map((country) => (
                      <SelectItem key={country} value={country}>
                        {country}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Button 
                  onClick={handleSearch}
                  className="h-12 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                >
                  <Search className="h-5 w-5 mr-2" />
                  Search Clinics
                </Button>
                
                <Button 
                  variant="outline" 
                  className="h-12 border-primary/30 hover:bg-primary/5 font-semibold rounded-xl"
                  onClick={() => navigate('/ai-xray-analysis')}
                >
                  <Zap className="h-5 w-5 mr-2" />
                  AI X-ray Analysis
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
          
          {/* Horizontal scrolling clinic cards */}
          <div className="relative">
            <div className="absolute left-0 top-0 w-8 h-full bg-gradient-to-r from-background to-transparent z-10 pointer-events-none"></div>
            <div className="absolute right-0 top-0 w-8 h-full bg-gradient-to-l from-background to-transparent z-10 pointer-events-none"></div>
            
            <div className="flex gap-6 overflow-x-auto scrollbar-hide snap-x snap-mandatory pb-4">
              {featuredClinics.map((clinic, index) => (
                <div 
                  key={clinic.id} 
                  className="flex-none w-80 md:w-96 snap-start animate-fade-in"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ClinicCard
                    {...clinic}
                    onClick={() => console.log(`Clicked clinic ${clinic.id}`)}
                  />
                </div>
              ))}
            </div>
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
            {POPULAR_CITIES.map((city, index) => (
              <Card 
                key={city.name}
                className="group relative overflow-hidden cursor-pointer transform transition-all duration-300 hover:scale-105 hover:shadow-elegant animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleCityClick(city.name)}
              >
                <div className="relative h-64">
                  <img
                    src={city.image}
                    alt={city.name}
                    className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent"></div>
                  <div className="absolute bottom-6 left-6 text-white">
                    <h3 className="text-2xl font-bold mb-2">{city.name}</h3>
                    <p className="text-white/90">{city.description}</p>
                  </div>
                </div>
              </Card>
            ))}
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
            {HOMEPAGE_TREATMENTS.map((treatment, index) => (
              <Card 
                key={treatment.name}
                className="group cursor-pointer hover:shadow-elegant transition-all duration-300 hover:scale-105 animate-fade-in"
                style={{ animationDelay: `${index * 0.1}s` }}
                onClick={() => handleTreatmentClick(treatment.name)}
              >
                <CardContent className="p-6 text-center">
                  <div className="bg-gradient-to-br from-primary/10 to-blue-600/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4 group-hover:from-primary/20 group-hover:to-blue-600/20 transition-colors duration-300">
                    <treatment.icon className="h-8 w-8 text-primary" />
                  </div>
                  <h3 className="font-semibold mb-2">{treatment.name}</h3>
                  <p className="text-sm text-muted-foreground">{treatment.description}</p>
                </CardContent>
              </Card>
            ))}
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
            <Button 
              size="lg" 
              variant="secondary"
              className="bg-white text-primary hover:bg-white/90 font-semibold px-8 py-3"
              onClick={() => navigate('/clinic-listing')}
            >
              Get Started
              <ArrowRight className="h-5 w-5 ml-2" />
            </Button>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;