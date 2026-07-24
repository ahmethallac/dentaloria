import { useEffect, useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateClinic, type Clinic, type GoogleReview } from "@/lib/services";
import { SITE_LOCALES } from "@/i18n/siteLocales";

// Translates each review's text into every site locale (including English —
// Google reviews, unlike clinic descriptions, are often NOT originally in
// English, so we can't assume the stored text is already the English
// version) via a background, non-blocking OpenAI call per review (never
// during a visitor's page load — only right after a clinic admin
// links/refreshes their Google rating), then patches google_reviews with the
// translations attached. Silently no-ops on failure so a broken translation
// never disrupts the rating save itself.
const ALL_LOCALE_CODES = SITE_LOCALES.map((l) => l.code);

async function translateReviewsInBackground(
  clinicId: string,
  reviews: GoogleReview[],
  onUpdated?: (updated: Clinic) => void
) {
  if (!reviews.length) return;
  try {
    const translated = await Promise.all(
      reviews.map(async (review) => {
        if (!review.text?.trim()) return review;
        try {
          const { data, error } = await supabase.functions.invoke("translate-content", {
            body: { text: review.text, isHtml: false, targetLocales: ALL_LOCALE_CODES },
          });
          if (error || !data?.translations) return review;
          return { ...review, translations: data.translations as Record<string, string> };
        } catch {
          return review;
        }
      })
    );
    const patched = await updateClinic(clinicId, { google_reviews: translated });
    onUpdated?.(patched);
  } catch (e) {
    console.error("Background review translation failed:", e);
  }
}
import { useToast } from "@/hooks/use-toast";

const GOOGLE_MAPS_KEY = import.meta.env.VITE_GOOGLE_MAPS_BROWSER_KEY as string;

