import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enGeoPopup from "./locales/en/geoPopup.json";
import enClinicListing from "./locales/en/clinicListing.json";
import enClinicDetail from "./locales/en/clinicDetail.json";
import enAuth from "./locales/en/auth.json";
import enRegisterClinic from "./locales/en/registerClinic.json";
import enDashboard from "./locales/en/dashboard.json";
import enClinicPanel from "./locales/en/clinicPanel.json";
import enApplicationsTab from "./locales/en/applicationsTab.json";
import enClinicInfoTab from "./locales/en/clinicInfoTab.json";
import enClinicManagers from "./locales/en/clinicManagers.json";
import enBalanceAndLeads from "./locales/en/balanceAndLeads.json";
import enAdmin from "./locales/en/admin.json";
import enTreatmentsPage from "./locales/en/treatmentsPage.json";
import enAboutUs from "./locales/en/aboutUs.json";

import trCommon from "./locales/tr/common.json";
import trHome from "./locales/tr/home.json";
import trGeoPopup from "./locales/tr/geoPopup.json";
import trClinicListing from "./locales/tr/clinicListing.json";
import trClinicDetail from "./locales/tr/clinicDetail.json";
import trAuth from "./locales/tr/auth.json";
import trRegisterClinic from "./locales/tr/registerClinic.json";
import trDashboard from "./locales/tr/dashboard.json";
import trClinicPanel from "./locales/tr/clinicPanel.json";
import trApplicationsTab from "./locales/tr/applicationsTab.json";
import trClinicInfoTab from "./locales/tr/clinicInfoTab.json";
import trClinicManagers from "./locales/tr/clinicManagers.json";
import trBalanceAndLeads from "./locales/tr/balanceAndLeads.json";
import trAdmin from "./locales/tr/admin.json";
import trTreatmentsPage from "./locales/tr/treatmentsPage.json";
import trAboutUs from "./locales/tr/aboutUs.json";

// Statically imported (no i18next-http-backend) on purpose: every locale's
// JSON is bundled at build time so switching language never triggers a
// network fetch or shows a flash of missing strings.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, home: enHome, geoPopup: enGeoPopup, clinicListing: enClinicListing, clinicDetail: enClinicDetail, auth: enAuth, registerClinic: enRegisterClinic, dashboard: enDashboard, clinicPanel: enClinicPanel, applicationsTab: enApplicationsTab, clinicInfoTab: enClinicInfoTab, clinicManagers: enClinicManagers, balanceAndLeads: enBalanceAndLeads, admin: enAdmin, treatmentsPage: enTreatmentsPage, aboutUs: enAboutUs },
      tr: { common: trCommon, home: trHome, geoPopup: trGeoPopup, clinicListing: trClinicListing, clinicDetail: trClinicDetail, auth: trAuth, registerClinic: trRegisterClinic, dashboard: trDashboard, clinicPanel: trClinicPanel, applicationsTab: trApplicationsTab, clinicInfoTab: trClinicInfoTab, clinicManagers: trClinicManagers, balanceAndLeads: trBalanceAndLeads, admin: trAdmin, treatmentsPage: trTreatmentsPage, aboutUs: trAboutUs },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "tr"],
    ns: ["common", "home", "geoPopup", "clinicListing", "clinicDetail", "auth", "registerClinic", "dashboard", "clinicPanel", "applicationsTab", "clinicInfoTab", "clinicManagers", "balanceAndLeads", "admin", "treatmentsPage", "aboutUs"],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    // The URL's :lang segment is the source of truth for the active
    // language (set explicitly by LocaleLayout) — the browser detector is
    // not used to auto-switch, only kept registered for potential future use.
    detection: { order: [], caches: [] },
  });

export default i18n;
