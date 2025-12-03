import i18n from "i18next";
import { initReactI18next } from "react-i18next";

import enAuth from "../../../locales/en/auth.json";
import enCommon from "../../../locales/en/common.json";
import jaAuth from "../../../locales/ja/auth.json";
import jaCommon from "../../../locales/ja/common.json";
import viAuth from "../../../locales/vi/auth.json";
import viCommon from "../../../locales/vi/common.json";

const resources = {
  en: {
    common: enCommon,
    auth: enAuth,
  },
  ja: {
    common: jaCommon,
    auth: jaAuth,
  },
  vi: {
    common: viCommon,
    auth: viAuth,
  },
} as const;

void i18n.use(initReactI18next).init({
  compatibilityJSON: "v4",
  resources,
  lng: "en",
  fallbackLng: "en",
  ns: ["common", "auth"],
  defaultNS: "common",
  interpolation: {
    escapeValue: false,
  },
});

export default i18n;
