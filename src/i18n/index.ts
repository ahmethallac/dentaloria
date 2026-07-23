import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import enCommon from "./locales/en/common.json";
import enHome from "./locales/en/home.json";
import enGeoPopup from "./locales/en/geoPopup.json";

import trCommon from "./locales/tr/common.json";
import trHome from "./locales/tr/home.json";
import trGeoPopup from "./locales/tr/geoPopup.json";

import roCommon from "./locales/ro/common.json";
import roHome from "./locales/ro/home.json";
import roGeoPopup from "./locales/ro/geoPopup.json";

import plCommon from "./locales/pl/common.json";
import plHome from "./locales/pl/home.json";
import plGeoPopup from "./locales/pl/geoPopup.json";

import ruCommon from "./locales/ru/common.json";
import ruHome from "./locales/ru/home.json";
import ruGeoPopup from "./locales/ru/geoPopup.json";

import deCommon from "./locales/de/common.json";
import deHome from "./locales/de/home.json";
import deGeoPopup from "./locales/de/geoPopup.json";

import frCommon from "./locales/fr/common.json";
import frHome from "./locales/fr/home.json";
import frGeoPopup from "./locales/fr/geoPopup.json";

// Statically imported (no i18next-http-backend) on purpose: every locale's
// JSON is bundled at build time so switching language never triggers a
// network fetch or shows a flash of missing strings.
i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { common: enCommon, home: enHome, geoPopup: enGeoPopup },
      tr: { common: trCommon, home: trHome, geoPopup: trGeoPopup },
      ro: { common: roCommon, home: roHome, geoPopup: roGeoPopup },
      pl: { common: plCommon, home: plHome, geoPopup: plGeoPopup },
      ru: { common: ruCommon, home: ruHome, geoPopup: ruGeoPopup },
      de: { common: deCommon, home: deHome, geoPopup: deGeoPopup },
      fr: { common: frCommon, home: frHome, geoPopup: frGeoPopup },
    },
    lng: "en",
    fallbackLng: "en",
    supportedLngs: ["en", "tr", "ro", "pl", "ru", "de", "fr"],
    ns: ["common", "home", "geoPopup"],
    defaultNS: "common",
    interpolation: { escapeValue: false }, // React already escapes
    // The URL's :lang segment is the source of truth for the active
    // language (set explicitly by LocaleLayout) — the browser detector is
    // not used to auto-switch, only kept registered for potential future use.
    detection: { order: [], caches: [] },
  });

export default i18n;
