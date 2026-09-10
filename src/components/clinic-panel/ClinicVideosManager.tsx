import { useRef, useState } from "react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseVideoUrl, VIDEO_BUCKET, MAX_VIDEO_BYTES, type VideoProvider } from "@/lib/videoUtils";
import { Trash2, Plus, Youtube, Instagram, Play, Upload, Film, Loader2 } from "lucide-react";

export interface ClinicVideo {
  id: string;
  video_url: string;
  provider: VideoProvider;
  provider_id: string;
  thumbnail_url: string | null;
  sort_order: number;
}

interface Props {
  clinicId: string;
  videos: ClinicVideo[];
  onChanged?: () => void;
}

export default function ClinicVideosManager({ clinicId, videos, onChanged }: Props) {
  const { t } = useTranslation('clinicManagers');
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);

  const nextOrder = () => (videos.reduce((m, v) => Math.max(m, v.sort_order || 0), 0) || 0) + 1;

  const add = async () => {
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      toast({
        title: t('videos.toasts.unsupportedTitle'),
        description: t('videos.toasts.unsupportedDesc'),
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from("clinic_videos").insert({
        clinic_id: clinicId,
        video_url: url.trim(),
        provider: parsed.provider,
        provider_id: parsed.id,
        thumbnail_url: parsed.thumbnailUrl,
        sort_order: nextOrder(),
      });
      if (error) throw error;
      setUrl("");
      toast({ title: t('videos.toasts.addedTitle'), description: t('videos.toasts.addedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('videos.toasts.errorTitle'), description: t('videos.toasts.addErrorDesc'), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  // Uploaded videos go to our own storage under the clinic's folder, so the
  // storage policy can check ownership from the path alone.
  const upload = async (file: File) => {
    if (file.size > MAX_VIDEO_BYTES) {
      toast({ title: t('videos.toasts.tooLargeTitle'), description: t('videos.toasts.tooLargeDesc'), variant: "destructive" });
      return;
    }
    setUploading(true);
    const ext = (file.name.split(".").pop() || "mp4").toLowerCase();
    const path = `${clinicId}/${crypto.randomUUID()}.${ext}`;
    try {
      const { error: upErr } = await supabase.storage
        .from(VIDEO_BUCKET)
        .upload(path, file, { contentType: file.type || "video/mp4", upsert: false });
      if (upErr) throw upErr;
      const { data: { publicUrl } } = supabase.storage.from(VIDEO_BUCKET).getPublicUrl(path);
      const { error } = await supabase.from("clinic_videos").insert({
        clinic_id: clinicId,
        video_url: publicUrl,
        provider: "file",
        provider_id: path,
        thumbnail_url: null,
        sort_order: nextOrder(),
      });
      if (error) {
        // The row is what makes the file reachable; without it the upload is
        // an orphan nobody can see or delete from here.
        await supabase.storage.from(VIDEO_BUCKET).remove([path]);
        throw error;
      }
      toast({ title: t('videos.toasts.addedTitle'), description: t('videos.toasts.addedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('videos.toasts.errorTitle'), description: t('videos.toasts.uploadErrorDesc'), variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileInput.current) fileInput.current.value = "";
    }
  };

  const remove = async (video: ClinicVideo) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("clinic_videos").delete().eq("id", video.id);
      if (error) throw error;
      // Row first, file second: a leftover file is invisible, a row pointing
      // at a deleted file is a broken tile on the public page.
      if (video.provider === "file") {
        await supabase.storage.from(VIDEO_BUCKET).remove([video.provider_id]);
      }
      toast({ title: t('videos.toasts.removedTitle'), description: t('videos.toasts.removedDesc') });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: t('videos.toasts.errorTitle'), description: t('videos.toasts.removeErrorDesc'), variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">{t('videos.title')}</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        {t('videos.hint')}
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-2">
        <Input
          placeholder={t('videos.placeholder')}
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy || uploading}
        />
        <Button onClick={add} disabled={busy || uploading || !url.trim()}>
          <Plus className="w-4 h-4 mr-1" /> {t('videos.addVideo')}
        </Button>
      </div>

      <div className="flex flex-wrap items-center gap-3 mb-4">
        <span className="text-xs text-muted-foreground">{t('videos.orUpload')}</span>
        <input
          ref={fileInput}
          type="file"
          accept="video/mp4,video/webm,video/quicktime"
          className="hidden"
          onChange={(e) => { const f = e.target.files?.[0]; if (f) upload(f); }}
        />
        <Button variant="outline" size="sm" disabled={busy || uploading} onClick={() => fileInput.current?.click()}>
          {uploading ? <Loader2 className="w-4 h-4 mr-1 animate-spin" /> : <Upload className="w-4 h-4 mr-1" />}
          {uploading ? t('videos.uploading') : t('videos.uploadButton')}
        </Button>
        <span className="text-xs text-muted-foreground">{t('videos.uploadHint')}</span>
      </div>

      {videos.length === 0 ? (
        <div className="text-sm text-muted-foreground">{t('videos.noVideos')}</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="relative border border-border/60 rounded-lg overflow-hidden">
              <div className="relative aspect-[9/16] bg-muted/40">
                {v.provider === "file" ? (
                  <video
                    src={`${v.video_url}#t=0.1`}
                    poster={v.thumbnail_url ?? undefined}
                    preload="metadata"
                    controls
                    playsInline
                    className="w-full h-full object-cover bg-black"
                  />
                ) : v.provider === "youtube" && v.thumbnail_url ? (
                  <>
                    <img
                      src={v.thumbnail_url}
                      alt="Video thumbnail"
                      className="w-full h-full object-cover"
                      loading="lazy"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                      <Play className="w-10 h-10 text-white drop-shadow-lg" />
                    </div>
                  </>
                ) : (
                  <iframe
                    src={
                      v.provider === "instagram"
                        ? `https://www.instagram.com/reel/${v.provider_id}/embed`
                        : `https://www.youtube.com/embed/${v.provider_id}`
                    }
                    className="w-full h-full pointer-events-none"
                    allow="autoplay; clipboard-write; encrypted-media; picture-in-picture"
                    loading="lazy"
                  />
                )}
                <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm rounded-full p-1.5 pointer-events-none">
                  {v.provider === "youtube" ? (
                    <Youtube className="w-4 h-4" />
                  ) : v.provider === "instagram" ? (
                    <Instagram className="w-4 h-4" />
                  ) : (
                    <Film className="w-4 h-4" />
                  )}
                </div>
              </div>
              <div className="p-2 flex items-center justify-between gap-2">
                <a
                  href={v.video_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-xs text-muted-foreground truncate hover:underline"
                >
                  {t('videos.openLink')}
                </a>
                <Button size="sm" variant="destructive" disabled={busy || uploading} onClick={() => remove(v)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
