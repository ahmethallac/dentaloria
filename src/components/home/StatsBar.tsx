import { useTranslation } from "react-i18next";
import {
  BadgePercent,
  HeartHandshake,
  MapPin,
  MessageSquareQuote,
  ShieldCheck,
  Users,
} from "lucide-react";
import { SectionShell } from "./SectionShell";

/*
 * The two stat bars in the reference: the navy one straddling the bottom of
 * the hero photo (node 2:343) and the pale one closing the page above the
 * footer (node 2:51). Same four-up structure and same 1264px column, so they
 * are one component with a tone rather than two near-copies.
 *
 * Heights are load-bearing — 108px for the hero bar, 96px for the closing one
 * — so the vertical padding differs per tone rather than being shared.
 */

const HERO_ITEMS = [
  { icon: ShieldCheck, valueKey: "stats.clinicsValue", labelKey: "stats.clinicsLabel" },
  { icon: HeartHandshake, valueKey: "stats.patientsValue", labelKey: "stats.patientsLabel" },
  { icon: BadgePercent, valueKey: "stats.priceValue", labelKey: "stats.priceLabel" },
  { icon: MessageSquareQuote, valueKey: "stats.reviewsValue", labelKey: "stats.reviewsLabel" },
] as const;

const CLOSING_ITEMS = [
  { icon: ShieldCheck, valueKey: "bottomStats.clinicsValue", labelKey: "bottomStats.clinicsLabel" },
  { icon: MapPin, valueKey: "bottomStats.destinationsValue", labelKey: "bottomStats.destinationsLabel" },
  { icon: Users, valueKey: "bottomStats.patientsValue", labelKey: "bottomStats.patientsLabel" },
  { icon: MessageSquareQuote, valueKey: "bottomStats.ratingValue", labelKey: "bottomStats.ratingLabel" },
] as const;

const TONES = {
  // pulled up so it overlaps the hero photo by 50px, exactly as the reference
  dark: {
    items: HERO_ITEMS,
    fid: "hero.stats",
    shell: "relative z-10 -mt-[50px] pb-16",
    bar: "bg-stats-navy py-[30px] shadow-elegant",
    divider: "lg:border-white/15",
    icon: "text-primary-foreground/90",
    disc: false,
    value: "text-xl font-semibold text-primary-foreground",
    label: "text-sm text-primary-foreground/70",
  },
  light: {
    items: CLOSING_ITEMS,
    fid: "bottom.stats",
    shell: "pt-10 pb-12",
    bar: "bg-muted/40 py-6",
    divider: "lg:border-border",
    icon: "text-primary",
    disc: true,
    value: "text-xl font-bold text-primary",
    label: "text-sm text-nav-muted",
  },
} as const;

export const StatsBar = ({ tone }: { tone: keyof typeof TONES }) => {
  const { t } = useTranslation("home");
  const s = TONES[tone];

  return (
    <SectionShell className={s.shell}>
      <div
        data-fid={s.fid}
        className={`grid grid-cols-2 gap-x-4 gap-y-6 rounded-xl px-5 sm:px-10 lg:grid-cols-4 ${s.bar}`}
      >
        {s.items.map(({ icon: Icon, valueKey, labelKey }, i) => (
          <div
            key={valueKey}
            className={`flex items-center gap-3 lg:gap-4 ${i > 0 ? `lg:border-l lg:pl-8 ${s.divider}` : ""}`}
          >
            {s.disc ? (
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-primary/10 lg:h-11 lg:w-11">
                <Icon className={`h-5 w-5 ${s.icon}`} aria-hidden="true" />
              </span>
            ) : (
              <Icon className={`h-6 w-6 shrink-0 lg:h-7 lg:w-7 ${s.icon}`} aria-hidden="true" />
            )}

            <div className="min-w-0">
              <div className={`${s.value} text-sm leading-snug lg:text-xl`}>{t(valueKey)}</div>
              <div className={`${s.label} text-[11px] leading-snug lg:text-sm`}>{t(labelKey)}</div>
            </div>
          </div>
        ))}
      </div>
    </SectionShell>
  );
};
