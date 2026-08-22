import { useTranslation } from "react-i18next";
import { ChevronLeft, ChevronRight } from "lucide-react";

/*
 * Page controls for the results list.
 *
 * The page state and the query's limit already existed, but nothing ever
 * rendered a control for them — setPage was only called to reset to 1, so
 * anything past the first 12 clinics was unreachable. This is that control.
 *
 * Window: always the first and last page, the current page with a neighbour
 * either side, and an ellipsis wherever the run breaks.
 */

const buildPages = (current: number, total: number): (number | "gap")[] => {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);

  const pages = new Set([1, total, current, current - 1, current + 1]);
  const sorted = [...pages].filter((p) => p >= 1 && p <= total).sort((a, b) => a - b);

  const out: (number | "gap")[] = [];
  sorted.forEach((p, i) => {
    if (i > 0 && p - (sorted[i - 1] as number) > 1) out.push("gap");
    out.push(p);
  });
  return out;
};

export const ResultsPagination = ({
  page,
  total,
  perPage,
  onChange,
}: {
  page: number;
  total: number;
  perPage: number;
  onChange: (page: number) => void;
}) => {
  const { t } = useTranslation("clinicListing");
  const totalPages = Math.max(1, Math.ceil(total / perPage));
  if (totalPages <= 1) return null;

  const go = (next: number) => {
    onChange(Math.min(Math.max(next, 1), totalPages));
    document.getElementById("clinic-results")?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const box =
    "flex h-10 min-w-10 items-center justify-center rounded-xl border px-3 text-sm transition-colors";

  return (
    <nav
      data-fid="listing.pagination"
      aria-label={t("pagination.page")}
      className="mt-8 flex items-center justify-center gap-2"
    >
      <button
        type="button"
        onClick={() => go(page - 1)}
        disabled={page === 1}
        aria-label={t("pagination.previous")}
        className={`${box} border-border bg-white text-brand-navy hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40`}
      >
        <ChevronLeft className="h-4 w-4" aria-hidden="true" />
      </button>

      {buildPages(page, totalPages).map((entry, i) =>
        entry === "gap" ? (
          <span key={`gap-${i}`} className="px-1 text-sm text-nav-muted" aria-hidden="true">
            …
          </span>
        ) : (
          <button
            key={entry}
            type="button"
            onClick={() => go(entry)}
            aria-label={`${t("pagination.page")} ${entry}`}
            aria-current={entry === page ? "page" : undefined}
            className={`${box} ${
              entry === page
                ? "border-primary bg-primary font-semibold text-primary-foreground"
                : "border-border bg-white text-brand-navy hover:border-primary/40 hover:text-primary"
            }`}
          >
            {entry}
          </button>
        ),
      )}

      <button
        type="button"
        onClick={() => go(page + 1)}
        disabled={page === totalPages}
        aria-label={t("pagination.next")}
        className={`${box} border-border bg-white text-brand-navy hover:border-primary/40 hover:text-primary disabled:pointer-events-none disabled:opacity-40`}
      >
        <ChevronRight className="h-4 w-4" aria-hidden="true" />
      </button>
    </nav>
  );
};
