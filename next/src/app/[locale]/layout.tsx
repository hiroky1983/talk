import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { NextIntlClientProvider } from "next-intl";
import { getTranslations } from "next-intl/server";
import { Geist, Geist_Mono } from "next/font/google";
import type { ReactNode } from "react";

import { getMessages } from "@/lib/i18n/messages";
import { defaultLocale, locales, type Locale } from "@/lib/i18n/config";
import { QueryProvider } from "@/providers/QueryProvider";
import "../globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const t = await getTranslations({ locale, namespace: "common" });

  return {
    title: `${t("appName")} - ${t("welcomeDefault")}`,
    description: t("tagline"),
  };
}

export const generateStaticParams = () => locales.map((locale) => ({ locale }));

const LocaleLayout = async ({
  children,
  params,
}: {
  children: ReactNode;
  params: Promise<{ locale: string }>;
}) => {
  const paramsData = await params;

  // Enhanced security validation for params to mitigate CVE-2025-55182
  // Ensure params is a plain object and locale is a string
  if (
    !paramsData ||
    typeof paramsData !== 'object' ||
    Array.isArray(paramsData) ||
    Object.getPrototypeOf(paramsData) !== Object.prototype
  ) {
    notFound();
  }

  const resolvedLocale = paramsData.locale;

  // Strict type and value validation
  if (typeof resolvedLocale !== 'string' || resolvedLocale.length === 0 || resolvedLocale.length > 10) {
    notFound();
  }

  // Only allow aa-BB format (two lowercase letters, optionally followed by hyphen and two uppercase letters)
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(resolvedLocale)) {
    notFound();
  }

  // Only allow explicitly supported locales
  if (!locales.includes(resolvedLocale as Locale)) {
    notFound();
  }

  const locale = resolvedLocale as Locale;
  const messages = await getMessages(locale);

  if (!messages) {
    notFound();
  }

  return (
    <html lang={locale}>
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <QueryProvider>
          <NextIntlClientProvider locale={locale} messages={messages}>
            {children}
          </NextIntlClientProvider>
        </QueryProvider>
      </body>
    </html>
  );
};

export default LocaleLayout;
