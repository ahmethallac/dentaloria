import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import { withLocalePrefix, clinicPath } from "@/lib/localePath";
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from "@/components/ui/carousel";
import { getHomepageShowcaseClinics, type Clinic } from "@/lib/services";
import { getClinicCardImageUrl } from "@/lib/imageUtils";
import clinic1 from "@/assets/clinic-1.jpg";

const fallbackImage = clinic1;

const getClinicImages = (c: any): string[] => {
  const imgs = (c.clinic_images || [])
    .slice()
    .sort((a: any, b: any) => Number(!!b.is_primary) - Number(!!a.is_primary))
    .map((i: any) => i.image_url)
    .filter(Boolean);
  return imgs.length > 0 ? imgs : [fallbackImage];
};

const ImageWithSkeleton = ({
  src,
  alt,
  loading,
}: {
  src: string;
  alt: string;
  loading?: "eager" | "lazy";
}) => {
  const [loaded, setLoaded] = useState(false);
  const optimizedSrc = getClinicCardImageUrl(src);

  return (
    <div className="relative w-full h-full">
      {!loaded && (
        <div className="absolute inset-0 bg-muted animate-pulse rounded-none" />
      )}
      <img
        src={optimizedSrc}
        alt={alt}
        loading={loading || "lazy"}
        onLoad={() => setLoaded(true)}
        className={`w-full h-full object-cover cursor-grab active:cursor-grabbing transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        draggable={false}
      />
    </div>
  );
};

export const ShowcaseCard = ({
  clinic,
  cardIndex,
}: {
  clinic: any;
  cardIndex: number;
}) => {
  const { t } = useTranslation("home");
  const { lang } = useParams();
  const city = clinic.cities?.name || "";
  const country = clinic.cities?.countries?.name || "";
  const location = [city, country].filter(Boolean).join(", ");
  const images = getClinicImages(clinic);
  const rating =
    typeof clinic.rating === "number" && clinic.rating > 0 ? clinic.rating : null;

  // Eager-load the first image of the first two cards (first visible row on
  // mobile and desktop). Lazy-load everything else.
  const firstImageLoading = cardIndex < 2 ? "eager" : "lazy";

  return (
    <div className="group bg-white rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-lg transition-all duration-300 flex flex-col">
      {/* Image carousel */}
      <div className="relative">
        <Carousel opts={{ loop: images.length > 1, dragFree: false }} className="w-full">
          <CarouselContent>
            {images.map((src, idx) => (
              <CarouselItem key={idx}>
                <div className="aspect-[4/3] overflow-hidden bg-muted">
                  <ImageWithSkeleton
                    src={src}
                    alt={`${clinic.name} ${idx + 1}`}
                    loading={idx === 0 ? firstImageLoading : "lazy"}
                  />
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>

          {images.length > 1 && (
            <>
              <CarouselPrevious className="left-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" />
              <CarouselNext className="right-2 opacity-0 group-hover:opacity-100 transition-opacity h-8 w-8" />
            </>
          )}
        </Carousel>

        {rating && (
          <div className="absolute top-2 right-2 z-10 bg-white/95 backdrop-blur px-2 py-1 rounded-full shadow-sm text-xs font-semibold flex items-center gap-1 pointer-events-none">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            <span>{Number(rating).toFixed(1)}</span>
          </div>
        )}
      </div>

      {/* Body */}
      <div className="p-3 lg:p-4 flex flex-col gap-1 flex-1">
        <h3 className="font-semibold text-sm lg:text-base text-foreground line-clamp-1 leading-tight">
          {clinic.name}
        </h3>
        {location && (
          <p className="text-xs text-muted-foreground line-clamp-1">{location}</p>
        )}

        <Button
          asChild
          className="mt-3 w-full h-10 rounded-xl font-semibold"
        >
          <Link to={withLocalePrefix(clinicPath(clinic), lang)}>{t("featured.viewClinic")}</Link>
        </Button>
      </div>
    </div>
  );
};

export const FeaturedClinicsSection = () => {
  const { t } = useTranslation("home");
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const data = await getHomepageShowcaseClinics(8);
        if (!cancelled) setClinics(data);
      } catch (e) {
        console.error("Failed to load homepage showcase clinics:", e);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (!loading && clinics.length === 0) return null;

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold mb-3">{t("featured.title")}</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            {t("featured.subtitle")}
          </p>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 lg:gap-5">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <div
                  key={i}
                  className="rounded-2xl overflow-hidden border border-border/60 bg-white"
                >
                  <div className="aspect-[4/3] bg-muted animate-pulse" />
                  <div className="p-3 lg:p-4 space-y-2">
                    <div className="h-4 bg-muted rounded animate-pulse" />
                    <div className="h-3 w-2/3 bg-muted rounded animate-pulse" />
                    <div className="h-10 bg-muted rounded-xl animate-pulse mt-3" />
                  </div>
                </div>
              ))
            : clinics.slice(0, 8).map((c, idx) => (
                <ShowcaseCard key={c.id} clinic={c} cardIndex={idx} />
              ))}
        </div>
      </div>
    </section>
  );
};

export default FeaturedClinicsSection;
