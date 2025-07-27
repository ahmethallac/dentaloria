import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, XCircle, MapPin, Users, ArrowUpDown, Filter, Search, Circle, CheckCircle2, ChevronLeft, ChevronRight } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

// Import clinic images
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

const TREATMENTS = [
  "All-on-4 Dental Implants",
  "All-on-6 Dental Implants", 
  "Single Dental Implant",
  "Dental Crown",
  "Dental Veneer",
  "Root Canal Treatment",
  "Teeth Whitening",
  "Orthodontic Treatment",
  "Gum Disease Treatment",
  "Oral Surgery"
];

const LOCATIONS = {
  "Türkiye": ["Antalya", "İstanbul", "İzmir"],
  "Amerika Birleşik Devletleri": ["New York City", "Los Angeles", "Florida"],
  "İngiltere": ["London", "Manchester"]
};

const mockClinics = [
  {
    id: 1,
    name: "Smile Center Turkey",
    images: [clinic1, clinic2, clinic3, clinic4, clinic5],
    country: "Türkiye",
    city: "Antalya",
    rating: 4.8,
    reviewCount: 245,
    treatments: {
      "All-on-4 Dental Implants": "€3,500",
      "Single Dental Implant": "€450",
      "Dental Crown": "€250"
    },
    experience: 15,
    transferService: true,
    accommodationService: true,
    featured: true
  },
  {
    id: 2,
    name: "Elite Dental Clinic",
    images: [clinic6, clinic7, clinic8, clinic9],
    country: "Türkiye",
    city: "İstanbul",
    rating: 4.9,
    reviewCount: 189,
    treatments: {
      "All-on-4 Dental Implants": "€4,200",
      "Dental Veneer": "€180",
      "Teeth Whitening": "€120"
    },
    experience: 12,
    transferService: true,
    accommodationService: false,
    featured: false
  },
  {
    id: 3,
    name: "Perfect Smile NY",
    images: [clinic10, clinic1, clinic3, clinic5],
    country: "Amerika Birleşik Devletleri",
    city: "New York City",
    rating: 4.7,
    reviewCount: 312,
    treatments: {
      "All-on-6 Dental Implants": "$8,500",
      "Orthodontic Treatment": "$4,200",
      "Root Canal Treatment": "$650"
    },
    experience: 20,
    transferService: false,
    accommodationService: false,
    featured: true
  },
  {
    id: 4,
    name: "London Dental Excellence",
    images: [clinic2, clinic4, clinic6, clinic8, clinic10],
    country: "İngiltere",
    city: "London",
    rating: 4.6,
    reviewCount: 156,
    treatments: {
      "All-on-4 Dental Implants": "£5,200",
      "Dental Crown": "£480",
      "Gum Disease Treatment": "£280"
    },
    experience: 18,
    transferService: false,
    accommodationService: true,
    featured: false
  },
  {
    id: 5,
    name: "Dental Paradise Antalya",
    images: [clinic7, clinic9, clinic1, clinic3],
    country: "Türkiye",
    city: "Antalya",
    rating: 4.9,
    reviewCount: 298,
    treatments: {
      "All-on-4 Dental Implants": "€3,200",
      "Single Dental Implant": "€420",
      "Oral Surgery": "€180"
    },
    experience: 22,
    transferService: true,
    accommodationService: true,
    featured: true
  }
];

