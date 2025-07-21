import { useParams, Link } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { 
  Star, 
  MapPin, 
  Phone, 
  Mail, 
  Clock, 
  Users, 
  Award, 
  ArrowLeft,
  Calendar,
  Shield,
  CheckCircle,
  Heart
} from "lucide-react";
import { useState } from "react";

// Mock clinic data - gerçek uygulamada API'den gelecek
const getClinicData = (id: string) => {
  const clinics = {
    "1": {
      id: "1",
      name: "Smile Center İstanbul",
      location: "Levent Mahallesi, Büyükdere Caddesi No:145",
      city: "İstanbul",
      country: "Türkiye",
      rating: 4.9,
      reviewCount: 1247,
      images: [
        "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1588776814546-1ffcf47267a5?w=800&h=600&fit=crop",
        "https://images.unsplash.com/photo-1551190822-a9333d879b1f?w=800&h=600&fit=crop"
      ],
      specialties: ["İmplant Tedavisi", "Ortodonti", "Estetik Diş Hekimliği", "Diş Beyazlatma"],
      description: "İstanbul'un kalbi Levent'te yer alan Smile Center, 15 yıllık deneyimi ile en kaliteli diş tedavilerini sunmaktadır. Uzman hekimlerimiz ve son teknoloji ekipmanlarımız ile gülüşünüzü yeniden kazanın.",
      experience: 15,
      patientCount: 5000,
      isVerified: true,
      phone: "+90 (212) 123 45 67",
      email: "info@smilecenter.com",
      workingHours: "Pzt-Cmt: 09:00-18:00, Pazar: Kapalı",
      doctors: [
        { name: "Dr. Mehmet Yılmaz", specialty: "İmplant Uzmanı", experience: 15 },
        { name: "Dr. Ayşe Kaya", specialty: "Ortodonti Uzmanı", experience: 12 },
        { name: "Dr. Can Özdemir", specialty: "Estetik Diş Hekimi", experience: 10 }
      ],
      treatments: [
        { name: "İmplant Tedavisi", price: "₺2.500 - ₺4.000", duration: "1-3 seans" },
        { name: "Ortodonti (Braket)", price: "₺8.000 - ₺15.000", duration: "12-24 ay" },
        { name: "Vener Kaplama", price: "₺1.200 - ₺2.500", duration: "2-3 seans" },
        { name: "Diş Beyazlatma", price: "₺800 - ₺1.500", duration: "1 seans" }
      ],
      beforeAfterImages: [
        { before: "https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=300&h=200&fit=crop", after: "https://images.unsplash.com/photo-1609840114035-3c981b782dfe?w=300&h=200&fit=crop" }
      ]
    }
  };
  
  return clinics[id as keyof typeof clinics];
};

