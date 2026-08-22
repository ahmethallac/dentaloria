import { useTranslation } from "react-i18next";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowRight, BadgeCheck, MapPin, Star } from "lucide-react";
import { withLocalePrefix } from "@/lib/localePath";
import { getLanguage } from "@/lib/clinicMeta";
import type { Clinic } from "@/lib/services";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma nodes 2:325 (heading) and 2:252 (the four cards, 760px wide at 863 ->
 * 1268 here, so four columns on the shared 1264 column with a 20px gutter).
 *
 * Card anatomy from node 2:303: photo with a rating pill top-right, then name,
 * location row, rating row, a hairline, and a "Verified Clinic" footer.
 */

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1629909613654-28e377c37b09?w=800&h=600&fit=crop";

const clinicImage = (clinic: Clinic) =>
  clinic.clinic_images?.find((img) => img.is_primary)?.image_url ||
  clinic.clinic_images?.[0]?.image_url ||
  FALLBACK_IMAGE;

const ClinicCardSkeleton = () => (
  <div className="overflow-hidden rounded-2xl border border-border bg-white">
    <div className="aspect-[16/9] animate-pulse bg-muted" />
    <div className="space-y-3 p-5">
      <div className="h-4 animate-pulse rounded bg-muted" />
      <div className="h-3 w-2/3 animate-pulse rounded bg-muted" />
      <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
    </div>
  </div>
);

export const PopularClinicsSection = ({
  clinics,
  loading,
}: {
  clinics: Clinic[];
  loading: boolean;
}) => {
  const { t } = useTranslation("home");
  const { lang } = useParams();
  const navigate = useNavigate();

  return (
    <SectionShell className="pt-8">
      <SectionHeading
        title={t("popularClinics.title")}
        subtitle={t("popularClinics.subtitle")}
        actionLabel={t("popularClinics.viewAll")}
        actionTo={withLocalePrefix("/clinic-listing", lang)}
      />

      <div
        data-fid="clinics.grid"
        className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-5"
      >
        {loading
          ? Array.from({ length: 4 }).map((_, i) => <ClinicCardSkeleton key={i} />)
          : clinics.slice(0, 4).map((clinic) => (
              <button
                key={clinic.id}
                type="button"
                onClick={() => navigate(withLocalePrefix(`/clinic/${clinic.id}`, lang))}
                className="group overflow-hidden rounded-2xl border border-border bg-white text-left transition-shadow hover:shadow-card"
              >
                <div className="relative aspect-[16/9] overflow-hidden">
                  <img
                    src={clinicImage(clinic)}
                    alt={clinic.name}
                    className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
                  />
                  <span className="absolute right-3 top-3 inline-flex items-center gap-1 rounded-lg bg-white px-2.5 py-1 text-xs font-semibold text-brand-navy shadow-sm">
                    <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" aria-hidden="true" />
                    {(clinic.rating || 0).toFixed(1)}
                  </span>
                </div>

                <div className="p-3 lg:p-5">
                  <h3 className="truncate text-sm font-semibold text-brand-navy lg:text-base">
                    {clinic.name}
                  </h3>

                  <p className="mt-2 flex items-center gap-1.5 text-xs text-nav-muted lg:text-sm">
                    <MapPin className="h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                    <span className="truncate">
                      {[clinic.cities?.name, clinic.cities?.countries?.name]
                        .filter(Boolean)
                        .join(", ")}
                    </span>
                  </p>

                  {clinic.languages && clinic.languages.length > 0 && (
                    <p className="mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 lg:hidden">
                      {clinic.languages.slice(0, 3).map((code) => {
                        const meta = getLanguage(code);
                        return (
                          <span
                            key={code}
                            className="inline-flex items-center gap-1 text-[11px] font-medium text-nav-muted"
                            title={meta?.name ?? code}
                          >
                            {/* no flag invented for a code we do not know */}
                            {meta && <span aria-hidden="true">{meta.flag}</span>}
                            {code.toUpperCase()}
                          </span>
                        );
                      })}
                    </p>
                  )}

                  <p className="mt-2 hidden items-center gap-1.5 text-sm lg:flex">
                    <Star
                      className="h-4 w-4 shrink-0 fill-medical-green text-medical-green"
                      aria-hidden="true"
                    />
                    <span className="font-medium text-brand-navy">
                      {(clinic.rating || 0).toFixed(1)}/5
                    </span>
                    <span className="text-nav-muted">
                      ({clinic.review_count || 0} {t("popularClinics.reviews")})
                    </span>
                  </p>
                </div>

                <div className="flex items-center gap-1.5 border-t border-border px-3 py-2.5 text-xs text-nav-muted lg:px-5 lg:py-3 lg:text-sm">
                  <BadgeCheck className="h-4 w-4 shrink-0 text-medical-green" aria-hidden="true" />
                  {t("popularClinics.verified")}
                </div>
              </button>
            ))}
      </div>

      {!loading && clinics.length > 0 && (
        <Link
          to={withLocalePrefix("/clinic-listing", lang)}
          className="mt-5 flex items-center justify-center gap-1.5 text-sm font-medium text-primary lg:hidden"
        >
          {t("popularClinics.viewAll")}
          <ArrowRight className="h-4 w-4" aria-hidden="true" />
        </Link>
      )}

      {!loading && clinics.length === 0 && (
        <p className="mt-6 rounded-2xl border border-border bg-white p-10 text-center text-sm text-nav-muted">
          {t("popularClinics.empty")}
        </p>
      )}
    </SectionShell>
  );
};
