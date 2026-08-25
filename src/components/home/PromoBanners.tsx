import { useTranslation } from "react-i18next";
import { useParams } from "react-router-dom";
import { SectionShell } from "./SectionShell";
import financeBannerEn from "@/assets/banners/finance-banner-en.png";
import financeBannerTr from "@/assets/banners/finance-banner-tr.png";
import quoteToolBannerEn from "@/assets/banners/quote-tool-banner-en.png";
import quoteToolBannerTr from "@/assets/banners/quote-tool-banner-tr.png";

export const PromoBanners = () => {
  const { t } = useTranslation("home");
  const { lang } = useParams();
  const isTurkish = lang === "tr";

  const financeBanner = isTurkish ? financeBannerTr : financeBannerEn;
  const quoteToolBanner = isTurkish ? quoteToolBannerTr : quoteToolBannerEn;

  return (
    <SectionShell className="pt-4">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        <img
          src={financeBanner}
          alt={t("promoBanners.financeAlt")}
          className="w-full rounded-xl"
        />
        <img
          src={quoteToolBanner}
          alt={t("promoBanners.quoteToolAlt")}
          className="w-full rounded-xl"
        />
      </div>
    </SectionShell>
  );
};
