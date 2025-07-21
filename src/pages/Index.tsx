import { HeroSection } from "@/components/ui/hero-section";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { ClinicCard } from "@/components/ui/clinic-card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { 
  Star, 
  MapPin, 
  Clock, 
  Users, 
  Award, 
  Heart, 
  TrendingUp,
  ArrowRight,
  CheckCircle
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
  }
];

const Index = () => {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <HeroSection />
      
      {/* Featured Clinics Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <Badge variant="outline" className="mb-4 border-primary/30 text-primary">
              Öne Çıkan Klinikler
            </Badge>
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              En <span className="bg-gradient-primary bg-clip-text text-transparent">Popüler</span> Klinikler
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Binlerce hasta tarafından tercih edilen, en yüksek puanlı diş kliniklerini keşfedin.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 md:grid-cols-2 gap-8 mb-12">
            {featuredClinics.map((clinic, index) => (
              <div 
                key={clinic.id} 
                className="animate-slide-up"
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <ClinicCard {...clinic} />
              </div>
            ))}
          </div>

          <div className="text-center">
            <Button size="lg" variant="outline" className="border-primary/30 hover:bg-primary/5">
              Tüm Klinikleri Gör
              <ArrowRight className="ml-2 h-5 w-5" />
            </Button>
          </div>
        </div>
      </section>

      {/* Statistics Section */}
      <section className="py-20">
        <div className="container mx-auto px-4">
          <div className="grid md:grid-cols-4 gap-8">
            {[
              { icon: Users, number: "50,000+", label: "Mutlu Hasta", color: "text-primary" },
              { icon: Award, number: "500+", label: "Doğrulanmış Klinik", color: "text-medical-green" },
              { icon: Star, number: "4.8", label: "Ortalama Puan", color: "text-trust-gold" },
              { icon: MapPin, number: "25+", label: "Şehir", color: "text-primary-light" }
            ].map((stat, index) => (
              <Card key={index} className="text-center p-8 border-border/50 hover:shadow-soft transition-all duration-300 hover:-translate-y-1 animate-scale-in" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-0 space-y-4">
                  <div className={`w-16 h-16 rounded-full bg-gradient-primary/10 flex items-center justify-center mx-auto`}>
                    <stat.icon className={`h-8 w-8 ${stat.color}`} />
                  </div>
                  <div className="space-y-2">
                    <div className={`text-4xl font-bold ${stat.color}`}>{stat.number}</div>
                    <div className="text-muted-foreground font-medium">{stat.label}</div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-20 bg-gradient-subtle">
        <div className="container mx-auto px-4">
          <div className="text-center mb-16 animate-fade-in">
            <h2 className="text-4xl md:text-5xl font-bold mb-6">
              Neden <span className="bg-gradient-primary bg-clip-text text-transparent">Dentaloria</span>?
            </h2>
            <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
              Diş tedaviniz için doğru seçimi yapmanızı sağlayan özelliklilerimiz.
            </p>
          </div>

          <div className="grid lg:grid-cols-3 gap-8">
            {[
              {
                icon: CheckCircle,
                title: "Doğrulanmış Klinikler",
                description: "Tüm kliniklerimiz titizlikle incelenir ve doğrulanır. Güvenilir tedavi garantisi.",
                color: "text-medical-green"
              },
              {
                icon: TrendingUp,
                title: "Şeffaf Fiyatlandırma", 
                description: "Tüm tedavi fiyatları açık ve net. Gizli maliyet yok, şeffaf karşılaştırma.",
                color: "text-primary"
              },
              {
                icon: Heart,
                title: "Hasta Memnuniyeti",
                description: "Gerçek hasta yorumları ve deneyimleri. Trustpilot entegrasyonu ile doğrulanmış.",
                color: "text-trust-gold"
              }
            ].map((feature, index) => (
              <Card key={index} className="p-8 text-center border-border/50 hover:shadow-medium transition-all duration-300 hover:-translate-y-2 animate-slide-up" style={{ animationDelay: `${index * 0.1}s` }}>
                <CardContent className="p-0 space-y-6">
                  <div className="w-20 h-20 rounded-full bg-gradient-primary/10 flex items-center justify-center mx-auto">
                    <feature.icon className={`h-10 w-10 ${feature.color}`} />
                  </div>
                  <div className="space-y-3">
                    <h3 className="text-2xl font-bold">{feature.title}</h3>
                    <p className="text-muted-foreground leading-relaxed">{feature.description}</p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default Index;
