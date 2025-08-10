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
  const [selected, setSelected] = useState<Record<string, number>>(Object.fromEntries(
    selections.map((s) => [s.treatment_id, Number(s.starting_price_euro || 0)])
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
      const next = { ...prev } as Record<string, number>;
      if (checked) {
        if (!next[id]) next[id] = 0;
      } else {
        delete next[id];
      }
      return next;
    });
  };

  const updatePrice = (id: string, value: number) => setSelected((p) => ({ ...p, [id]: value }));

  const save = async () => {
    setSaving(true);
    try {
      // Replace all rows with current selections
      await supabase.from("clinic_treatments").delete().eq("clinic_id", clinicId);
      const rows = Object.entries(selected).map(([treatment_id, price]) => ({
        clinic_id: clinicId,
        treatment_id,
        starting_price_euro: price,
      }));
      if (rows.length) {
        const { error } = await supabase.from("clinic_treatments").insert(rows);
        if (error) throw error;
      }
      toast({ title: "Kaydedildi", description: "Tedaviler güncellendi." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Hata", description: "Tedaviler kaydedilemedi.", variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const allSelectedCount = useMemo(() => Object.keys(selected).length, [selected]);

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Tedaviler ve Fiyatlar</h3>
        <div className="text-sm text-muted-foreground">Seçili: {allSelectedCount}</div>
      </div>
      {loading ? (
        <div className="text-sm text-muted-foreground">Yükleniyor...</div>
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
                    <span className="text-sm text-muted-foreground">Başlangıç (EUR)</span>
                    <Input
                      type="number"
                      min={0}
                      step={0.01}
                      value={selected[t.id] ?? 0}
                      onChange={(e) => updatePrice(t.id, parseFloat(e.target.value) || 0)}
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
        <Button onClick={save} disabled={saving}>{saving ? "Kaydediliyor..." : "Tedavileri Kaydet"}</Button>
      </div>
    </Card>
  );
}
