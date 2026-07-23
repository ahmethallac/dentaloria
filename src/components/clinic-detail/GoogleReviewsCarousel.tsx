import { useMemo } from "react";
import { useTranslation } from "react-i18next";
import { Star } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import type { GoogleReview } from "@/lib/services";
import { localizedField } from "@/lib/i18nContent";

const shuffle = <T,>(arr: T[]): T[] => {
  const copy = [...arr];
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
};

const getInitials = (name: string) =>
  name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase() || "G";

interface GoogleReviewsCarouselProps {
  reviews: GoogleReview[];
  lang?: string;
}

export default function GoogleReviewsCarousel({ reviews, lang }: GoogleReviewsCarouselProps) {
  const { t } = useTranslation("clinicDetail");
  // Re-shuffled on every mount (page load), so the same clinic shows its
  // handful of reviews in a different order each visit.
  const shuffled = useMemo(() => shuffle(reviews), [reviews]);

  if (shuffled.length === 0) return null;

  return (
    <div>
      <h2 className="text-lg font-semibold mb-1">{t("googleReviews.title")}</h2>
      <p className="text-xs text-muted-foreground mb-3">
        {t("googleReviews.subtitle")}
      </p>
      <div className="relative overflow-hidden">
        <div className="pointer-events-none absolute inset-y-0 left-0 w-12 md:w-24 bg-gradient-to-r from-background to-transparent z-10" />
        <div className="pointer-events-none absolute inset-y-0 right-0 w-12 md:w-24 bg-gradient-to-l from-background to-transparent z-10" />

        <div className="flex w-max gap-4 animate-marquee hover:[animation-play-state:paused]">
          {[...shuffled, ...shuffled].map((r, i) => (
            <Card key={`${r.authorName}-${r.time}-${i}`} className="w-72 shrink-0">
              <CardContent className="p-4 space-y-2">
                <div className="flex items-center gap-2">
                  {r.profilePhotoUrl ? (
                    <img
                      src={r.profilePhotoUrl}
                      alt={r.authorName}
                      className="w-8 h-8 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-primary/10 text-primary text-xs font-semibold flex items-center justify-center">
                      {getInitials(r.authorName)}
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{r.authorName}</p>
                    <p className="text-xs text-muted-foreground">{r.relativeTimeDescription}</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {Array.from({ length: 5 }).map((_, idx) => (
                    <Star
                      key={idx}
                      className={`w-3.5 h-3.5 ${
                        idx < (r.rating ?? 0) ? "fill-yellow-400 text-yellow-400" : "text-muted-foreground/30"
                      }`}
                    />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground line-clamp-4">
                  {localizedField(r.text, r.translations, lang || "en")}
                </p>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}
