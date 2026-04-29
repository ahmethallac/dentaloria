import { useParams, Link, useSearchParams } from "react-router-dom";
import { useHeadMeta } from "@/hooks/useHeadMeta";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Navbar } from "@/components/ui/navbar";
import { Footer } from "@/components/ui/footer";
import {
  MapPin,
  Users,
  Award,
  Shield,
  CheckCircle,
  Clock,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Languages as LanguagesIcon,
  Sparkles,
  Images as ImagesIcon,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback } from "react";
import { getClinicById, getClinicByIdPrivate } from "@/lib/services";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { getCurrentUserRole, type AppRole } from "@/lib/roleService";
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
import { ContactClinicForm, type ContactClinicSubmittedValues } from "@/components/forms/ContactClinicForm";
import PostFormRecommendationsDialog from "@/components/forms/PostFormRecommendationsDialog";
import { GoogleRating } from "@/components/ui/google-rating";
import { getLanguage, getFacility } from "@/lib/clinicMeta";

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
    name: db.display_name || db.name,
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
    languages: Array.isArray(db?.languages) ? db.languages : [],
    facilities: Array.isArray(db?.facilities) ? db.facilities : [],
    beforeAfter: ((db?.clinic_before_after_images || []) as any[])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((i) => i.image_url),
  };
};

/* ───────── tabs config ───────── */
const TABS = [
  { id: "overview", label: "Overview" },
  { id: "about", label: "About" },
  { id: "photos", label: "Photos" },
  { id: "treatments", label: "Treatments" },
  { id: "doctors", label: "Doctors" },
] as const;

