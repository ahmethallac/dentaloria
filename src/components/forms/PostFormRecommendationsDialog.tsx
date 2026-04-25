import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Loader2, Check, ExternalLink } from "lucide-react";
import { Link } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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
  const [sentTo, setSentTo] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !values) return;
    setSentTo(new Set());
    setLoading(true);
    (async () => {
      try {
        const { data, error } = await supabase.functions.invoke("recommend-clinics", {
          body: { excludeClinicId: values.clinicId },
        });
        if (error) throw error;
        setClinics((data?.clinics as RecommendedClinic[]) || []);
      } catch (e) {
        console.error("recommend-clinics error", e);
        setClinics([]);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, values]);

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
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Apply to more clinics</DialogTitle>
          <DialogDescription>
            We recommend applying to at least 3 clinics to find the best one for you.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3">
          {loading ? (
            <div className="flex items-center justify-center py-8 text-muted-foreground">
              <Loader2 className="w-5 h-5 animate-spin mr-2" /> Finding clinics…
            </div>
          ) : clinics.length === 0 ? (
            <div className="text-center text-muted-foreground py-6 text-sm">
              No additional clinic recommendations available right now.
            </div>
          ) : (
            clinics.map((c) => {
              const isSent = sentTo.has(c.id);
              return (
                <div key={c.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                  <div className="w-12 h-12 rounded-lg bg-muted overflow-hidden shrink-0">
                    {c.image_url ? (
                      <img src={c.image_url} alt={c.name} className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xs text-muted-foreground">No image</div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="font-medium truncate">{c.name}</div>
                  </div>
                  <div className="flex flex-col sm:flex-row gap-2 shrink-0">
                    <Link to={`/clinic/${c.id}`} target="_blank" rel="noopener noreferrer">
                      <Button size="sm" variant="outline">
                        <ExternalLink className="w-3.5 h-3.5 mr-1" /> Visit
                      </Button>
                    </Link>
                    {isSent ? (
                      <Button size="sm" variant="secondary" disabled>
                        <Check className="w-3.5 h-3.5 mr-1" /> Sent
                      </Button>
                    ) : (
                      <Button
                        size="sm"
                        onClick={() => quickApply(c)}
                        disabled={sending === c.id}
                      >
                        {sending === c.id ? <Loader2 className="w-3.5 h-3.5 mr-1 animate-spin" /> : null}
                        Quick Apply
                      </Button>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
