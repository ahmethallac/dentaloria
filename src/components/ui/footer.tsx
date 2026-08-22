import { useEffect, useState } from "react";
import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { Facebook, Instagram, Linkedin, Lock, Mail, SendHorizontal, Twitter, Youtube } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { getPopularTreatments, type Treatment } from "@/lib/services";
import { withLocalePrefix } from "@/lib/localePath";

/*
 * Figma node 2:10 — the navy footer. Five columns (brand, Explore, Popular
 * Treatments, Support, newsletter), a hairline, then a bottom row carrying the
 * copyright on the left and the payment / SSL marks on the right.
 *
 * The card marks are rendered as type rather than brand artwork: the reference
 * shows real logos, but shipping Visa/Mastercard marks means shipping their
 * assets under their brand rules. Swap in licensed SVGs when you have them.
 */

const SOCIALS = [
  { icon: Facebook, label: "Facebook" },
  { icon: Instagram, label: "Instagram" },
  { icon: Twitter, label: "X" },
  { icon: Youtube, label: "YouTube" },
  { icon: Linkedin, label: "LinkedIn" },
] as const;

const FooterLink = ({ href, children }: { href: string; children: React.ReactNode }) => (
  <li>
    <a
      href={href}
      className="text-sm text-primary-foreground/65 transition-colors hover:text-primary-foreground"
    >
      {children}
    </a>
  </li>
);

const ColumnTitle = ({ children }: { children: React.ReactNode }) => (
  <h3 className="mb-4 text-sm font-semibold text-primary-foreground">{children}</h3>
);

export const Footer = () => {
  const { t } = useTranslation("common");
  const { lang } = useParams();
  const [popularTreatments, setPopularTreatments] = useState<Treatment[]>([]);

  useEffect(() => {
    getPopularTreatments(7)
      .then(setPopularTreatments)
      .catch((e) => console.error("Failed to load popular treatments", e));
  }, []);

  const p = (path: string) => withLocalePrefix(path, lang);

  return (
    <footer className="bg-stats-navy px-5 pt-14 sm:px-8">
      <div className="mx-auto w-full max-w-[1264px]">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr_1.3fr]">
          {/* Brand */}
          <div>
            <div className="text-xl font-bold text-primary-foreground">dentaloria</div>
            <p className="mt-4 max-w-[260px] text-sm leading-relaxed text-primary-foreground/65">
              {t("footer.tagline")}
            </p>
            <div className="mt-6 flex gap-4">
              {SOCIALS.map(({ icon: Icon, label }) => (
                <a
                  key={label}
                  href="#"
                  aria-label={label}
                  className="text-primary-foreground/65 transition-colors hover:text-primary-foreground"
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              ))}
            </div>
          </div>

          {/* Explore */}
          <div>
            <ColumnTitle>{t("footer.explore")}</ColumnTitle>
            <ul className="space-y-2.5">
              <FooterLink href={p("/clinic-listing")}>{t("footer.clinics")}</FooterLink>
              <FooterLink href={p("/treatments")}>{t("nav.treatments")}</FooterLink>
              <FooterLink href={`${p("/")}#destinations`}>{t("nav.destinations")}</FooterLink>
              <FooterLink href={`${p("/")}#how-it-works`}>{t("nav.howItWorks")}</FooterLink>
              <FooterLink href={p("/about-us")}>{t("nav.aboutUs")}</FooterLink>
              <FooterLink href={p("/clinic")}>{t("footer.featuredClinic")}</FooterLink>
            </ul>
          </div>

          {/* Popular treatments */}
          <div>
            <ColumnTitle>{t("footer.popularTreatments")}</ColumnTitle>
            <ul className="space-y-2.5">
              {popularTreatments.map((treatment) => (
                <FooterLink
                  key={treatment.id}
                  href={p(`/clinic-listing?treatment=${encodeURIComponent(treatment.id)}`)}
                >
                  {treatment.name}
                </FooterLink>
              ))}
            </ul>
          </div>

          {/* Support */}
          <div>
            <ColumnTitle>{t("footer.support")}</ColumnTitle>
            <ul className="space-y-2.5">
              <FooterLink href={p("/about-us")}>{t("footer.helpCenter")}</FooterLink>
              <FooterLink href="#">{t("footer.privacyPolicy")}</FooterLink>
              <FooterLink href="#">{t("footer.termsOfService")}</FooterLink>
              <FooterLink href="#">{t("footer.cookiePolicy")}</FooterLink>
              <FooterLink href="#">{t("footer.gdpr")}</FooterLink>
            </ul>
          </div>

          {/* Newsletter */}
          <div>
            <ColumnTitle>{t("footer.newsletterHeading")}</ColumnTitle>
            <p className="text-sm leading-relaxed text-primary-foreground/65">
              {t("footer.newsletterNote")}
            </p>

            <form
              className="mt-4 flex gap-2"
              onSubmit={(e) => e.preventDefault()}
              aria-label={t("footer.newsletterHeading")}
            >
              <label htmlFor="footer-email" className="sr-only">
                {t("footer.newsletterPlaceholder")}
              </label>
              <Input
                id="footer-email"
                type="email"
                placeholder={t("footer.newsletterPlaceholder")}
                className="h-11 flex-1 rounded-xl border-white/20 bg-white/10 text-sm text-primary-foreground placeholder:text-primary-foreground/45 focus-visible:ring-primary"
              />
              <Button
                type="submit"
                aria-label={t("footer.subscribe")}
                className="h-11 w-11 shrink-0 rounded-xl bg-primary p-0 hover:bg-primary/90"
              >
                <SendHorizontal className="h-4 w-4" aria-hidden="true" />
              </Button>
            </form>

            <p className="mt-4 flex items-center gap-2 text-sm text-primary-foreground/65">
              <Mail className="h-4 w-4" aria-hidden="true" />
              info@dentaloria.com
            </p>
          </div>
        </div>

        <div className="mt-12 flex flex-col gap-4 border-t border-white/10 py-6 lg:flex-row lg:items-center lg:justify-between">
          <p className="text-xs leading-relaxed text-primary-foreground/55">
            {t("footer.designedBy")}
            <br />
            {t("footer.rightsReserved")}
          </p>

          <div className="flex flex-wrap items-center gap-3">
            <span className="text-xs text-primary-foreground/55">{t("footer.weAccept")}</span>
            {["VISA", "Mastercard", "Amex"].map((brand) => (
              <span
                key={brand}
                className="rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold tracking-wide text-primary-foreground/80"
              >
                {brand}
              </span>
            ))}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1 text-[11px] font-semibold text-primary-foreground/80">
              <Lock className="h-3 w-3" aria-hidden="true" />
              {t("footer.sslSecured")}
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
};
