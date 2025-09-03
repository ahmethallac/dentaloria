import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { optimizeClinicImages } from "@/lib/imageUtils";

interface ClinicImage {
  id: string;
  image_url: string;
  is_primary: boolean | null;
}

interface Props {
  clinicId: string;
  images: ClinicImage[];
  onChanged?: () => void;
}

export default function ClinicImagesManager({ clinicId, images, onChanged }: Props) {
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setIsWorking(true);
    try {
      const optimized = await optimizeClinicImages(files);
      const toInsert: { clinic_id: string; image_url: string; is_primary: boolean }[] = [];

      await Promise.all(
        optimized.map(async (file, i) => {
          const path = `${clinicId}/${Date.now()}-${i}-${file.name}`;
          const { error: upErr } = await supabase.storage.from("clinic-images").upload(path, file);
          if (upErr) throw upErr;
          const {
            data: { publicUrl },
          } = supabase.storage.from("clinic-images").getPublicUrl(path);
          toInsert.push({ clinic_id: clinicId, image_url: publicUrl, is_primary: images.length === 0 && i === 0 });
        })
      );

      if (toInsert.length) {
        const { error } = await supabase.from("clinic_images").insert(toInsert);
        if (error) throw error;
      }

      toast({ title: "Uploaded", description: "Images added." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not upload images.", variant: "destructive" });
    } finally {
      setIsWorking(false);
      e.currentTarget.value = "";
    }
  };

  const setPrimary = async (imageId: string) => {
    setIsWorking(true);
    try {
      // set all false then one true
      await supabase.from("clinic_images").update({ is_primary: false }).eq("clinic_id", clinicId);
      const { error } = await supabase.from("clinic_images").update({ is_primary: true }).eq("id", imageId);
      if (error) throw error;
      toast({ title: "Updated", description: "Cover image set." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not set cover image.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (imageId: string) => {
    setIsWorking(true);
    try {
      const { error } = await supabase.from("clinic_images").delete().eq("id", imageId);
      if (error) throw error;
      toast({ title: "Deleted", description: "Image removed." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not delete image.", variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Images</h3>
        <label className="inline-flex items-center gap-2">
          <Input type="file" multiple accept="image/*" onChange={handleUpload} disabled={isWorking} />
        </label>
      </div>
      {images.length === 0 ? (
        <div className="text-sm text-muted-foreground">No images yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {images.map((img) => (
            <div key={img.id} className="relative border border-border/60 rounded-lg overflow-hidden">
              <img src={img.image_url} alt="clinic image" className="w-full h-32 object-cover" loading="lazy" />
              <div className="p-2 flex items-center justify-between gap-2">
                <Button size="sm" variant="outline" disabled={isWorking || !!img.is_primary} onClick={() => setPrimary(img.id)}>
                  {img.is_primary ? "Cover" : "Set as Cover"}
                </Button>
                <Button size="sm" variant="destructive" disabled={isWorking} onClick={() => remove(img.id)}>
                  Delete
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}