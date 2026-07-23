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

import roCommon from "./locales/ro/common.json";
import roHome from "./locales/ro/home.json";
import roGeoPopup from "./locales/ro/geoPopup.json";
import roClinicListing from "./locales/ro/clinicListing.json";
import roClinicDetail from "./locales/ro/clinicDetail.json";
import roAuth from "./locales/ro/auth.json";
import roRegisterClinic from "./locales/ro/registerClinic.json";
import roDashboard from "./locales/ro/dashboard.json";
import roClinicPanel from "./locales/ro/clinicPanel.json";
import roApplicationsTab from "./locales/ro/applicationsTab.json";
import roClinicInfoTab from "./locales/ro/clinicInfoTab.json";
import roClinicManagers from "./locales/ro/clinicManagers.json";
import roBalanceAndLeads from "./locales/ro/balanceAndLeads.json";
import roAdmin from "./locales/ro/admin.json";

import plCommon from "./locales/pl/common.json";
import plHome from "./locales/pl/home.json";
import plGeoPopup from "./locales/pl/geoPopup.json";
import plClinicListing from "./locales/pl/clinicListing.json";
import plClinicDetail from "./locales/pl/clinicDetail.json";
import plAuth from "./locales/pl/auth.json";
import plRegisterClinic from "./locales/pl/registerClinic.json";
import plDashboard from "./locales/pl/dashboard.json";
import plClinicPanel from "./locales/pl/clinicPanel.json";
import plApplicationsTab from "./locales/pl/applicationsTab.json";
import plClinicInfoTab from "./locales/pl/clinicInfoTab.json";
import plClinicManagers from "./locales/pl/clinicManagers.json";
import plBalanceAndLeads from "./locales/pl/balanceAndLeads.json";
import plAdmin from "./locales/pl/admin.json";

import ruCommon from "./locales/ru/common.json";
import ruHome from "./locales/ru/home.json";
import ruGeoPopup from "./locales/ru/geoPopup.json";
import ruClinicListing from "./locales/ru/clinicListing.json";
import ruClinicDetail from "./locales/ru/clinicDetail.json";
import ruAuth from "./locales/ru/auth.json";
import ruRegisterClinic from "./locales/ru/registerClinic.json";
import ruDashboard from "./locales/ru/dashboard.json";
import ruClinicPanel from "./locales/ru/clinicPanel.json";
import ruApplicationsTab from "./locales/ru/applicationsTab.json";
import ruClinicInfoTab from "./locales/ru/clinicInfoTab.json";
import ruClinicManagers from "./locales/ru/clinicManagers.json";
import ruBalanceAndLeads from "./locales/ru/balanceAndLeads.json";
import ruAdmin from "./locales/ru/admin.json";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deGeoPopup from "./locales/de/geoPopup.json";
import deClinicListing from "./locales/de/clinicListing.json";
import deClinicDetail from "./locales/de/clinicDetail.json";
import deAuth from "./locales/de/auth.json";
import deRegisterClinic from "./locales/de/registerClinic.json";
import deDashboard from "./locales/de/dashboard.json";
import deClinicPanel from "./locales/de/clinicPanel.json";
import deApplicationsTab from "./locales/de/applicationsTab.json";
import deClinicInfoTab from "./locales/de/clinicInfoTab.json";
import deClinicManagers from "./locales/de/clinicManagers.json";
import deBalanceAndLeads from "./locales/de/balanceAndLeads.json";
import deAdmin from "./locales/de/admin.json";

import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import frGeoPopup from "./locales/fr/geoPopup.json";
import frClinicListing from "./locales/fr/clinicListing.json";
import frClinicDetail from "./locales/fr/clinicDetail.json";
import frAuth from "./locales/fr/auth.json";
import frRegisterClinic from "./locales/fr/registerClinic.json";
import frDashboard from "./locales/fr/dashboard.json";
import frClinicPanel from "./locales/fr/clinicPanel.json";
import frApplicationsTab from "./locales/fr/applicationsTab.json";
import frClinicInfoTab from "./locales/fr/clinicInfoTab.json";
import frClinicManagers from "./locales/fr/clinicManagers.json";
import frBalanceAndLeads from "./locales/fr/balanceAndLeads.json";
import frAdmin from "./locales/fr/admin.json";

