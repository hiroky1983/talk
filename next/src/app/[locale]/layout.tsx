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
  const { locale: resolvedLocale } = await params;
  const locale = locales.includes(resolvedLocale as Locale)
    ? (resolvedLocale as Locale)
    : defaultLocale;
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
