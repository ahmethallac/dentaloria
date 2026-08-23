import { useLayoutEffect } from "react";
import { Navigate, Outlet, useLocation, useParams } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { isRetiredLocale, isSupportedLocale } from "@/i18n/siteLocales";
import NotFound from "@/pages/NotFound";

// Layout route mounted at "/:lang". Validates the locale segment, switches
// i18next's active language before the children paint, and sets the
// document's lang attribute for accessibility/SEO. An unrecognized :lang
// renders NotFound directly (without changing the URL) rather than
// silently absorbing typo'd paths as home.
export const LocaleLayout = () => {
  const { lang } = useParams();
  const location = useLocation();
  const { i18n } = useTranslation();

  useLayoutEffect(() => {
    if (isSupportedLocale(lang) && i18n.language !== lang) {
      i18n.changeLanguage(lang);
    }
    if (isSupportedLocale(lang)) {
      document.documentElement.lang = lang;
    }
  }, [lang, i18n]);

  // A locale we used to serve: its URLs were indexed, so strip the prefix and
  // land on the English page rather than throwing a 404 at the visitor.
  if (isRetiredLocale(lang)) {
    const stripped = location.pathname.replace(new RegExp(`^/${lang}`), "") || "/";
    return <Navigate to={`${stripped}${location.search}${location.hash}`} replace />;
  }

  if (!isSupportedLocale(lang)) {
    return <NotFound />;
  }

  return <Outlet />;
};

export default LocaleLayout;
