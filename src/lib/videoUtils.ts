export type VideoProvider = "youtube" | "instagram";

export interface ParsedVideo {
  provider: VideoProvider;
  id: string;
  embedUrl: string;
  thumbnailUrl: string | null;
}

const YT_HOSTS = new Set(["youtube.com", "www.youtube.com", "m.youtube.com", "youtu.be"]);
const IG_HOSTS = new Set(["instagram.com", "www.instagram.com"]);

export function parseVideoUrl(input: string): ParsedVideo | null {
  const raw = (input || "").trim();
  if (!raw) return null;
  let url: URL;
  try {
    url = new URL(raw.startsWith("http") ? raw : `https://${raw}`);
  } catch {
    return null;
  }
  const host = url.hostname.toLowerCase();

  // YouTube
  if (YT_HOSTS.has(host)) {
    let id: string | null = null;
    if (host === "youtu.be") {
      id = url.pathname.split("/").filter(Boolean)[0] || null;
    } else if (url.pathname.startsWith("/watch")) {
      id = url.searchParams.get("v");
    } else if (url.pathname.startsWith("/shorts/")) {
      id = url.pathname.split("/")[2] || null;
    } else if (url.pathname.startsWith("/embed/")) {
      id = url.pathname.split("/")[2] || null;
    }
    if (!id) return null;
    return {
      provider: "youtube",
      id,
      embedUrl: `https://www.youtube.com/embed/${id}`,
      thumbnailUrl: `https://img.youtube.com/vi/${id}/hqdefault.jpg`,
    };
  }

  // Instagram
  if (IG_HOSTS.has(host)) {
    const parts = url.pathname.split("/").filter(Boolean);
    // Accept /reel/{id}, /p/{id}, /tv/{id}, or /{user}/reel/{id}
    const kindIdx = parts.findIndex((p) => p === "reel" || p === "reels" || p === "p" || p === "tv");
    if (kindIdx === -1) return null;
    const kind = parts[kindIdx] === "reels" ? "reel" : parts[kindIdx];
    const id = parts[kindIdx + 1];
    if (!id) return null;
    return {
      provider: "instagram",
      id,
      embedUrl: `https://www.instagram.com/${kind}/${id}/embed`,
      thumbnailUrl: null,
    };
  }

  return null;
}

export function getVideoEmbedUrl(provider: VideoProvider, id: string, kindHint?: string): string {
  if (provider === "youtube") return `https://www.youtube.com/embed/${id}`;
  return `https://www.instagram.com/${kindHint || "reel"}/${id}/embed`;
}
