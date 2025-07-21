import { HeroSection } from "@/components/ui/hero-section";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ClinicCard } from "@/components/ui/clinic-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Award, 
  Heart, 
  TrendingUp,
  ArrowRight,
  CheckCircle,
  Search,
  Shield,
  Zap,
  Target,
  Quote,
  Play,
  Filter
} from "lucide-react";

// Mock data for clinics
const featuredClinics = [
  {
    id: "1",
    name: "Smile Center İstanbul",
    location: "Levent",
    city: "İstanbul",
    country: "Türkiye",
    rating: 4.9,
    reviewCount: 1247,
    image: "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=400&h=300&fit=crop",
    specialties: ["İmplant", "Ortodonti", "Estetik Diş"],
    priceRange: "₺₺₺",
    experience: 15,
    patientCount: 5000,
    isVerified: true
  },
  {
    id: "2", 
    name: "Dental Plus Antalya",
    location: "Lara",
    city: "Antalya", 
    country: "Türkiye",
    rating: 4.8,
    reviewCount: 892,
    image: "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=400&h=300&fit=crop",
    specialties: ["Vener", "Beyazlatma", "İmplant"],
    priceRange: "₺₺",
    experience: 12,
    patientCount: 3500,
    isVerified: true
  },
  {
    id: "3",
    name: "Cyprus Dental Clinic",
    location: "Girne",
    city: "Girne",
    country: "Kıbrıs",
    rating: 4.7,
    reviewCount: 634,
    image: "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=400&h=300&fit=crop",
    specialties: ["All-on-4", "İmplant", "Protez"],
    priceRange: "₺₺",
    experience: 18,
    patientCount: 4200,
    isVerified: true
  },
  {
    id: "4",
    name: "Elite Dental Ankara",
    location: "Çankaya",
    city: "Ankara",
    country: "Türkiye",
    rating: 4.6,
    reviewCount: 523,
    image: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=400&h=300&fit=crop",
    specialties: ["Ortodonti", "Çocuk Diş", "Cerrahi"],
    priceRange: "₺₺",
    experience: 10,
    patientCount: 2800,
    isVerified: true
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* New Hero Section */}
      <section className="relative py-20 md:py-32 overflow-hidden">
        {/* Background Pattern */}
        <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-background to-primary-light/5"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_20%,hsl(var(--primary)/0.1),transparent_50%)]"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_80%,hsl(var(--primary-light)/0.1),transparent_50%)]"></div>
        
        <div className="container mx-auto px-4 relative">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            {/* Left Content */}
            <div className="space-y-8">
              <div className="space-y-6">
                <Badge variant="outline" className="border-primary/30 text-primary px-4 py-2">
                  🦷 Türkiye'nin #1 Diş Kliniği Platformu
                </Badge>
                
                <h1 className="text-5xl md:text-6xl lg:text-7xl font-bold leading-tight">
                  <span className="text-foreground">Perfect</span>
                  <br />
                  <span className="bg-gradient-primary bg-clip-text text-transparent">Smile</span>
                  <br />
                  <span className="text-foreground">Guaranteed</span>
                </h1>
                
                <p className="text-xl md:text-2xl text-muted-foreground leading-relaxed max-w-lg">
                  Binlerce doğrulanmış hasta yorumu ile en iyi diş kliniklerini karşılaştır, 
                  güvenle randevu al.
                </p>
              </div>

              {/* Quick Search */}
              <div className="bg-card/80 backdrop-blur-sm p-6 rounded-2xl border border-border/50 shadow-soft">
                <div className="space-y-4">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
                      <Input 
                        placeholder="Ne arıyorsunuz?"
                        className="pl-10 h-12 bg-background/70"
                      />
                    </div>
                    
                    <Select>
                      <SelectTrigger className="h-12 bg-background/70">
                        <SelectValue placeholder="📍 Konum Seçin" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="istanbul">🏙️ İstanbul</SelectItem>
                        <SelectItem value="ankara">🏛️ Ankara</SelectItem>
                        <SelectItem value="izmir">🌊 İzmir</SelectItem>
                        <SelectItem value="antalya">🏖️ Antalya</SelectItem>
                        <SelectItem value="cyprus">🏝️ Kıbrıs</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button size="lg" className="w-full h-12 bg-gradient-primary hover:opacity-90 text-lg font-semibold">
                    🔍 Mükemmel Gülüşü Bul
                  </Button>
                </div>
              </div>

              {/* Trust Indicators */}
              <div className="flex items-center gap-8">
                <div className="flex items-center gap-2">
                  <div className="flex -space-x-2">
                    {[1,2,3,4].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full bg-gradient-primary border-2 border-background flex items-center justify-center text-white text-sm font-bold">
                        {i}K
                      </div>
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">50,000+</div>
                    <div className="text-muted-foreground">Mutlu Hasta</div>
                  </div>
                </div>
                
                <div className="flex items-center gap-2">
                  <div className="flex">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} className="w-5 h-5 fill-trust-gold text-trust-gold" />
                    ))}
                  </div>
                  <div className="text-sm">
                    <div className="font-semibold">4.8/5</div>
                    <div className="text-muted-foreground">Trustpilot</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Content - Video/Image */}
            <div className="relative">
              <div className="relative aspect-square max-w-lg mx-auto">
                {/* Main Circle */}
                <div className="absolute inset-0 rounded-full bg-gradient-primary/10 animate-pulse"></div>
                <div className="absolute inset-4 rounded-full bg-gradient-primary/20"></div>
                <div className="absolute inset-8 rounded-full bg-gradient-primary/30"></div>
                
                {/* Center Content */}
                <div className="absolute inset-16 rounded-full bg-background border-4 border-primary/20 flex items-center justify-center">
                  <div className="text-center space-y-4">
                    <div className="w-16 h-16 bg-gradient-primary rounded-full flex items-center justify-center mx-auto cursor-pointer hover:scale-110 transition-transform">
                      <Play className="w-8 h-8 text-white ml-1" />
                    </div>
                    <div>
                      <div className="text-2xl font-bold">2 DK</div>
                      <div className="text-sm text-muted-foreground">Nasıl Çalışır?</div>
                    </div>
                  </div>
                </div>

                {/* Floating Elements */}
                <div className="absolute top-8 right-8 bg-card p-3 rounded-xl shadow-soft border animate-float">
                  <div className="flex items-center gap-2">
                    <Star className="w-4 h-4 fill-trust-gold text-trust-gold" />
                    <span className="text-sm font-semibold">4.9</span>
                  </div>
                </div>
                
                <div className="absolute bottom-8 left-8 bg-card p-3 rounded-xl shadow-soft border animate-float" style={{ animationDelay: '1s' }}>
                  <div className="flex items-center gap-2">
                    <Shield className="w-4 h-4 text-medical-green" />
                    <span className="text-sm font-semibold">Güvenli</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Popular Treatments */}
      <section className="py-20 bg-muted/20">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Popüler <span className="bg-gradient-primary bg-clip-text text-transparent">Tedaviler</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              En çok aranan diş tedavileri ve ortalama fiyat aralıkları
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {[
              { name: "İmplant Tedavisi", price: "₺2.500+", icon: "🦷", color: "from-blue-500 to-blue-600" },
              { name: "Diş Beyazlatma", price: "₺800+", icon: "✨", color: "from-yellow-400 to-yellow-500" },
              { name: "Ortodonti", price: "₺8.000+", icon: "🦷", color: "from-green-500 to-green-600" },
              { name: "Vener Kaplama", price: "₺1.200+", icon: "💎", color: "from-purple-500 to-purple-600" }
            ].map((treatment, index) => (
              <Card key={index} className="group hover:shadow-medium transition-all duration-300 hover:-translate-y-2 cursor-pointer border-border/50">
                <CardContent className="p-6 text-center">
                  <div className={`w-16 h-16 rounded-full bg-gradient-to-r ${treatment.color} flex items-center justify-center mx-auto mb-4 text-2xl group-hover:scale-110 transition-transform`}>
                    {treatment.icon}
                  </div>
                  <h3 className="font-semibold text-lg mb-2">{treatment.name}</h3>
                  <p className="text-2xl font-bold text-primary mb-2">{treatment.price}</p>
                  <p className="text-sm text-muted-foreground">başlayan fiyatlarla</p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Featured Clinics */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between mb-16">
            <div>
              <h2 className="text-4xl md:text-5xl font-bold mb-4">
                Öne Çıkan <span className="bg-gradient-primary bg-clip-text text-transparent">Klinikler</span>
              </h2>
              <p className="text-xl text-muted-foreground">
                En yüksek puanlı ve güvenilir diş klinikleri
              </p>
            </div>
            
            <div className="hidden md:flex gap-4">
              <Button variant="outline" size="sm">
                <Filter className="w-4 h-4 mr-2" />
                Filtrele
              </Button>
              <Button variant="outline" size="sm">
                Tümünü Gör
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </div>
          </div>

          {/* Horizontal Scrollable Clinics */}
          <div className="relative">
            <div className="flex gap-6 overflow-x-auto scrollbar-hide pb-4 snap-x snap-mandatory">
              {featuredClinics.map((clinic, index) => (
                <div 
                  key={clinic.id} 
                  className="flex-none w-80 md:w-96 snap-start animate-slide-up"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  <ClinicCard {...clinic} />
                </div>
              ))}
            </div>
            
            {/* Scroll indicators */}
            <div className="absolute top-1/2 -translate-y-1/2 left-0 w-8 h-full bg-gradient-to-r from-background to-transparent pointer-events-none"></div>
            <div className="absolute top-1/2 -translate-y-1/2 right-0 w-8 h-full bg-gradient-to-l from-background to-transparent pointer-events-none"></div>
          </div>

          <div className="text-center mt-12 md:hidden">
            <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
              Tüm Klinikleri Gör
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Testimonials */}
      <section className="py-20 bg-gradient-to-br from-primary/5 to-primary-light/5">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Hasta <span className="bg-gradient-primary bg-clip-text text-transparent">Yorumları</span>
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Binlerce memnun hastamızın gerçek deneyimleri
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                name: "Ayşe K.",
                location: "İstanbul",
                rating: 5,
                text: "İmplant tedavim harika geçti. Fiyat karşılaştırması sayesinde en uygun kliniği buldum.",
                treatment: "İmplant Tedavisi"
              },
              {
                name: "Mehmet Y.",
                location: "Ankara", 
                rating: 5,
                text: "Platform sayesinde güvenilir bir klinik buldum. Ortodonti tedavim mükemmel sonuç verdi.",
                treatment: "Ortodonti"
              },
              {
                name: "Fatma D.",
                location: "Antalya",
                rating: 5,
                text: "Diş beyazlatma için araştırma yaparken buradaki yorumlar çok yardımcı oldu.",
                treatment: "Diş Beyazlatma"
              }
            ].map((testimonial, index) => (
              <Card key={index} className="border-border/50 hover:shadow-medium transition-all duration-300">
                <CardContent className="p-6">
                  <div className="space-y-4">
                    <Quote className="w-8 h-8 text-primary/60" />
                    
                    <p className="text-muted-foreground italic leading-relaxed">
                      "{testimonial.text}"
                    </p>
                    
                    <div className="flex items-center gap-1 mb-3">
                      {[...Array(testimonial.rating)].map((_, i) => (
                        <Star key={i} className="w-4 h-4 fill-trust-gold text-trust-gold" />
                      ))}
                    </div>
                    
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-semibold">{testimonial.name}</div>
                        <div className="text-sm text-muted-foreground">{testimonial.location}</div>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        {testimonial.treatment}
                      </Badge>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="bg-gradient-primary rounded-3xl p-12 text-center text-white relative overflow-hidden">
            {/* Background Pattern */}
            <div className="absolute inset-0 bg-white/10 bg-[radial-gradient(circle_at_30%_20%,white_1px,transparent_1px)] bg-[length:20px_20px]"></div>
            
            <div className="relative space-y-8">
              <div className="space-y-4">
                <h2 className="text-4xl md:text-5xl font-bold">
                  Mükemmel Gülüşünüz İçin
                  <br />
                  Hemen Başlayın!
                </h2>
                <p className="text-xl opacity-90 max-w-2xl mx-auto">
                  Binlerce klinik arasından size en uygun olanını bulun. 
                  Ücretsiz danışmanlık ve fiyat karşılaştırması.
                </p>
              </div>

              <div className="flex flex-col md:flex-row gap-4 justify-center items-center">
                <Button size="lg" variant="secondary" className="text-primary font-semibold px-8">
                  <Search className="w-5 h-5 mr-2" />
                  Klinik Ara
                </Button>
                <Button size="lg" variant="outline" className="border-white/30 text-white hover:bg-white/10 px-8">
                  <Play className="w-5 h-5 mr-2" />
                  Nasıl Çalışır?
                </Button>
              </div>

              <div className="grid grid-cols-3 gap-8 max-w-md mx-auto pt-8">
                <div className="text-center">
                  <div className="text-3xl font-bold">500+</div>
                  <div className="text-sm opacity-80">Klinik</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">50K+</div>
                  <div className="text-sm opacity-80">Hasta</div>
                </div>
                <div className="text-center">
                  <div className="text-3xl font-bold">4.8★</div>
                  <div className="text-sm opacity-80">Puan</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
