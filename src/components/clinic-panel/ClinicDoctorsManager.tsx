import { useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { optimizeDoctorImages } from "@/lib/imageUtils";

interface Doctor {
  id: string;
  title: string | null;
  name: string;
  experience_years: number | null;
  profile_image_url?: string | null;
}

interface Props {
  clinicId: string;
  doctors: Doctor[];
  onChanged?: () => void;
}

export default function ClinicDoctorsManager({ clinicId, doctors, onChanged }: Props) {
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [list, setList] = useState<Doctor[]>(doctors);
  const [form, setForm] = useState<{ title: string; name: string; experience_years: number; image?: File | null }>({
    title: "Dr.",
    name: "",
    experience_years: 0,
    image: null,
  });

  const onField = (i: number, key: keyof Doctor, val: any) =>
    setList((prev) => prev.map((d, idx) => (idx === i ? { ...d, [key]: val } : d)));

  const add = async () => {
    if (!form.name || !form.image) {
      toast({ title: "Uyarı", description: "İsim ve görsel gerekli", variant: "destructive" });
      return;
    }
    setIsWorking(true);
    try {
      const [opt] = await optimizeDoctorImages([form.image]);
      const path = `${clinicId}/doctors/${Date.now()}-${opt.name}`;
      const { error: upErr } = await supabase.storage.from("doctor-images").upload(path, opt);
      if (upErr) throw upErr;
      const {
        data: { publicUrl },
      } = supabase.storage.from("doctor-images").getPublicUrl(path);

      const { data, error } = await supabase
        .from("doctors")
        .insert({ clinic_id: clinicId, title: form.title, name: form.name, experience_years: form.experience_years, profile_image_url: publicUrl })
        .select("*")
        .single();
      if (error) throw error;
      setList((prev) => [...prev, data as Doctor]);
      setForm({ title: "Dr.", name: "", experience_years: 0, image: null });
      toast({ title: "Eklendi", description: "Doktor eklendi." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Hata", description: "Doktor eklenemedi.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const save = async (doc: Doctor) => {
    setIsWorking(true);
    try {
      const { error } = await supabase
        .from("doctors")
        .update({ title: doc.title, name: doc.name, experience_years: doc.experience_years })
        .eq("id", doc.id);
      if (error) throw error;
      toast({ title: "Kaydedildi", description: "Doktor güncellendi." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Hata", description: "Doktor güncellenemedi.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (id: string) => {
    setIsWorking(true);
    try {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
      setList((prev) => prev.filter((d) => d.id !== id));
      toast({ title: "Silindi", description: "Doktor kaldırıldı." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Hata", description: "Doktor silinemedi.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <h3 className="text-lg font-semibold">Doktorlar</h3>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-3 items-end">
        <div>
          <Label>Ünvan</Label>
          <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} />
        </div>
        <div>
          <Label>Ad Soyad</Label>
          <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
        </div>
        <div>
          <Label>Deneyim (yıl)</Label>
          <Input
            type="number"
            min={0}
            value={form.experience_years}
            onChange={(e) => setForm((f) => ({ ...f, experience_years: parseInt(e.target.value) || 0 }))}
          />
        </div>
        <div className="flex gap-2">
          <Input type="file" accept="image/*" onChange={(e) => setForm((f) => ({ ...f, image: e.target.files?.[0] || null }))} />
          <Button onClick={add} disabled={isWorking}>Ekle</Button>
        </div>
      </div>

      <div className="space-y-3">
        {list.length === 0 ? (
          <div className="text-sm text-muted-foreground">Henüz doktor eklenmemiş.</div>
        ) : (
          list.map((d, i) => (
            <div key={d.id} className="p-3 border border-border/60 rounded-lg flex items-center gap-3">
              {d.profile_image_url && (
                <img src={d.profile_image_url} alt={d.name} className="w-12 h-12 rounded-full object-cover" loading="lazy" />
              )}
              <Input value={d.title || ""} onChange={(e) => onField(i, "title", e.target.value)} className="w-24" />
              <Input value={d.name} onChange={(e) => onField(i, "name", e.target.value)} className="flex-1" />
              <Input
                type="number"
                min={0}
                value={d.experience_years || 0}
                onChange={(e) => onField(i, "experience_years", parseInt(e.target.value) || 0)}
                className="w-28"
              />
              <div className="ml-auto flex gap-2">
                <Button variant="outline" onClick={() => save(d)} disabled={isWorking}>Kaydet</Button>
                <Button variant="destructive" onClick={() => remove(d.id)} disabled={isWorking}>Sil</Button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  );
}
