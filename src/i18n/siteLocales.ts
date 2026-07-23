// The site's UI locales — deliberately separate from src/lib/clinicMeta.ts's
// LANGUAGES array, which lists languages spoken AT a clinic (patient-facing
// metadata), not the site's own interface language.
export interface SiteLocale {
  code: string;
  label: string;
  flag: string;
}

export const SITE_LOCALES: SiteLocale[] = [
  { code: "en", label: "English", flag: "🇬🇧" },
  { code: "tr", label: "Türkçe", flag: "🇹🇷" },
  { code: "ro", label: "Română", flag: "🇷🇴" },
  { code: "pl", label: "Polski", flag: "🇵🇱" },
  { code: "ru", label: "Русский", flag: "🇷🇺" },
  { code: "de", label: "Deutsch", flag: "🇩🇪" },
  { code: "fr", label: "Français", flag: "🇫🇷" },
];

// Codes that get a URL prefix (everything except English, which stays bare).
export const PREFIXED_LOCALE_CODES = SITE_LOCALES.map((l) => l.code).filter((c) => c !== "en");

export const DEFAULT_LOCALE = "en";

export const isSupportedLocale = (code: string | undefined): code is string =>
  !!code && PREFIXED_LOCALE_CODES.includes(code);
