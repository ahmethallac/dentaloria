import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface HorizontalMediaRowProps<T> {
  items: T[];
  renderItem: (item: T, index: number) => React.ReactNode;
  /** Tailwind aspect utility class for each tile (e.g. "aspect-video" or "aspect-[9/16]") */
  aspectClass: string;
  keyFor?: (item: T, index: number) => string | number;
}

/**
 * Horizontal media strip that shows 2 items per row on mobile and 3 on desktop.
 * When the total width exceeds the visible area, previous/next arrows appear
 * and each click scrolls by roughly one page.
 */
export default function HorizontalMediaRow<T>({
  items,
  renderItem,
  aspectClass,
  keyFor,
}: HorizontalMediaRowProps<T>) {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(false);

  const update = useCallback(() => {
    const el = scrollerRef.current;
    if (!el) return;
    setCanScrollLeft(el.scrollLeft > 4);
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 4);
  }, []);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    update();
    el.addEventListener("scroll", update, { passive: true });
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => {
      el.removeEventListener("scroll", update);
      ro.disconnect();
    };
  }, [update, items.length]);

  const scrollBy = (dir: 1 | -1) => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollBy({ left: dir * el.clientWidth, behavior: "smooth" });
  };

  if (items.length === 0) return null;

  return (
    <div className="relative">
      <div
        ref={scrollerRef}
        className="flex gap-3 md:gap-4 overflow-x-auto scroll-smooth snap-x snap-mandatory scrollbar-hide"
        style={{ WebkitOverflowScrolling: "touch" }}
      >
        {items.map((item, i) => (
          <div
            key={keyFor ? keyFor(item, i) : i}
            className="snap-start shrink-0 basis-[calc((100%-0.75rem)/2)] md:basis-[calc((100%-2rem)/3)]"
          >
            <div className={`${aspectClass} w-full overflow-hidden rounded-xl bg-muted/40`}>
              {renderItem(item, i)}
            </div>
          </div>
        ))}
      </div>

      {canScrollLeft && (
        <button
          type="button"
          onClick={() => scrollBy(-1)}
          aria-label="Previous"
          className="absolute left-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
        >
          <ChevronLeft className="h-5 w-5" />
        </button>
      )}
      {canScrollRight && (
        <button
          type="button"
          onClick={() => scrollBy(1)}
          aria-label="Next"
          className="absolute right-2 top-1/2 z-10 -translate-y-1/2 rounded-full border border-border/60 bg-background/90 p-2 text-foreground shadow-sm backdrop-blur-sm transition hover:bg-background"
        >
          <ChevronRight className="h-5 w-5" />
        </button>
      )}
    </div>
  );
}
