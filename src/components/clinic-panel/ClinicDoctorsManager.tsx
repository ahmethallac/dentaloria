import { useState } from "react";
import { useTranslation } from "react-i18next";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { optimizeDoctorImages } from "@/lib/imageUtils";
import ImageCropDialog from "@/components/ui/ImageCropDialog";
import { Plus, Trash2, Upload, Loader2 } from "lucide-react";

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

const EMPTY_FORM = { title: "Dr.", name: "", experience_years: 0 };

export default function ClinicDoctorsManager({ clinicId, doctors, onChanged }: Props) {
  const { t } = useTranslation('clinicManagers');
  const { toast } = useToast();
  const [list, setList] = useState<Doctor[]>(doctors);
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);

  // Image flow: rawFile -> ImageCropDialog -> croppedFile (preview)
  const [rawFile, setRawFile] = useState<File | null>(null);
  const [croppedFile, setCroppedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const resetModal = () => {
    setForm(EMPTY_FORM);
    setRawFile(null);
    setCroppedFile(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
  };

  const handleFilePicked = (f: File | null) => {
    if (!f) return;
    setRawFile(f);
  };

  const handleCropped = (f: File) => {
    setCroppedFile(f);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(URL.createObjectURL(f));
    setRawFile(null);
  };

  const handleSave = async () => {
    if (!form.name.trim()) {
      toast({ title: t('doctors.toasts.missingNameTitle'), description: t('doctors.toasts.missingNameDesc'), variant: "destructive" });
      return;
    }
    if (!croppedFile) {
      toast({ title: t('doctors.toasts.missingPhotoTitle'), description: t('doctors.toasts.missingPhotoDesc'), variant: "destructive" });
      return;
    }
    setSaving(true);
    try {
      const [opt] = await optimizeDoctorImages([croppedFile]);
      const path = `${clinicId}/doctors/${Date.now()}-${opt.name}`;
      const { error: upErr } = await supabase.storage.from("doctor-images").upload(path, opt);
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from("doctor-images").getPublicUrl(path);

      const { data, error } = await supabase
        .from("doctors")
        .insert({
          clinic_id: clinicId,
          title: form.title,
          name: form.name.trim(),
          experience_years: form.experience_years,
          profile_image_url: publicUrl,
        })
        .select("*")
        .single();
      if (error) throw error;

      setList((prev) => [...prev, data as Doctor]);
      toast({ title: t('doctors.toasts.addedTitle'), description: t('doctors.toasts.addedDesc') });
      onChanged?.();
      setOpen(false);
      resetModal();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('doctors.toasts.errorTitle'), description: t('doctors.toasts.addErrorDesc'), variant: "destructive" });
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const { error } = await supabase.from("doctors").delete().eq("id", id);
      if (error) throw error;
      setList((prev) => prev.filter((d) => d.id !== id));
      toast({ title: t('doctors.toasts.deletedTitle'), description: t('doctors.toasts.deletedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('doctors.toasts.errorTitle'), description: t('doctors.toasts.deleteErrorDesc'), variant: "destructive" });
    }
  };

  return (
    <Card className="p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">{t('doctors.title')}</h3>
        <Button onClick={() => { resetModal(); setOpen(true); }} size="sm">
          <Plus className="w-4 h-4 mr-1" /> {t('doctors.addDentist')}
        </Button>
      </div>

      {list.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('doctors.noDentists')}</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {list.map((d) => (
            <div key={d.id} className="flex items-center gap-3 p-3 border border-border/60 rounded-lg">
              {d.profile_image_url ? (
                <img
                  src={d.profile_image_url}
                  alt={d.name}
                  loading="lazy"
                  className="w-14 h-14 rounded-full object-cover shrink-0"
                />
              ) : (
                <div className="w-14 h-14 rounded-full bg-muted shrink-0" />
              )}
              <div className="flex-1 min-w-0">
                <div className="font-medium truncate">{d.title ? `${d.title} ` : ""}{d.name}</div>
                <div className="text-xs text-muted-foreground">
                  {d.experience_years ? t('doctors.yearsExperience', { count: d.experience_years }) : "—"}
                </div>
              </div>
              <Button variant="ghost" size="icon" onClick={() => handleDelete(d.id)} aria-label={t('doctors.deleteAriaLabel')}>
                <Trash2 className="w-4 h-4 text-destructive" />
              </Button>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onOpenChange={(o) => { setOpen(o); if (!o) resetModal(); }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>{t('doctors.dialogTitle')}</DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* Circular photo preview / uploader */}
            <div className="flex flex-col items-center gap-2">
              <label className="cursor-pointer group">
                <div className="w-32 h-32 rounded-full border-2 border-dashed border-border bg-muted/40 overflow-hidden flex items-center justify-center group-hover:border-primary/60 transition-colors">
                  {previewUrl ? (
                    <img src={previewUrl} alt="Preview" className="w-full h-full object-cover" />
                  ) : (
                    <div className="flex flex-col items-center text-muted-foreground text-xs">
                      <Upload className="w-6 h-6 mb-1" />
                      {t('doctors.uploadPhoto')}
                    </div>
                  )}
                </div>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleFilePicked(e.target.files?.[0] || null)}
                />
              </label>
              {previewUrl && (
                <button
                  type="button"
                  className="text-xs text-primary hover:underline"
                  onClick={() => {
                    // Re-open crop dialog with last cropped file as source
                    if (croppedFile) setRawFile(croppedFile);
                  }}
                >
                  {t('doctors.readjustPhoto')}
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="col-span-1">
                <Label htmlFor="doc-title">{t('doctors.titleLabel')}</Label>
                <Input
                  id="doc-title"
                  value={form.title}
                  onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                  placeholder={t('doctors.titlePlaceholder')}
                />
              </div>
              <div className="col-span-2">
                <Label htmlFor="doc-name">{t('doctors.fullNameLabel')}</Label>
                <Input
                  id="doc-name"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder={t('doctors.fullNamePlaceholder')}
                />
              </div>
            </div>

            <div>
              <Label htmlFor="doc-exp">{t('doctors.experienceLabel')}</Label>
              <Input
                id="doc-exp"
                type="number"
                min={0}
                value={form.experience_years}
                onChange={(e) => setForm((f) => ({ ...f, experience_years: parseInt(e.target.value) || 0 }))}
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)} disabled={saving}>
              {t('doctors.cancel')}
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              {t('doctors.save')}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Crop dialog: 1:1 for circular avatar */}
      <ImageCropDialog
        file={rawFile}
        aspectRatio={1}
        outputWidth={512}
        outputHeight={512}
        onCrop={handleCropped}
        onCancel={() => setRawFile(null)}
      />
    </Card>
  );
}
