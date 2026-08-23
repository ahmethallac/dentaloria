import { useState } from "react";
import { useTranslation } from "react-i18next";
import { CheckCircle2, CloudUpload, FileSearch, MessagesSquare, ScrollText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { SectionShell } from "./SectionShell";

/*
 * Figma node 2:170 — "Get Offers From Clinics". Three columns on a tinted
 * panel: the pitch and its checklist (2:212–2:201), the request card
 * (2:187), and the "How it works?" rail (2:172).
 *
 * PRESENTATION ONLY — there is deliberately no backend behind this.
 *
 * Note the upload zone is a plain <div>, NOT an <input type="file">. A control
 * that accepts a dental X-ray and then discards it would let a patient believe
 * they had sent their medical images to a clinic. Until a real endpoint exists,
 * the block shows the design without ever taking custody of a file.
 */

const CHECKLIST = ["getOffers.check1", "getOffers.check2", "getOffers.check3", "getOffers.check4"] as const;

const STEPS = [
  { icon: ScrollText, titleKey: "getOffers.step1Title", descKey: "getOffers.step1Desc" },
  { icon: MessagesSquare, titleKey: "getOffers.step2Title", descKey: "getOffers.step2Desc" },
  { icon: FileSearch, titleKey: "getOffers.step3Title", descKey: "getOffers.step3Desc" },
] as const;

const MAX_LENGTH = 500;

export const GetOffersSection = () => {
  const { t } = useTranslation("home");
  const { toast } = useToast();
  const [request, setRequest] = useState("");

  return (
    <SectionShell className="pt-10">
      <div
        data-fid="getoffers"
        className="grid grid-cols-1 gap-8 rounded-xl bg-muted/40 p-6 lg:grid-cols-[1fr_1.1fr_0.9fr] lg:gap-10 lg:p-8"
      >
        {/* Pitch */}
        <div>
          <span className="text-xs font-semibold uppercase tracking-wide text-primary">
            {t("getOffers.badge")}
          </span>
          <h2 className="mt-2 text-2xl/tight font-bold text-brand-navy">
            <span className="text-primary">{t("getOffers.titleAccent")}</span>{" "}
            {t("getOffers.titleRest")}
          </h2>
          <p className="mt-3 max-w-[280px] text-sm text-nav-muted">{t("getOffers.subtitle")}</p>

          <ul className="mt-6 space-y-3">
            {CHECKLIST.map((key) => (
              <li key={key} className="flex items-start gap-3 text-sm text-brand-navy">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
                {t(key)}
              </li>
            ))}
          </ul>
        </div>

        {/* Request card */}
        <div className="rounded-xl bg-white p-5 shadow-card">
          <div className="flex flex-col items-center justify-center gap-1 rounded-xl border border-border px-6 py-6 text-center">
            <CloudUpload className="mb-1 h-8 w-8 text-primary" aria-hidden="true" />
            <div className="text-sm font-medium text-brand-navy">{t("getOffers.uploadTitle")}</div>
            <div className="text-xs text-nav-muted">{t("getOffers.uploadHint")}</div>
          </div>

          <div className="mt-2">
            <label htmlFor="treatment-request" className="sr-only">
              {t("getOffers.describePlaceholder")}
            </label>
            <textarea
              id="treatment-request"
              value={request}
              maxLength={MAX_LENGTH}
              onChange={(e) => setRequest(e.target.value)}
              placeholder={t("getOffers.describePlaceholder")}
              className="h-24 w-full resize-none rounded-xl border border-border bg-white p-4 text-sm text-brand-navy placeholder:text-nav-muted focus:border-primary focus:outline-none"
            />
            <div className="mt-1 text-right text-xs text-nav-muted">
              {request.length}/{MAX_LENGTH}
            </div>
          </div>

          <Button
            className="mt-2 h-11 w-full rounded-xl bg-primary text-sm font-medium text-primary-foreground hover:bg-primary/90"
            onClick={() =>
              toast({
                title: t("getOffers.comingSoonTitle"),
                description: t("getOffers.comingSoonBody"),
              })
            }
          >
            {t("getOffers.submit")}
          </Button>
        </div>

        {/* How it works rail */}
        <div>
          <h3 className="text-base font-bold text-brand-navy">{t("getOffers.howTitle")}</h3>
          <ol className="mt-4 space-y-5">
            {STEPS.map(({ icon: Icon, titleKey, descKey }, i) => (
              <li key={titleKey} className="relative flex gap-4">
                {i < STEPS.length - 1 && (
                  <span
                    className="absolute left-[19px] top-11 h-[calc(100%-4px)] w-px border-l border-dashed border-primary/40"
                    aria-hidden="true"
                  />
                )}
                <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-white text-primary shadow-sm">
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </span>
                <div className="min-w-0">
                  <div className="text-sm font-semibold text-brand-navy">{t(titleKey)}</div>
                  <p className="mt-0.5 text-xs text-nav-muted">{t(descKey)}</p>
                </div>
              </li>
            ))}
          </ol>
        </div>
      </div>
    </SectionShell>
  );
};
