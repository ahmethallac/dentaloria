import { useParams, Link, useSearchParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { withLocalePrefix } from "@/lib/localePath";
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
  ShieldCheck,
  CheckCircle,
  Clock,
  ChevronRight,
  ChevronLeft,
  ChevronDown,
  ChevronUp,
  X,
  Languages as LanguagesIcon,
  Sparkles,
  Heart,
  Share2,
  Cpu,
  BadgePercent,
  Linkedin,
  Headset,
  ArrowRight,
  Lock,
  Star,
} from "lucide-react";
import { useEffect, useState, useRef, useCallback, useMemo } from "react";
import { getClinicById, getClinicByIdPrivate, getClinicBySlug } from "@/lib/services";
import { sanitizeRichText } from "@/lib/sanitizeHtml";
import { localizedField } from "@/lib/i18nContent";
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
import HorizontalMediaRow from "@/components/clinic-detail/HorizontalMediaRow";
import GoogleReviewsCarousel from "@/components/clinic-detail/GoogleReviewsCarousel";
import { Play } from "lucide-react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

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
    descriptionTranslations: db.description_translations || {},
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
    videos: ((db?.clinic_videos || []) as any[])
      .slice()
      .sort((a, b) => (a.sort_order ?? 0) - (b.sort_order ?? 0))
      .map((v) => ({
        id: v.id,
        provider: v.provider as "youtube" | "instagram",
        providerId: v.provider_id,
        url: v.video_url,
        thumbnail: v.thumbnail_url as string | null,
      })),
    googleReviews: Array.isArray(db?.google_reviews) ? db.google_reviews : [],
    googlePlaceId: db.google_place_id || undefined,
  };
};

/* ───────── tabs config ───────── */
// `sectionId` is the anchor actually scrolled to / observed; `id` is only the
// button's React key and active-tab flag, since "Prices" points at the same
// treatments table as "Treatments" rather than a section of its own.
const TABS = [
  { id: "overview", sectionId: "overview", key: "overview" },
  { id: "about", sectionId: "about", key: "about" },
  { id: "treatments", sectionId: "treatments", key: "treatments" },
  { id: "doctors", sectionId: "doctors", key: "doctors" },
  { id: "photos", sectionId: "photos", key: "photos" },
  { id: "reviews", sectionId: "reviews", key: "reviews" },
  { id: "prices", sectionId: "treatments", key: "prices" },
  { id: "faq", sectionId: "faq", key: "faq" },
] as const;

/* ───────── before/after carousel + lightbox ───────── */
const BeforeAfterCarousel = ({
  images,
  sectionRef,
}: {
  images: string[];
  sectionRef: (el: HTMLDivElement | null) => void;
}) => {
  const { t } = useTranslation("clinicDetail");
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);

  return (
    <div ref={sectionRef} className="scroll-mt-32">
      <div className="mb-3">
        <h3 className="font-semibold text-sm uppercase tracking-wider text-muted-foreground">
          {t("beforeAfter.title")}
        </h3>
      </div>

      <HorizontalMediaRow
        items={images}
        aspectClass="aspect-video"
        keyFor={(_: string, i: number) => i}
        renderItem={(src: string, i: number) => (
          <button
            type="button"
            onClick={() => setLightboxIdx(i)}
            className="w-full h-full block group cursor-zoom-in"
            aria-label={t("beforeAfter.openImage", { n: i + 1 })}
          >
            <img
              src={src}
              alt={t("beforeAfter.openImage", { n: i + 1 })}
              className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
              loading="lazy"
            />
          </button>
        )}
      />

      {images.length > 1 && (
        <div className="mt-4 flex justify-center">
          <Button variant="outline" onClick={() => setLightboxIdx(0)}>
            {t("beforeAfter.viewMore")}
          </Button>
        </div>
      )}

      {/* Lightbox */}
      <Dialog open={lightboxIdx !== null} onOpenChange={(o) => { if (!o) setLightboxIdx(null); }}>
        <DialogContent
          className="max-w-5xl w-[95vw] p-0 bg-background border-border/40 [&>button]:hidden"
        >
          <DialogHeader className="sr-only">
            <DialogTitle>{t("beforeAfter.dialogTitle")}</DialogTitle>
          </DialogHeader>
          {lightboxIdx !== null && (
            <div className="relative">
              <button
                type="button"
                onClick={() => setLightboxIdx(null)}
                aria-label={t("beforeAfter.close")}
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
                          alt={t("beforeAfter.openImage", { n: i + 1 })}
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
  const { t } = useTranslation("clinicDetail");
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
          {expanded ? t("description.showLess") : t("description.readMore")}
          {expanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
        </button>
      )}
    </div>
  );
};

