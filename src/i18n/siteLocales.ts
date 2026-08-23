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
];

// Codes that get a URL prefix (everything except English, which stays bare).
export const PREFIXED_LOCALE_CODES = SITE_LOCALES.map((l) => l.code).filter((c) => c !== "en");

/**
 * Locales the site used to serve. They no longer have translations, but their
 * URLs were live and indexed, so /de/clinic-listing must land on
 * /clinic-listing rather than a 404. Only ever remove a code from here once
 * you are content to lose whatever still links to it.
 */
export const RETIRED_LOCALE_CODES = ["ro", "pl", "ru", "de", "fr"] as const;

export const isRetiredLocale = (code: string | undefined): boolean =>
  !!code && (RETIRED_LOCALE_CODES as readonly string[]).includes(code);

export const DEFAULT_LOCALE = "en";

export const isSupportedLocale = (code: string | undefined): code is string =>
  !!code && PREFIXED_LOCALE_CODES.includes(code);
