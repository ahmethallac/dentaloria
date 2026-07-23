// Prefixes an internal path with the active locale segment, unless the
// locale is undefined/English (which stays bare, e.g. "/clinic-listing").
export const withLocalePrefix = (path: string, lang: string | undefined): string => {
  if (!lang) return path;
  return path === "/" ? `/${lang}` : `/${lang}${path}`;
};