const ClinicDetail = () => {
  const { id } = useParams();
  const clinic = getClinicData(id || "1");
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    treatment: "",
    message: ""
  });

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Klinik bulunamadı</h1>
          <Link to="/">
            <Button>Ana Sayfaya Dön</Button>
          </Link>
        </div>
      </div>
    );
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Form submission logic burada olacak
    console.log("Form submitted:", contactForm);
    alert("Başvurunuz alındı! Klinik en kısa sürede sizinle iletişime geçecektir.");
  };

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Ana Sayfa</Link>
          <span>/</span>
          <span>Klinikler</span>
          <span>/</span>
          <span className="text-foreground">{clinic.name}</span>
        </div>
      </div>

      {/* Hero Section */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-2 gap-12 items-start">
          {/* Images */}
          <div className="space-y-4">
            <div className="aspect-video rounded-2xl overflow-hidden">
              <img 
                src={clinic.images[0]} 
                alt={clinic.name}
                className="w-full h-full object-cover"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {clinic.images.slice(1).map((image, index) => (
                <div key={index} className="aspect-video rounded-xl overflow-hidden">
                  <img 
                    src={image} 
                    alt={`${clinic.name} ${index + 2}`}
                    className="w-full h-full object-cover"
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Clinic Info */}
          <div className="space-y-6">
            <div className="flex items-start justify-between">
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <h1 className="text-4xl font-bold">{clinic.name}</h1>
                  {clinic.isVerified && (
                    <Badge className="bg-medical-green text-white">
                      <Award className="w-3 h-3 mr-1" />
                      Doğrulanmış
                    </Badge>
                  )}
                </div>
                <div className="flex items-center gap-2 text-muted-foreground mb-4">
                  <MapPin className="w-5 h-5" />
                  <span>{clinic.location}, {clinic.city}, {clinic.country}</span>
                </div>
              </div>
              <Button variant="ghost" size="icon">
                <Heart className="w-5 h-5" />
              </Button>
            </div>

            {/* Rating */}
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-5 h-5 ${i < Math.floor(clinic.rating) ? 'fill-trust-gold text-trust-gold' : 'text-gray-300'}`} />
                  ))}
                </div>
                <span className="text-2xl font-bold">{clinic.rating}</span>
              </div>
              <span className="text-muted-foreground">({clinic.reviewCount} değerlendirme)</span>
            </div>

            {/* Description */}
            <p className="text-muted-foreground leading-relaxed">{clinic.description}</p>

            {/* Specialties */}
            <div>
              <h3 className="font-semibold mb-3">Uzmanlık Alanları</h3>
              <div className="flex flex-wrap gap-2">
                {clinic.specialties.map((specialty, index) => (
                  <Badge key={index} variant="secondary">{specialty}</Badge>
                ))}
              </div>
            </div>

            {/* Quick Stats */}
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Clock className="w-8 h-8 text-primary" />
                <div>
                  <div className="font-semibold">{clinic.experience} Yıl</div>
                  <div className="text-sm text-muted-foreground">Deneyim</div>
                </div>
              </div>
              <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                <Users className="w-8 h-8 text-primary" />
                <div>
                  <div className="font-semibold">{clinic.patientCount}+</div>
                  <div className="text-sm text-muted-foreground">Mutlu Hasta</div>
                </div>
              </div>
            </div>

            {/* Contact Info */}
            <Card>
              <CardHeader>
                <CardTitle>İletişim Bilgileri</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center gap-3">
                  <Phone className="w-5 h-5 text-primary" />
                  <span>{clinic.phone}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Mail className="w-5 h-5 text-primary" />
                  <span>{clinic.email}</span>
                </div>
                <div className="flex items-center gap-3">
                  <Clock className="w-5 h-5 text-primary" />
                  <span>{clinic.workingHours}</span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>

      {/* Treatment Prices */}
      <section className="container mx-auto px-4 py-12">
        <h2 className="text-3xl font-bold mb-8">Tedavi Fiyatları</h2>
        <div className="grid md:grid-cols-2 gap-6">
          {clinic.treatments.map((treatment, index) => (
            <Card key={index}>
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-semibold text-lg">{treatment.name}</h3>
                  <Badge variant="outline">{treatment.duration}</Badge>
                </div>
                <div className="text-2xl font-bold text-primary">{treatment.price}</div>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Doctors */}
      <section className="container mx-auto px-4 py-12 bg-muted/30">
        <h2 className="text-3xl font-bold mb-8">Uzman Hekimlerimiz</h2>
        <div className="grid md:grid-cols-3 gap-6">
          {clinic.doctors.map((doctor, index) => (
            <Card key={index}>
              <CardContent className="p-6 text-center">
                <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Users className="w-10 h-10 text-primary" />
                </div>
                <h3 className="font-semibold text-lg mb-2">{doctor.name}</h3>
                <p className="text-muted-foreground mb-2">{doctor.specialty}</p>
                <p className="text-sm text-muted-foreground">{doctor.experience} yıl deneyim</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact Form */}
      <section className="container mx-auto px-4 py-12">
        <div className="max-w-2xl mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold mb-4">Randevu Talebinde Bulun</h2>
            <p className="text-muted-foreground">Bilgilerinizi bırakın, sizinle en kısa sürede iletişime geçelim.</p>
          </div>
          
          <Card>
            <CardContent className="p-8">
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid md:grid-cols-2 gap-4">
                  <div>
                    <label className="text-sm font-medium mb-2 block">Ad Soyad *</label>
                    <Input 
                      value={contactForm.name}
                      onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium mb-2 block">Telefon *</label>
                    <Input 
                      type="tel"
                      value={contactForm.phone}
                      onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                      required
                    />
                  </div>
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">E-posta</label>
                  <Input 
                    type="email"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">İlgilendiğiniz Tedavi</label>
                  <Input 
                    value={contactForm.treatment}
                    onChange={(e) => setContactForm({...contactForm, treatment: e.target.value})}
                    placeholder="Örn: İmplant tedavisi"
                  />
                </div>
                
                <div>
                  <label className="text-sm font-medium mb-2 block">Mesajınız</label>
                  <Textarea 
                    value={contactForm.message}
                    onChange={(e) => setContactForm({...contactForm, message: e.target.value})}
                    placeholder="Tedavi hakkında sorularınız varsa buraya yazabilirsiniz..."
                    rows={4}
                  />
                </div>
                
                <Button type="submit" size="lg" className="w-full bg-gradient-primary hover:opacity-90">
                  <Calendar className="w-5 h-5 mr-2" />
                  Randevu Talebinde Bulun
                </Button>
                
                <p className="text-xs text-muted-foreground text-center">
                  Başvurunuzu göndererek <a href="#" className="text-primary hover:underline">Gizlilik Politikası</a>'nı kabul etmiş olursunuz.
                </p>
              </form>
            </CardContent>
          </Card>
        </div>
      </section>

      <Footer />
    </div>
  );
};

export default ClinicDetail;