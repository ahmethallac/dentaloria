import { useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { ArrowLeft, ArrowRight, Trash2 } from "lucide-react";

interface BeforeAfterImage {
  id: string;
  image_url: string;
  sort_order: number;
}

interface Props {
  clinicId: string;
}

export default function ClinicBeforeAfterManager({ clinicId }: Props) {
  const { toast } = useToast();
  const [items, setItems] = useState<BeforeAfterImage[]>([]);
  const [isWorking, setIsWorking] = useState(false);

  const load = async () => {
    const { data, error } = await supabase
      .from("clinic_before_after_images")
      .select("id, image_url, sort_order")
      .eq("clinic_id", clinicId)
      .order("sort_order", { ascending: true })
      .order("created_at", { ascending: true });
    if (error) {
      console.error(error);
      return;
    }
    setItems((data as BeforeAfterImage[]) || []);
  };

  useEffect(() => {
    if (clinicId) void load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clinicId]);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;
    setIsWorking(true);
    try {
      const startOrder = items.length;
      let i = 0;
      for (const file of files) {
        const path = `before-after/${clinicId}/${Date.now()}-${file.name}`;
        const { error: upErr } = await supabase.storage
          .from("clinic-images")
          .upload(path, file);
        if (upErr) throw upErr;
        const {
          data: { publicUrl },
        } = supabase.storage.from("clinic-images").getPublicUrl(path);
        const { error } = await supabase
          .from("clinic_before_after_images")
          .insert({
            clinic_id: clinicId,
            image_url: publicUrl,
            sort_order: startOrder + i,
          });
        if (error) throw error;
        i++;
      }
      toast({ title: "Uploaded", description: "Before/after photos added." });
      await load();
    } catch (err: any) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not upload photo.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (id: string) => {
    setIsWorking(true);
    try {
      const { error } = await supabase
        .from("clinic_before_after_images")
        .delete()
        .eq("id", id);
      if (error) throw error;
      await load();
    } catch (err) {
      console.error(err);
      toast({
        title: "Error",
        description: "Could not delete photo.",
        variant: "destructive",
      });
    } finally {
      setIsWorking(false);
    }
  };

  const swap = async (idx: number, dir: -1 | 1) => {
    const j = idx + dir;
    if (j < 0 || j >= items.length) return;
    const a = items[idx];
    const b = items[j];
    setIsWorking(true);
    try {
      await supabase
        .from("clinic_before_after_images")
        .update({ sort_order: b.sort_order })
        .eq("id", a.id);
      await supabase
        .from("clinic_before_after_images")
        .update({ sort_order: a.sort_order })
        .eq("id", b.id);
      await load();
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4 gap-3 flex-wrap">
        <div>
          <h3 className="text-lg font-semibold">Before & After Photos</h3>
          <p className="text-xs text-muted-foreground">
            Landscape photos work best. Shown as a carousel on your public page.
          </p>
        </div>
        <Input
          type="file"
          multiple
          accept="image/*"
          onChange={handleFileSelect}
          disabled={isWorking}
          className="max-w-xs"
        />
      </div>
      {items.length === 0 ? (
        <div className="text-sm text-muted-foreground">No before/after photos yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {items.map((img, idx) => (
            <div
              key={img.id}
              className="relative border border-border/60 rounded-lg overflow-hidden"
            >
              <div className="aspect-video bg-muted">
                <img
                  src={img.image_url}
                  alt="before/after"
                  className="w-full h-full object-cover"
                  loading="lazy"
                />
              </div>
              <div className="p-2 flex items-center justify-between gap-1">
                <div className="flex gap-1">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isWorking || idx === 0}
                    onClick={() => swap(idx, -1)}
                  >
                    <ArrowLeft className="w-3 h-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={isWorking || idx === items.length - 1}
                    onClick={() => swap(idx, 1)}
                  >
                    <ArrowRight className="w-3 h-3" />
                  </Button>
                </div>
                <Button
                  size="sm"
                  variant="destructive"
                  disabled={isWorking}
                  onClick={() => remove(img.id)}
                >
                  <Trash2 className="w-3 h-3" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
