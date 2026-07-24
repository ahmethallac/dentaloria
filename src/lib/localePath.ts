// Prefixes an internal path with the active locale segment, unless the
// locale is undefined/English (which stays bare, e.g. "/clinic-listing").
export const withLocalePrefix = (path: string, lang: string | undefined): string => {
  if (!lang) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
};

// Builds the permanent, human-readable clinic URL (/clinic/:citySlug/:clinicSlug).
// Falls back to the legacy id-based path (which redirects to the canonical URL)
// if slug data isn't loaded for some reason, so a link never dead-ends.
export const clinicPath = (clinic: { id: string; slug?: string; cities?: { slug?: string } }): string =>
  clinic.slug && clinic.cities?.slug
    ? `/clinic/${clinic.cities.slug}/${clinic.slug}`
    : `/clinic/${clinic.id}`;
