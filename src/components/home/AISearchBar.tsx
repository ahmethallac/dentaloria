import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Search, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { getTreatments, getCountries, getCities, type Treatment, type Country, type City } from "@/lib/services";
import { parseSearchQuery, type SearchableData } from "@/lib/aiSearchParser";

const EXAMPLE_QUERIES = [
  "Cheapest dental implant clinics in Antalya",
  "Highest rated Hollywood Smile clinics in Istanbul",
  "Dental clinics in Antalya that speak Polish",
  "Best veneers clinics in Izmir",
  "Affordable teeth whitening in Istanbul",
];

interface AISearchBarProps {
  className?: string;
  onResults?: (params: URLSearchParams) => void;
}

export function AISearchBar({ className, onResults }: AISearchBarProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [placeholder, setPlaceholder] = useState("");
  const [data, setData] = useState<SearchableData | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const typingPaused = useRef(false);

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

  // Typewriter effect cycling through example queries; pauses while the user is typing.
  useEffect(() => {
    let exampleIndex = 0;
    let charIndex = 0;
    let deleting = false;
    let timeoutId: ReturnType<typeof setTimeout>;

    const tick = () => {
      if (typingPaused.current) {
        timeoutId = setTimeout(tick, 300);
        return;
      }
      const current = EXAMPLE_QUERIES[exampleIndex];
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
          exampleIndex = (exampleIndex + 1) % EXAMPLE_QUERIES.length;
          timeoutId = setTimeout(tick, 400);
          return;
        }
        timeoutId = setTimeout(tick, 25);
      }
    };

    timeoutId = setTimeout(tick, 600);
    return () => clearTimeout(timeoutId);
  }, []);

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
      navigate(`/clinic-listing?${params.toString()}`);
    }
  };

  return (
    <div className={className}>
      <div className="flex justify-center mb-3">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white text-primary shadow-sm text-xs font-semibold tracking-wide">
          <Sparkles className="h-3.5 w-3.5" />
          AI-powered search
        </span>
      </div>
      <div className="bg-white/95 backdrop-blur-sm rounded-2xl p-2 shadow-2xl flex items-center gap-2">
        <Search className="h-5 w-5 text-muted-foreground ml-3 shrink-0" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => (typingPaused.current = true)}
          onBlur={() => {
            if (!query) typingPaused.current = false;
          }}
          onKeyDown={(e) => e.key === "Enter" && handleSubmit()}
          placeholder={placeholder}
          className="flex-1 h-12 bg-transparent outline-none text-base text-foreground placeholder:text-muted-foreground/70 min-w-0"
        />
        <Button
          onClick={handleSubmit}
          disabled={submitting || !query.trim() || !data}
          className="h-12 px-6 bg-gradient-to-r from-primary to-blue-600 hover:from-blue-600 hover:to-blue-700 rounded-xl font-semibold shrink-0"
        >
          {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : "Search"}
        </Button>
      </div>
    </div>
  );
}

export default AISearchBar;
