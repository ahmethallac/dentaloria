import { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate, useSearchParams, Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowLeft, Wallet, Loader2, Check, Tag, X } from "lucide-react";

const PRICE_CENTS = 2500;

interface Pkg {
  leads: number;
  amountCents: number;
  highlight?: boolean;
}

const PACKAGES: Pkg[] = [
  { leads: 2, amountCents: 5000 },
  { leads: 5, amountCents: 12000, highlight: true },
  { leads: 10, amountCents: 23000 },
  { leads: 20, amountCents: 44000 },
];

export default function BalanceTopupPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, loading: authLoading } = useAuth();

  const [balanceCents, setBalanceCents] = useState(0);
  const [clinicName, setClinicName] = useState("");
  const [loaded, setLoaded] = useState(false);
  const [submitting, setSubmitting] = useState<number | "custom" | null>(null);
  const [customEuros, setCustomEuros] = useState<string>("");
  const [codeInput, setCodeInput] = useState("");
  const [applyingCode, setApplyingCode] = useState(false);
  const [discount, setDiscount] = useState<{ code: string; percentOff: number } | null>(null);

  useEffect(() => {
    if (!id) return;
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    (async () => {
      const [balRes, clinicRes] = await Promise.all([
        supabase.from("clinic_balances").select("balance_cents").eq("clinic_id", id).maybeSingle(),
        supabase.from("clinics").select("display_name, name").eq("id", id).maybeSingle(),
      ]);
      setBalanceCents(balRes.data?.balance_cents ?? 0);
      setClinicName((clinicRes.data as any)?.display_name || (clinicRes.data as any)?.name || "");
      setLoaded(true);
    })();

    // Live updates
    const channel = supabase
      .channel(`balance-topup-${id}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "clinic_balances", filter: `clinic_id=eq.${id}` },
        (payload: any) => {
          if (payload.new?.balance_cents != null) setBalanceCents(payload.new.balance_cents);
        }
      )
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [id, user, authLoading, navigate]);

  // Toast on Stripe return
  useEffect(() => {
    const t = searchParams.get("topup");
    if (t === "success") {
      toast({ title: "Top-up received", description: "Your balance has been credited." });
      const next = new URLSearchParams(searchParams);
      next.delete("topup");
      setSearchParams(next, { replace: true });
    } else if (t === "cancelled") {
      toast({ title: "Top-up cancelled", description: "No charge was made.", variant: "destructive" });
      const next = new URLSearchParams(searchParams);
      next.delete("topup");
      setSearchParams(next, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const leads = useMemo(() => Math.floor(balanceCents / PRICE_CENTS), [balanceCents]);

  const startTopup = async (amountCents: number, key: number | "custom") => {
    if (!id) return;
    setSubmitting(key);
    try {
      const { data, error } = await supabase.functions.invoke("create-balance-topup", {
        body: { clinicId: id, amountCents, discountCode: discount?.code },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      if (data?.credited) {
        toast({ title: "Balance credited", description: "Your discounted top-up is complete." });
        const { data: bal } = await supabase
          .from("clinic_balances").select("balance_cents").eq("clinic_id", id).maybeSingle();
        setBalanceCents(bal?.balance_cents ?? balanceCents);
        setSubmitting(null);
        return;
      }
      if (data?.url) {
        window.location.href = data.url;
        return;
      }
      throw new Error("No checkout URL returned");
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not start top-up.", variant: "destructive" });
      setSubmitting(null);
    }
  };

  const applyCode = async () => {
    const code = codeInput.trim().toUpperCase();
    if (!code) return;
    setApplyingCode(true);
    try {
      // Validate against a placeholder amount (€25) — server re-validates against actual amount on purchase
      const { data, error } = await supabase.rpc("validate_discount_code", {
        p_code: code,
        p_amount_cents: 2500,
      });
      if (error) throw error;
      const v = data as any;
      if (!v?.valid) {
        toast({ title: "Invalid code", description: v?.reason || "Code cannot be applied.", variant: "destructive" });
        setDiscount(null);
        return;
      }
      setDiscount({ code: v.code, percentOff: v.percent_off });
      toast({ title: "Discount ready", description: `${v.code} — ${v.percent_off}% off applies at checkout` });
    } catch (e: any) {
      toast({ title: "Error", description: e.message || "Could not validate code.", variant: "destructive" });
    } finally {
      setApplyingCode(false);
    }
  };

  const removeCode = () => { setDiscount(null); setCodeInput(""); };

  const handleCustom = () => {
    const euros = parseFloat(customEuros.replace(",", "."));
    if (isNaN(euros) || euros < 25) {
      toast({ title: "Invalid amount", description: "Minimum top-up is €25.", variant: "destructive" });
      return;
    }
    const amountCents = Math.round(euros * 100);
    startTopup(amountCents, "custom");
  };

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8 max-w-4xl">
        <div className="mb-6">
          <Link to={`/clinic/${id}/panel?section=patients`} className="inline-flex items-center text-sm text-muted-foreground hover:text-foreground">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back to clinic panel
          </Link>
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Wallet className="w-5 h-5 text-primary" /> Add balance
            </CardTitle>
            <CardDescription>{clinicName}</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3">
              <div>
                <div className="text-sm text-muted-foreground">Current balance</div>
                <div className="text-3xl font-bold">{loaded ? `€${(balanceCents / 100).toFixed(2)}` : "…"}</div>
                <div className="text-sm text-muted-foreground">
                  {leads} lead{leads === 1 ? "" : "s"} remaining (€25 per lead)
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          {PACKAGES.map((pkg) => (
            <Card
              key={pkg.amountCents}
              className={`relative ${pkg.highlight ? "border-primary/60 ring-1 ring-primary/30" : ""}`}
            >
              {pkg.highlight && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 bg-primary text-primary-foreground text-xs px-2 py-0.5 rounded-full">
                  Most popular
                </div>
              )}
              <CardContent className="pt-6 text-center space-y-2">
                <div className="text-3xl font-bold">{pkg.leads}</div>
                <div className="text-xs text-muted-foreground uppercase tracking-wider">leads</div>
                <div className="text-xl font-semibold text-primary">€{(pkg.amountCents / 100).toFixed(0)}</div>
                <Button
                  className="w-full mt-2 bg-green-600 hover:bg-green-700 text-white"
                  onClick={() => startTopup(pkg.amountCents, pkg.amountCents)}
                  disabled={submitting !== null}
                >
                  {submitting === pkg.amountCents ? (
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  ) : (
                    <Check className="w-4 h-4 mr-2" />
                  )}
                  Buy now
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>

        <Card className="mb-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Tag className="w-4 h-4 text-primary" /> Discount code
            </CardTitle>
            <CardDescription>Apply a code to discount your top-up.</CardDescription>
          </CardHeader>
          <CardContent>
            {discount ? (
              <div className="flex items-center justify-between p-3 rounded-md border border-green-500/30 bg-green-500/5">
                <div className="flex items-center gap-2 text-sm">
                  <Check className="w-4 h-4 text-green-600" />
                  <span><span className="font-semibold">{discount.code}</span> — {discount.percentOff}% off will apply at checkout</span>
                </div>
                <Button size="sm" variant="ghost" onClick={removeCode}>
                  <X className="w-4 h-4 mr-1" /> Remove
                </Button>
              </div>
            ) : (
              <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="topup-code">Code</Label>
                  <Input
                    id="topup-code"
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
            <CardTitle className="text-base">Custom amount</CardTitle>
            <CardDescription>Minimum €25.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col sm:flex-row gap-3 items-stretch sm:items-end">
              <div className="flex-1">
                <Label htmlFor="custom-amount">Amount (€)</Label>
                <Input
                  id="custom-amount"
                  type="number"
                  min={25}
                  step={1}
                  placeholder="e.g. 100"
                  value={customEuros}
                  onChange={(e) => setCustomEuros(e.target.value)}
                />
              </div>
              <Button
                onClick={handleCustom}
                disabled={submitting !== null || !customEuros}
                className="bg-green-600 hover:bg-green-700 text-white"
              >
                {submitting === "custom" ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
                Top up
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