// Statically imported (no i18next-http-backend) on purpose: every locale's
// JSON is bundled at build time so switching language never triggers a
// network fetch or shows a flash of missing strings.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, home: enHome, geoPopup: enGeoPopup, clinicListing: enClinicListing, clinicDetail: enClinicDetail, auth: enAuth, registerClinic: enRegisterClinic, dashboard: enDashboard, clinicPanel: enClinicPanel, applicationsTab: enApplicationsTab, clinicInfoTab: enClinicInfoTab, clinicManagers: enClinicManagers, balanceAndLeads: enBalanceAndLeads, admin: enAdmin },
      tr: { common: trCommon, home: trHome, geoPopup: trGeoPopup, clinicListing: trClinicListing, clinicDetail: trClinicDetail, auth: trAuth, registerClinic: trRegisterClinic, dashboard: trDashboard, clinicPanel: trClinicPanel, applicationsTab: trApplicationsTab, clinicInfoTab: trClinicInfoTab, clinicManagers: trClinicManagers, balanceAndLeads: trBalanceAndLeads, admin: trAdmin },
      ro: { common: roCommon, home: roHome, geoPopup: roGeoPopup, clinicListing: roClinicListing, clinicDetail: roClinicDetail, auth: roAuth, registerClinic: roRegisterClinic, dashboard: roDashboard, clinicPanel: roClinicPanel, applicationsTab: roApplicationsTab, clinicInfoTab: roClinicInfoTab, clinicManagers: roClinicManagers, balanceAndLeads: roBalanceAndLeads, admin: roAdmin },
      pl: { common: plCommon, home: plHome, geoPopup: plGeoPopup, clinicListing: plClinicListing, clinicDetail: plClinicDetail, auth: plAuth, registerClinic: plRegisterClinic, dashboard: plDashboard, clinicPanel: plClinicPanel, applicationsTab: plApplicationsTab, clinicInfoTab: plClinicInfoTab, clinicManagers: plClinicManagers, balanceAndLeads: plBalanceAndLeads, admin: plAdmin },
      ru: { common: ruCommon, home: ruHome, geoPopup: ruGeoPopup, clinicListing: ruClinicListing, clinicDetail: ruClinicDetail, auth: ruAuth, registerClinic: ruRegisterClinic, dashboard: ruDashboard, clinicPanel: ruClinicPanel, applicationsTab: ruApplicationsTab, clinicInfoTab: ruClinicInfoTab, clinicManagers: ruClinicManagers, balanceAndLeads: ruBalanceAndLeads, admin: ruAdmin },
      de: { common: deCommon, home: deHome, geoPopup: deGeoPopup, clinicListing: deClinicListing, clinicDetail: deClinicDetail, auth: deAuth, registerClinic: deRegisterClinic, dashboard: deDashboard, clinicPanel: deClinicPanel, applicationsTab: deApplicationsTab, clinicInfoTab: deClinicInfoTab, clinicManagers: deClinicManagers, balanceAndLeads: deBalanceAndLeads, admin: deAdmin },
      fr: { common: frCommon, home: frHome, geoPopup: frGeoPopup, clinicListing: frClinicListing, clinicDetail: frClinicDetail, auth: frAuth, registerClinic: frRegisterClinic, dashboard: frDashboard, clinicPanel: frClinicPanel, applicationsTab: frApplicationsTab, clinicInfoTab: frClinicInfoTab, clinicManagers: frClinicManagers, balanceAndLeads: frBalanceAndLeads, admin: frAdmin },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "tr", "ro", "pl", "ru", "de", "fr"],
    ns: ["common", "home", "geoPopup", "clinicListing", "clinicDetail", "auth", "registerClinic", "dashboard", "clinicPanel", "applicationsTab", "clinicInfoTab", "clinicManagers", "balanceAndLeads", "admin"],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    // The URL's :lang segment is the source of truth for the active
    // language (set explicitly by LocaleLayout) — the browser detector is
    // not used to auto-switch, only kept registered for potential future use.
    detection: { order: [], caches: [] },
  });

export default i18n;
