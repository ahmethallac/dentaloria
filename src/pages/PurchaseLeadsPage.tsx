import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, ShoppingCart, Loader2, Tag, Check, X, AlertCircle } from "lucide-react";

const PRICE_CENTS = 2500;
const EXPIRY_MS = 48 * 60 * 60 * 1000;

interface LeadRow {
  id: string;
  name: string;
  email: string;
  created_at: string;
}

interface DiscountState {
  code: string;
  amountOffCents: number;
  finalCents: number;
  percentOff: number;
}

const maskEmail = (email: string) => {
  const [local, domain] = email.split("@");
  if (!domain) return "***@***";
  return `${local[0]}***@${domain[0]}***.${domain.split(".").pop()}`;
};

export default function PurchaseLeadsPage() {
  const { id: clinicId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [loaded, setLoaded] = useState(false);
  const [clinicName, setClinicName] = useState("");
  const [leads, setLeads] = useState<LeadRow[]>([]);
  const [droppedCount, setDroppedCount] = useState(0);

  const [codeInput, setCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [discount, setDiscount] = useState<DiscountState | null>(null);

  const [submitting, setSubmitting] = useState(false);

  const ids = useMemo(() => {
    const raw = searchParams.get("ids") || "";
    return raw.split(",").map((s) => s.trim()).filter(Boolean);
  }, [searchParams]);

  // Load leads + clinic
  useEffect(() => {
    if (!clinicId) return;
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }
    if (ids.length === 0) {
      navigate(`/clinic/${clinicId}/panel?section=patients`, { replace: true });
      return;
    }

    (async () => {
      const [reqRes, clinicRes, purchasedRes] = await Promise.all([
        supabase.from("contact_requests").select("id, name, email, created_at, clinic_id").in("id", ids),
        supabase.from("clinics").select("display_name, name").eq("id", clinicId).maybeSingle(),
        supabase.from("lead_purchases").select("contact_request_id").eq("clinic_id", clinicId).in("contact_request_id", ids),
      ]);

      const purchasedSet = new Set((purchasedRes.data || []).map((r: any) => r.contact_request_id));
      const now = Date.now();
      const valid: LeadRow[] = [];
      let dropped = 0;
      for (const r of (reqRes.data || []) as any[]) {
        if (r.clinic_id !== clinicId) { dropped++; continue; }
        if (purchasedSet.has(r.id)) { dropped++; continue; }
        if (now - new Date(r.created_at).getTime() > EXPIRY_MS) { dropped++; continue; }
        valid.push({ id: r.id, name: r.name, email: r.email, created_at: r.created_at });
      }
      dropped += ids.length - (reqRes.data?.length || 0);
      setLeads(valid);
      setDroppedCount(dropped);
      setClinicName((clinicRes.data as any)?.display_name || (clinicRes.data as any)?.name || "");
      setLoaded(true);
    })();
  }, [clinicId, user, authLoading, navigate, ids]);

  // Cancel toast
  useEffect(() => {
    const p = searchParams.get("purchase");
    if (p === "cancelled") {
      toast({ title: "Purchase cancelled", description: "No charge was made.", variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("purchase");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const subtotalCents = leads.length * PRICE_CENTS;
  const finalCents = discount ? discount.finalCents : subtotalCents;

  const applyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCode(true);
    try {
      const { data, error } = await supabase.rpc("validate_discount_code", {
        p_code: code,
        p_amount_cents: subtotalCents,
      });
      if (error) throw error;
      const v = data as any;
      if (!v?.valid) {
        toast({
          title: "Invalid code",
          description: reasonText(v?.reason),
          variant: "destructive",
        });
        setDiscount(null);
        return;
      }
      setDiscount({
        code: v.code,
        amountOffCents: v.amount_off_cents,
        finalCents: v.final_cents,
        percentOff: v.percent_off,
      });
      toast({ title: "Discount applied", description: `${v.code} — ${v.percent_off}% off` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not validate code.", variant: "destructive" });
    } finally {
      setApplyingCode(false);
    }
  };

  const removeCode = () => {
    setDiscount(null);
    setCodeInput("");
  };

  const handlePay = async () => {
    if (!clinicId || leads.length === 0) return;
    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-direct-lead-purchase", {
        body: {
          clinicId,
          requestIds: leads.map((l) => l.id),
          discountCode: discount?.code,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      if (data?.freeUnlock) {
        toast({
          title: "Leads unlocked",
          description: `${data.unlockedCount || leads.length} lead${(data.unlockedCount || leads.length) === 1 ? "" : "s"} unlocked for free.`,
        });
        navigate(`/clinic/${clinicId}/panel?section=patients&purchase=success`, { replace: true });
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not start purchase.", variant: "destructive" });
      setSubmitting(false);
    }
  };

  if (!loaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link
            to={`/clinic/${clinicId}/panel?section=patients`}
            className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground"
          >
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to clinic panel
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="w-5 h-5 text-primary" /> Purchase leads
            </CardTitle>
            <CardDescription>{clinicName}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {droppedCount > 0 && (
              <div className="flex items-start gap-2 p-3 rounded-md border border-destructive/30 bg-destructive/5 text-sm">
                <AlertCircle className="w-4 h-4 text-destructive mt-0.5" />
                <span>
                  {droppedCount} selected lead{droppedCount === 1 ? " was" : "s were"} removed
                  (already purchased, expired, or invalid).
                </span>
              </div>
            )}
            {leads.length === 0 ? (
              <div className="p-6 text-center text-muted-foreground">
                No purchasable leads. <Link to={`/clinic/${clinicId}/panel?section=patients`} className="text-primary hover:underline">Go back</Link>.
              </div>
            ) : (
              <div className="divide-y border rounded-md">
                {leads.map((l) => (
                  <div key={l.id} className="flex items-center justify-between p-3 text-sm">
                    <div className="min-w-0">
                      <div className="font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {maskEmail(l.email)} · {new Date(l.created_at).toLocaleString()}
                      </div>
                    </div>
                    <Badge variant="secondary">€{(PRICE_CENTS / 100).toFixed(2)}</Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {leads.length > 0 && (
          <>
            <Card className="mb-6">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Tag className="w-4 h-4 text-primary" /> Discount code
                </CardTitle>
                <CardDescription>Have a code? Apply it below.</CardDescription>
              </CardHeader>
              <CardContent>
                {discount ? (
                  <div className="flex items-center justify-between p-3 rounded-md border border-green-500/30 bg-green-500/5">
                    <div className="flex items-center gap-2 text-sm">
                      <Check className="w-4 h-4 text-green-600" />
                      <span><span className="font-semibold">{discount.code}</span> applied — {discount.percentOff}% off (−€{(discount.amountOffCents / 100).toFixed(2)})</span>
                    </div>
                    <Button size="sm" variant="ghost" onClick={removeCode}>
                      <X className="w-4 h-4 mr-1" /> Remove
                    </Button>
                  </div>
                ) : (
                  <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                    <div className="flex-1">
                      <Label htmlFor="discount-code">Code</Label>
                      <Input
                        id="discount-code"
                        placeholder="Enter code"
                        value={codeInput}
                        onChange={(e) => setCodeInput(e.target.value.toUpperCase())}
                        onKeyDown={(e) => { if (e.key === "Enter") applyCode(); }}
                      />
                    </div>
                    <Button onClick={applyCode} disabled={applyingCode || !codeInput.trim()} variant="outline">
                      {applyingCode ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                      Apply
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Order summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span>{leads.length} lead{leads.length === 1 ? "" : "s"} × €{(PRICE_CENTS / 100).toFixed(2)}</span>
                  <span>€{(subtotalCents / 100).toFixed(2)}</span>
                </div>
                {discount && (
                  <div className="flex justify-between text-green-700">
                    <span>Discount ({discount.code})</span>
                    <span>−€{(discount.amountOffCents / 100).toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between text-lg font-bold pt-2 border-t">
                  <span>Total</span>
                  <span>€{(finalCents / 100).toFixed(2)}</span>
                </div>
                <Button
                  className="w-full mt-4 bg-green-600 hover:bg-green-700 text-white"
                  size="lg"
                  onClick={handlePay}
                  disabled={submitting}
                >
                  {submitting ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                  {finalCents === 0 ? "Unlock for free" : `Pay €${(finalCents / 100).toFixed(2)}`}
                </Button>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}

function reasonText(reason?: string) {
  switch (reason) {
    case "not_found": return "This code does not exist.";
    case "inactive": return "This code is no longer active.";
    case "expired": return "This code has expired.";
    case "max_uses_reached": return "This code has reached its usage limit.";
    case "invalid_input": return "Please enter a valid code.";
    default: return "This code cannot be applied.";
  }
}