/* ───────── component ───────── */
// idProp is passed by ClinicLegacyRedirect when rendering the old /clinic/:id
// route (whose match only provides a "token" param, not "id" — see ClinicTokenRoute).
const ClinicDetail = ({ idProp }: { idProp?: string } = {}) => {
  const { id: routeId, citySlug, clinicSlug, lang } = useParams();
  const id = idProp ?? routeId;
  const { t } = useTranslation("clinicDetail");
  const { t: tCommon } = useTranslation("common");
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
  const [videoLightbox, setVideoLightbox] = useState<null | { provider: "youtube" | "instagram"; providerId: string }>(null);
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [tappedImageIdx, setTappedImageIdx] = useState<number | null>(null);
  const [isMobile, setIsMobile] = useState(false);
  const [highlightForm, setHighlightForm] = useState(false);
  const [recoOpen, setRecoOpen] = useState(false);
  const [recoValues, setRecoValues] = useState<ContactClinicSubmittedValues | null>(null);
  const [saved, setSaved] = useState(false);
  const [treatmentsExpanded, setTreatmentsExpanded] = useState(false);

  const handleShare = useCallback(async () => {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title: document.title, url });
        return;
      } catch {
        // user cancelled the native share sheet — fall through to clipboard
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      toast({ description: t("actions.linkCopied") });
    } catch {
      // clipboard unavailable — nothing more we can do here
    }
  }, [t, toast]);

  const handleFormSuccess = (values: ContactClinicSubmittedValues) => {
    setRecoValues(values);
    setRecoOpen(true);
    setMobileOpen(false);
  };

  // Resolved DB clinic id — works whether we arrived via the legacy /clinic/:id
  // route or the canonical /clinic/:citySlug/:clinicSlug route.
  const clinicId: string | undefined = clinic?.id ?? id;

  // Stable reference so PostFormRecommendationsDialog's fetch effect only reruns
  // when a new submission actually happens, not on every unrelated re-render.
  const recoDialogValues = useMemo(
    () => (recoValues ? { ...recoValues, clinicId: clinicId! } : null),
    [recoValues, clinicId]
  );

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
  const hasSlugRoute = !!citySlug && !!clinicSlug;

  useEffect(() => {
    if (!id && !hasSlugRoute) return;

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
        if (previewRequested && id) {
          const data = await getClinicByIdPrivate(id);
          console.log('[ClinicDetail] mode=preview role=', resolvedPreviewRole, 'result=', data ? 'found' : 'null');
          setClinic(data ? mapClinic(data) : null);
        } else if (hasSlugRoute) {
          const data = await getClinicBySlug(citySlug!, clinicSlug!);
          console.log('[ClinicDetail] mode=public(slug) result=', data ? 'found' : 'null');
          setClinic(data ? mapClinic(data) : null);
        } else if (id) {
          const data = await getClinicById(id);
          console.log('[ClinicDetail] mode=public(id) result=', data ? 'found' : 'null');
          setClinic(data ? mapClinic(data) : null);
        }
      } catch (e) {
        console.error('[ClinicDetail] fetch error', e);
        toast({ title: t("loadError.title"), description: t("loadError.description"), variant: "destructive" });
      } finally {
        setLoading(false);
      }
    })();
  }, [id, citySlug, clinicSlug, hasSlugRoute, previewRequested, previewAccess, resolvedPreviewRole, toast]);

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
        const el = sectionRefs.current[t.sectionId];
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

  // On mobile the sidebar contact form is hidden (it lives in the desktop
  // aside), so "Get Quote" opens the quote dialog directly instead of
  // scrolling to a hidden element. On desktop it scrolls to the sticky
  // sidebar form and briefly shakes it so it's obvious where the quote goes.
  const handleGetQuote = useCallback(() => {
    if (isMobile) {
      setMobileOpen(true);
      return;
    }
    scrollTo("contact");
    setHighlightForm(true);
    window.setTimeout(() => setHighlightForm(false), 600);
  }, [isMobile, scrollTo]);

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
    title: clinic ? `${clinic.name} | Dentaloria` : t("meta.titleFallback"),
    description: clinic
      ? `${clinic.name} - ${clinic.description?.substring(0, 160) || t("meta.descriptionDefault")}`
      : t("meta.descriptionFallback"),
    ogTitle: clinic ? `${clinic.name} | Dentaloria` : t("meta.titleFallback"),
    ogDescription: clinic
      ? `${clinic.name} - ${clinic.description?.substring(0, 160) || t("meta.descriptionDefault")}`
      : t("meta.descriptionFallback"),
  });

  /* loading / not‑found states */
  if (loading || (previewRequested && previewAccess === 'pending')) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <span className="text-muted-foreground text-sm">{t("loadingClinic")}</span>
        </div>
      </div>
    );
  }

  if (previewRequested && previewAccess === 'denied') {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background px-4">
        <div className="text-center max-w-md space-y-4">
          <h1 className="text-2xl font-bold">{t("previewUnavailable.title")}</h1>
          <p className="text-muted-foreground">
            {t("previewUnavailable.description")}
          </p>
          <Link to={withLocalePrefix("/admin?section=approvals", lang)}>
            <Button>{t("previewUnavailable.back")}</Button>
          </Link>
        </div>
      </div>
    );
  }

  if (!clinic) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">{t("notFound.title")}</h1>
          <Link to={withLocalePrefix("/", lang)}>
            <Button>{t("notFound.back")}</Button>
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
              <strong>{t("previewBanner.label")}</strong> {t("previewBanner.text")}
            </span>
            <Link to={withLocalePrefix("/admin?section=approvals", lang)} className="underline underline-offset-4 font-medium">
              {t("previewBanner.back")}
            </Link>
          </div>
        </div>
      )}

      {/* ── Breadcrumb ── */}
      <div className="container mx-auto px-4 pt-4 pb-2">
        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
          <Link to={withLocalePrefix("/", lang)} className="hover:text-primary transition-colors">{tCommon("nav.home")}</Link>
          <ChevronRight className="w-3 h-3" />
          <Link to={withLocalePrefix("/clinic-listing", lang)} className="hover:text-primary transition-colors">{tCommon("nav.clinics")}</Link>
          <ChevronRight className="w-3 h-3" />
          <span className="text-foreground font-medium truncate max-w-[200px]">{clinic.name}</span>
        </div>
      </div>

      {/* ── Header Strip ── */}
      <header className="container mx-auto px-4 pb-4">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3">
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <h1 className="text-2xl lg:text-3xl font-bold tracking-tight text-brand-navy">{clinic.name}</h1>
              {clinic.isVerified && <ShieldCheck className="w-6 h-6 text-primary shrink-0" aria-label={t("verified")} />}
            </div>
            <div className="flex items-center gap-4 mt-1.5 flex-wrap">
              <span className="flex items-center gap-1.5 text-sm text-muted-foreground">
                <MapPin className="w-3.5 h-3.5" />
                {[clinic.location, clinic.city, clinic.country].filter(Boolean).join(", ")}
              </span>
              <span className="flex items-center gap-1.5 text-sm">
                <GoogleRating rating={clinic.rating} starClassName="w-3.5 h-3.5" />
                {clinic.reviewCount > 0 && (
                  <span className="text-muted-foreground">({clinic.reviewCount.toLocaleString()} {t("googleReviews.reviewsSuffix")})</span>
                )}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setSaved((v) => !v)}>
              <Heart className={`w-4 h-4 ${saved ? "fill-primary text-primary" : ""}`} />
              {saved ? t("actions.saved") : t("actions.save")}
            </Button>
            <Button variant="outline" size="sm" className="gap-1.5" onClick={handleShare}>
              <Share2 className="w-4 h-4" />
              {t("actions.share")}
            </Button>
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
        <nav className="container mx-auto overflow-x-hidden px-4" aria-label={t("breadcrumb.sectionsAriaLabel")}>
          <div className="flex min-w-max gap-1 overflow-x-auto scrollbar-hide pr-4">
            {TABS.map((tab) => (
              <button
                key={tab.id}
                onClick={() => scrollTo(tab.sectionId)}
                className={`shrink-0 px-5 py-3 text-sm font-medium whitespace-nowrap border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "text-primary border-primary"
                    : "text-muted-foreground border-transparent hover:text-foreground hover:border-border"
                }`}
              >
                {t(`tabs.${tab.key}`)}
              </button>
            ))}
          </div>
        </nav>
      </div>

      {/* ── Main Content ── */}
      <section className="container mx-auto px-4 py-8">
        <div className="grid lg:grid-cols-[1fr_380px] gap-10">
          {/* LEFT COLUMN */}
          <div className="space-y-12 min-w-0">
            {/* Overview section */}
            <div ref={(el) => (sectionRefs.current["overview"] = el)} className="scroll-mt-32 space-y-8">
              {/* ── Image Slider ── */}
              <div className="relative overflow-hidden rounded-2xl">
                {clinic.isVerified && (
                  <div className="absolute left-3 top-3 z-20 flex items-center gap-1.5 rounded-full bg-background/95 px-3 py-1.5 text-xs font-medium shadow-sm backdrop-blur-sm">
                    <ShieldCheck className="w-3.5 h-3.5 text-primary" />
                    {t("verified")}
                  </div>
                )}
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
                            {t("aria.fullScreen")}
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
                      aria-label={t("aria.previousImage")}
                      className="absolute left-3 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
                    >
                      <ChevronLeft className="h-5 w-5" />
                    </button>
                    <button
                      type="button"
                      onClick={() => scrollGalleryToIndex(wrapIndex(currentImageIndex + 1))}
                      aria-label={t("aria.nextImage")}
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

              {/* ── Thumbnail strip ── */}
              {clinic.images.length > 1 && (
                <div className="grid grid-cols-4 gap-3">
                  {clinic.images.slice(1, 5).map((src: string, i: number) => {
                    const idx = i + 1;
                    const remaining = clinic.images.length - 5;
                    const isLastVisible = i === 3 && remaining > 0;
                    return (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => (isMobile ? setFullscreenIdx(idx) : scrollGalleryToIndex(idx))}
                        className="relative aspect-video overflow-hidden rounded-xl bg-muted/30"
                      >
                        <img
                          src={src}
                          alt={`${clinic.name} ${idx + 1}`}
                          loading="lazy"
                          className="h-full w-full object-cover"
                        />
                        {isLastVisible && (
                          <div className="absolute inset-0 flex items-center justify-center bg-black/55 text-center text-xs font-medium text-white">
                            +{remaining}
                            <br />
                            {t("aria.viewAllPhotos")}
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              )}

              {/* ── Quick facts ── */}
              <div className="grid grid-cols-2 gap-3 rounded-xl border border-border/50 bg-muted/20 p-5 sm:grid-cols-3 lg:grid-cols-6">
                {clinic.experience > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Clock className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-tight">{clinic.experience}+</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">{t("stats.yearsExperience")}</div>
                    </div>
                  </div>
                )}
                {clinic.patientCount > 0 && (
                  <div className="flex items-center gap-2.5">
                    <Users className="w-5 h-5 text-primary shrink-0" />
                    <div className="min-w-0">
                      <div className="text-sm font-bold leading-tight">{clinic.patientCount.toLocaleString()}+</div>
                      <div className="text-[11px] text-muted-foreground leading-tight">{t("stats.happyPatients")}</div>
                    </div>
                  </div>
                )}
                <div className="flex items-center gap-2.5">
                  <Cpu className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{t("quickFacts.digitalTechnology")}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <LanguagesIcon className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{t("quickFacts.multiLanguageSupport")}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Clock className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{t("quickFacts.patientCare")}</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <BadgePercent className="w-5 h-5 text-primary shrink-0" />
                  <span className="text-xs font-medium">{t("quickFacts.bestPriceGuarantee")}</span>
                </div>
              </div>

              {/* ── About cluster (description + languages + facilities) ── */}
              <div
                ref={(el) => (sectionRefs.current["about"] = el)}
                className="scroll-mt-32 space-y-8"
              >
                {/* About the Clinic */}
                {clinic.description && (
                  <div>
                    <h2 className="text-lg font-semibold mb-3">{t("description.title", { name: clinic.name })}</h2>
                    <ExpandableDescription
                      html={sanitizeRichText(
                        localizedField(clinic.description, clinic.descriptionTranslations, lang || "en")
                      )}
                    />
                    <div className="flex flex-wrap gap-2 mt-4">
                      {["technology", "experiencedTeam", "internationalStandards", "patientSatisfaction"].map((key) => (
                        <Badge key={key} variant="secondary" className="bg-primary/10 text-primary border-transparent font-medium">
                          {t(`aboutPills.${key}`)}
                        </Badge>
                      ))}
                    </div>
                  </div>
                )}

                {/* We Speak Your Language */}
                {clinic.languages.length > 0 && (
                  <div className="rounded-xl border border-border/50 p-6 bg-muted/20">
                    <h3 className="font-semibold text-primary mb-1">{t("languagesPanel.title")}</h3>
                    <p className="text-xs text-muted-foreground mb-4 max-w-md">{t("languagesPanel.subtitle")}</p>
                    <div className="flex flex-wrap items-center gap-3">
                      {clinic.languages.slice(0, 5).map((code: string) => {
                        const l = getLanguage(code);
                        if (!l) return null;
                        return (
                          <span
                            key={code}
                            title={tCommon(`languageNames.${l.code}`)}
                            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-xl"
                          >
                            <span aria-hidden>{l.flag}</span>
                          </span>
                        );
                      })}
                      {clinic.languages.length > 5 && (
                        <span className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-border bg-background text-xs font-semibold text-muted-foreground">
                          +{clinic.languages.length - 5}
                        </span>
                      )}
                    </div>
                  </div>
                )}

                {/* Facilities & Amenities */}
                {clinic.facilities.length > 0 && (
                  <div className="rounded-xl border border-border/50 p-6 bg-muted/20">
                    <h3 className="font-semibold mb-4 text-sm uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                      <Sparkles className="w-4 h-4 text-primary" /> {t("facilitiesAmenities")}
                    </h3>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                      {clinic.facilities.map((key: string) => {
                        const f = getFacility(key);
                        if (!f) return null;
                        const Icon = f.icon;
                        return (
                          <div key={key} className="flex items-center gap-2.5">
                            <Icon className="w-4 h-4 text-primary shrink-0" />
                            <span className="text-sm">{tCommon(`facilityLabels.${f.key}`)}</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ── Treatments ── */}
            {clinic.treatments.length > 0 && (
              <div ref={(el) => (sectionRefs.current["treatments"] = el)} className="scroll-mt-32">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-brand-navy">{t("treatmentPrices.title")}</h2>
                  {clinic.treatments.length > 5 && (
                    <button
                      type="button"
                      onClick={() => setTreatmentsExpanded((v) => !v)}
                      className="text-sm font-medium text-primary hover:underline"
                    >
                      {treatmentsExpanded ? t("treatmentPrices.showFewer") : t("treatmentPrices.viewAll")}
                    </button>
                  )}
                </div>
                <div className="rounded-xl border border-border/50 overflow-hidden">
                  <table className="w-full">
                    <thead>
                      <tr className="bg-muted/40 text-xs uppercase tracking-wider text-muted-foreground">
                        <th className="text-left px-5 py-3 font-medium">{t("treatmentPrices.treatment")}</th>
                        <th className="text-left px-5 py-3 font-medium hidden sm:table-cell">{t("treatmentPrices.duration")}</th>
                        <th className="text-right px-5 py-3 font-medium">{t("treatmentPrices.startingFrom")}</th>
                        <th className="px-5 py-3 w-[1%]"></th>
                      </tr>
                    </thead>
                    <tbody>
                      {(treatmentsExpanded ? clinic.treatments : clinic.treatments.slice(0, 5)).map((treatment: any, i: number) => (
                        <tr
                          key={i}
                          className="border-t border-border/30 hover:bg-muted/20 transition-colors"
                        >
                          <td className="px-5 py-4">
                            <span className="font-medium text-sm">{treatment.name}</span>
                          </td>
                          <td className="px-5 py-4 text-sm text-muted-foreground hidden sm:table-cell">
                            {treatment.duration || "—"}
                          </td>
                          <td className="px-5 py-4 text-right">
                            <span className="font-semibold text-primary">
                              {treatment.price || t("treatmentPrices.contactUs")}
                            </span>
                          </td>
                          <td className="px-5 py-4">
                            <Button
                              size="sm"
                              variant="ghost"
                              className="text-xs text-primary hover:text-primary"
                              onClick={handleGetQuote}
                            >
                              {t("treatmentPrices.getQuote")}
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {clinic.treatments.length > 5 && (
                  <div className="mt-4 flex justify-center">
                    <Button variant="outline" onClick={() => setTreatmentsExpanded((v) => !v)}>
                      {treatmentsExpanded ? t("treatmentPrices.showFewer") : t("treatmentPrices.viewAllButton")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Before & After (Photos) ── */}
            {clinic.beforeAfter.length > 0 && (
              <BeforeAfterCarousel
                images={clinic.beforeAfter}
                sectionRef={(el) => (sectionRefs.current["photos"] = el)}
              />
            )}

            {/* ── Videos (YouTube / Instagram Reels) — 9:16 tiles ── */}
            {clinic.videos && clinic.videos.length > 0 && (
              <div>
                <h2 className="text-lg font-semibold mb-3">{t("videos.title")}</h2>
                <div className="max-w-xl md:max-w-none">
                  <HorizontalMediaRow
                    items={clinic.videos as any[]}
                    aspectClass="aspect-[9/16]"
                    desktopVisibleCount={5}
                    keyFor={(v: any) => v.id}
                    renderItem={(v: any) => (
                      <button
                        type="button"
                        onClick={() => setVideoLightbox({ provider: v.provider, providerId: v.providerId })}
                        className="relative w-full h-full block group"
                        aria-label={t("videos.play")}
                      >
                        {v.provider === "youtube" && v.thumbnail ? (
                          <>
                            <img
                              src={v.thumbnail}
                              alt={t("videos.thumbnailAlt")}
                              loading="lazy"
                              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/25">
                              <div className="rounded-full bg-white/90 p-2.5 shadow-lg">
                                <Play className="w-5 h-5 text-black fill-black" />
                              </div>
                            </div>
                          </>
                        ) : (
                          <>
                            <iframe
                              src={
                                v.provider === "instagram"
                                  ? `https://www.instagram.com/reel/${v.providerId}/embed`
                                  : `https://www.youtube.com/embed/${v.providerId}`
                              }
                              className="w-full h-full pointer-events-none"
                              loading="lazy"
                              allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                            />
                            <div className="absolute inset-0 flex items-center justify-center bg-black/10 group-hover:bg-black/25 transition-colors">
                              <div className="rounded-full bg-white/90 p-2.5 shadow-lg opacity-0 group-hover:opacity-100 transition-opacity">
                                <Play className="w-5 h-5 text-black fill-black" />
                              </div>
                            </div>
                          </>
                        )}
                      </button>
                    )}
                  />
                </div>
                {clinic.videos.length > 1 && (
                  <div className="mt-4 flex justify-center">
                    <Button
                      variant="outline"
                      onClick={() => setVideoLightbox({ provider: clinic.videos[0].provider, providerId: clinic.videos[0].providerId })}
                    >
                      {t("videos.viewAll")}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* ── Google Reviews ── */}
            {clinic.googleReviews && clinic.googleReviews.length > 0 && (
              <div ref={(el) => (sectionRefs.current["reviews"] = el)} className="scroll-mt-32">
                <GoogleReviewsCarousel reviews={clinic.googleReviews} lang={lang} googlePlaceId={clinic.googlePlaceId} />
              </div>
            )}

            {/* ── Doctors ── */}

            {clinic.doctors.length > 0 && (
              <div ref={(el) => (sectionRefs.current["doctors"] = el)} className="scroll-mt-32">
                <h2 className="text-xl font-bold mb-4 text-brand-navy">{t("doctors.title")}</h2>
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
                          {doc.experience} {t("doctors.yearsExpSuffix")}
                        </p>
                      )}
                    </div>
                  ))}
                  <div className="min-w-[200px] shrink-0 rounded-xl border border-dashed border-primary/30 bg-primary/5 p-5 flex flex-col items-center justify-center text-center gap-2">
                    <Users className="w-7 h-7 text-primary" />
                    <h3 className="font-semibold text-sm">{t("doctors.teamCard.title")}</h3>
                    <p className="text-xs text-muted-foreground">{t("doctors.teamCard.subtitle")}</p>
                  </div>
                </div>
              </div>
            )}

            {/* ── FAQ ── */}
            <div ref={(el) => (sectionRefs.current["faq"] = el)} className="scroll-mt-32">
              <h2 className="text-xl font-bold mb-4 text-brand-navy">{t("faq.title")}</h2>
              <div className="grid lg:grid-cols-[1fr_280px] gap-6 items-start">
                <Accordion type="single" collapsible className="rounded-xl border border-border/50 divide-y divide-border/50">
                  {(t("faq.items", { returnObjects: true }) as { question: string; answer: string }[]).map((item, i) => (
                    <AccordionItem key={i} value={`item-${i}`} className="border-0 px-5">
                      <AccordionTrigger className="text-sm font-medium hover:no-underline">
                        {item.question}
                      </AccordionTrigger>
                      <AccordionContent className="text-sm text-muted-foreground">
                        {item.answer}
                      </AccordionContent>
                    </AccordionItem>
                  ))}
                </Accordion>

                <div className="rounded-xl border border-border/50 bg-muted/20 p-6 text-center">
                  <div className="mx-auto mb-3 flex h-11 w-11 items-center justify-center rounded-full bg-primary/10">
                    <Headset className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-semibold text-sm">{t("faq.stillHaveQuestions.title")}</h3>
                  <p className="text-xs text-muted-foreground mt-1.5 mb-4">{t("faq.stillHaveQuestions.subtitle")}</p>
                  <Button variant="outline" size="sm" onClick={handleGetQuote}>
                    {t("faq.stillHaveQuestions.cta")}
                  </Button>
                </div>
              </div>
            </div>

            {/* ── Contact anchor (mobile) ── */}
            <div className="scroll-mt-32 lg:hidden">
              <h2 className="text-xl font-bold mb-4">{t("contact.mobileTitle")}</h2>
              <div className="rounded-xl border border-border/50 p-6">
                <ContactClinicForm clinicId={clinicId!} initialTreatment={initialTreatment} onSuccess={handleFormSuccess} />
              </div>
            </div>
          </div>

          {/* RIGHT SIDEBAR (desktop) */}
          <aside className="hidden lg:block">
            <div
              ref={(el) => (sectionRefs.current["contact"] = el)}
              className="sticky top-36 scroll-mt-32"
            >
              <div className={`glass-sidebar rounded-2xl p-6 space-y-5 shadow-card ${highlightForm ? "animate-shake" : ""}`}>
                <div>
                  <h3 className="text-lg font-bold">{t("contact.sidebarTitle")}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {t("contact.sidebarSubtitle")}
                  </p>
                </div>

                {/* Trust bullets */}
                <div className="space-y-2">
                  {[
                    t("contact.trust1"),
                    t("contact.trust2"),
                    t("contact.trust3"),
                  ].map((text, i) => (
                    <div key={i} className="flex items-center gap-2">
                      <CheckCircle className="w-3.5 h-3.5 text-primary shrink-0" />
                      <span className="text-xs">{text}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-border/40 pt-4">
                  <ContactClinicForm
                    clinicId={clinicId!}
                    initialTreatment={initialTreatment}
                    submitLabel={t("contact.requestFreeQuote")}
                    onSuccess={handleFormSuccess}
                  />
                </div>

                {/* Accreditation */}
                {clinic.isVerified && (
                  <div className="flex items-center gap-2 pt-2 border-t border-border/40">
                    <Shield className="w-4 h-4 text-primary" />
                    <span className="text-xs text-muted-foreground">{t("contact.verifiedBadge")}</span>
                  </div>
                )}

                <div className="flex items-center justify-center gap-1.5 text-[11px] text-muted-foreground">
                  <Lock className="w-3 h-3" />
                  {t("contact.trustFooter")}
                </div>
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
            <div className="text-xs text-muted-foreground">{t("contact.mobileBarSubtitle")}</div>
          </div>
          <Button onClick={() => setMobileOpen(true)} className="bg-primary text-primary-foreground">
            {t("contact.getQuote")}
          </Button>
        </div>
      </div>

      {/* Mobile Dialog */}
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="sm:max-w-lg" onOpenAutoFocus={(e) => e.preventDefault()}>
          <DialogHeader>
            <DialogTitle>{t("contact.sidebarTitle")}</DialogTitle>
          </DialogHeader>
          <ContactClinicForm
            clinicId={clinicId!}
            initialTreatment={initialTreatment}
            onSuccess={handleFormSuccess}
            submitLabel={t("contact.requestFreeQuote")}
          />
        </DialogContent>
      </Dialog>

      {/* ── Video Lightbox ── */}
      {videoLightbox && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={t("aria.videoPlayer")}
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-md p-4 sm:p-8 animate-in fade-in-0 duration-200"
          onClick={() => setVideoLightbox(null)}
        >
          <div
            className="relative w-full max-w-[300px] sm:max-w-[340px]"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setVideoLightbox(null)}
              aria-label={t("aria.closeVideo")}
              className="absolute -top-3 -right-3 sm:-top-4 sm:-right-4 z-20 rounded-full bg-white hover:bg-white text-black p-2.5 shadow-xl ring-2 ring-black/10"
            >
              <X className="w-6 h-6" />
            </button>
            <div className="aspect-[9/16] w-full overflow-hidden rounded-2xl bg-black shadow-2xl">
              <iframe
                src={
                  videoLightbox.provider === "instagram"
                    ? `https://www.instagram.com/reel/${videoLightbox.providerId}/embed`
                    : `https://www.youtube.com/embed/${videoLightbox.providerId}?autoplay=1`
                }
                className="w-full h-full"
                allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
              />
            </div>
          </div>
        </div>
      )}

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
            aria-label={t("aria.close")}
          >
            <X className="h-6 w-6" />
          </button>

          <div className="absolute top-5 left-1/2 -translate-x-1/2 text-white/70 text-sm font-medium z-10">
            {fullscreenIdx + 1} / {clinic.images.length}
          </div>

          <button
            onClick={() => setFullscreenIdx((p) => wrapIndex((p ?? 0) - 1))}
            className="absolute left-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label={t("aria.previousImage")}
          >
            <ChevronLeft className="h-6 w-6" />
          </button>

          <button
            onClick={() => setFullscreenIdx((p) => wrapIndex((p ?? 0) + 1))}
            className="absolute right-3 top-1/2 -translate-y-1/2 z-10 rounded-full bg-white/20 p-2.5 text-white backdrop-blur-sm hover:bg-white/30 transition-colors"
            aria-label={t("aria.nextImage")}
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
        values={recoDialogValues}
      />

      {/* Bottom padding for mobile CTA */}
      <div className="h-20 lg:hidden" />
    </div>
  );
};

export default ClinicDetail;
