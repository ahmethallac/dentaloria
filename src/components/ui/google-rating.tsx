import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GoogleRatingProps {
  rating: number | null | undefined;
  className?: string;
  starClassName?: string;
  variant?: "default" | "prominent";
  showLabel?: boolean;
}

/**
 * Star + Google rating number with a tooltip explaining the source.
 * Shows nothing if no rating is set.
 */
export const GoogleRating = ({
  rating,
  className,
  starClassName,
  variant = "default",
  showLabel,
}: GoogleRatingProps) => {
  if (rating == null || isNaN(Number(rating)) || Number(rating) <= 0) return null;
  const value = Number(rating).toFixed(1);
  const isProminent = variant === "prominent";
  const withLabel = showLabel ?? isProminent;

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn(
            "inline-flex items-center gap-1 cursor-help",
            isProminent &&
              "px-2 py-0.5 rounded-md bg-amber-50 border border-amber-200 text-amber-900",
            className
          )}
          onClick={(e) => e.stopPropagation()}
        >
          <Star
            className={cn(
              "fill-amber-400 text-amber-400",
              isProminent ? "w-4 h-4" : "w-3.5 h-3.5",
              starClassName
            )}
          />
          <span
            className={cn(
              "font-semibold tabular-nums",
              isProminent ? "text-sm" : "text-sm"
            )}
          >
            {value}
          </span>
          {withLabel && (
            <span
              className={cn(
                "font-medium text-[11px]"
              )}
            >
              Google Rating
            </span>
          )}
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-xs">Ratings reflect the clinic's actual Google rating.</p>
      </TooltipContent>
    </Tooltip>
  );
};
