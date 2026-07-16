import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { parseVideoUrl } from "@/lib/videoUtils";
import { Trash2, Plus, Youtube, Instagram, Play } from "lucide-react";

export interface ClinicVideo {
  id: string;
  video_url: string;
  provider: "youtube" | "instagram";
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
  const { toast } = useToast();
  const [url, setUrl] = useState("");
  const [busy, setBusy] = useState(false);

  const add = async () => {
    const parsed = parseVideoUrl(url);
    if (!parsed) {
      toast({
        title: "Unsupported link",
        description: "Please paste a valid YouTube or Instagram video URL.",
        variant: "destructive",
      });
      return;
    }
    setBusy(true);
    try {
      const nextOrder = (videos.reduce((m, v) => Math.max(m, v.sort_order || 0), 0) || 0) + 1;
      const { error } = await supabase.from("clinic_videos").insert({
        clinic_id: clinicId,
        video_url: url.trim(),
        provider: parsed.provider,
        provider_id: parsed.id,
        thumbnail_url: parsed.thumbnailUrl,
        sort_order: nextOrder,
      });
      if (error) throw error;
      setUrl("");
      toast({ title: "Video added", description: "Preview is now visible below." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not add video.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  const remove = async (id: string) => {
    setBusy(true);
    try {
      const { error } = await supabase.from("clinic_videos").delete().eq("id", id);
      if (error) throw error;
      toast({ title: "Removed", description: "Video removed." });
      onChanged?.();
    } catch (e: any) {
      console.error(e);
      toast({ title: "Error", description: "Could not remove video.", variant: "destructive" });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="p-4">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Videos</h3>
      </div>
      <p className="text-xs text-muted-foreground mb-3">
        Paste a YouTube or Instagram link. Videos display in a 9:16 (Reels) frame on your public page.
      </p>
      <div className="flex flex-col sm:flex-row gap-2 mb-4">
        <Input
          placeholder="https://www.youtube.com/watch?v=… or https://www.instagram.com/reel/…"
          value={url}
          onChange={(e) => setUrl(e.target.value)}
          disabled={busy}
        />
        <Button onClick={add} disabled={busy || !url.trim()}>
          <Plus className="w-4 h-4 mr-1" /> Add video
        </Button>
      </div>

      {videos.length === 0 ? (
        <div className="text-sm text-muted-foreground">No videos yet.</div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {videos.map((v) => (
            <div key={v.id} className="relative border border-border/60 rounded-lg overflow-hidden">
              <div className="relative aspect-[9/16] bg-muted/40">
                {v.provider === "youtube" && v.thumbnail_url ? (
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
                <div className="absolute top-2 left-2 bg-background/85 backdrop-blur-sm rounded-full p-1.5">
                  {v.provider === "youtube" ? (
                    <Youtube className="w-4 h-4" />
                  ) : (
                    <Instagram className="w-4 h-4" />
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
                  Open link
                </a>
                <Button size="sm" variant="destructive" disabled={busy} onClick={() => remove(v.id)}>
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
