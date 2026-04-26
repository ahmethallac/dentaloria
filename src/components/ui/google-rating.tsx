import { Star } from "lucide-react";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface GoogleRatingProps {
  rating: number | null | undefined;
  className?: string;
  starClassName?: string;
}

/**
 * Star + Google rating number with a tooltip explaining the source.
 * Shows nothing if no rating is set.
 */
export const GoogleRating = ({ rating, className, starClassName }: GoogleRatingProps) => {
  if (rating == null || isNaN(Number(rating)) || Number(rating) <= 0) return null;
  const value = Number(rating).toFixed(1);
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <span
          className={cn("inline-flex items-center gap-1 cursor-help", className)}
          onClick={(e) => e.stopPropagation()}
        >
          <Star className={cn("w-3.5 h-3.5 fill-amber-400 text-amber-400", starClassName)} />
          <span className="font-semibold">{value}</span>
        </span>
      </TooltipTrigger>
      <TooltipContent>
        <p className="text-xs max-w-xs">Ratings reflect the clinic's actual Google rating.</p>
      </TooltipContent>
    </Tooltip>
  );
};
