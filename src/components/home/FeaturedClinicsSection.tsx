import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle, MapPin } from "lucide-react";
import { GoogleRating } from "@/components/ui/google-rating";
import { getLanguage, getFacility, sortFacilitiesForCard } from "@/lib/clinicMeta";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ContactClinicForm } from "@/components/forms/ContactClinicForm";
import { getHomepageShowcaseClinics, type Clinic } from "@/lib/services";
import clinic1 from "@/assets/clinic-1.jpg";

const fallbackImage = clinic1;

const getClinicImage = (c: any): string =>
  c.clinic_images?.find((i: any) => i.is_primary)?.image_url ||
  c.clinic_images?.[0]?.image_url ||
  fallbackImage;

const getClinicLocation = (c: any): string =>
  `${c.cities?.name || ""}${c.cities?.countries?.name ? `, ${c.cities.countries.name}` : ""}`;

interface ShowcaseCardProps {
  clinic: any;
  onApply: (id: string) => void;
}

const ShowcaseCard = ({ clinic, onApply }: ShowcaseCardProps) => {
  return (
    <Card className="overflow-hidden bg-white/90 backdrop-blur-glass border border-white/40 rounded-2xl shadow-card hover:shadow-elegant transition-shadow duration-300 h-full flex flex-col">
      <CardContent className="p-0 flex flex-col h-full">
        {/* Image */}
        <div className="relative h-44">
          <img
            src={getClinicImage(clinic)}
            alt={clinic.name}
            className="w-full h-full object-cover"
          />
          <div className="absolute top-3 left-3 right-3 flex justify-between items-start z-10">
            <Badge className="bg-primary text-white border-0 px-2.5 py-1 rounded-full text-xs font-medium shadow-lg">
              Featured
            </Badge>
            {clinic.is_verified && (
              <div className="flex items-center gap-1 bg-white/90 backdrop-blur-sm px-2 py-1 rounded-full shadow-sm">
                <CheckCircle className="h-3.5 w-3.5 text-medical-green" />
                <span className="text-xs font-medium text-foreground/80">Verified</span>
              </div>
            )}
          </div>
          <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent pt-8 pb-3 px-3">
            <div className="flex items-center gap-1.5 text-white">
              <MapPin className="h-3.5 w-3.5" />
              <span className="text-sm font-medium">{getClinicLocation(clinic)}</span>
            </div>
          </div>
        </div>

        {/* Body */}
        <div className="p-4 space-y-3 flex flex-col flex-1">
          <div className="flex items-start justify-between gap-3">
            <h3 className="text-base font-bold text-foreground leading-tight flex-1 line-clamp-2">
              {clinic.name}
            </h3>
            <GoogleRating rating={clinic.rating} variant="prominent" />
          </div>

          {/* Languages */}
          {Array.isArray(clinic.languages) && clinic.languages.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
              {clinic.languages.slice(0, 3).map((code: string) => {
                const l = getLanguage(code);
                if (!l) return null;
                return (
                  <span key={code} className="inline-flex items-center gap-1 shrink-0">
                    <span aria-hidden>{l.flag}</span>
                    <span>{l.name}</span>
                  </span>
                );
              })}
              {clinic.languages.length > 3 && (
                <span className="text-primary shrink-0">+{clinic.languages.length - 3}</span>
              )}
            </div>
          )}

          {/* Facilities */}
          {Array.isArray(clinic.facilities) && clinic.facilities.length > 0 && (
            <div className="flex items-center gap-2 overflow-hidden whitespace-nowrap text-xs text-foreground/70 min-w-0">
              {sortFacilitiesForCard(clinic.facilities).slice(0, 3).map((key: string) => {
                const f = getFacility(key);
                if (!f) return null;
                const Icon = f.icon;
                return (
                  <span key={key} className="inline-flex items-center gap-1 shrink-0">
                    <Icon className="w-3 h-3 text-primary" />
                    <span>{f.label}</span>
                  </span>
                );
              })}
              {clinic.facilities.length > 3 && (
                <span className="text-primary shrink-0">+{clinic.facilities.length - 3}</span>
              )}
            </div>
          )}

          {/* Services / Treatments — names only, no pricing */}
          {clinic.clinic_treatments && clinic.clinic_treatments.length > 0 && (
            <div className="flex items-center gap-1.5 overflow-hidden whitespace-nowrap min-w-0">
              {clinic.clinic_treatments.slice(0, 3).map((ct: any) => (
                <Badge
                  key={ct.id}
                  variant="secondary"
                  className="bg-muted/70 text-foreground/80 border-0 px-2.5 py-1 rounded-full text-xs font-normal shrink-0 max-w-[140px] truncate"
                >
                  <span className="truncate">{ct.treatments?.name}</span>
                </Badge>
              ))}
              {clinic.clinic_treatments.length > 3 && (
                <Badge
                  variant="outline"
                  className="border-primary/30 text-primary bg-primary/5 px-2.5 py-1 rounded-full text-xs shrink-0"
                >
                  +{clinic.clinic_treatments.length - 3}
                </Badge>
              )}
            </div>
          )}

          {/* CTAs */}
          <div className="mt-auto pt-2 flex flex-col gap-2">
            <Button
              onClick={() => onApply(clinic.id)}
              className="w-full h-10 bg-medical-green hover:bg-medical-green/90 text-white font-semibold rounded-xl shadow-sm"
            >
              Quick Apply
            </Button>
            <Button
              asChild
              className="w-full h-10 bg-primary hover:bg-primary/90 text-primary-foreground font-semibold rounded-xl shadow-sm"
            >
              <Link to={`/clinic/${clinic.id}`}>View Clinic</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export const FeaturedClinicsSection = () => {
  const [clinics, setClinics] = useState<Clinic[]>([]);
  const [loading, setLoading] = useState(true);
  const [applyOpenForClinicId, setApplyOpenForClinicId] = useState<string | null>(null);

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

  // Hide section entirely when there is nothing to showcase.
  if (!loading && clinics.length === 0) return null;

  const activeClinic = clinics.find((c) => c.id === applyOpenForClinicId);

  return (
    <section className="py-16 bg-background">
      <div className="container mx-auto px-4">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold mb-3">Featured Clinics</h2>
          <p className="text-muted-foreground max-w-2xl mx-auto">
            Hand-picked clinics from our editorial team
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-6">
          {loading
            ? Array.from({ length: 8 }).map((_, i) => (
                <Card key={i} className="h-[420px] animate-pulse bg-muted/40" />
              ))
            : clinics.slice(0, 8).map((c) => (
                <ShowcaseCard
                  key={c.id}
                  clinic={c}
                  onApply={(id) => setApplyOpenForClinicId(id)}
                />
              ))}
        </div>
      </div>

      <Dialog
        open={!!applyOpenForClinicId}
        onOpenChange={(open) => !open && setApplyOpenForClinicId(null)}
      >
        <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Apply to {activeClinic?.name || "clinic"}</DialogTitle>
          </DialogHeader>
          {activeClinic && (
            <ContactClinicForm
              clinicId={activeClinic.id}
              onSuccess={() => setApplyOpenForClinicId(null)}
              submitLabel="Send Application"
            />
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
};

export default FeaturedClinicsSection;
