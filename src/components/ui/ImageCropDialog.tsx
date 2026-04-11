import { useState, useRef, useEffect, useCallback } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { ZoomIn, ZoomOut, Check, X } from "lucide-react";

interface ImageCropDialogProps {
  file: File | null;
  aspectRatio?: number;
  outputWidth?: number;
  outputHeight?: number;
  onCrop: (croppedFile: File) => void;
  onCancel: () => void;
}

const OUTPUT_W = 1200;
const OUTPUT_H = 675; // 16:9

export default function ImageCropDialog({
  file,
  aspectRatio = 16 / 9,
  outputWidth = OUTPUT_W,
  outputHeight = OUTPUT_H,
  onCrop,
  onCancel,
}: ImageCropDialogProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);

  const [imgSrc, setImgSrc] = useState<string | null>(null);
  const [naturalW, setNaturalW] = useState(0);
  const [naturalH, setNaturalH] = useState(0);

  // zoom: 1 = image fits the frame exactly on its shortest axis
  const [zoom, setZoom] = useState(1);
  // offset in px relative to the displayed container
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);
  const dragStart = useRef({ x: 0, y: 0, ox: 0, oy: 0 });

  // Load image when file changes
  useEffect(() => {
    if (!file) return;
    const url = URL.createObjectURL(file);
    setImgSrc(url);
    const img = new Image();
    img.onload = () => {
      setNaturalW(img.naturalWidth);
      setNaturalH(img.naturalHeight);
      imgRef.current = img;
      setZoom(1);
      setOffset({ x: 0, y: 0 });
    };
    img.src = url;
    return () => URL.revokeObjectURL(url);
  }, [file]);

  // Compute base scale: the scale at which the image exactly covers the frame
  const getBaseScale = useCallback(() => {
    if (!containerRef.current || !naturalW || !naturalH) return 1;
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    return Math.max(cw / naturalW, ch / naturalH);
  }, [naturalW, naturalH]);

  // Clamp offset so image always covers the frame
  const clampOffset = useCallback(
    (ox: number, oy: number, z: number) => {
      if (!containerRef.current || !naturalW || !naturalH) return { x: 0, y: 0 };
      const cw = containerRef.current.clientWidth;
      const ch = containerRef.current.clientHeight;
      const base = getBaseScale();
      const dispW = naturalW * base * z;
      const dispH = naturalH * base * z;
      const maxX = Math.max(0, (dispW - cw) / 2);
      const maxY = Math.max(0, (dispH - ch) / 2);
      return {
        x: Math.max(-maxX, Math.min(maxX, ox)),
        y: Math.max(-maxY, Math.min(maxY, oy)),
      };
    },
    [naturalW, naturalH, getBaseScale]
  );

  // Re-clamp on zoom change
  useEffect(() => {
    setOffset((prev) => clampOffset(prev.x, prev.y, zoom));
  }, [zoom, clampOffset]);

  // Mouse / touch drag handlers
  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    setDragging(true);
    dragStart.current = { x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!dragging) return;
    const dx = e.clientX - dragStart.current.x;
    const dy = e.clientY - dragStart.current.y;
    setOffset(clampOffset(dragStart.current.ox + dx, dragStart.current.oy + dy, zoom));
  };

  const onPointerUp = () => setDragging(false);

  // Confirm crop
  const handleConfirm = () => {
    if (!imgRef.current || !containerRef.current) return;
    const base = getBaseScale();
    const cw = containerRef.current.clientWidth;
    const ch = containerRef.current.clientHeight;
    const dispW = naturalW * base * zoom;
    const dispH = naturalH * base * zoom;

    // The visible region in source-image coordinates
    const srcX = ((dispW - cw) / 2 - offset.x) / (base * zoom);
    const srcY = ((dispH - ch) / 2 - offset.y) / (base * zoom);
    const srcW = cw / (base * zoom);
    const srcH = ch / (base * zoom);

    const canvas = document.createElement("canvas");
    canvas.width = outputWidth;
    canvas.height = outputHeight;
    const ctx = canvas.getContext("2d")!;
    ctx.drawImage(imgRef.current, srcX, srcY, srcW, srcH, 0, 0, outputWidth, outputHeight);

    canvas.toBlob(
      (blob) => {
        if (blob) {
          const name = file?.name?.replace(/\.[^.]+$/, "") || "image";
          onCrop(new File([blob], `${name}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
        }
      },
      "image/jpeg",
      0.85
    );
  };

  if (!file) return null;

  return (
    <Dialog open={!!file} onOpenChange={(open) => { if (!open) onCancel(); }}>
      <DialogContent className="sm:max-w-xl p-0 gap-0 overflow-hidden">
        <DialogHeader className="p-4 pb-2">
          <DialogTitle className="text-base">Crop Image</DialogTitle>
          <p className="text-xs text-muted-foreground">Drag to reposition. Zoom to adjust.</p>
        </DialogHeader>

        {/* Crop viewport */}
        <div className="px-4">
          <div
            ref={containerRef}
            className="relative w-full overflow-hidden rounded-lg border-2 border-primary/30 bg-black cursor-grab active:cursor-grabbing"
            style={{ aspectRatio: `${aspectRatio}` }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
          >
            {imgSrc && naturalW > 0 && (
              <img
                src={imgSrc}
                alt="Crop preview"
                draggable={false}
                className="absolute select-none"
                style={{
                  width: `${naturalW * getBaseScale() * zoom}px`,
                  height: `${naturalH * getBaseScale() * zoom}px`,
                  left: `calc(50% - ${(naturalW * getBaseScale() * zoom) / 2 - offset.x}px)`,
                  top: `calc(50% - ${(naturalH * getBaseScale() * zoom) / 2 - offset.y}px)`,
                }}
              />
            )}
            {/* Grid overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="w-full h-full grid grid-cols-3 grid-rows-3">
                {Array.from({ length: 9 }).map((_, i) => (
                  <div key={i} className="border border-white/10" />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Zoom control */}
        <div className="px-4 py-3 flex items-center gap-3">
          <ZoomOut className="w-4 h-4 text-muted-foreground shrink-0" />
          <Slider
            value={[zoom]}
            min={1}
            max={3}
            step={0.05}
            onValueChange={([v]) => setZoom(v)}
            className="flex-1"
          />
          <ZoomIn className="w-4 h-4 text-muted-foreground shrink-0" />
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-2 p-4 pt-0">
          <Button variant="outline" size="sm" onClick={onCancel}>
            <X className="w-4 h-4 mr-1" /> Cancel
          </Button>
          <Button size="sm" onClick={handleConfirm}>
            <Check className="w-4 h-4 mr-1" /> Confirm
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
