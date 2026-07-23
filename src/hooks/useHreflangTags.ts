import { useEffect } from "react";
import { useLocation } from "react-router-dom";
import { PREFIXED_LOCALE_CODES, isSupportedLocale } from "@/i18n/siteLocales";

const SITE_ORIGIN = "https://dentaloria.com";

// Mounted once at the app root (not per-page) so every route automatically
// gets hreflang alternates + a canonical tag without each page needing to
// call it. Derives the current locale from the URL path itself rather than
// useParams() — this component sits above <Routes>, so useParams() would
// always return {} here (same pitfall as LocaleSuggestionBanner earlier).
export const useHreflangTags = () => {
  const location = useLocation();

  useEffect(() => {
    const segments = location.pathname.split("/").filter(Boolean);
    const maybeLocale = segments[0];
    const hasLocalePrefix = isSupportedLocale(maybeLocale);
    const barePath = hasLocalePrefix ? `/${segments.slice(1).join("/")}` : location.pathname;
    const normalizedBare = barePath === "" ? "/" : barePath;

    const buildHref = (localePrefix?: string) => {
      const path = localePrefix
        ? normalizedBare === "/" ? `/${localePrefix}` : `/${localePrefix}${normalizedBare}`
        : normalizedBare;
      return `${SITE_ORIGIN}${path}`;
    };

    document.querySelectorAll('link[rel="alternate"][data-hreflang]').forEach((el) => el.remove());

    const addAlternate = (hreflang: string, href: string) => {
      const link = document.createElement("link");
      link.rel = "alternate";
      link.hreflang = hreflang;
      link.href = href;
      link.setAttribute("data-hreflang", "1");
      document.head.appendChild(link);
    };

    addAlternate("en", buildHref());
    addAlternate("x-default", buildHref());
    for (const code of PREFIXED_LOCALE_CODES) {
      addAlternate(code, buildHref(code));
    }

    let canonical = document.querySelector('link[rel="canonical"]') as HTMLLinkElement | null;
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.appendChild(canonical);
    }
    canonical.href = `${SITE_ORIGIN}${location.pathname}`;

    return () => {
      document.querySelectorAll('link[rel="alternate"][data-hreflang]').forEach((el) => el.remove());
    };
  }, [location.pathname]);
};
