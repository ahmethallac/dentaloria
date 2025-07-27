import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Calendar, Filter, Check, X, ChevronLeft, ChevronRight } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

// Treatment options
const TREATMENTS = [
  "All-on-4",
  "All-on-6", 
  "Dental İmplant",
  "Diş Beyazlatma",
  "Veneer",
  "Kron",
  "Kanal Tedavisi",
  "Ortodonti",
  "Hollywood Smile",
  "Diş Eti Tedavisi"
];

// Countries and cities
const LOCATIONS = {
  "Türkiye": ["Antalya", "İstanbul", "İzmir"],
  "Amerika Birleşik Devletleri": ["New York City", "Los Angeles", "Florida"],
  "İngiltere": ["London", "Manchester"]
};

// Mock clinic data with Turkish clinics and comprehensive details
const mockClinics = [
  {
    id: "1",
    name: "DentCare İstanbul",
    location: "İstanbul, Türkiye",
    country: "Türkiye",
    city: "İstanbul",
    rating: 4.8,
    reviewCount: 324,
    images: [
      "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png",
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png"
    ],
    treatments: {
      "All-on-4": { price: "3500", currency: "€" },
      "Hollywood Smile": { price: "2500", currency: "€" },
      "Dental İmplant": { price: "800", currency: "€" }
    },
    selectedTreatment: "All-on-4",
    experience: 15,
    patientCount: 2500,
    isVerified: true,
    hasTransfer: true,
    hasAccommodation: true,
    trustpilotScore: 4.8
  },
  {
    id: "2", 
    name: "Smile Center Antalya",
    location: "Antalya, Türkiye",
    country: "Türkiye",
    city: "Antalya",
    rating: 4.9,
    reviewCount: 156,
    images: [
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png",
      "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png"
    ],
    treatments: {
      "All-on-4": { price: "3200", currency: "€" },
      "All-on-6": { price: "4500", currency: "€" },
      "Veneer": { price: "250", currency: "€" }
    },
    selectedTreatment: "All-on-4",
    experience: 12,
    patientCount: 1800,
    isVerified: true,
    hasTransfer: true,
    hasAccommodation: false,
    trustpilotScore: 4.9
  },
  {
    id: "3",
    name: "İzmir Dental Center",
    location: "İzmir, Türkiye",
    country: "Türkiye", 
    city: "İzmir",
    rating: 4.7,
    reviewCount: 89,
    images: [
      "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png"
    ],
    treatments: {
      "Hollywood Smile": { price: "2800", currency: "€" },
      "Diş Beyazlatma": { price: "400", currency: "€" },
      "Veneer": { price: "300", currency: "€" }
    },
    selectedTreatment: "Hollywood Smile",
    experience: 8,
    patientCount: 1200,
    isVerified: false,
    hasTransfer: false,
    hasAccommodation: true,
    trustpilotScore: 4.6
  },
  {
    id: "4",
    name: "Manhattan Dental Clinic",
    location: "New York City, Amerika Birleşik Devletleri",
    country: "Amerika Birleşik Devletleri",
    city: "New York City",
    rating: 4.6,
    reviewCount: 234,
    images: [
      "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png"
    ],
    treatments: {
      "All-on-4": { price: "8500", currency: "$" },
      "Dental İmplant": { price: "2500", currency: "$" },
      "Ortodonti": { price: "5000", currency: "$" }
    },
    selectedTreatment: "All-on-4",
    experience: 20,
    patientCount: 3500,
    isVerified: true,
    hasTransfer: false,
    hasAccommodation: false,
    trustpilotScore: 4.5
  },
  {
    id: "5",
    name: "London Smile Studio",
    location: "London, İngiltere",
    country: "İngiltere",
    city: "London",
    rating: 4.8,
    reviewCount: 145,
    images: [
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png"
    ],
    treatments: {
      "Hollywood Smile": { price: "3500", currency: "£" },
      "Veneer": { price: "400", currency: "£" },
      "Diş Beyazlatma": { price: "500", currency: "£" }
    },
    selectedTreatment: "Hollywood Smile",
    experience: 18,
    patientCount: 2200,
    isVerified: true,
    hasTransfer: false,
    hasAccommodation: false,
    trustpilotScore: 4.7
  }
];

