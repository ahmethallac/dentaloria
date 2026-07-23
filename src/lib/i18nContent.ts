// Reads the machine-translated variant of a clinic-authored field for the
// active site locale, falling back to the original (English) text if no
// translation exists yet (mid-rollout) or the active locale is English.
// Never blank/broken: worst case shows the original text.
export function localizedField(
  original: string | undefined,
  translations: Record<string, string> | undefined,
  locale: string
): string {
  if (locale === "en" || !translations) return original ?? "";
  return translations[locale] || original || "";
}
