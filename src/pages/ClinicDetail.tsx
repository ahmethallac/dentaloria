import { useParams, Link, useSearchParams } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  Star,
  MapPin,
  Users,
  Award,
  Calendar,
  Shield,
  CheckCircle,
  Clock,
  Stethoscope,
  ChevronRight,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { getClinicById } from "@/lib/services";
import { useToast } from "@/hooks/use-toast";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { ContactClinicForm } from "@/components/forms/ContactClinicForm";

/* ───────── mapper ───────── */
const mapClinic = (db: any) => {
  const images = (db?.clinic_images || [])
    .sort((a: any, b: any) => (b.is_primary ? 1 : 0) - (a.is_primary ? 1 : 0))
    .map((i: any) => i.image_url);

  const treatments = (db?.clinic_treatments || []).map((ct: any) => {
    const starting = ct?.starting_price_euro ?? ct?.price_from ?? ct?.price ?? null;
    const priceText = starting
      ? `€${starting}`
      : ct?.price_from && ct?.price_to
      ? `${ct.price_from} - ${ct.price_to} ${ct.currency || ""}`.trim()
      : ct?.price_from
      ? `${ct.price_from} ${ct.currency || ""}`.trim()
      : ct?.price_to
      ? `${ct.price_to} ${ct.currency || ""}`.trim()
      : "";
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
    image: d.profile_image_url || d.image_url || null,
  }));

  const specialties = Array.from(
    new Set(
      (db?.clinic_treatments || [])
        .map((ct: any) => ct?.treatments?.treatment_categories?.name)
        .filter(Boolean)
    )
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
    doctors,
    treatments,
  };
};

/* ───────── tabs config ───────── */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "treatments", label: "Treatments" },
  { id: "doctors", label: "Doctors" },
  { id: "contact", label: "Contact" },
] as const;

