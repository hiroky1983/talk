export const locales = ["en", "ja", "vi"] as const;

export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "en";
export const namespaces = ["common", "auth"] as const;
export const localePrefix = "always";
