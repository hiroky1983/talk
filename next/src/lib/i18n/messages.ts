import fs from "node:fs/promises";
import path from "node:path";
import type { AbstractIntlMessages } from "next-intl";

import { defaultLocale, locales, namespaces, type Locale } from "./config";

const getLocaleFilePath = (locale: Locale, namespace: (typeof namespaces)[number]) =>
  path.join(process.cwd(), "..", "locales", locale, `${namespace}.json`);

const loadNamespace = async (
  locale: Locale,
  namespace: (typeof namespaces)[number],
): Promise<Record<string, unknown>> => {
  const filePath = getLocaleFilePath(locale, namespace);
  const rawContent = await fs.readFile(filePath, "utf-8");
  return JSON.parse(rawContent) as Record<string, unknown>;
};

export const getMessages = async (
  locale: string,
): Promise<AbstractIntlMessages | null> => {
  if (!locales.includes(locale as Locale)) {
    return null;
  }

  try {
    const loadedNamespaces = await Promise.all(
      namespaces.map((namespace) => loadNamespace(locale as Locale, namespace)),
    );

    return namespaces.reduce<AbstractIntlMessages>((acc, namespace, index) => {
      acc[namespace] = loadedNamespaces[index];
      return acc;
    }, {});
  } catch (error) {
    console.error(`Failed to load messages for locale: ${locale}`, error);
    return null;
  }
};

export { defaultLocale };