/* ───────── before/after carousel + lightbox ───────── */
const BeforeAfterCarousel = ({
  images,
  sectionRef,
}: {
  images: string[];
  sectionRef: (el: HTMLDivElement | null) => void;
}) => {
  const ref = useRef<HTMLDivElement>(null);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  const scroll = (dir: -1 | 1) => {
    const el = ref.current;
    if (!el) return;
    const card = el.firstElementChild as HTMLElement | null;
    const step = card ? card.clientWidth + 12 : el.clientWidth / 3;
    el.scrollBy({ left: dir * step, behavior: "smooth" });
  };

  return (
    <div ref={sectionRef} className="scroll-mt-32">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          Before & After
        </h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => scroll(-1)}
            aria-label="Scroll left"
            className="rounded-full border border-border/60 bg-background p-1.5 hover:bg-muted"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <button
            type="button"
            onClick={() => scroll(1)}
            aria-label="Scroll right"
            className="rounded-full border border-border/60 bg-background p-1.5 hover:bg-muted"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
      <div
        ref={ref}
        className="flex gap-3 overflow-x-auto scrollbar-hide snap-x snap-mandatory"
      >
        {images.map((src, i) => (
          <button
            key={i}
            type="button"
            onClick={() => setLightboxIdx(i)}
            className="snap-start shrink-0 basis-[calc((100%-1.5rem)/3)] aspect-video overflow-hidden rounded-lg bg-muted group cursor-zoom-in"
            aria-label={`Open before & after image ${i + 1}`}
          >
            <img
              src={src}
              alt={`Before & after ${i + 1}`}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        ))}
      </div>

      {/* Lightbox */}
      <Dialog open={lightboxIdx !== null} onOpenChange={(o) => { if (!o) setLightboxIdx(null); }}>
        <DialogContent
          className="max-w-5xl w-[95vw] p-0 bg-background border-border/40 [&>button]:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>Before & After photos</DialogTitle>
          </DialogHeader>
          {lightboxIdx !== null && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label="Close"
                className="absolute right-3 top-3 z-20 rounded-full bg-background/90 hover:bg-background p-2 border border-border/60 shadow"
              >
                <X className="w-4 h-4" />
              </button>
              <Carousel
                opts={{ startIndex: lightboxIdx, loop: true }}
                className="w-full"
              >
                <CarouselContent>
                  {images.map((src, i) => (
                    <CarouselItem key={i}>
                      <div className="flex items-center justify-center bg-black/5 dark:bg-black/40 aspect-[4/3] sm:aspect-video">
                        <img
                          src={src}
                          alt={`Before & after ${i + 1}`}
                          className="max-h-[80vh] max-w-full object-contain select-none"
                          draggable={false}
                        />
                      </div>
                    </CarouselItem>
                  ))}
                </CarouselContent>
                <CarouselPrevious className="left-3 sm:-left-12" />
                <CarouselNext className="right-3 sm:-right-12" />
              </Carousel>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

/* ───────── expandable description ───────── */
const ExpandableDescription = ({ html }: { html: string }) => {
  const innerRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  const [overflows, setOverflows] = useState(false);

  useEffect(() => {
    const el = innerRef.current;
    if (!el) return;
    const check = () => {
      // Compare full scrollHeight to the collapsed clientHeight.
      // 192px ≈ max-h-48 (12rem)
      setOverflows(el.scrollHeight > 192 + 4);
    };
    check();
    const ro = new ResizeObserver(check);
    ro.observe(el);
    return () => ro.disconnect();
  }, [html]);

  return (
    <div>
      <div className="relative">
        <div
          ref={innerRef}
          className={`prose prose-sm max-w-none text-muted-foreground leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2 transition-[max-height] duration-300 overflow-hidden ${
            expanded ? "max-h-none" : "max-h-48"
          }`}
          dangerouslySetInnerHTML={{ __html: html }}
        />
        {!expanded && overflows && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-background to-transparent" />
        )}
      </div>
      {overflows && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-2 inline-flex items-center gap-1 text-sm font-medium text-primary hover:underline"
        >
          {expanded ? "Show less" : "Read more"}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

/* ───────── component ───────── */
const ClinicDetail = () => {
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, userRole, loading: authLoading } = useAuth();

  // Super-admin / sub-admin preview mode: lets the admin review a clinic page
  // before it goes live. The clinic stays hidden from the public site until it
  // is approved and page_status === 'live'.
  const previewRequested = searchParams.get('preview') === '1';

  const [clinic, setClinic] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [previewAccess, setPreviewAccess] = useState<'pending' | 'granted' | 'denied'>(previewRequested ? 'pending' : 'granted');
  const [resolvedPreviewRole, setResolvedPreviewRole] = useState<AppRole | null>(userRole);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("overview");
  const galleryRef = useRef<HTMLDivElement>(null);
  const [tabSticky, setTabSticky] = useState(false);
  const [fullscreenIdx, setFullscreenIdx] = useState<number | null>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tappedImageIdx, setTappedImageIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [recoOpen, setRecoOpen] = useState(false);
  const [recoValues, setRecoValues] = useState<ContactClinicSubmittedValues | null>(null);

  const handleFormSuccess = (values: ContactClinicSubmittedValues) => {
    setRecoValues(values);
    setRecoOpen(true);
    setMobileOpen(false);
  };

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1024);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  const initialTreatment = searchParams.get("treatment") || "";

  const sectionRefs = useRef<Record<string, HTMLElement | null>>({});
  const tabBarRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!previewRequested) {
      setPreviewAccess('granted');
      setResolvedPreviewRole(userRole);
      return;
    }

    if (authLoading) {
      setPreviewAccess('pending');
      return;
    }

    let cancelled = false;

    const resolvePreviewAccess = async () => {
      if (!user) {
        if (!cancelled) {
          setResolvedPreviewRole(null);
          setPreviewAccess('denied');
          console.warn('[ClinicDetail] preview denied: no authenticated user');
        }
        return;
      }

      const role = userRole ?? await getCurrentUserRole();
      if (cancelled) return;

      setResolvedPreviewRole(role);

      const allowed = role === 'admin' || role === 'sub_admin';
      console.log('[ClinicDetail] preview access resolved', {
        userId: user.id,
        role,
        allowed,
      });

      setPreviewAccess(allowed ? 'granted' : 'denied');
    };

    void resolvePreviewAccess();

    return () => {
      cancelled = true;
    };
  }, [previewRequested, authLoading, user, userRole]);

  const isPreview = previewRequested && previewAccess === 'granted';

  /* fetch clinic */
  useEffect(() => {
    if (!id) return;

    if (previewRequested && previewAccess !== 'granted') {
      if (previewAccess === 'denied') {
        setClinic(null);
        setLoading(false);
      }
      return;
    }

    (async () => {
      try {
        setLoading(true);
        if (previewRequested) {
          const data = await getClinicByIdPrivate(id);
          console.log('[ClinicDetail] mode=preview role=', resolvedPreviewRole, 'result=', data ? 'found' : 'null');
          setClinic(data ? mapClinic(data) : null);
        } else {
          const data = await getClinicById(id);
          console.log('[ClinicDetail] mode=public result=', data ? 'found' : 'null');
          setClinic(data ? mapClinic(data) : null);
        }
      } catch (e) {
        console.error('[ClinicDetail] fetch error', e);
        toast({ title: "Error", description: "Failed to load clinic data.", variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, previewRequested, previewAccess, resolvedPreviewRole, toast]);

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

  const wrapIndex = useCallback((index: number) => {
    const len = clinic?.images?.length ?? 1;
    return ((index % len) + len) % len;
  }, [clinic?.images?.length]);

  const scrollGalleryToIndex = useCallback((index: number) => {
    const el = galleryRef.current;
    const imageCount = clinic?.images?.length ?? 0;
    if (!el || imageCount === 0) return;

    const wrapped = wrapIndex(index);
    el.scrollTo({ left: wrapped * el.clientWidth, behavior: "smooth" });
    setCurrentImageIndex(wrapped);
  }, [clinic?.images?.length, wrapIndex]);

  /* ── gallery drag-scroll (mouse only) ── */
  useEffect(() => {
    const el = galleryRef.current;
    if (!el) return;

    let isDown = false;
    let startX = 0;
    let scrollLeftStart = 0;

    const getNearestIndex = () => Math.round(el.scrollLeft / Math.max(el.clientWidth, 1));

    const onDown = (e: MouseEvent) => {
      isDown = true;
      el.style.scrollBehavior = "auto";
      el.classList.add("cursor-grabbing");
      startX = e.pageX;
      scrollLeftStart = el.scrollLeft;
    };

    const onUp = () => {
      if (!isDown) return;
      isDown = false;
      el.classList.remove("cursor-grabbing");
      el.style.scrollBehavior = "smooth";
      scrollGalleryToIndex(getNearestIndex());
    };

    const onMove = (e: MouseEvent) => {
      if (!isDown) return;
      e.preventDefault();
      const dx = e.pageX - startX;
      el.scrollLeft = scrollLeftStart - dx;
    };

    const onKey = (e: KeyboardEvent) => {
      if (!el.matches(":hover") && document.activeElement !== el) return;
      const ci = getNearestIndex();
      if (e.key === "ArrowRight") { e.preventDefault(); scrollGalleryToIndex(ci + 1); }
      if (e.key === "ArrowLeft") { e.preventDefault(); scrollGalleryToIndex(ci - 1); }
    };

    const onScroll = () => {
      setCurrentImageIndex((prev) => {
        const next = getNearestIndex();
        return prev === next ? prev : next;
      });
      setTappedImageIdx(null);
    };

    el.addEventListener("mousedown", onDown);
    el.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("mouseup", onUp);
    window.addEventListener("mousemove", onMove as any);
    window.addEventListener("keydown", onKey);

    return () => {
      el.removeEventListener("mousedown", onDown);
      el.removeEventListener("scroll", onScroll);
      window.removeEventListener("mouseup", onUp);
      window.removeEventListener("mousemove", onMove as any);
      window.removeEventListener("keydown", onKey);
    };
  }, [scrollGalleryToIndex]);

  useEffect(() => {
    setCurrentImageIndex(0);
    requestAnimationFrame(() => scrollGalleryToIndex(0));
  }, [clinic?.id, scrollGalleryToIndex]);

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
  if (loading || (previewRequested && previewAccess === 'pending')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">Loading clinic...</span>
        </div>
      </div>
    );
  }

  if (previewRequested && previewAccess === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold">Preview unavailable</h1>
          <p className="text-muted-foreground">
            Only Super Admins can open clinic review previews. Please open this page from the admin approvals screen while signed in.
          </p>
          <Link to="/admin?section=approvals">
            <Button>Back to Approvals</Button>
          </Link>
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

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      {isPreview && (
        <div className="bg-yellow-500/15 border-b border-yellow-500/40 text-sm">
          <div className="container mx-auto px-4 py-2 text-yellow-900 dark:text-yellow-100 flex flex-wrap items-center justify-between gap-3">
            <span>
              <strong>Preview mode</strong> — this page is not live yet. Only Super Admins can see it.
            </span>
            <Link to="/admin?section=approvals" className="underline underline-offset-4 font-medium">
              Back to approvals
            </Link>
          </div>
        </div>
      )}

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
                <GoogleRating rating={clinic.rating} starClassName="w-3.5 h-3.5" />
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
              {/* ── Image Slider ── */}
              <div className="relative overflow-hidden rounded-2xl">
                <div
                  ref={galleryRef}
                  tabIndex={0}
                  className="flex overflow-x-auto scroll-smooth snap-x snap-mandatory cursor-grab scrollbar-hide rounded-2xl focus:outline-none"
                  style={{ WebkitOverflowScrolling: "touch" }}
                >
                  {clinic.images.map((src: string, idx: number) => (
                    <div
                      key={idx}
                      className="w-full shrink-0 snap-center relative"
                      onClick={() => {
                        if (isMobile) setTappedImageIdx((prev) => (prev === idx ? null : idx));
                      }}
                    >
                      <div className="aspect-video overflow-hidden rounded-2xl bg-muted/30">
                        <img
                          src={src}
                          alt={`${clinic.name} ${idx + 1}`}
                          draggable={false}
                          className="h-full w-full object-cover select-none"
                        />
                      </div>
                      {/* Mobile "Full Screen" button overlay */}
                      {isMobile && tappedImageIdx === idx && (
                        <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-2xl">
                          <Button
                            variant="secondary"
                            className="bg-white/90 text-foreground font-semibold shadow-lg"
                            onClick={(e) => {
                              e.stopPropagation();
                              setTappedImageIdx(null);
                              setFullscreenIdx(idx);
                            }}
                          >
                            Full Screen
                          </Button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {clinic.images.length > 1 && (
                  <>
                    <button
                      type="button"
                      onClick={() => scrollGalleryToIndex(wrapIndex(currentImageIndex - 1))}
                      aria-label="Previous image"
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGalleryToIndex(wrapIndex(currentImageIndex + 1))}
                      aria-label="Next image"
                      className="absolute right-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
                    >
                      <ChevronRight className="h-5 w-5" />
                    </button>

                    {/* Dot indicators */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
                      {clinic.images.map((_: string, i: number) => (
                        <div
                          key={i}
                          className={`w-2 h-2 rounded-full transition-colors ${
                            i === currentImageIndex ? "bg-white" : "bg-white/40"
                          }`}
                        />
                      ))}
                    </div>
                  </>
                )}
              </div>

              {/* ── About ── */}
              {clinic.description && (
                <div>
                  <h2 className="text-lg font-semibold mb-3">About the Clinic</h2>
                  <div
                    className="prose prose-sm max-w-none text-muted-foreground leading-relaxed text-[15px] [&_ul]:list-disc [&_ul]:pl-5 [&_ol]:list-decimal [&_ol]:pl-5 [&_p]:my-2"
                    dangerouslySetInnerHTML={{ __html: sanitizeRichText(clinic.description) }}
                  />
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

              {/* ── Facilities & Amenities ── */}
              {clinic.facilities.length > 0 && (
                <div
                  ref={(el) => (sectionRefs.current["facilities"] = el)}
                  className="scroll-mt-32 rounded-xl border border-border/50 p-6 bg-muted/20"
                >
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-primary" /> Facilities & Amenities
                  </h3>
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                    {clinic.facilities.map((key: string) => {
                      const f = getFacility(key);
                      if (!f) return null;
                      const Icon = f.icon;
                      return (
                        <div key={key} className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4 text-primary shrink-0" />
                          <span className="text-sm">{f.label}</span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Supported Languages ── */}
              {clinic.languages.length > 0 && (
                <div
                  ref={(el) => (sectionRefs.current["languages"] = el)}
                  className="scroll-mt-32 rounded-xl border border-border/50 p-6 bg-muted/20"
                >
                  <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                    <LanguagesIcon className="w-4 h-4 text-primary" /> Supported Languages
                  </h3>
                  <div className="flex flex-wrap gap-2">
                    {clinic.languages.map((code: string) => {
                      const l = getLanguage(code);
                      if (!l) return null;
                      return (
                        <span
                          key={code}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-background border border-border text-sm"
                        >
                          <span aria-hidden>{l.flag}</span>
                          <span>{l.name}</span>
                        </span>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ── Before & After ── */}
              {clinic.beforeAfter.length > 0 && (
                <BeforeAfterCarousel
                  images={clinic.beforeAfter}
                  sectionRef={(el) => (sectionRefs.current["gallery"] = el)}
                />
              )}
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
                <ContactClinicForm clinicId={id!} initialTreatment={initialTreatment} onSuccess={handleFormSuccess} />
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
                    onSuccess={handleFormSuccess}
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
            onSuccess={handleFormSuccess}
            submitLabel="Request Free Quote"
          />
        </DialogContent>
      </Dialog>

      {/* ── Fullscreen Image Viewer ── */}
      {fullscreenIdx !== null && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black"
          onMouseDown={(e) => {
            (e.currentTarget as any)._dragStartX = e.clientX;
            (e.currentTarget as any)._dragging = true;
          }}
          onMouseMove={(e) => {
            if (!(e.currentTarget as any)._dragging) return;
            e.preventDefault();
          }}
          onMouseUp={(e) => {
            const el = e.currentTarget as any;
            if (!el._dragging) return;
            el._dragging = false;
            const diff = el._dragStartX - e.clientX;
            if (Math.abs(diff) > 50) {
              setFullscreenIdx((p) => wrapIndex((p ?? 0) + (diff > 0 ? 1 : -1)));
            }
          }}
          onTouchStart={(e) => {
            (e.currentTarget as any)._swipeStartX = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            const startX = (e.currentTarget as any)._swipeStartX;
            if (startX == null) return;
            const diff = startX - e.changedTouches[0].clientX;
            if (Math.abs(diff) > 50) {
              setFullscreenIdx((p) => wrapIndex((p ?? 0) + (diff > 0 ? 1 : -1)));
            }
            (e.currentTarget as any)._swipeStartX = null;
          }}
        >
          <button
            onClick={() => setFullscreenIdx(null)}
            className="absolute top-4 right-4 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
            {fullscreenIdx + 1} / {clinic.images.length}
          </div>

          <button
            onClick={() => setFullscreenIdx((p) => wrapIndex((p ?? 0) - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Previous image"
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={() => setFullscreenIdx((p) => wrapIndex((p ?? 0) + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label="Next image"
          >
            <ChevronRight className="h-6 w-6" />
          </button>

          <div className="w-full max-w-4xl px-4 select-none">
            <div className="aspect-video w-full overflow-hidden rounded-lg">
              <img
                src={clinic.images[fullscreenIdx]}
                alt={`${clinic.name} ${fullscreenIdx + 1}`}
                draggable={false}
                className="h-full w-full object-cover pointer-events-none"
              />
            </div>
          </div>
        </div>
      )}

      {/* Post-submit recommendations */}
      <PostFormRecommendationsDialog
        open={recoOpen}
        onOpenChange={setRecoOpen}
        values={recoValues ? { ...recoValues, clinicId: id! } : null}
      />

      {/* Bottom padding for mobile CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default ClinicDetail;
