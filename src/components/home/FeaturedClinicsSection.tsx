import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { MapPin } from "lucide-react";
import { getLanguage } from "@/lib/clinicMeta";
import { getHomepageShowcaseClinics, type Clinic } from "@/lib/services";
import clinic1 from "@/assets/clinic-1.jpg";

const fallbackImage = clinic1;

const getClinicImage = (c: any): string =>
  c.clinic_images?.find((i: any) => i.is_primary)?.image_url ||
  c.clinic_images?.[0]?.image_url ||
  fallbackImage;

const ShowcaseCard = ({ clinic }: { clinic: any }) => {
  const city = clinic.cities?.name || "";

  return (
    <Link
      to={`/clinic/${clinic.id}`}
      className="group block bg-white rounded-2xl overflow-hidden border border-border/60 shadow-sm hover:shadow-lg hover:-translate-y-1 transition-all duration-300"
    >
      <div className="aspect-[4/3] overflow-hidden bg-muted">
        <img
          src={getClinicImage(clinic)}
          alt={clinic.name}
          loading="lazy"
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
      </div>

      <div className="p-3 lg:p-4 space-y-2">
        <h3 className="font-semibold text-sm lg:text-base text-foreground line-clamp-1 leading-tight">
          {clinic.name}
        </h3>

        {city && (
          <div className="flex items-center gap-1 text-xs text-muted-foreground">
            <MapPin className="h-3.5 w-3.5 shrink-0" />
            <span className="truncate">{city}</span>
          </div>
        )}

        {Array.isArray(clinic.languages) && clinic.languages.length > 0 && (
          <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-foreground/70 pt-0.5">
            {clinic.languages.slice(0, 3).map((code: string) => {
              const l = getLanguage(code);
              if (!l) return null;
              return (
                <span key={code} className="inline-flex items-center gap-1 shrink-0">
                  <span aria-hidden>{l.flag}</span>
                  <span className="hidden sm:inline">{l.name}</span>
                </span>
              );
            })}
            {clinic.languages.length > 3 && (
              <span className="text-primary shrink-0">+{clinic.languages.length - 3}</span>
            )}
          </div>
        )}
      </div>
    </Link>
  );
};

export const FeaturedClinicsSection = () => {
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
          <h2 className="text-3xl font-bold mb-3">Featured Clinics</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hand-picked clinics from our editorial team
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 lg:gap-5">
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
                  </div>
                </div>
              ))
            : clinics.slice(0, 8).map((c) => <ShowcaseCard key={c.id} clinic={c} />)}
        </div>
      </div>
    </section>
  );
};

export default FeaturedClinicsSection;
