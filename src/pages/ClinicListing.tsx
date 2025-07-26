import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { MapPin, Star, Users, Calendar, Filter } from "lucide-react";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

// Treatment options
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

// Countries and cities
const LOCATIONS = {
  "Turkey": ["Istanbul", "Antalya", "Izmir"],
  "USA": ["New York", "Los Angeles"],
  "UK": ["London", "Birmingham"]
};

// Mock clinic data
const mockClinics = [
  {
    id: "1",
    name: "DentCare Istanbul",
    location: "Istanbul, Turkey",
    country: "Turkey",
    city: "Istanbul",
    rating: 4.8,
    reviewCount: 324,
    image: "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png",
    treatments: ["Hollywood Smile", "Implant", "Zirconium Crowns"],
    priceRange: "€2,500 - €8,000",
    experience: 15,
    patientCount: 2500,
    isVerified: true
  },
  {
    id: "2", 
    name: "Smile Center Antalya",
    location: "Antalya, Turkey",
    country: "Turkey",
    city: "Antalya",
    rating: 4.9,
    reviewCount: 156,
    image: "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png",
    treatments: ["Full Mouth All-on-4", "Full Mouth All-on-6", "Hollywood Smile"],
    priceRange: "€3,000 - €12,000",
    experience: 12,
    patientCount: 1800,
    isVerified: true
  }
];

export default function ClinicListing() {
  const [searchParams] = useSearchParams();
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "");
  const [filteredClinics, setFilteredClinics] = useState(mockClinics);

  useEffect(() => {
    let filtered = mockClinics;
    
    if (selectedTreatment) {
      filtered = filtered.filter(clinic => 
        clinic.treatments.some(treatment => 
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
    
    setFilteredClinics(filtered);
  }, [selectedTreatment, selectedCountry, selectedCity]);

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
            <div className="mb-6">
              <h1 className="text-3xl font-bold mb-2">Clinics</h1>
              <p className="text-muted-foreground">
                {filteredClinics.length} clinics found
              </p>
            </div>
            
            <div className="space-y-6">
              {filteredClinics.map((clinic) => (
                <Card key={clinic.id} className="overflow-hidden hover:shadow-elegant transition-all duration-300 shadow-card">
                  <div className="flex flex-col md:flex-row">
                    <div className="md:w-1/3 relative">
                      <img
                        src={clinic.image}
                        alt={clinic.name}
                        className="w-full h-48 md:h-full object-cover"
                      />
                      {clinic.isVerified && (
                        <Badge className="absolute top-3 left-3 bg-trust-indicator text-white">
                          Verified
                        </Badge>
                      )}
                    </div>
                    
                    <CardContent className="md:w-2/3 p-6">
                      <div className="flex flex-col h-full">
                        <div className="flex justify-between items-start mb-4">
                          <div>
                            <h3 className="text-xl font-semibold mb-2">{clinic.name}</h3>
                            <div className="flex items-center text-muted-foreground mb-2">
                              <MapPin className="h-4 w-4 mr-1" />
                              {clinic.location}
                            </div>
                            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                              <div className="flex items-center">
                                <Star className="h-4 w-4 mr-1 text-yellow-500 fill-current" />
                                {clinic.rating} ({clinic.reviewCount} reviews)
                              </div>
                              <div className="flex items-center">
                                <Calendar className="h-4 w-4 mr-1" />
                                {clinic.experience} years experience
                              </div>
                              <div className="flex items-center">
                                <Users className="h-4 w-4 mr-1" />
                                {clinic.patientCount}+ patients
                              </div>
                            </div>
                          </div>
                          <Badge variant="outline" className="text-primary border-primary">
                            {clinic.priceRange}
                          </Badge>
                        </div>
                        
                        <div className="mb-4">
                          <p className="text-sm text-muted-foreground mb-2">Specialties:</p>
                          <div className="flex flex-wrap gap-2">
                            {clinic.treatments.map((treatment) => (
                              <Badge key={treatment} variant="secondary">
                                {treatment}
                              </Badge>
                            ))}
                          </div>
                        </div>
                        
                        <div className="flex gap-3 mt-auto">
                          <Button className="flex-1">
                            Contact
                          </Button>
                          <Button variant="outline" className="flex-1">
                            View Details
                          </Button>
                        </div>
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