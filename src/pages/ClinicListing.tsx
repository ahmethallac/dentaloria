import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Star, CheckCircle, XCircle, MapPin, Users, ArrowUpDown, Filter, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";

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
    images: [
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png",
      "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png",
      "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png"
    ],
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
    images: [
      "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png",
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png"
    ],
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
    images: [
      "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png"
    ],
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
    images: [
      "/lovable-uploads/4ffdb0f9-b2c0-4e60-9169-f1512aaeef5b.png",
      "/lovable-uploads/8e8bbef7-0d15-4132-8e92-9ecafe42543e.png"
    ],
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
    images: [
      "/lovable-uploads/34e1d1a2-cfa4-44f4-bb32-889286bde89a.png",
      "/lovable-uploads/589c94a5-9387-4e65-962f-cb011bfc5bfa.png"
    ],
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
      <div className="relative bg-gradient-primary py-20 px-4 overflow-hidden">
        <div className="absolute inset-0 bg-gradient-mesh opacity-50"></div>
        <div className="relative max-w-7xl mx-auto text-center text-white">
          <h1 className="text-5xl font-bold mb-6 animate-fade-in">
            Dünya Çapında En İyi Dental Klinikler
          </h1>
          <p className="text-xl opacity-90 max-w-2xl mx-auto animate-slide-up">
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
                  <div className="space-y-2">
                    <button
                      onClick={() => setSelectedTreatment("all")}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                        selectedTreatment === "all" 
                          ? "bg-gradient-primary text-white shadow-glow" 
                          : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                      }`}
                    >
                      Tümü
                    </button>
                    {TREATMENTS.slice(0, showAllTreatments ? TREATMENTS.length : 7).map((treatment) => (
                      <button
                        key={treatment}
                        onClick={() => setSelectedTreatment(treatment)}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                          selectedTreatment === treatment 
                            ? "bg-gradient-primary text-white shadow-glow" 
                            : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                        }`}
                      >
                        {treatment}
                      </button>
                    ))}
                    {TREATMENTS.length > 7 && (
                      <button
                        onClick={() => setShowAllTreatments(!showAllTreatments)}
                        className="w-full text-left px-4 py-3 rounded-xl text-sm bg-gradient-secondary text-white hover:opacity-90 transition-all duration-300"
                      >
                        {showAllTreatments ? "Daha Az Göster" : "Tümünü Göster"}
                      </button>
                    )}
                  </div>
                </div>
                
                {/* Countries Filter */}
                <div>
                  <h4 className="text-sm font-semibold mb-4 text-foreground/80">Ülkeler</h4>
                  <div className="space-y-2">
                    <button
                      onClick={() => {
                        setSelectedCountry("all");
                        setSelectedCity("all");
                      }}
                      className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                        selectedCountry === "all" 
                          ? "bg-gradient-primary text-white shadow-glow" 
                          : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                      }`}
                    >
                      Tümü
                    </button>
                    {Object.keys(LOCATIONS).map((country) => (
                      <button
                        key={country}
                        onClick={() => {
                          setSelectedCountry(country);
                          setSelectedCity("all");
                        }}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                          selectedCountry === country 
                            ? "bg-gradient-primary text-white shadow-glow" 
                            : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                        }`}
                      >
                        {country}
                      </button>
                    ))}
                  </div>
                </div>
                
                {/* Cities Filter */}
                {selectedCountry !== "all" && LOCATIONS[selectedCountry as keyof typeof LOCATIONS] && (
                  <div>
                    <h4 className="text-sm font-semibold mb-4 text-foreground/80">Şehirler</h4>
                    <div className="space-y-2">
                      <button
                        onClick={() => setSelectedCity("all")}
                        className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                          selectedCity === "all" 
                            ? "bg-gradient-primary text-white shadow-glow" 
                            : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                        }`}
                      >
                        Tümü
                      </button>
                      {LOCATIONS[selectedCountry as keyof typeof LOCATIONS].map((city) => (
                        <button
                          key={city}
                          onClick={() => setSelectedCity(city)}
                          className={`w-full text-left px-4 py-3 rounded-xl text-sm transition-all duration-300 ${
                            selectedCity === city 
                              ? "bg-gradient-primary text-white shadow-glow" 
                              : "bg-white/50 hover:bg-white/70 text-foreground/70 hover:text-foreground"
                          }`}
                        >
                          {city}
                        </button>
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
                    <div className="flex flex-col lg:flex-row">
                      {/* Image Section */}
                      <div className="lg:w-80 h-64 lg:h-auto relative">
                        <div className="absolute inset-0 bg-gradient-card"></div>
                        <img
                          src={clinic.images[0]}
                          alt={clinic.name}
                          className="w-full h-full object-cover"
                        />
                        {clinic.featured && (
                          <Badge className="absolute top-4 left-4 bg-gradient-accent text-white border-0 px-3 py-1 rounded-full">
                            Öne Çıkan
                          </Badge>
                        )}
                        <div className="absolute bottom-4 left-4 flex items-center gap-2 text-white">
                          <MapPin className="h-4 w-4" />
                          <span className="text-sm font-medium">{clinic.city}, {clinic.country}</span>
                        </div>
                      </div>

                      {/* Content Section */}
                      <div className="flex-1 p-6">
                        <div className="flex flex-col h-full">
                          {/* Header */}
                          <div className="flex justify-between items-start mb-4">
                            <div>
                              <h3 className="text-xl font-bold text-foreground mb-2">{clinic.name}</h3>
                              <div className="flex items-center gap-4 text-sm text-foreground/70">
                                <div className="flex items-center gap-1">
                                  <Star className="h-4 w-4 fill-yellow-400 text-yellow-400" />
                                  <span className="font-semibold">{clinic.rating}</span>
                                  <span>({clinic.reviewCount} yorum)</span>
                                </div>
                                <div className="flex items-center gap-1">
                                  <Users className="h-4 w-4" />
                                  <span>{clinic.experience} yıl deneyim</span>
                                </div>
                              </div>
                            </div>
                            
                            {/* Price */}
                            <div className="text-right">
                              <div className="text-sm text-foreground/70 mb-1">Başlangıç fiyatı</div>
                              <div className="text-2xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                                {Object.values(clinic.treatments)[0]}
                              </div>
                            </div>
                          </div>

                          {/* Services */}
                          <div className="flex gap-6 mb-6">
                            <div className="flex items-center gap-2">
                              {clinic.transferService ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <span className="text-sm text-foreground/80">Transfer Hizmeti</span>
                            </div>
                            <div className="flex items-center gap-2">
                              {clinic.accommodationService ? (
                                <CheckCircle className="h-5 w-5 text-green-500" />
                              ) : (
                                <XCircle className="h-5 w-5 text-red-500" />
                              )}
                              <span className="text-sm text-foreground/80">Konaklama Hizmeti</span>
                            </div>
                          </div>

                          {/* Treatments */}
                          <div className="flex-1 mb-6">
                            <h4 className="text-sm font-semibold text-foreground/80 mb-3">Sunulan Tedaviler</h4>
                            <div className="flex flex-wrap gap-2">
                              {Object.entries(clinic.treatments).slice(0, 3).map(([treatment, price]) => (
                                <Badge 
                                  key={treatment} 
                                  variant="secondary" 
                                  className="bg-gradient-subtle text-foreground/80 border-0 px-3 py-1 rounded-full"
                                >
                                  {treatment} - {price}
                                </Badge>
                              ))}
                              {Object.keys(clinic.treatments).length > 3 && (
                                <Badge 
                                  variant="outline" 
                                  className="border-primary/20 text-primary bg-white/50 px-3 py-1 rounded-full"
                                >
                                  +{Object.keys(clinic.treatments).length - 3} daha
                                </Badge>
                              )}
                            </div>
                          </div>

                          {/* Action Button */}
                          <Button 
                            className="bg-gradient-primary hover:opacity-90 text-white border-0 rounded-xl px-8 py-3 font-semibold shadow-glow transition-all duration-300 hover:scale-105"
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