import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, RefreshCw, Star } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { updateClinic, type Clinic, type GoogleReview } from "@/lib/services";
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
        title: "Error",
        description: "Could not fetch the Google rating for this business.",
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
        containerRef.current.innerHTML = "";
        containerRef.current.appendChild(element);
        element.addEventListener("gmp-select", async (event: any) => {
          const place = event.placePrediction.toPlace();
          if (place?.id) fetchRating(place.id);
        });
      })
      .catch((e) => {
        console.error(e);
        toast({ title: "Error", description: "Could not load Google search.", variant: "destructive" });
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
      toast({ title: "Success", description: "Google rating linked and saved." });
      onUpdated?.(updated);
      setPreview(null);
      setSearching(false);
    } catch (e) {
      console.error("Could not save Google rating:", e);
      toast({ title: "Error", description: "Could not save the Google rating.", variant: "destructive" });
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
      toast({ title: "Success", description: "Rating refreshed from Google." });
      onUpdated?.(updated);
    } catch (e) {
      console.error("Could not refresh Google rating:", e);
      toast({ title: "Error", description: "Could not refresh the rating.", variant: "destructive" });
    } finally {
      setFetching(false);
    }
  };

  return (
    <div>
      <label className="text-sm font-medium mb-2 block">Google Rating</label>

      {!searching && currentPlaceId ? (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border p-3">
          <div className="flex items-center gap-2 text-sm">
            <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
            <span className="font-semibold">{clinic.rating?.toFixed(1)}</span>
            <span className="text-muted-foreground">({clinic.review_count} reviews)</span>
            {clinic.google_rating_synced_at && (
              <span className="text-xs text-muted-foreground">
                · synced {new Date(clinic.google_rating_synced_at).toLocaleDateString()}
              </span>
            )}
          </div>
          <div className="flex gap-2">
            <Button type="button" variant="outline" size="sm" onClick={handleRefresh} disabled={fetching}>
              {fetching ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
            </Button>
            <Button type="button" variant="outline" size="sm" onClick={() => setSearching(true)}>
              Change
            </Button>
          </div>
        </div>
      ) : (
        <div className="space-y-2">
          <div ref={containerRef} className="[&_gmp-place-autocomplete]:w-full" />

          {fetching && !preview && (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="w-4 h-4 animate-spin" /> Fetching rating…
            </div>
          )}

          {preview && (
            <div className="rounded-lg border border-primary/30 bg-primary/5 p-3 space-y-2">
              <p className="text-sm font-medium">{preview.name}</p>
              <div className="flex items-center gap-1 text-sm">
                <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                <span>{preview.rating ?? "—"}</span>
                <span className="text-muted-foreground">({preview.reviewCount ?? 0} reviews)</span>
              </div>
              <p className="text-xs text-muted-foreground">
                {preview.reviews.length > 0
                  ? `${preview.reviews.length} positive review${preview.reviews.length > 1 ? "s" : ""} will be shown on your clinic page.`
                  : "No 4-5 star reviews were found to show on your clinic page."}
              </p>
              <div className="flex gap-2">
                <Button type="button" size="sm" onClick={handleConfirm} disabled={fetching}>
                  {fetching ? <Loader2 className="w-4 h-4 animate-spin mr-1" /> : null}
                  Confirm & Save
                </Button>
                <Button type="button" size="sm" variant="ghost" onClick={() => setPreview(null)}>
                  Search again
                </Button>
              </div>
            </div>
          )}

          {currentPlaceId && !preview && (
            <Button type="button" size="sm" variant="ghost" onClick={() => setSearching(false)}>
              Cancel
            </Button>
          )}

          <p className="text-xs text-muted-foreground">
            Search your business name, select it from the Google suggestions below, and we'll pull your real rating
            automatically.
          </p>
        </div>
      )}
    </div>
  );
}
