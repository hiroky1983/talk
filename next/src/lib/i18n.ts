import path from "node:path";
import type { UserConfig } from "next-i18next";

export const supportedLngs = ["en", "ja", "vi"] as const;
export const defaultLocale = "en";
export const namespaces = ["common", "auth"] as const;

const localePath =
  typeof window === "undefined"
    ? path.resolve(process.cwd(), "../locales")
    : "/locales";

export const createNextI18NextConfig = (): UserConfig => ({
  i18n: {
    defaultLocale,
    locales: [...supportedLngs],
  },
  ns: namespaces,
  defaultNS: "common",
  localePath,
  fallbackLng: defaultLocale,
  reloadOnPrerender: process.env.NODE_ENV === "development",
});

const i18nConfig = createNextI18NextConfig();

export default i18nConfig;
