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
import { useEffect, useState } from "react";
import { getClinicById, createContactRequest } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";


// Map Supabase clinic to the view model this page expects
const mapClinic = (db: any) => {
  const images = (db?.clinic_images || [])
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((i: any) => i.image_url);

  const treatments = (db?.clinic_treatments || []).map((ct: any) => ({
    name: ct?.treatments?.name || "",
    price: ct?.price_from && ct?.price_to
      ? `${ct.price_from} - ${ct.price_to} ${ct.currency || ''}`.trim()
      : ct?.price_from
      ? `${ct.price_from} ${ct.currency || ''}`.trim()
      : ct?.price_to
      ? `${ct.price_to} ${ct.currency || ''}`.trim()
      : "",
    duration: ct?.duration_minutes ? `${ct.duration_minutes} dk` : "",
  }));

  const doctors = (db?.doctors || []).map((d: any) => ({
    name: d.name,
    specialty: d.specialization || d.title || "",
    experience: d.experience_years || 0,
  }));

  const specialties = Array.from(
    new Set((db?.clinic_treatments || [])
      .map((ct: any) => ct?.treatments?.treatment_categories?.name)
      .filter(Boolean))
  );

  return {
    id: db.id,
    name: db.name,
    location: db.address || "",
    city: db?.cities?.name || "",
    country: db?.cities?.countries?.name || "",
    rating: db.rating ?? 4.8,
    reviewCount: db.review_count ?? 0,
    images: images.length ? images : ["/placeholder.svg"],
    specialties,
    description: db.description || "",
    experience: db.experience_years || 0,
    patientCount: db.patient_count || 0,
    isVerified: !!db.is_verified,
    phone: db.phone || "",
    email: db.email || "",
    workingHours: "",
    doctors,
    treatments,
  };
};

const ClinicDetail = () => {
  const { id } = useParams();
  const { toast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [clinic, setClinic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [contactForm, setContactForm] = useState({
    name: "",
    phone: "",
    email: "",
    treatment: "",
    message: ""
  });

  useEffect(() => {
    if (!id) return;
    (async () => {
      try {
        setLoading(true);
        const data = await getClinicById(id);
        if (data) {
          setClinic(mapClinic(data));
        } else {
          setClinic(null);
        }
      } catch (e) {
        console.error("Klinik yüklenemedi", e);
        toast({ title: "Hata", description: "Klinik bilgileri yüklenemedi.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Yükleniyor...</div>
      </div>
    );
  }

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

const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!id) {
      toast({ title: "Hata", description: "Klinik bilgisi bulunamadı.", variant: "destructive" });
      return;
    }
    try {
      setSubmitting(true);
      await createContactRequest({
        clinic_id: id,
        name: contactForm.name,
        email: contactForm.email,
        phone: contactForm.phone,
        message: contactForm.message || (contactForm.treatment ? `Tedavi: ${contactForm.treatment}` : undefined),
        source: "website",
        status: "new",
      } as any);
      toast({ title: "Başvurunuz alındı", description: "Klinik en kısa sürede sizinle iletişime geçecek." });
      setContactForm({ name: "", phone: "", email: "", treatment: "", message: "" });
    } catch (err) {
      console.error(err);
      toast({ title: "Hata", description: "Başvuru gönderilemedi. Lütfen tekrar deneyin.", variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-background pb-24">
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

      <Footer />

      {/* Fixed Contact Form */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-strong">
        <div className="container mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="flex items-center gap-3">
            <div className="flex-1 grid grid-cols-2 md:grid-cols-4 gap-3">
              <Input 
                placeholder="Ad Soyad *"
                value={contactForm.name}
                onChange={(e) => setContactForm({...contactForm, name: e.target.value})}
                required
                className="bg-background/80"
              />
              <Input 
                placeholder="Telefon *"
                type="tel"
                value={contactForm.phone}
                onChange={(e) => setContactForm({...contactForm, phone: e.target.value})}
                required
                className="bg-background/80"
              />
              <Input 
                placeholder="E-posta *"
                type="email"
                value={contactForm.email}
                onChange={(e) => setContactForm({...contactForm, email: e.target.value})}
                required
                className="bg-background/80"
              />
              <Input 
                placeholder="Tedavi türü"
                value={contactForm.treatment}
                onChange={(e) => setContactForm({...contactForm, treatment: e.target.value})}
                className="bg-background/80 hidden md:block"
              />
            </div>
<Button type="submit" disabled={submitting} className="bg-gradient-primary hover:opacity-90 px-6 whitespace-nowrap">
              <Calendar className="w-4 h-4 mr-2" />
              {submitting ? "Gönderiliyor..." : "Randevu Al"}
            </Button>
          </form>
          
          {/* Mobile additional fields */}
          <div className="md:hidden mt-3 space-y-2">
            <Input 
              placeholder="Tedavi türü"
              value={contactForm.treatment}
              onChange={(e) => setContactForm({...contactForm, treatment: e.target.value})}
              className="bg-background/80"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

export default ClinicDetail;