// Image Carousel Component
const ImageCarousel = ({ images, alt }: { images: string[], alt: string }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const nextImage = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const prevImage = () => {
    setCurrentIndex((prev) => (prev - 1 + images.length) % images.length);
  };

  return (
    <div className="relative w-full h-full group">
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover transition-opacity duration-300"
      />
      
      {images.length > 1 && (
        <>
          {/* Navigation Buttons */}
          <button
            onClick={prevImage}
            className="absolute left-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronLeft className="h-4 w-4" />
          </button>
          <button
            onClick={nextImage}
            className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-black/50 hover:bg-black/70 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300"
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          
          {/* Dots Indicator */}
          <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 flex gap-1">
            {images.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentIndex(index)}
                className={`w-2 h-2 rounded-full transition-colors duration-300 ${
                  index === currentIndex ? 'bg-white' : 'bg-white/50'
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
  const [selectedTreatment, setSelectedTreatment] = useState(searchParams.get('treatment') || "all");
  const [selectedCountry, setSelectedCountry] = useState(searchParams.get('country') || "all");
  const [selectedCity, setSelectedCity] = useState(searchParams.get('city') || "all");
  const [filteredClinics, setFilteredClinics] = useState(mockClinics);
  const [sortBy, setSortBy] = useState("rating");
  const [showAllTreatments, setShowAllTreatments] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    let filtered = mockClinics;
    
    if (selectedTreatment && selectedTreatment !== "all") {
      filtered = filtered.filter(clinic => 
        Object.keys(clinic.treatments).some(treatment => 
          treatment.toLowerCase().includes(selectedTreatment.toLowerCase())
        )
      );
    }
    
    if (selectedCountry && selectedCountry !== "all") {
      filtered = filtered.filter(clinic => clinic.country === selectedCountry);
    }
    
    if (selectedCity && selectedCity !== "all") {
      filtered = filtered.filter(clinic => clinic.city === selectedCity);
    }

    if (searchQuery.trim()) {
      filtered = filtered.filter(clinic => 
        clinic.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        Object.keys(clinic.treatments).some(treatment => 
          treatment.toLowerCase().includes(searchQuery.toLowerCase())
        )
      );
    }

    // Sort clinics
    filtered.sort((a, b) => {
      switch (sortBy) {
        case "rating":
          return b.rating - a.rating;
        case "price":
          const aPrice = parseFloat(Object.values(a.treatments)[0].replace(/[€$£,]/g, ''));
          const bPrice = parseFloat(Object.values(b.treatments)[0].replace(/[€$£,]/g, ''));
          return aPrice - bPrice;
        case "experience":
          return b.experience - a.experience;
        default:
          return 0;
      }
    });

    setFilteredClinics(filtered);
  }, [selectedTreatment, selectedCountry, selectedCity, sortBy, searchQuery]);

  const clearFilters = () => {
    setSelectedTreatment("all");
    setSelectedCountry("all");
    setSelectedCity("all");
    setSearchQuery("");
  };

  return (
    <div className="min-h-screen bg-gradient-mesh">
      <Navbar />
      
      {/* Hero Section */}
      <div className="relative bg-gradient-to-r from-primary/20 to-accent/20 py-16 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-white/30"></div>
        <div className="relative max-w-7xl mx-auto text-center">
          <h1 className="text-4xl font-bold mb-4 animate-fade-in text-foreground">
            Dünya Çapında En İyi Dental Klinikler
          </h1>
          <p className="text-lg opacity-80 max-w-2xl mx-auto animate-slide-up text-foreground/80">
            Uzman doktorlar, modern teknoloji ve güvenilir hizmet ile mükemmel gülümsemenizi bulun
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
                  Filtreler
                </h3>
              </div>

              {/* Search */}
              <div className="mb-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Klinik veya tedavi ara..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 bg-white/70 border-white/30 rounded-xl"
                  />
                </div>
              </div>

              <div className="space-y-6">
                {/* Treatments Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground/80">Tedaviler</h4>
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
                        Tümü
                      </span>
                    </div>
                    {TREATMENTS.slice(0, showAllTreatments ? TREATMENTS.length : 7).map((treatment) => (
                      <div
                        key={treatment}
                        onClick={() => setSelectedTreatment(treatment)}
                        className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                      >
                        <div className="relative">
                          {selectedTreatment === treatment ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className={`text-sm ${selectedTreatment === treatment ? "text-primary font-medium" : "text-foreground/70"}`}>
                          {treatment}
                        </span>
                      </div>
                    ))}
                    {TREATMENTS.length > 7 && (
                      <button
                        onClick={() => setShowAllTreatments(!showAllTreatments)}
                        className="text-primary text-sm hover:underline ml-8"
                      >
                        {showAllTreatments ? "Daha Az Göster" : "Tümünü Göster"}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Countries Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground/80">Ülkeler</h4>
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
                        Tümü
                      </span>
                    </div>
                    {Object.keys(LOCATIONS).map((country) => (
                      <div
                        key={country}
                        onClick={() => {
                          setSelectedCountry(country);
                          setSelectedCity("all");
                        }}
                        className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                      >
                        <div className="relative">
                          {selectedCountry === country ? (
                            <CheckCircle2 className="h-5 w-5 text-primary" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                        </div>
                        <span className={`text-sm ${selectedCountry === country ? "text-primary font-medium" : "text-foreground/70"}`}>
                          {country}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Cities Filter */}
                {selectedCountry !== "all" && LOCATIONS[selectedCountry as keyof typeof LOCATIONS] && (
                  <div>
                    <h4 className="text-sm font-semibold mb-4 text-foreground/80">Şehirler</h4>
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
                          Tümü
                        </span>
                      </div>
                      {LOCATIONS[selectedCountry as keyof typeof LOCATIONS].map((city) => (
                        <div
                          key={city}
                          onClick={() => setSelectedCity(city)}
                          className="flex items-center gap-3 cursor-pointer hover:bg-white/30 p-2 rounded-lg transition-colors"
                        >
                          <div className="relative">
                            {selectedCity === city ? (
                              <CheckCircle2 className="h-5 w-5 text-primary" />
                            ) : (
                              <Circle className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                          <span className={`text-sm ${selectedCity === city ? "text-primary font-medium" : "text-foreground/70"}`}>
                            {city}
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
                  Filtreleri Temizle
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
                  {filteredClinics.length} Klinik Bulundu
                </h2>
                <p className="text-foreground/70">En iyi dental klinikleri keşfedin</p>
              </div>
              
              <div className="flex items-center gap-2">
                <ArrowUpDown className="h-4 w-4 text-foreground/70" />
                <Select value={sortBy} onValueChange={setSortBy}>
                  <SelectTrigger className="w-48 bg-white/80 border-white/30 rounded-xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-white/95 backdrop-blur-glass border-white/30">
                    <SelectItem value="rating">Puana Göre</SelectItem>
                    <SelectItem value="price">Fiyata Göre</SelectItem>
                    <SelectItem value="experience">Deneyime Göre</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Clinic Cards */}
            <div className="space-y-6">
              {filteredClinics.map((clinic, index) => (
                <Card 
                  key={clinic.id} 
                  className={`overflow-hidden bg-white/80 backdrop-blur-glass border-white/30 rounded-2xl shadow-card hover:shadow-elegant transition-all duration-500 hover:scale-[1.02] animate-fade-in ${
                    clinic.featured ? 'ring-2 ring-primary/20 shadow-colored' : ''
                  }`}
                  style={{ animationDelay: `${index * 100}ms` }}
                >
                  <CardContent className="p-0">
                    <div className="flex flex-col lg:flex-row h-auto lg:h-48">
                      {/* Image Section */}
                      <div className="lg:w-64 h-48 lg:h-full relative">
                        <ImageCarousel images={clinic.images} alt={clinic.name} />
                        {clinic.featured && (
                          <Badge className="absolute top-3 left-3 bg-primary text-white border-0 px-2 py-1 rounded-full text-xs z-10">
                            Öne Çıkan
                          </Badge>
                        )}
                        <div className="absolute bottom-3 left-3 flex items-center gap-1 text-white z-10">
                          <MapPin className="h-3 w-3" />
                          <span className="text-xs font-medium">{clinic.city}, {clinic.country}</span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-4">
                        <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="flex justify-between items-start mb-3">
                            <div>
                              <h3 className="text-lg font-bold text-foreground mb-1">{clinic.name}</h3>
                              <div className="flex items-center gap-3 text-xs text-foreground/70">
                                <div className="flex items-center gap-1">
                                  <Star className="h-3 w-3 fill-yellow-400 text-yellow-400" />
                                  <span className="font-semibold">{clinic.rating}</span>
                                  <span>({clinic.reviewCount})</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-3 w-3" />
                                  <span>{clinic.experience} yıl</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right">
                              <div className="text-xs text-foreground/70 mb-1">Başlangıç</div>
                              <div className="text-lg font-bold text-primary">
                                {Object.values(clinic.treatments)[0]}
                              </div>
                            </div>
                          </div>

                          {/* Services */}
                          <div className="flex gap-4 mb-3">
                            <div className="flex items-center gap-1">
                              {clinic.transferService ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-foreground/80">Transfer</span>
                            </div>
                            <div className="flex items-center gap-1">
                              {clinic.accommodationService ? (
                                <CheckCircle className="h-4 w-4 text-green-500" />
                              ) : (
                                <XCircle className="h-4 w-4 text-red-500" />
                              )}
                              <span className="text-xs text-foreground/80">Konaklama</span>
                            </div>
                          </div>

                          {/* Treatments */}
                          <div className="flex-1 mb-3">
                            <div className="flex flex-wrap gap-1">
                              {Object.entries(clinic.treatments).slice(0, 2).map(([treatment, price]) => (
                                <Badge 
                                  key={treatment} 
                                  variant="secondary" 
                                  className="bg-muted text-foreground/80 border-0 px-2 py-1 rounded-full text-xs"
                                >
                                  {treatment} - {price}
                                </Badge>
                              ))}
                              {Object.keys(clinic.treatments).length > 2 && (
                                <Badge 
                                  variant="outline" 
                                  className="border-primary/20 text-primary bg-white/50 px-2 py-1 rounded-full text-xs"
                                >
                                  +{Object.keys(clinic.treatments).length - 2}
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <Button 
                            size="sm"
                            className="bg-primary hover:bg-primary/90 text-white border-0 rounded-lg px-4 py-2 font-medium transition-all duration-300 self-start"
                          >
                            Kliniği İncele
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>

            {/* No Results */}
            {filteredClinics.length === 0 && (
              <div className="text-center py-16">
                <div className="bg-white/80 backdrop-blur-glass rounded-2xl p-8 shadow-card border border-white/20 max-w-md mx-auto">
                  <div className="text-6xl mb-4">🔍</div>
                  <h3 className="text-xl font-semibold text-foreground mb-4">Klinik Bulunamadı</h3>
                  <p className="text-foreground/70 mb-6">
                    Seçilen kriterlere uygun klinik bulunamadı. Filtrelerinizi değiştirmeyi deneyin.
                  </p>
                  <Button 
                    onClick={clearFilters}
                    className="bg-gradient-primary hover:opacity-90 text-white border-0 rounded-xl px-6 py-2"
                  >
                    Filtreleri Temizle
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