export default function ClinicListing() {
  const [searchParams] = useSearchParams();
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "");
  const [filteredClinics, setFilteredClinics] = useState(mockClinics);
  const [sortBy, setSortBy] = useState("rating");

  useEffect(() => {
    let filtered = mockClinics;
    
    if (selectedTreatment) {
      filtered = filtered.filter(clinic => 
        Object.keys(clinic.treatments).some(treatment => 
          treatment.toLowerCase().includes(selectedTreatment.toLowerCase())
        )
      );
    }
    
    if (selectedCountry) {
      filtered = filtered.filter(clinic => clinic.country === selectedCountry);
    }
    
    if (selectedCity) {
      filtered = filtered.filter(clinic => clinic.city === selectedCity);
    }

    // Sort the filtered clinics
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "price":
          const priceA = parseInt(a.treatments[a.selectedTreatment]?.price || "0");
          const priceB = parseInt(b.treatments[b.selectedTreatment]?.price || "0");
          return priceA - priceB;
        case "rating":
          return b.trustpilotScore - a.trustpilotScore;
        case "experience":
          return b.experience - a.experience;
        default:
          return 0;
      }
    });
    
    setFilteredClinics(filtered);
  }, [selectedTreatment, selectedCountry, selectedCity, sortBy]);

  const clearFilters = () => {
    setSelectedTreatment("");
    setSelectedCountry("");
    setSelectedCity("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-medical-light to-background">
      <Navbar />
      
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Filters Sidebar */}
          <div className="lg:w-1/4">
            <Card className="sticky top-8 shadow-card">
              <CardContent className="p-6">
                <div className="flex items-center justify-between mb-6">
                  <h3 className="text-lg font-semibold flex items-center gap-2">
                    <Filter className="h-5 w-5 text-primary" />
                    Filters
                  </h3>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={clearFilters}
                    className="text-muted-foreground hover:text-primary"
                  >
                    Clear
                  </Button>
                </div>
                
                <div className="space-y-6">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Treatment</label>
                    <Select value={selectedTreatment} onValueChange={setSelectedTreatment}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select treatment" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {TREATMENTS.map((treatment) => (
                          <SelectItem key={treatment} value={treatment}>
                            {treatment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">Country</label>
                    <Select value={selectedCountry} onValueChange={(value) => {
                      setSelectedCountry(value);
                      setSelectedCity(""); // Reset city when country changes
                    }}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select country" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {Object.keys(LOCATIONS).map((country) => (
                          <SelectItem key={country} value={country}>
                            {country}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <label className="text-sm font-medium mb-2 block">City</label>
                    <Select 
                      value={selectedCity} 
                      onValueChange={setSelectedCity}
                      disabled={!selectedCountry}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select city" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="">All</SelectItem>
                        {selectedCountry && LOCATIONS[selectedCountry as keyof typeof LOCATIONS]?.map((city) => (
                          <SelectItem key={city} value={city}>
                            {city}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
          
          {/* Results */}
          <div className="lg:w-3/4">
            <div className="mb-6 flex justify-between items-center">
              <div>
                <h1 className="text-3xl font-bold mb-2">Klinikler</h1>
                <p className="text-muted-foreground">
                  {filteredClinics.length} klinik bulundu
                </p>
              </div>
              <Select value={sortBy} onValueChange={setSortBy}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Sırala" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="rating">Puana Göre</SelectItem>
                  <SelectItem value="price">Fiyata Göre</SelectItem>
                  <SelectItem value="experience">Deneyime Göre</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-6">
              {filteredClinics.map((clinic) => (
                <Card key={clinic.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 shadow-card">
                  <div className="flex flex-col md:flex-row h-64">
                    {/* Image Gallery Section */}
                    <div className="md:w-1/3 relative group">
                      <div className="relative w-full h-full overflow-hidden">
                        <img
                          src={clinic.images[0]}
                          alt={clinic.name}
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        {clinic.images.length > 1 && (
                          <div className="absolute inset-x-0 bottom-3 flex justify-center space-x-1">
                            {clinic.images.map((_, index) => (
                              <div
                                key={index}
                                className={`w-2 h-2 rounded-full ${
                                  index === 0 ? 'bg-white' : 'bg-white/50'
                                }`}
                              />
                            ))}
                          </div>
                        )}
                      </div>
                      {clinic.isVerified && (
                        <Badge className="absolute top-3 left-3 bg-trust-indicator text-white">
                          ✓ Doğrulanmış
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="md:w-2/3 p-6 flex flex-col justify-between">
                      <div>
                        <div className="flex justify-between items-start mb-4">
                          <div className="flex-1">
                            <h3 className="text-xl font-semibold mb-2">{clinic.name}</h3>
                            <div className="flex items-center text-muted-foreground mb-3">
                              <MapPin className="h-4 w-4 mr-1" />
                              {clinic.location}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground mb-3">
                              <div className="flex items-center">
                                <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                                {clinic.trustpilotScore} ({clinic.reviewCount} yorum)
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {clinic.experience} yıl deneyim
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-2xl font-bold text-primary mb-1">
                              {clinic.treatments[clinic.selectedTreatment]?.currency}
                              {clinic.treatments[clinic.selectedTreatment]?.price}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {clinic.selectedTreatment}
                            </div>
                          </div>
                        </div>
                        
                        {/* Services */}
                        <div className="flex items-center gap-4 mb-4">
                          <div className="flex items-center gap-2">
                            {clinic.hasTransfer ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">Transfer</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {clinic.hasAccommodation ? (
                              <Check className="h-4 w-4 text-green-600" />
                            ) : (
                              <X className="h-4 w-4 text-red-500" />
                            )}
                            <span className="text-sm">Konaklama</span>
                          </div>
                        </div>
                      </div>
                      
                      <div className="flex gap-3">
                        <Button variant="outline" className="flex-1">
                          İletişim
                        </Button>
                        <Button className="flex-1">
                          Kliniği Gör
                        </Button>
                      </div>
                    </CardContent>
                  </div>
                </Card>
              ))}
            </div>
            
            {filteredClinics.length === 0 && (
              <Card className="p-12 text-center">
                <h3 className="text-xl font-semibold mb-2">No clinics found</h3>
                <p className="text-muted-foreground mb-4">
                  No clinics match your selected criteria. Please adjust your filters.
                </p>
                <Button onClick={clearFilters}>
                  Clear Filters
                </Button>
              </Card>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}