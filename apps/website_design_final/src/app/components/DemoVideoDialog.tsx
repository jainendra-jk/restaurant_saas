import { useEffect, useState } from "react";
import { Play } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
} from "./ui/dialog";

type DemoVideoDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

type VimeoOEmbedResponse = {
  thumbnail_url?: string;
};

function getDemoVideoUrl(): string | null {
  const url = import.meta.env.VITE_DEMO_VIDEO_URL;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed || null;
}

function getDemoThumbnailUrl(): string | null {
  const url = import.meta.env.VITE_DEMO_VIDEO_THUMBNAIL_URL;
  if (typeof url !== "string") return null;
  const trimmed = url.trim();
  return trimmed || null;
}

function parseVimeoId(url: string): string | null {
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match?.[1] ?? null;
}

export function DemoVideoDialog({ open, onOpenChange }: DemoVideoDialogProps) {
  const [hasStarted, setHasStarted] = useState(false);
  const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(() => getDemoThumbnailUrl());
  const videoUrl = getDemoVideoUrl();
  const vimeoId = videoUrl ? parseVimeoId(videoUrl) : null;

  useEffect(() => {
    if (open) return;
    setHasStarted(false);
  }, [open]);

  useEffect(() => {
    const envThumbnail = getDemoThumbnailUrl();
    if (envThumbnail) {
      setThumbnailUrl(envThumbnail);
      return;
    }
    if (!vimeoId) return;

    let cancelled = false;
    fetch(
      `https://vimeo.com/api/oembed.json?url=${encodeURIComponent(`https://vimeo.com/${vimeoId}`)}`,
    )
      .then((res) => (res.ok ? res.json() : Promise.reject(new Error("oEmbed failed"))))
      .then((data: VimeoOEmbedResponse) => {
        if (!cancelled && data.thumbnail_url) {
          setThumbnailUrl(data.thumbnail_url);
        }
      })
      .catch(() => {
        /* keep dark fallback if thumbnail fetch fails */
      });

    return () => {
      cancelled = true;
    };
  }, [vimeoId]);

  const embedSrc = vimeoId
    ? `https://player.vimeo.com/video/${vimeoId}?autoplay=1&title=0&byline=0&portrait=0`
    : null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[calc(100%-2rem)] sm:max-w-3xl lg:max-w-4xl gap-0 p-0 overflow-hidden bg-black border-0 rounded-2xl [&>button]:text-white [&>button]:hover:text-white/90 [&>button]:opacity-80 [&>button]:hover:opacity-100"
        aria-describedby={undefined}
      >
        <DialogTitle className="sr-only">Product demo</DialogTitle>

        {embedSrc ? (
          <div className="relative aspect-video w-full bg-gray-900">
            {hasStarted ? (
              <iframe
                src={embedSrc}
                title="Product demo"
                className="absolute inset-0 h-full w-full"
                allow="autoplay; fullscreen; picture-in-picture; encrypted-media"
                allowFullScreen
              />
            ) : (
              <>
                {thumbnailUrl ? (
                  <img
                    src={thumbnailUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : null}
                <button
                  type="button"
                  onClick={() => setHasStarted(true)}
                  aria-label="Play demo video"
                  className="absolute inset-0 flex items-center justify-center bg-black/30 transition-colors hover:bg-black/40 cursor-pointer"
                >
                  <span className="flex h-16 w-16 sm:h-20 sm:w-20 items-center justify-center rounded-full bg-white/95 text-[#f97316] shadow-lg transition-transform hover:scale-105">
                    <Play size={32} className="ml-1 fill-current" />
                  </span>
                </button>
              </>
            )}
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center bg-gray-900 px-6 text-center text-sm text-gray-300">
            Demo video is not configured.
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