/* ───────── component ───────── */
const ClinicDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();

  const [clinic, setClinic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const galleryRef = useRef<HTMLDivElement>(null);
  const [tabSticky, setTabSticky] = useState(false);

  const initialTreatment = searchParams.get("treatment") || "";

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);

  /* fetch clinic */
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

  /* scroll‑spy */
  useEffect(() => {
    const handleScroll = () => {
      // sticky detection
      if (tabBarRef.current) {
        const rect = tabBarRef.current.getBoundingClientRect();
        setTabSticky(rect.top <= 64);
      }
      // active section
      const offsets = TABS.map((t) => {
        const el = sectionRefs.current[t.id];
        if (!el) return { id: t.id, top: Infinity };
        return { id: t.id, top: el.getBoundingClientRect().top };
      });
      const active = offsets
        .filter((o) => o.top <= 200)
        .sort((a, b) => b.top - a.top)[0];
      if (active) setActiveTab(active.id);
    };
    window.addEventListener("scroll", handleScroll, { passive: true });
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const scrollTo = useCallback((sectionId: string) => {
    const el = sectionRefs.current[sectionId];
    if (el) el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  useHeadMeta({
    title: clinic ? `${clinic.name} | Dentaloria` : "Clinic Details | Dentaloria",
    description: clinic
      ? `${clinic.name} - ${clinic.description?.substring(0, 160) || "Professional dental clinic."}`
      : "View detailed information about dental clinics.",
    ogTitle: clinic ? `${clinic.name} | Dentaloria` : "Clinic Details | Dentaloria",
    ogDescription: clinic
      ? `${clinic.name} - ${clinic.description?.substring(0, 160) || "Professional dental clinic."}`
      : "View detailed information about dental clinics.",
  });

  /* loading / not‑found states */
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading clinic...</span>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Clinic not found</h1>
          <Link to="/">
            <Button>Back to Home</Button>
          </Link>
        </div>
      </div>
    );
  }

  /* ── gallery drag-scroll ── */
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;
    let isDown = false;
    let startX = 0;
    let scrollLeft = 0;

    const onDown = (e: MouseEvent) => {
      isDown = true;
      el.classList.add("cursor-grabbing");
      startX = e.pageX - el.offsetLeft;
      scrollLeft = el.scrollLeft;
    };
    const onUp = () => { isDown = false; el.classList.remove("cursor-grabbing"); };
    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      el.scrollLeft = scrollLeft - (e.pageX - el.offsetLeft - startX);
    };
    const onKey = (e: KeyboardEvent) => {
      if (!el.matches(":hover") && document.activeElement !== el) return;
      if (e.key === "ArrowRight") el.scrollBy({ left: 320, behavior: "smooth" });
      if (e.key === "ArrowLeft") el.scrollBy({ left: -320, behavior: "smooth" });
    };

    el.addEventListener("mousedown", onDown);
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove);
    window.addEventListener("keydown", onKey);
    return () => {
      el.removeEventListener("mousedown", onDown);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove);
      window.removeEventListener("keydown", onKey);
    };
  }, [clinic]);

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {/* ── Breadcrumb ── */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to="/" className="hover:text-primary transition-colors">Home</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to="/clinic-listing" className="hover:text-primary transition-colors">Clinics</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{clinic.name}</span>
        </div>
      </div>

      {/* ── Header Strip ── */}
      <header className="container mx-auto px-4 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight">{clinic.name}</h1>
              {clinic.isVerified && (
                <Badge className="bg-emerald-500/10 text-emerald-600 border-emerald-500/20 font-medium text-xs">
                  <Award className="w-3 h-3 mr-1" />
                  Verified
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {[clinic.location, clinic.city, clinic.country].filter(Boolean).join(", ")}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <div className="flex">
                  {[...Array(5)].map((_, i) => (
                    <Star
                      key={i}
                      className={`w-3.5 h-3.5 ${
                        i < Math.floor(clinic.rating)
                          ? "fill-amber-400 text-amber-400"
                          : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <span className="font-semibold">{clinic.rating}</span>
                <span className="text-muted-foreground">({clinic.reviewCount})</span>
              </span>
            </div>
            {clinic.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-2">
                {clinic.specialties.map((s: string, i: number) => (
                  <Badge key={i} variant="secondary" className="text-xs font-normal">
                    {s}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </header>

      {/* ── Sticky Tab Navigation ── */}
      <div
        ref={tabBarRef}
        className={`sticky top-16 z-30 border-b transition-colors ${
          tabSticky ? "bg-background/95 backdrop-blur-md shadow-sm" : "bg-background"
        }`}
      >
        <nav className="container mx-auto overflow-x-hidden px-4" aria-label="Clinic detail sections">
          <div className="flex min-w-max gap-1 overflow-x-auto scrollbar-hide pr-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollTo(tab.id)}
                className={`shrink-0 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ── Main Content ── */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10 items-start">
          {/* LEFT COLUMN */}
          <div className="space-y-12 min-w-0">
            {/* Overview section */}
            <div ref={(el) => (sectionRefs.current["overview"] = el)} className="scroll-mt-32 space-y-8">
              {/* ── Horizontal Image Gallery ── */}
              <div
                ref={galleryRef}
                tabIndex={0}
                className="flex gap-2 overflow-x-auto scroll-smooth snap-x snap-mandatory cursor-grab scrollbar-hide rounded-2xl focus:outline-none"
                style={{ WebkitOverflowScrolling: "touch" }}
              >
                {clinic.images.map((src: string, idx: number) => (
                  <div
                    key={idx}
                    className="shrink-0 snap-start w-[85%] sm:w-[60%] lg:w-[48%] xl:w-[45%]"
                  >
                    <div className="aspect-video overflow-hidden rounded-xl bg-muted/30">
                      <img
                        src={src}
                        alt={`${clinic.name} ${idx + 1}`}
                        draggable={false}
                        className="h-full w-full object-cover select-none pointer-events-none"
                      />
                    </div>
                  </div>
                ))}
              </div>

              {/* ── About ── */}
              {clinic.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">About the Clinic</h2>
                  <p className="text-muted-foreground leading-relaxed text-[15px]">
                    {clinic.description}
                  </p>
                </div>
              )}

              {/* ── Quick Stats ── */}
              <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                {clinic.experience > 0 && (
                  <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Clock className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold leading-tight">{clinic.experience}+ </div>
                      <div className="text-xs text-muted-foreground">Years Experience</div>
                    </div>
                  </div>
                )}
                {clinic.patientCount > 0 && (
                  <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Users className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold leading-tight">{clinic.patientCount.toLocaleString()}+</div>
                      <div className="text-xs text-muted-foreground">Happy Patients</div>
                    </div>
                  </div>
                )}
                {clinic.specialties.length > 0 && (
                  <div className="glass-card rounded-xl p-4 flex items-center gap-3">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                      <Stethoscope className="w-5 h-5 text-primary" />
                    </div>
                    <div>
                      <div className="text-lg font-bold leading-tight">{clinic.specialties.length}</div>
                      <div className="text-xs text-muted-foreground">Specialties</div>
                    </div>
                  </div>
                )}
              </div>

              {/* ── Why Choose ── */}
              <div className="rounded-xl border border-border/50 p-6 bg-muted/20">
                <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground">
                  Why Choose This Clinic
                </h3>
                <div className="grid sm:grid-cols-2 gap-3">
                  {[
                    { icon: Shield, text: "Licensed & Accredited" },
                    { icon: CheckCircle, text: "Free Online Consultation" },
                    { icon: Calendar, text: "Priority Appointments" },
                    { icon: Award, text: clinic.isVerified ? "Dentaloria Verified" : "Quality Guaranteed" },
                  ].map(({ icon: Icon, text }, i) => (
                    <div key={i} className="flex items-center gap-2.5">
                      <Icon className="w-4 h-4 text-primary shrink-0" />
                      <span className="text-sm">{text}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* ── Treatments ── */}
            {clinic.treatments.length > 0 && (
              <div ref={(el) => (sectionRefs.current["treatments"] = el)} className="scroll-mt-32">
                <h2 className="text-xl font-bold mb-4">Treatment Prices</h2>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="text-left px-5 py-3 font-medium">Treatment</th>
                        <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">Duration</th>
                        <th className="text-right px-5 py-3 font-medium">Starting From</th>
                        <th className="px-5 py-3 w-[1%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {clinic.treatments.map((t: any, i: number) => (
                        <tr
                          key={i}
                          className="border-t border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className="font-medium text-sm">{t.name}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                            {t.duration || "—"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-primary">
                              {t.price || "Contact us"}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-primary hover:text-primary"
                              onClick={() => scrollTo("contact")}
                            >
                              Get Quote
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* ── Doctors ── */}
            {clinic.doctors.length > 0 && (
              <div ref={(el) => (sectionRefs.current["doctors"] = el)} className="scroll-mt-32">
                <h2 className="text-xl font-bold mb-4">Our Doctors</h2>
                <div className="flex gap-4 overflow-x-auto scrollbar-hide pb-2">
                  {clinic.doctors.map((doc: any, i: number) => (
                    <div
                      key={i}
                      className="glass-card rounded-xl p-5 min-w-[200px] flex flex-col items-center text-center shrink-0"
                    >
                      <div className="w-16 h-16 rounded-full bg-primary/10 flex items-center justify-center mb-3 overflow-hidden">
                        {doc.image ? (
                          <img src={doc.image} alt={doc.name} className="w-full h-full object-cover" />
                        ) : (
                          <Users className="w-7 h-7 text-primary" />
                        )}
                      </div>
                      <h3 className="font-semibold text-sm">{doc.name}</h3>
                      <p className="text-xs text-muted-foreground mt-0.5">{doc.specialty}</p>
                      {doc.experience > 0 && (
                        <p className="text-xs text-muted-foreground mt-1">
                          {doc.experience} yrs exp.
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── Contact anchor (mobile) ── */}
            <div
              ref={(el) => (sectionRefs.current["contact"] = el)}
              className="scroll-mt-32 lg:hidden"
            >
              <h2 className="text-xl font-bold mb-4">Contact Clinic</h2>
              <div className="rounded-xl border border-border/50 p-6">
                <ContactClinicForm clinicId={id!} initialTreatment={initialTreatment} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (desktop) */}
          <aside className="hidden lg:block">
            <div
              ref={(el) => (sectionRefs.current["contact"] = el)}
              className="sticky top-36 scroll-mt-32"
            >
              <div className="glass-sidebar rounded-2xl p-6 space-y-5 shadow-card">
                <div>
                  <h3 className="text-lg font-bold">Get a Free Quote</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    Fill out the form and hear back within 24 hours.
                  </p>
                </div>

                {/* Trust bullets */}
                <div className="space-y-2">
                  {[
                    "Free online consultation",
                    "Priority for appointments",
                    "Response within 24h",
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-4">
                  <ContactClinicForm
                    clinicId={id!}
                    initialTreatment={initialTreatment}
                    submitLabel="Request Free Quote"
                  />
                </div>

                {/* Accreditation */}
                {clinic.isVerified && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">Dentaloria Verified Clinic</span>
                  </div>
                )}
              </div>
            </div>
          </aside>
        </div>
      </section>

      <Footer />

      {/* ── Mobile Bottom CTA ── */}
      <div className="fixed bottom-0 left-0 right-0 z-50 bg-background/95 backdrop-blur-md border-t border-border/50 shadow-lg lg:hidden">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <div>
            <div className="text-sm font-semibold">{clinic.name}</div>
            <div className="text-xs text-muted-foreground">Get a free quote today</div>
          </div>
          <Button onClick={() => setMobileOpen(true)} className="bg-primary text-primary-foreground">
            Get Quote
          </Button>
        </div>
      </div>

      {/* Mobile Dialog */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Get a Free Quote</DialogTitle>
          </DialogHeader>
          <ContactClinicForm
            clinicId={id!}
            initialTreatment={initialTreatment}
            onSuccess={() => setMobileOpen(false)}
            submitLabel="Request Free Quote"
          />
        </DialogContent>
      </Dialog>


      {/* Bottom padding for mobile CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default ClinicDetail;
