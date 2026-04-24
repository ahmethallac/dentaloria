import { useEffect, useMemo, useState } from "react";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { getTreatments, type Treatment } from "@/lib/services";

interface Props {
  clinicId: string;
  selections: { treatment_id: string; starting_price_euro?: number | null }[];
  onChanged?: () => void;
}

export default function ClinicTreatmentsManager({ clinicId, selections, onChanged }: Props) {
  const { toast } = useToast();
  const [allTreatments, setAllTreatments] = useState<Treatment[]>([]);
  // Store prices as strings so the input can be empty and the user can freely
  // edit/clear the value without a leading "0" getting stuck in front.
  const [selected, setSelected] = useState<Record<string, string>>(Object.fromEntries(
    selections.map((s) => {
      const v = s.starting_price_euro;
      return [s.treatment_id, v === null || v === undefined || Number(v) === 0 ? "" : String(v)];
    })
  ));
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const ts = await getTreatments();
        setAllTreatments(ts);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const toggle = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = { ...prev } as Record<string, string>;
      if (checked) {
        if (!(id in next)) next[id] = "";
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const updatePrice = (id: string, value: string) => {
    // Only digits and a single decimal separator.
    const cleaned = value.replace(/[^0-9.,]/g, "").replace(",", ".");
    setSelected((p) => ({ ...p, [id]: cleaned }));
  };

  const save = async () => {
    setSaving(true);
    try {
      // Replace all rows with current selections
      await supabase.from("clinic_treatments").delete().eq("clinic_id", clinicId);
      const rows = Object.entries(selected).map(([treatment_id, priceStr]) => ({
        clinic_id: clinicId,
        treatment_id,
        starting_price_euro: priceStr === "" ? null : Number(priceStr),
      }));
      if (rows.length) {
        const { error } = await supabase.from("clinic_treatments").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Saved", description: "Treatments updated." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not save treatments.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const allSelectedCount = useMemo(() => Object.keys(selected).length, [selected]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Treatments and Prices</h3>
        <div className="text-sm text-muted-foreground">Selected: {allSelectedCount}</div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Loading...</div>
      ) : (
        <div className="space-y-3">
          {allTreatments.map((t) => {
            const isChecked = t.id in selected;
            return (
              <div key={t.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
                <Checkbox checked={isChecked} onCheckedChange={(c) => toggle(t.id, Boolean(c))} />
                <div className="flex-1">
                  <Label className="font-medium">{t.name}</Label>
                </div>
                {isChecked && (
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-muted-foreground">Starting Price (EUR)</span>
                    <Input
                      // text + inputMode=decimal => no native spinner arrows,
                      // numeric keyboard on mobile, free editing of the value.
                      type="text"
                      inputMode="decimal"
                      placeholder="e.g. 1500"
                      value={selected[t.id] ?? ""}
                      onChange={(e) => updatePrice(t.id, e.target.value)}
                      className="w-28"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      <div className="flex justify-end">
        <Button onClick={save} disabled={saving}>{saving ? "Saving..." : "Save Treatments"}</Button>
      </div>
    </Card>
  );
}