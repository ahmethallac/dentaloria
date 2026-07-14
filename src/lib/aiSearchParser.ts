import type { Country, City, Treatment } from "./services";
import { LANGUAGES } from "./clinicMeta";

export interface ParsedSearchQuery {
  treatmentId?: string;
  countryId?: string;
  cityId?: string;
  languageCodes: string[];
  sortBy?: "balance" | "rating" | "price_asc" | "price_desc";
}

export interface SearchableData {
  treatments: Treatment[];
  countries: Country[];
  cities: City[];
}

// Patients type short generic terms ("implant", "veneers"), not the full
// stored treatment name ("All-on-4 Dental Implants", "Porcelain Veneers").
// Each entry: phrases a patient might type -> a substring to look for
// inside the real treatment name (not the other way around). More specific
// entries (all-on-4, single tooth) are listed before the generic "implant"
// fallback so a specific mention always wins over the generic one.
const TREATMENT_KEYWORDS: Array<{ match: string[]; nameIncludes: string }> = [
  { match: ["all-on-4", "all on 4", "all on four"], nameIncludes: "all-on-4" },
  { match: ["all-on-6", "all on 6", "all on six"], nameIncludes: "all-on-6" },
  { match: ["single tooth implant", "single implant", "single tooth"], nameIncludes: "single tooth" },
  { match: ["multiple tooth", "multiple teeth", "multiple implants"], nameIncludes: "multiple tooth" },
  { match: ["hollywood smile", "smile makeover", "veneer"], nameIncludes: "veneer" },
  { match: ["whitening", "whiten", "bleaching"], nameIncludes: "whitening" },
  { match: ["crown", "cap"], nameIncludes: "crown" },
  { match: ["invisalign", "clear aligner", "invisible aligner"], nameIncludes: "invisalign" },
  { match: ["braces"], nameIncludes: "braces" },
  { match: ["bonding"], nameIncludes: "bonding" },
  { match: ["wisdom tooth", "wisdom teeth"], nameIncludes: "wisdom" },
  // Generic fallback: any mention of "implant(s)" with no specific
  // qualifier above matches whichever implant treatment comes first.
  { match: ["implant"], nameIncludes: "implant" },
];

// Native self-names AND Turkish names patients commonly use for a
// language, in addition to the English name already in LANGUAGES. Many
// patients (and Ahmet's own testing) type Turkish sentences even though
// the site itself is English — these must be covered too.
const LANGUAGE_ALIASES: Record<string, string[]> = {
  de: ["deutsch", "german", "almanca"],
  pl: ["polski", "polish", "lehçe"],
  fr: ["français", "french", "fransızca"],
  nl: ["nederlands", "dutch", "hollandaca", "felemenkçe"],
  ro: ["română", "romanian", "romence"],
  ar: ["arabic", "عربي", "arapça"],
  it: ["italiano", "italian", "italyanca"],
  es: ["español", "spanish", "ispanyolca"],
  pt: ["português", "portuguese", "portekizce"],
  ru: ["русский", "russian", "rusça"],
  en: ["english", "ingilizce"],
};

const PRICE_ASC_KEYWORDS = [
  "cheap",
  "cheapest",
  "affordable",
  "budget",
  "inexpensive",
  "low cost",
  "lowest price",
  "best price",
  "best value",
];

const RATING_KEYWORDS = [
  "best rated",
  "highest rated",
  "top rated",
  "best reviewed",
  "highest rating",
  "most reviewed",
  "best",
];

// Turkish characters fold to their closest ASCII Latin letter before
// lowercasing. This matters for two reasons: (1) patients type Turkish
// city/language names while the stored data is plain ASCII ("İzmir" vs
// "Izmir"), and (2) JavaScript's default (non-locale) toLowerCase() turns
// the Turkish dotted capital "İ" into "i" + a combining dot above
// (U+0307), NOT plain "i" — so "İstanbul" would otherwise never match the
// stored "Istanbul" at all.
const TURKISH_FOLD: Record<string, string> = {
  İ: "i", I: "i", ı: "i",
  Ğ: "g", ğ: "g",
  Ü: "u", ü: "u",
  Ş: "s", ş: "s",
  Ö: "o", ö: "o",
  Ç: "c", ç: "c",
};

const norm = (s: string) =>
  s
    .split("")
    .map((ch) => TURKISH_FOLD[ch] ?? ch)
    .join("")
    .toLowerCase()
    .trim();

export function parseSearchQuery(query: string, data: SearchableData): ParsedSearchQuery {
  const q = norm(query);
  const result: ParsedSearchQuery = { languageCodes: [] };

  // Treatment — try the full stored name first (covers a patient typing the
  // exact name), then fall back to keyword matching (covers the much more
  // common case of a short generic term like "implant" or "veneers").
  const treatmentsByLength = [...data.treatments].sort((a, b) => b.name.length - a.name.length);
  const directTreatment = treatmentsByLength.find((t) => q.includes(norm(t.name)));
  if (directTreatment) {
    result.treatmentId = directTreatment.id;
  } else {
    const matchedKeyword = TREATMENT_KEYWORDS.find((k) => k.match.some((phrase) => q.includes(phrase)));
    if (matchedKeyword) {
      const byKeyword = treatmentsByLength.find((t) => norm(t.name).includes(matchedKeyword.nameIncludes));
      if (byKeyword) result.treatmentId = byKeyword.id;
    }
  }

  // City — longest city name first to avoid a short name matching inside a longer one.
  const citiesByLength = [...data.cities].sort((a, b) => b.name.length - a.name.length);
  const matchedCity = citiesByLength.find((c) => q.includes(norm(c.name)));
  if (matchedCity) {
    result.cityId = matchedCity.id;
    result.countryId = matchedCity.country_id;
  } else {
    // Only look for a country name if no specific city already matched.
    const countriesByLength = [...data.countries].sort((a, b) => b.name.length - a.name.length);
    const matchedCountry = countriesByLength.find((c) => q.includes(norm(c.name)));
    if (matchedCountry) result.countryId = matchedCountry.id;
  }

  // Languages — can match more than one.
  const matchedLangs = new Set<string>();
  for (const lang of LANGUAGES) {
    const names = [lang.name, ...(LANGUAGE_ALIASES[lang.code] || [])];
    if (names.some((n) => q.includes(norm(n)))) {
      matchedLangs.add(lang.code);
    }
  }
  result.languageCodes = Array.from(matchedLangs);

  // Sort intent
  if (PRICE_ASC_KEYWORDS.some((kw) => q.includes(kw))) {
    result.sortBy = "price_asc";
  } else if (RATING_KEYWORDS.some((kw) => q.includes(kw))) {
    result.sortBy = "rating";
  }

  return result;
}
