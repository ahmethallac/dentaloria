import { useEffect, useState, type ReactNode } from "react";
import { useLocation, useNavigate } from "react-router-dom";

export const LOCALE_CHOICE_KEY = "dentaloria_locale_choice";
export const JUST_REDIRECTED_KEY = "dentaloria_just_geo_redirected";

const GEO_TIMEOUT_MS = 1500;

const COUNTRY_TO_LOCALE: Record<string, string> = {
  TR: "tr",
  RO: "ro",
  PL: "pl",
  RU: "ru",
  DE: "de",
  AT: "de",
  CH: "de",
  FR: "fr",
  BE: "fr",
  LU: "fr",
};

interface JustRedirected {
  locale: string;
  countryName: string;
}

// Wraps the whole route tree. On a visitor's very first hit to the bare
// root path (no locale choice stored yet), briefly holds off rendering the
// page while a lightweight IP-geolocation lookup decides whether to
// redirect to a translated locale — this is what prevents any flash of
// English content before a translated version takes over. Deep links
// (anything other than "/") are never auto-redirected, and once a decision
// is made (geo-resolved or explicitly chosen) it's never repeated.
export function GeoRedirectGate({ children }: { children: ReactNode }) {
  const location = useLocation();
  const navigate = useNavigate();
  const [checking, setChecking] = useState(
    () => location.pathname === "/" && !localStorage.getItem(LOCALE_CHOICE_KEY)
  );

  useEffect(() => {
    if (!checking) return;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), GEO_TIMEOUT_MS);

    fetch("https://ipwho.is/", { signal: controller.signal })
      .then((r) => r.json())
      .then((data) => {
        const countryCode = data?.country_code as string | undefined;
        const countryName = (data?.country as string | undefined) || countryCode || "";
        const locale = countryCode ? COUNTRY_TO_LOCALE[countryCode] : undefined;
        localStorage.setItem(LOCALE_CHOICE_KEY, locale || "en");
        if (locale) {
          const payload: JustRedirected = { locale, countryName };
          sessionStorage.setItem(JUST_REDIRECTED_KEY, JSON.stringify(payload));
          navigate(`/${locale}`, { replace: true });
        }
      })
      .catch(() => {
        // Geo lookup failed or timed out — stay on English, never block the homepage.
        localStorage.setItem(LOCALE_CHOICE_KEY, "en");
      })
      .finally(() => {
        clearTimeout(timeoutId);
        setChecking(false);
      });

    return () => {
      clearTimeout(timeoutId);
      controller.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return <>{children}</>;
}
