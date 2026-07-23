import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Check } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { SITE_LOCALES } from "@/i18n/siteLocales";
import { LOCALE_CHOICE_KEY, JUST_REDIRECTED_KEY } from "./GeoRedirectGate";
import { withLocalePrefix } from "@/lib/localePath";
import { cn } from "@/lib/utils";

const SHOW_DELAY_MS = 2500;

// Appears ~2-3s after a geo-based redirect (see GeoRedirectGate), as a small
// centered dialog (not a full-page takeover) offering every site language.
// Only ever shows once per redirect (session-scoped), and dismissing it
// never re-shows it — it's a suggestion, not a nag.
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

  const currentLocale = SITE_LOCALES.find((l) => l.code === i18n.language);
  const languageName = currentLocale?.label || i18n.language;

  const chooseLocale = (code: string) => {
    localStorage.setItem(LOCALE_CHOICE_KEY, code);
    setVisible(false);
    const restOfPath = "/"; // dialog only ever appears right after landing on the redirected homepage
    navigate(withLocalePrefix(restOfPath, code === "en" ? undefined : code), { replace: true });
  };

  return (
    <Dialog open={visible} onOpenChange={setVisible}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>
            {t("message", { language: languageName, country: countryName || "" })}
          </DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 pt-1">
          {SITE_LOCALES.map((l) => {
            const isCurrent = l.code === i18n.language;
            return (
              <button
                key={l.code}
                type="button"
                disabled={isCurrent}
                onClick={() => chooseLocale(l.code)}
                className={cn(
                  "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm transition-colors",
                  isCurrent
                    ? "border-primary bg-primary/10 text-primary font-medium cursor-default"
                    : "border-border hover:border-primary/50 hover:bg-muted"
                )}
              >
                <span aria-hidden>{l.flag}</span>
                <span className="truncate">{l.label}</span>
                {isCurrent && <Check className="w-3.5 h-3.5 ml-auto shrink-0" />}
              </button>
            );
          })}
        </div>
      </DialogContent>
    </Dialog>
  );
}
