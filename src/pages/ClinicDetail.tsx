import { useParams, Link, useSearchParams } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import { Star, MapPin, Phone, Mail, Clock, Users, Award, Calendar, Heart, ChevronRight } from "lucide-react";
import { useEffect, useState } from "react";
import { getClinicById } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel";
import { ContactClinicForm } from "@/components/forms/ContactClinicForm";

const mapClinic = (db: any) => {
  const images = (db?.clinic_images || [])
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((i: any) => i.image_url);

  const treatments = (db?.clinic_treatments || []).map((ct: any) => {
    const starting = ct?.starting_price_euro ?? ct?.price_from ?? ct?.price ?? null;
    const priceText = starting ? `€${starting}` : (
      ct?.price_from && ct?.price_to ? `${ct.price_from} - ${ct.price_to} ${ct.currency || ''}`.trim()
        : ct?.price_from ? `${ct.price_from} ${ct.currency || ''}`.trim()
        : ct?.price_to ? `${ct.price_to} ${ct.currency || ''}`.trim() : ""
    );
    return {
      name: ct?.treatments?.name || "",
      price: priceText,
      duration: ct?.duration_minutes ? `${ct.duration_minutes} min` : "",
    };
  });

  const doctors = (db?.doctors || []).map((d: any) => ({
    name: d.name, specialty: d.specialization || d.title || "", experience: d.experience_years || 0,
  }));

  const specialties = Array.from(
    new Set((db?.clinic_treatments || []).map((ct: any) => ct?.treatments?.treatment_categories?.name).filter(Boolean))
  );

  return {
    id: db.id, name: db.name, location: db.address || "",
    city: db?.cities?.name || "", country: db?.cities?.countries?.name || "",
    rating: db.rating ?? 4.8, reviewCount: db.review_count ?? 0,
    images: images.length ? images : ["/placeholder.svg"],
    specialties, description: db.description || "",
    experience: db.experience_years || 0, patientCount: db.patient_count || 0,
    isVerified: !!db.is_verified, phone: db.phone || "", email: db.email || "",
    workingHours: "", doctors, treatments,
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
        setClinic(data ? mapClinic(data) : null);
      } catch {
        toast({ title: "Error", description: "Failed to load clinic data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  useHeadMeta({
    title: clinic ? `${clinic.name} | Dentaloria` : "Clinic Details | Dentaloria",
    description: clinic ? `${clinic.name} - ${clinic.description?.substring(0, 160) || 'Professional dental clinic.'}` : "Dental clinic details.",
    ogTitle: clinic ? `${clinic.name} | Dentaloria` : "Clinic Details | Dentaloria",
    ogDescription: clinic ? clinic.description?.substring(0, 160) : "Dental clinic details."
  });

  if (loading) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-muted-foreground text-sm">Loading clinic...</div>
      </div>
    </div>
  );

  if (!clinic) return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <h1 className="text-xl font-bold mb-3">Clinic not found</h1>
          <Link to="/"><Button>Back to Home</Button></Link>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-background pb-24">
      <Navbar />
      
      {/* Breadcrumb */}
      <div className="container mx-auto px-6 py-5">
        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/clinic-listing" className="hover:text-primary transition-colors">Clinics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium">{clinic.name}</span>
        </div>
      </div>

      <section className="container mx-auto px-6 pb-12">
        <div className="grid lg:grid-cols-3 gap-8 items-start">
          <div className="lg:col-span-2 space-y-8">
            {/* Gallery */}
            <Carousel opts={{ loop: true }} className="w-full">
              <CarouselContent>
                {clinic.images.map((src: string, idx: number) => (
                  <CarouselItem key={idx}>
                    <div className="aspect-video overflow-hidden rounded-xl">
                      <img src={src} alt={`${clinic.name} ${idx + 1}`} className="w-full h-full object-cover" />
                    </div>
                  </CarouselItem>
                ))}
              </CarouselContent>
              <CarouselPrevious className="left-3 bg-foreground/60 text-background border-0 hover:bg-foreground/80" />
              <CarouselNext className="right-3 bg-foreground/60 text-background border-0 hover:bg-foreground/80" />
            </Carousel>

            {/* Info */}
            <div className="space-y-6">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h1 className="text-2xl md:text-3xl font-bold">{clinic.name}</h1>
                    {clinic.isVerified && (
                      <Badge className="bg-[hsl(var(--medical-green))] text-primary-foreground border-0">
                        <Award className="w-3 h-3 mr-1" /> Verified
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                    <MapPin className="w-4 h-4" />
                    {clinic.location}, {clinic.city}, {clinic.country}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="shrink-0">
                  <Heart className="w-5 h-5" />
                </Button>
              </div>

              {/* Rating */}
              <div className="flex items-center gap-3">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star key={i} className={`w-4 h-4 ${i < Math.floor(clinic.rating) ? 'fill-[hsl(var(--trust-gold))] text-[hsl(var(--trust-gold))]' : 'text-border'}`} />
                  ))}
                </div>
                <span className="text-lg font-bold">{clinic.rating}</span>
                <span className="text-sm text-muted-foreground">({clinic.reviewCount} reviews)</span>
              </div>

              <p className="text-muted-foreground leading-relaxed text-sm">{clinic.description}</p>

              {/* Specialties */}
              {clinic.specialties.length > 0 && (
                <div>
                  <h3 className="text-sm font-semibold mb-2">Specialties</h3>
                  <div className="flex flex-wrap gap-1.5">
                    {clinic.specialties.map((s: string, i: number) => (
                      <Badge key={i} variant="secondary" className="text-xs">{s}</Badge>
                    ))}
                  </div>
                </div>
              )}

              {/* Stats */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <Clock className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-semibold text-sm">{clinic.experience} Years</div>
                    <div className="text-xs text-muted-foreground">Experience</div>
                  </div>
                </div>
                <div className="flex items-center gap-3 p-4 bg-muted/50 rounded-xl">
                  <Users className="w-6 h-6 text-primary" />
                  <div>
                    <div className="font-semibold text-sm">{clinic.patientCount}+</div>
                    <div className="text-xs text-muted-foreground">Happy Patients</div>
                  </div>
                </div>
              </div>

              {/* Contact Info */}
              <Card className="border-border/50">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Information</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {clinic.phone && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Phone className="w-4 h-4 text-primary" />
                      <span>{clinic.phone}</span>
                    </div>
                  )}
                  {clinic.email && (
                    <div className="flex items-center gap-2.5 text-sm">
                      <Mail className="w-4 h-4 text-primary" />
                      <span>{clinic.email}</span>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Treatments */}
            {clinic.treatments.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Treatment Prices</h2>
                <div className="rounded-xl border border-border/50 divide-y divide-border/50">
                  {clinic.treatments.map((treatment: any, index: number) => (
                    <div key={index} className="flex items-center justify-between p-4">
                      <div>
                        <div className="font-medium text-sm">{treatment.name}</div>
                        {treatment.duration && (
                          <div className="text-xs text-muted-foreground mt-0.5">{treatment.duration}</div>
                        )}
                      </div>
                      <div className="text-right">
                        <div className="text-xs text-muted-foreground">Starting</div>
                        <div className="text-lg font-bold text-primary">{treatment.price || "Contact"}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}

            {/* Doctors */}
            {clinic.doctors.length > 0 && (
              <section>
                <h2 className="text-xl font-bold mb-4">Our Doctors</h2>
                <div className="grid md:grid-cols-3 gap-4">
                  {clinic.doctors.map((doctor: any, index: number) => (
                    <Card key={index} className="border-border/50">
                      <CardContent className="p-5 text-center">
                        <div className="w-16 h-16 bg-primary/8 rounded-full flex items-center justify-center mx-auto mb-3">
                          <Users className="w-8 h-8 text-primary" />
                        </div>
                        <h3 className="font-semibold text-sm mb-1">{doctor.name}</h3>
                        <p className="text-xs text-muted-foreground mb-1">{doctor.specialty}</p>
                        <p className="text-xs text-muted-foreground">{doctor.experience} years experience</p>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </section>
            )}
          </div>

          {/* Sticky Contact */}
          <div className="hidden lg:block">
            <div className="sticky top-24">
              <Card className="border-border/50 shadow-[var(--shadow-card)]">
                <CardHeader className="pb-3">
                  <CardTitle className="text-base">Contact Clinic</CardTitle>
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

      {/* Mobile CTA */}
      <Dialog open={open} onOpenChange={setOpen}>
        <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 lg:hidden">
          <div className="container mx-auto px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-muted-foreground">Ready to book?</span>
            <Button onClick={() => setOpen(true)} size="sm" className="bg-primary hover:bg-primary/90">
              <Calendar className="w-4 h-4 mr-1.5" />
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
