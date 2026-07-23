import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import ImageCropDialog from "@/components/ui/ImageCropDialog";

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
  const { t } = useTranslation('clinicManagers');
  const { toast } = useToast();
  const [isWorking, setIsWorking] = useState(false);
  const [cropQueue, setCropQueue] = useState<File[]>([]);
  const [currentCropFile, setCurrentCropFile] = useState<File | null>(null);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setCropQueue(files.slice(1));
    setCurrentCropFile(files[0]);
    e.target.value = "";
  };

  const uploadCroppedFile = async (file: File) => {
    setIsWorking(true);
    try {
      const path = `${clinicId}/${Date.now()}-${file.name}`;
      const { error: upErr } = await supabase.storage.from("clinic-images").upload(path, file);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("clinic-images").getPublicUrl(path);

      const { error } = await supabase.from("clinic_images").insert({
        clinic_id: clinicId,
        image_url: publicUrl,
        is_primary: images.length === 0,
      });
      if (error) throw error;

      toast({ title: t('images.toasts.uploadedTitle'), description: t('images.toasts.uploadedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('images.toasts.errorTitle'), description: t('images.toasts.uploadErrorDesc'), variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const handleCropConfirm = async (croppedFile: File) => {
    await uploadCroppedFile(croppedFile);
    if (cropQueue.length > 0) {
      setCurrentCropFile(cropQueue[0]);
      setCropQueue((prev) => prev.slice(1));
    } else {
      setCurrentCropFile(null);
    }
  };

  const handleCropCancel = () => {
    if (cropQueue.length > 0) {
      setCurrentCropFile(cropQueue[0]);
      setCropQueue((prev) => prev.slice(1));
    } else {
      setCurrentCropFile(null);
    }
  };

  const setPrimary = async (imageId: string) => {
    setIsWorking(true);
    try {
      await supabase.from("clinic_images").update({ is_primary: false }).eq("clinic_id", clinicId);
      const { error } = await supabase.from("clinic_images").update({ is_primary: true }).eq("id", imageId);
      if (error) throw error;
      toast({ title: t('images.toasts.coverUpdatedTitle'), description: t('images.toasts.coverUpdatedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('images.toasts.errorTitle'), description: t('images.toasts.coverErrorDesc'), variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  const remove = async (imageId: string) => {
    setIsWorking(true);
    try {
      const { error } = await supabase.from("clinic_images").delete().eq("id", imageId);
      if (error) throw error;
      toast({ title: t('images.toasts.deletedTitle'), description: t('images.toasts.deletedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('images.toasts.errorTitle'), description: t('images.toasts.deleteErrorDesc'), variant: "destructive" });
    } finally {
      setIsWorking(false);
    }
  };

  return (
    <>
      <Card className="p-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">{t('images.title')}</h3>
          <label className="inline-flex items-center gap-2">
            <Input type="file" multiple accept="image/*" onChange={handleFileSelect} disabled={isWorking} />
          </label>
        </div>
        {images.length === 0 ? (
          <div className="text-sm text-muted-foreground">{t('images.noImages')}</div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {images.map((img) => (
              <div key={img.id} className="relative border border-border/60 rounded-lg overflow-hidden">
                <img src={img.image_url} alt="clinic image" className="w-full h-32 object-cover" loading="lazy" />
                <div className="p-2 flex items-center justify-between gap-2">
                  <Button size="sm" variant="outline" disabled={isWorking || !!img.is_primary} onClick={() => setPrimary(img.id)}>
                    {img.is_primary ? t('images.cover') : t('images.setAsCover')}
                  </Button>
                  <Button size="sm" variant="destructive" disabled={isWorking} onClick={() => remove(img.id)}>
                    {t('images.delete')}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>
      <ImageCropDialog
        file={currentCropFile}
        onCrop={handleCropConfirm}
        onCancel={handleCropCancel}
      />
    </>
  );
}
