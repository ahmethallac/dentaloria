import { useLayoutEffect } from "react";
import { Outlet, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isSupportedLocale } from "@/i18n/siteLocales";
import NotFound from "@/pages/NotFound";

// Layout route mounted at "/:lang". Validates the locale segment, switches
// i18next's active language before the children paint, and sets the
// document's lang attribute for accessibility/SEO. An unrecognized :lang
// renders NotFound directly (without changing the URL) rather than
// silently absorbing typo'd paths as home.
export const LocaleLayout = () => {
  const { lang } = useParams();
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    if (isSupportedLocale(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    if (isSupportedLocale(lang)) {
      document.documentElement.lang = lang;
    }
  }, [lang, i18n]);

  if (!isSupportedLocale(lang)) {
    return <NotFound />;
  }

  return <Outlet />;
};

export default LocaleLayout;
