import { Sparkles } from "lucide-react";

/**
 * Beta banner: leads are free right now, balance top-ups aren't open yet.
 * Shown wherever a clinic might expect to pay — the patients/leads list and
 * the balance top-up page — so nobody is surprised by a charge that isn't
 * live yet. Text comes from the caller's own i18n namespace.
 */
export default function BetaNotice({ title, body }: { title: string; body: string }) {
  return (
    <div className="flex items-start gap-3 p-4 rounded-xl border border-primary/25 bg-primary/5">
      <div className="w-9 h-9 shrink-0 rounded-lg bg-primary/15 flex items-center justify-center">
        <Sparkles className="w-4 h-4 text-primary" />
      </div>
      <div>
        <div className="font-semibold text-sm text-brand-navy">{title}</div>
        <div className="text-sm text-muted-foreground mt-0.5">{body}</div>
      </div>
    </div>
  );
}
