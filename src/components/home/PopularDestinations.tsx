import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { withLocalePrefix } from "@/lib/localePath";
import { SectionShell, SectionHeading } from "./SectionShell";

/*
 * Figma node 2:213 (upper half) — four city cards, each ~176x103 at 863, i.e.
 * a 4-up grid of 16:9 photos with the name and tagline burned into the bottom
 * left over a dark scrim.
 */

export type DestinationCard = {
  id: string;
  name: string;
  image: string;
  /** i18n key under popularCities.<key> for the tagline. */
  key: string;
  countryId?: string;
};

export const PopularDestinations = ({
  cities,
  onSelect,
}: {
  cities: DestinationCard[];
  onSelect: (cityId: string, countryId?: string) => void;
}) => {
  const { t } = useTranslation("home");
  const { lang } = useParams();

  if (cities.length === 0) return null;

  return (
    <SectionShell id="destinations" className="pt-8">
      <SectionHeading
        title={t("popularCities.title")}
        subtitle={t("popularCities.subtitle")}
        actionLabel={t("popularCities.viewAll")}
        actionTo={withLocalePrefix("/clinic-listing", lang)}
      />

      <div
        data-fid="destinations.grid"
        className="mt-6 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4"
      >
        {cities.slice(0, 4).map((city) => (
          <button
            key={city.id}
            type="button"
            onClick={() => onSelect(city.id, city.countryId)}
            className="group relative aspect-[16/10] overflow-hidden rounded-2xl text-left"
          >
            <img
              src={city.image}
              alt={city.name}
              className="h-full w-full object-cover transition-transform duration-300 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-black/75 via-black/25 to-transparent" />
            <div className="absolute inset-x-0 bottom-0 p-5 text-white">
              <div className="text-lg font-bold">{city.name}</div>
              <div className="mt-0.5 text-sm text-white/85">
                {t(`popularCities.${city.key}`)}
              </div>
            </div>
          </button>
        ))}
      </div>
    </SectionShell>
  );
};
