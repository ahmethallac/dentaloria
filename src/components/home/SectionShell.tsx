import type { ReactNode } from "react";
import { ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";

/*
 * Shared page furniture for the home sections.
 *
 * Every band in the Figma reference (node 2:2) sits on the same column: the
 * traced backgrounds land at x=48..53 and 754..764 wide at 863px, i.e. a
 * 1264px column centred in 1440. Rather than repeat that per section — and
 * drift by a few px each time — it lives here once.
 */

export const SectionShell = ({
  id,
  className = "",
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) => (
  <section id={id} className={`px-5 sm:px-8 ${className}`}>
    <div className="mx-auto w-full max-w-[1264px]">{children}</div>
  </section>
);

/**
 * Title + subtitle on the left, an outlined "View all …" link on the right.
 * The reference repeats this exact pairing above four different grids.
 */
export const SectionHeading = ({
  title,
  subtitle,
  actionLabel,
  actionTo,
  align = "left",
}: {
  title: string;
  subtitle?: string;
  actionLabel?: string;
  actionTo?: string;
  align?: "left" | "center";
}) => (
  <div
    className={
      align === "center"
        ? "flex flex-col items-center text-center"
        : "flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"
    }
  >
    <div className={align === "center" ? "max-w-2xl" : ""}>
      <h2 className="text-2xl/tight font-bold text-brand-navy">{title}</h2>
      {subtitle && <p className="mt-1.5 text-sm text-nav-muted">{subtitle}</p>}
    </div>

    {actionLabel && actionTo && (
      <Link
        to={actionTo}
        className="inline-flex h-11 shrink-0 items-center gap-2 rounded-xl border border-primary/40 px-5 text-sm font-medium text-primary transition-colors hover:bg-primary/5"
      >
        {actionLabel}
        <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    )}
  </div>
);
