import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ExternalLink, Star, MapPin } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { getClinicCardImageUrl } from "@/lib/imageUtils";
import { getLanguage } from "@/lib/clinicMeta";

export interface SubmittedFormValues {
  clinicId: string;
  name: string;
  email: string;
  phone: string;
  treatment?: string;
  message?: string;
}

interface RecommendedClinic {
  id: string;
  name: string;
  image_url: string | null;
  rating: number | null;
  city: string | null;
  languages: string[];
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  values: SubmittedFormValues | null;
}

export default function PostFormRecommendationsDialog({ open, onOpenChange, values }: Props) {
  const { toast } = useToast();
  const [clinics, setClinics] = useState<RecommendedClinic[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !values) return;
    setSentTo(new Set());
    setError(null);
    setClinics([]);
    setLoading(true);
    (async () => {
      try {
        const { data, error: invokeError } = await supabase.functions.invoke("recommend-clinics", {
          body: { excludeClinicId: values.clinicId },
        });

        if (invokeError) throw new Error(invokeError.message || "Could not load recommendations.");
        if (data?.error) throw new Error(data.error);

        const list = (data?.clinics as RecommendedClinic[]) || [];
        setClinics(list);
      } catch (e: any) {
        const message = e?.message || "Could not load recommendations.";
        setError(message);
        toast({ title: "Recommendations unavailable", description: message, variant: "destructive" });
        setClinics([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, values, toast]);

  const quickApply = async (clinic: RecommendedClinic) => {
    if (!values) return;
    setSending(clinic.id);
    try {
      const { data, error } = await supabase.functions.invoke("contact-clinic", {
        body: {
          clinicId: clinic.id,
          name: values.name,
          email: values.email,
          phone: values.phone,
          treatment: values.treatment,
          message: values.message || (values.treatment ? `Treatment: ${values.treatment}` : undefined),
        },
      });
      if (error) throw error;
      if ((data as any)?.error) throw new Error((data as any).error);
      setSentTo((prev) => new Set(prev).add(clinic.id));
      toast({ title: "Sent", description: `Your details were sent to ${clinic.name}.` });
    } catch (e: any) {
      toast({ title: "Could not send", description: e.message || "Please try again.", variant: "destructive" });
    } finally {
      setSending(null);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Apply to more clinics</DialogTitle>
          <DialogDescription>
            We recommend applying to at least 3 clinics to find the best one for you.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-12 text-muted-foreground">
            <Loader2 className="w-5 h-5 animate-spin mr-2" /> Finding clinics…
          </div>
        ) : clinics.length === 0 ? (
          <div className="text-center text-muted-foreground py-8 text-sm">
            {error ? (
              <span className="text-destructive">{error}</span>
            ) : (
              "No additional clinic recommendations available right now."
            )}
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {clinics.map((c) => {
              const isSent = sentTo.has(c.id);
              const visibleLangs = c.languages.slice(0, 3);
              const extraLangs = c.languages.length - visibleLangs.length;
              return (
                <div
                  key={c.id}
                  className="flex flex-row sm:flex-col rounded-xl border border-border/60 overflow-hidden bg-card shadow-sm"
                >
                  <div className="w-20 h-20 sm:w-full sm:h-auto shrink-0 sm:aspect-[4/3] bg-muted overflow-hidden">
                    {c.image_url ? (
                      <img
                        src={getClinicCardImageUrl(c.image_url)}
                        alt={c.name}
                        className="w-full h-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[9px] sm:text-xs text-center px-1 text-muted-foreground">
                        No image
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0 flex flex-col p-3 gap-1.5 sm:gap-2">
                    <div className="font-semibold text-sm leading-snug line-clamp-1 sm:line-clamp-2 sm:min-h-[2.5rem]">
                      {c.name}
                    </div>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      {c.rating != null && (
                        <span className="flex items-center gap-1">
                          <Star className="w-3.5 h-3.5 fill-yellow-400 text-yellow-400" />
                          <span className="font-medium text-foreground">{Number(c.rating).toFixed(1)}</span>
                        </span>
                      )}
                      {c.city && (
                        <span className="flex items-center gap-1 truncate">
                          <MapPin className="w-3.5 h-3.5 shrink-0" />
                          <span className="truncate">{c.city}</span>
                        </span>
                      )}
                    </div>
                    {visibleLangs.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {visibleLangs.map((code) => {
                          const l = getLanguage(code);
                          return (
                            <span
                              key={code}
                              className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium text-foreground/80"
                            >
                              <span aria-hidden>{l?.flag ?? "🏳️"}</span>
                              <span>{l?.name ?? code.toUpperCase()}</span>
                            </span>
                          );
                        })}
                        {extraLangs > 0 && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full bg-muted text-[10px] font-medium text-foreground/70">
                            +{extraLangs}
                          </span>
                        )}
                      </div>
                    )}
                    <div className="flex flex-row sm:flex-col gap-2 mt-1 sm:mt-auto sm:pt-2">
                      <Link to={`/clinic/${c.id}`} target="_blank" rel="noopener noreferrer" className="flex-1 sm:w-full">
                        <Button size="sm" variant="outline" className="w-full">
                          <ExternalLink className="w-3.5 h-3.5 mr-1" /> Visit
                        </Button>
                      </Link>
                      {isSent ? (
                        <Button size="sm" variant="secondary" disabled className="flex-1 sm:w-full">
                          <Check className="w-3.5 h-3.5 mr-1" /> Sent
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => quickApply(c)}
                          disabled={sending === c.id}
                          className="flex-1 sm:w-full"
                        >
                          {sending === c.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                          Quick Apply
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
