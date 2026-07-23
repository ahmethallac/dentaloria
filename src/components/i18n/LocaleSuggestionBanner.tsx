import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { SITE_LOCALES } from "@/i18n/siteLocales";
import { LOCALE_CHOICE_KEY, JUST_REDIRECTED_KEY } from "./GeoRedirectGate";
import { withLocalePrefix } from "@/lib/localePath";

const SHOW_DELAY_MS = 2500;

// Appears ~2-3s after a geo-based redirect (see GeoRedirectGate), offering a
// quick way to switch back or to any other locale. Only ever shows once per
// redirect (session-scoped), and dismissing it never re-shows it — it's a
// suggestion, not a nag.
export function LocaleSuggestionBanner() {
  const { t, i18n } = useTranslation("geoPopup");
  const navigate = useNavigate();
  const [visible, setVisible] = useState(false);
  const [countryName, setCountryName] = useState<string | null>(null);

  useEffect(() => {
    const raw = sessionStorage.getItem(JUST_REDIRECTED_KEY);
    if (!raw) return;
    sessionStorage.removeItem(JUST_REDIRECTED_KEY);
    try {
      const { countryName: cn } = JSON.parse(raw);
      setCountryName(cn || null);
    } catch {
      // ignore malformed payload
    }
    const timeoutId = setTimeout(() => setVisible(true), SHOW_DELAY_MS);
    return () => clearTimeout(timeoutId);
  }, []);

  if (!visible) return null;

  const currentLocale = SITE_LOCALES.find((l) => l.code === i18n.language);
  const languageName = currentLocale?.label || i18n.language;

  const chooseLocale = (code: string) => {
    localStorage.setItem(LOCALE_CHOICE_KEY, code);
    setVisible(false);
    const restOfPath = "/"; // banner only ever appears right after landing on the redirected homepage
    navigate(withLocalePrefix(restOfPath, code === "en" ? undefined : code), { replace: true });
  };

  return (
    <div className="fixed bottom-4 inset-x-4 sm:inset-x-auto sm:right-4 sm:max-w-sm z-[100] rounded-2xl border border-border bg-background shadow-2xl p-4 animate-fade-in">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-foreground pr-2">
          {t("message", { language: languageName, country: countryName || "" })}
        </p>
        <button
          type="button"
          aria-label={t("dismiss")}
          onClick={() => setVisible(false)}
          className="shrink-0 text-muted-foreground hover:text-foreground transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5 mt-3">
        {SITE_LOCALES.filter((l) => l.code !== i18n.language).map((l) => (
          <Button
            key={l.code}
            type="button"
            variant="outline"
            size="sm"
            className="h-8 px-2.5 text-xs"
            onClick={() => chooseLocale(l.code)}
          >
            <span className="mr-1">{l.flag}</span>
            {l.label}
          </Button>
        ))}
      </div>
    </div>
  );
}
