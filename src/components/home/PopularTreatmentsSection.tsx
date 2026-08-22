import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { withLocalePrefix } from "@/lib/localePath";
import { HOMEPAGE_SHOWCASE_TREATMENTS, getTreatmentImage } from "@/lib/treatmentMeta";
import type { Treatment } from "@/lib/services";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma node 2:138 — six treatment tiles in one row (2:160 … 2:140), each
 * ~119x111 at 863. Square-ish cards: artwork on top, name centred beneath.
 */

export const PopularTreatmentsSection = ({
  treatments,
  onSelect,
}: {
  treatments: Treatment[];
  onSelect: (treatmentId: string) => void;
}) => {
  const { t } = useTranslation("home");
  const { lang } = useParams();

  const shown = treatments
    .filter((tr) => HOMEPAGE_SHOWCASE_TREATMENTS.includes(tr.name))
    .slice(0, 6);

  if (shown.length === 0) return null;

  return (
    <SectionShell className="pt-10">
      <SectionHeading
        title={t("treatmentOptions.title")}
        subtitle={t("treatmentOptions.subtitle")}
        actionLabel={t("treatmentOptions.viewAll")}
        actionTo={withLocalePrefix("/treatments", lang)}
      />

      <div
        data-fid="treatments.grid"
        className="mt-6 grid grid-cols-2 gap-5 sm:grid-cols-3 lg:grid-cols-6"
      >
        {shown.map((treatment) => (
          <button
            key={treatment.id}
            type="button"
            onClick={() => onSelect(treatment.id)}
            className="group flex flex-col items-center rounded-2xl border border-border bg-white p-5 transition-shadow hover:shadow-card"
          >
            <div className="h-24 w-24 overflow-hidden rounded-full ring-1 ring-border">
              <img
                src={getTreatmentImage(treatment.name)}
                alt={treatment.name}
                className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
              />
            </div>
            <span className="mt-3 text-center text-sm font-medium leading-snug text-brand-navy">
              {treatment.name}
            </span>
          </button>
        ))}
      </div>
    </SectionShell>
  );
};