// Loads the Maps JS script at most once, no matter how many times this
// component mounts (e.g. switching panel tabs).
let mapsLoadPromise: Promise<void> | null = null;
function loadGoogleMaps(): Promise<void> {
  if (!mapsLoadPromise) {
    mapsLoadPromise = new Promise((resolve, reject) => {
      if ((window as any).google?.maps?.places?.PlaceAutocompleteElement) {
        resolve();
        return;
      }
      const script = document.createElement("script");
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_KEY}&libraries=places`;
      script.async = true;
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Failed to load Google Maps"));
      document.head.appendChild(script);
    });
  }
  return mapsLoadPromise;
}

interface RatingPreview {
  placeId: string;
  name: string | null;
  rating: number | null;
  reviewCount: number | null;
  reviews: GoogleReview[];
}

interface GoogleBusinessLinkProps {
  clinic: Clinic;
  onUpdated?: (updated: Clinic) => void;
}

export default function GoogleBusinessLink({ clinic, onUpdated }: GoogleBusinessLinkProps) {
  const { t } = useTranslation('clinicManagers');
  const { toast } = useToast();
  const containerRef = useRef<HTMLDivElement>(null);
  const currentPlaceId = clinic.google_place_id;

  const [searching, setSearching] = useState(!currentPlaceId);
  const [fetching, setFetching] = useState(false);
  const [preview, setPreview] = useState<RatingPreview | null>(null);

  const fetchRating = async (placeId: string) => {
    setFetching(true);
    setPreview(null);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-rating", {
        body: { placeId },
      });
      if (error) throw error;
      setPreview({
        placeId,
        name: data.name,
        rating: data.rating,
        reviewCount: data.reviewCount,
        reviews: data.reviews ?? [],
      });
    } catch (e) {
      console.error("Could not fetch Google rating:", e);
      toast({
        title: t('googleBusiness.toasts.fetchErrorTitle'),
        description: t('googleBusiness.toasts.fetchErrorDesc'),
        variant: "destructive",
      });
    } finally {
      setFetching(false);
    }
  };

  useEffect(() => {
    if (!searching) return;
    let cancelled = false;
    let element: any = null;
    loadGoogleMaps()
      .then(() => {
        if (cancelled || !containerRef.current) return;
        element = new (window as any).google.maps.places.PlaceAutocompleteElement();
        element.style.width = "100%";
        element.placeholder = t('googleBusiness.searchPlaceholder');
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(element);
        element.addEventListener("gmp-select", async (event: any) => {
          const place = event.placePrediction.toPlace();
          if (place?.id) fetchRating(place.id);
        });
      })
      .catch((e) => {
        console.error(e);
        toast({ title: t('googleBusiness.toasts.fetchErrorTitle'), description: t('googleBusiness.toasts.mapsLoadErrorDesc'), variant: "destructive" });
      });
    return () => {
      cancelled = true;
      element?.remove();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searching]);

  const handleConfirm = async () => {
    if (!preview) return;
    setFetching(true);
    try {
      const updated = await updateClinic(clinic.id, {
        google_place_id: preview.placeId,
        rating: preview.rating ?? clinic.rating,
        review_count: preview.reviewCount ?? clinic.review_count,
        google_reviews: preview.reviews,
        google_rating_synced_at: new Date().toISOString(),
      });
      toast({ title: t('googleBusiness.toasts.savedTitle'), description: t('googleBusiness.toasts.savedDesc') });
      onUpdated?.(updated);
      setPreview(null);
      setSearching(false);
      void translateReviewsInBackground(clinic.id, preview.reviews, onUpdated);
    } catch (e) {
      console.error("Could not save Google rating:", e);
      toast({ title: t('googleBusiness.toasts.fetchErrorTitle'), description: t('googleBusiness.toasts.saveErrorDesc'), variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  const handleRefresh = async () => {
    if (!currentPlaceId) return;
    setFetching(true);
    try {
      const { data, error } = await supabase.functions.invoke("fetch-google-rating", {
        body: { placeId: currentPlaceId },
      });
      if (error) throw error;
      const updated = await updateClinic(clinic.id, {
        rating: data.rating ?? clinic.rating,
        review_count: data.reviewCount ?? clinic.review_count,
        google_reviews: data.reviews ?? [],
        google_rating_synced_at: new Date().toISOString(),
      });
      toast({ title: t('googleBusiness.toasts.refreshedTitle'), description: t('googleBusiness.toasts.refreshedDesc') });
      onUpdated?.(updated);
      void translateReviewsInBackground(clinic.id, data.reviews ?? [], onUpdated);
    } catch (e) {
      console.error("Could not refresh Google rating:", e);
      toast({ title: t('googleBusiness.toasts.fetchErrorTitle'), description: t('googleBusiness.toasts.refreshErrorDesc'), variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">{t('googleBusiness.label')}</label>

      {!searching && currentPlaceId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{clinic.rating?.toFixed(1)}</span>
            <span className="text-muted-foreground">{t('googleBusiness.reviewsCount', { count: clinic.review_count })}</span>
            {clinic.google_rating_synced_at && (
              <span className="text-xs text-muted-foreground">
                {t('googleBusiness.syncedOn', { date: new Date(clinic.google_rating_synced_at).toLocaleDateString() })}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={fetching}>
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSearching(true)}>
              {t('googleBusiness.change')}
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div
            ref={containerRef}
            className="rounded-md border border-input px-1 [&_gmp-place-autocomplete]:w-full"
          />

          {fetching && !preview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> {t('googleBusiness.fetchingRating')}
            </div>
          )}

          {preview && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">{preview.name}</p>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{preview.rating ?? "—"}</span>
                <span className="text-muted-foreground">{t('googleBusiness.reviewsCount', { count: preview.reviewCount ?? 0 })}</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {preview.reviews.length > 0
                  ? t('googleBusiness.positiveReviews', { count: preview.reviews.length })
                  : t('googleBusiness.noReviews')}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleConfirm} disabled={fetching}>
                  {fetching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  {t('googleBusiness.confirmSave')}
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  {t('googleBusiness.searchAgain')}
                </Button>
              </div>
            </div>
          )}

          {currentPlaceId && !preview && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setSearching(false)}>
              {t('googleBusiness.cancel')}
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            {t('googleBusiness.footerNote')}
          </p>
        </div>
      )}
    </div>
  );
}
