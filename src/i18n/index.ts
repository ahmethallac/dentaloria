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

import trCommon from "./locales/tr/common.json";
import trHome from "./locales/tr/home.json";
import trGeoPopup from "./locales/tr/geoPopup.json";
import trClinicListing from "./locales/tr/clinicListing.json";
import trClinicDetail from "./locales/tr/clinicDetail.json";
import trAuth from "./locales/tr/auth.json";
import trRegisterClinic from "./locales/tr/registerClinic.json";

import roCommon from "./locales/ro/common.json";
import roHome from "./locales/ro/home.json";
import roGeoPopup from "./locales/ro/geoPopup.json";
import roClinicListing from "./locales/ro/clinicListing.json";
import roClinicDetail from "./locales/ro/clinicDetail.json";
import roAuth from "./locales/ro/auth.json";
import roRegisterClinic from "./locales/ro/registerClinic.json";

import plCommon from "./locales/pl/common.json";
import plHome from "./locales/pl/home.json";
import plGeoPopup from "./locales/pl/geoPopup.json";
import plClinicListing from "./locales/pl/clinicListing.json";
import plClinicDetail from "./locales/pl/clinicDetail.json";
import plAuth from "./locales/pl/auth.json";
import plRegisterClinic from "./locales/pl/registerClinic.json";

import ruCommon from "./locales/ru/common.json";
import ruHome from "./locales/ru/home.json";
import ruGeoPopup from "./locales/ru/geoPopup.json";
import ruClinicListing from "./locales/ru/clinicListing.json";
import ruClinicDetail from "./locales/ru/clinicDetail.json";
import ruAuth from "./locales/ru/auth.json";
import ruRegisterClinic from "./locales/ru/registerClinic.json";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deGeoPopup from "./locales/de/geoPopup.json";
import deClinicListing from "./locales/de/clinicListing.json";
import deClinicDetail from "./locales/de/clinicDetail.json";
import deAuth from "./locales/de/auth.json";
import deRegisterClinic from "./locales/de/registerClinic.json";

import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import frGeoPopup from "./locales/fr/geoPopup.json";
import frClinicListing from "./locales/fr/clinicListing.json";
import frClinicDetail from "./locales/fr/clinicDetail.json";
import frAuth from "./locales/fr/auth.json";
import frRegisterClinic from "./locales/fr/registerClinic.json";

// Statically imported (no i18next-http-backend) on purpose: every locale's
// JSON is bundled at build time so switching language never triggers a
// network fetch or shows a flash of missing strings.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, home: enHome, geoPopup: enGeoPopup, clinicListing: enClinicListing, clinicDetail: enClinicDetail, auth: enAuth, registerClinic: enRegisterClinic },
      tr: { common: trCommon, home: trHome, geoPopup: trGeoPopup, clinicListing: trClinicListing, clinicDetail: trClinicDetail, auth: trAuth, registerClinic: trRegisterClinic },
      ro: { common: roCommon, home: roHome, geoPopup: roGeoPopup, clinicListing: roClinicListing, clinicDetail: roClinicDetail, auth: roAuth, registerClinic: roRegisterClinic },
      pl: { common: plCommon, home: plHome, geoPopup: plGeoPopup, clinicListing: plClinicListing, clinicDetail: plClinicDetail, auth: plAuth, registerClinic: plRegisterClinic },
      ru: { common: ruCommon, home: ruHome, geoPopup: ruGeoPopup, clinicListing: ruClinicListing, clinicDetail: ruClinicDetail, auth: ruAuth, registerClinic: ruRegisterClinic },
      de: { common: deCommon, home: deHome, geoPopup: deGeoPopup, clinicListing: deClinicListing, clinicDetail: deClinicDetail, auth: deAuth, registerClinic: deRegisterClinic },
      fr: { common: frCommon, home: frHome, geoPopup: frGeoPopup, clinicListing: frClinicListing, clinicDetail: frClinicDetail, auth: frAuth, registerClinic: frRegisterClinic },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "tr", "ro", "pl", "ru", "de", "fr"],
    ns: ["common", "home", "geoPopup", "clinicListing", "clinicDetail", "auth", "registerClinic"],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    // The URL's :lang segment is the source of truth for the active
    // language (set explicitly by LocaleLayout) — the browser detector is
    // not used to auto-switch, only kept registered for potential future use.
    detection: { order: [], caches: [] },
  });

export default i18n;
