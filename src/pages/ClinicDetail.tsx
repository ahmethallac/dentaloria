import { useParams, Link, useSearchParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
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
import { getClinicById } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ContactClinicForm } from "@/components/forms/ContactClinicForm";


// Map Supabase clinic to the view model this page expects
const mapClinic = (db: any) => {
  const images = (db?.clinic_images || [])
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((i: any) => i.image_url);

  const treatments = (db?.clinic_treatments || []).map((ct: any) => {
    const starting = ct?.starting_price_euro ?? ct?.price_from ?? ct?.price ?? null;
    const priceText = starting ? `€${starting}` : (
      ct?.price_from && ct?.price_to
        ? `${ct.price_from} - ${ct.price_to} ${ct.currency || ''}`.trim()
        : ct?.price_from
        ? `${ct.price_from} ${ct.currency || ''}`.trim()
        : ct?.price_to
        ? `${ct.price_to} ${ct.currency || ''}`.trim()
        : ""
    );
    return {
      name: ct?.treatments?.name || "",
      price: priceText,
      duration: ct?.duration_minutes ? `${ct.duration_minutes} min` : "",
    };
  });

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
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  
  const [clinic, setClinic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);

  const initialTreatment = searchParams.get('treatment') || "";

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
        console.error("Failed to load clinic", e);
        toast({ title: "Error", description: "Failed to load clinic data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div>Loading...</div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Clinic not found</h1>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }


  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-4 py-6">
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <span>/</span>
          <span>Clinics</span>
          <span>/</span>
          <span className="text-foreground">{clinic.name}</span>
        </div>
      </div>

      {/* Hero + Content Layout */}
      <section className="container mx-auto px-4 pb-12">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          {/* Left: Gallery + Info */}
          <div className="lg:col-span-2 space-y-8">
            {/* Image Carousel */}
            <div className="relative">
              <Carousel opts={{ loop: true }} className="w-full">
                <CarouselContent>
                  {clinic.images.map((src: string, idx: number) => (
                    <CarouselItem key={idx}>
                      <div className="aspect-video overflow-hidden rounded-2xl">
                        <img src={src} alt={`${clinic.name} image ${idx + 1}`} className="w-full h-full object-cover" />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-2 top-1/2 -translate-y-1/2 bg-black/60 text-white border-0 hover:bg-black/80" />
                <CarouselNext className="right-2 top-1/2 -translate-y-1/2 bg-black/60 text-white border-0 hover:bg-black/80" />
              </Carousel>
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
                        Verified
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
                <span className="text-muted-foreground">({clinic.reviewCount} reviews)</span>
              </div>

              {/* Description */}
              <p className="text-muted-foreground leading-relaxed">{clinic.description}</p>

              {/* Specialties */}
              <div>
                <h3 className="font-semibold mb-3">Specialties</h3>
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
                    <div className="font-semibold">{clinic.experience} Years</div>
                    <div className="text-sm text-muted-foreground">Experience</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted rounded-lg">
                  <Users className="w-8 h-8 text-primary" />
                  <div>
                    <div className="font-semibold">{clinic.patientCount}+</div>
                    <div className="text-sm text-muted-foreground">Happy Patients</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <Card>
                <CardHeader>
                  <CardTitle>Contact Information</CardTitle>
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

            {/* Treatment Prices */}
            <section>
              <h2 className="text-3xl font-bold mb-6">Treatment Prices</h2>
              <div className="rounded-2xl border border-border bg-card divide-y">
                {clinic.treatments.map((treatment, index) => (
                  <div key={index} className="flex items-center justify-between p-4">
                    <div>
                      <div className="font-semibold">{treatment.name}</div>
                      {treatment.duration && (
                        <div className="text-xs text-muted-foreground mt-1">Duration: {treatment.duration}</div>
                      )}
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-muted-foreground">Starting</div>
                      <div className="text-xl font-bold text-primary">{treatment.price || "Contact for pricing"}</div>
                    </div>
                  </div>
                ))}
              </div>
            </section>

            {/* Doctors */}
            <section className="bg-muted/30 rounded-2xl p-6">
              <h2 className="text-3xl font-bold mb-6">Our Doctors</h2>
              <div className="grid md:grid-cols-3 gap-6">
                {clinic.doctors.map((doctor, index) => (
                  <Card key={index}>
                    <CardContent className="p-6 text-center">
                      <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Users className="w-10 h-10 text-primary" />
                      </div>
                      <h3 className="font-semibold text-lg mb-2">{doctor.name}</h3>
                      <p className="text-muted-foreground mb-2">{doctor.specialty}</p>
                      <p className="text-sm text-muted-foreground">{doctor.experience} years experience</p>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </section>
          </div>

          {/* Right: Sticky Contact Form (Desktop) */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Card className="shadow-card">
                <CardHeader>
                  <CardTitle>Contact Clinic</CardTitle>
                </CardHeader>
                <CardContent>
                  <ContactClinicForm clinicId={id!} initialTreatment={initialTreatment} />
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />

      {/* Mobile Apply Bar + Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-strong lg:hidden">
          <div className="container mx-auto px-4 py-3 flex items-center justify-between">
            <div className="text-sm text-muted-foreground">Have a question? Apply now.</div>
            <Button onClick={() => setOpen(true)} className="bg-gradient-primary">
              Contact Clinic
            </Button>
          </div>
        </div>

        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Contact Clinic</DialogTitle>
          </DialogHeader>
          <ContactClinicForm clinicId={id!} initialTreatment={initialTreatment} onSuccess={() => setOpen(false)} />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ClinicDetail;