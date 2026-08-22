import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTreatments, getCountries, getCities, type Treatment, type Country, type City } from "@/lib/services";
import { parseSearchQuery, type SearchableData } from "@/lib/aiSearchParser";
import { withLocalePrefix } from "@/lib/localePath";

interface AISearchBarProps {
  className?: string;
  /**
   * "bare" drops the badge, hint and arrow so a surrounding panel can supply
   * its own heading — the clinic-listing page does. Defaults to "full".
   */
  variant?: "full" | "bare";
  onResults?: (params: URLSearchParams) => void;
}

export function AISearchBar({ className, onResults, variant = "full" }: AISearchBarProps) {
  const navigate = useNavigate();
  const { lang } = useParams();
  const { t } = useTranslation("home");
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [data, setData] = useState<SearchableData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const exampleQueries = t("aiSearch.examples", { returnObjects: true }) as string[];

  useEffect(() => {
    (async () => {
      try {
        const [treatments, countries, cities] = await Promise.all([
          getTreatments(),
          getCountries(),
          getCities(),
        ]);
        setData({ treatments, countries, cities });
      } catch (e) {
        console.error("Failed to load AI search data:", e);
      }
    })();
  }, []);

  // Typewriter effect cycling through example queries. Keeps running all the
  // time, even while the box is focused — the browser only ever shows a
  // placeholder when the field is empty, so this naturally hides itself the
  // moment the patient types a character and resumes right where it left off
  // as soon as they clear the field again. No pause/resume logic needed.
  useEffect(() => {
    let exampleIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      const current = exampleQueries[exampleIndex];
      if (!deleting) {
        charIndex++;
        setPlaceholder(current.slice(0, charIndex) + (charIndex < current.length ? "|" : ""));
        if (charIndex === current.length) {
          deleting = true;
          timeoutId = setTimeout(tick, 2000);
          return;
        }
        timeoutId = setTimeout(tick, 45);
      } else {
        charIndex--;
        setPlaceholder(current.slice(0, charIndex) + "|");
        if (charIndex === 0) {
          deleting = false;
          exampleIndex = (exampleIndex + 1) % exampleQueries.length;
          timeoutId = setTimeout(tick, 400);
          return;
        }
        timeoutId = setTimeout(tick, 25);
      }
    };

    timeoutId = setTimeout(tick, 600);
    return () => clearTimeout(timeoutId);
    // Restarts cleanly whenever the site language changes (same component
    // instance across a locale switch — react-router doesn't remount it).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [exampleQueries.join("|")]);

  const buildParams = () => {
    if (!data) return null;
    const parsed = parseSearchQuery(query, data);
    const params = new URLSearchParams();
    if (parsed.treatmentId) params.set("treatment", parsed.treatmentId);
    if (parsed.countryId) params.set("country", parsed.countryId);
    if (parsed.cityId) params.set("city", parsed.cityId);
    if (parsed.languageCodes.length > 0) params.set("languages", parsed.languageCodes.join(","));
    if (parsed.sortBy) params.set("sort", parsed.sortBy);
    return params;
  };

  const handleSubmit = () => {
    if (!query.trim() || !data || submitting) return;
    setSubmitting(true);
    const params = buildParams();
    if (!params) {
      setSubmitting(false);
      return;
    }
    if (onResults) {
      onResults(params);
      setSubmitting(false);
    } else {
      navigate(withLocalePrefix(`/clinic-listing?${params.toString()}`, lang));
    }
  };

  return (
    <div className={className}>
      {variant === "full" && (
        <>
          <div className="flex justify-center mb-3">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-primary shadow-sm text-xs font-semibold tracking-wide">
              <Sparkles className="h-3.5 w-3.5" />
              {t("aiSearch.badge")}
            </span>
          </div>
          <p className="text-center mb-3 px-2">
            <span className="inline-block bg-white/90 text-foreground text-sm sm:text-base font-medium px-4 py-1.5 rounded-full shadow-sm">
              {t("aiSearch.hint")}
            </span>
          </p>
        </>
      )}
      <div className="relative">
        {variant === "full" && <svg
          viewBox="0 0 60 60"
          className="absolute -top-7 left-2 sm:left-10 w-9 h-9 sm:w-12 sm:h-12 -scale-x-100 animate-bounce"
          style={{ filter: "drop-shadow(0 1px 2px rgba(0,0,0,0.6)) drop-shadow(0 0 5px rgba(0,0,0,0.35))" }}
          aria-hidden="true"
        >
          <path
            d="M50 6 C 32 6, 14 16, 11 36"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
          />
          <path
            d="M11 36 L4 26 M11 36 L21 31"
            fill="none"
            stroke="white"
            strokeWidth="3"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>}
        <div className={`flex gap-2 rounded-2xl p-3 ${
          variant === "bare"
            // stacked under sm so the field is not squeezed to ~200px beside the button
            ? "flex-col items-stretch border border-border bg-white shadow-sm sm:flex-row sm:items-start"
            : "items-start bg-white/95 backdrop-blur-sm shadow-2xl"
        }`}>
          {/* icon + field stay on one row even when the button drops below */}
          <div className="flex min-w-0 flex-1 items-start gap-2">
          <Search className="h-5 w-5 text-muted-foreground ml-2 mt-2.5 shrink-0" />
          <textarea
            rows={2}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSubmit();
              }
            }}
            placeholder={placeholder}
            className="flex-1 py-2 bg-transparent outline-none resize-none text-base sm:text-lg text-foreground placeholder:text-muted-foreground/70 min-w-0"
          />
          </div>
          <Button
            onClick={handleSubmit}
            disabled={submitting || !query.trim() || !data}
            className={`h-12 shrink-0 rounded-xl px-6 font-semibold ${variant === "bare" ? "w-full bg-primary hover:bg-primary/90 sm:w-auto sm:self-center" : "self-center bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700"}`}
          >
            {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : t("aiSearch.search")}
          </Button>
        </div>
      </div>
    </div>
  );
}

export default AISearchBar;
