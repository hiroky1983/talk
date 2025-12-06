import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import { NextIntlClientProvider } from 'next-intl'
import { getTranslations } from 'next-intl/server'
import { Geist, Geist_Mono } from 'next/font/google'
import type { ReactNode } from 'react'

import { getMessages } from '@/lib/i18n/messages'
import { defaultLocale, locales, type Locale } from '@/lib/i18n/config'
import { QueryProvider } from '@/providers/QueryProvider'
import { ThemeProvider } from '@/contexts/ThemeContext'
import '../globals.css'

const geistSans = Geist({
  variable: '--font-geist-sans',
  subsets: ['latin'],
})

const geistMono = Geist_Mono({
  variable: '--font-geist-mono',
  subsets: ['latin'],
})

/**
 * Validates locale parameter with strict security checks to prevent:
 * - Prototype pollution attacks
 * - Path traversal attempts
 * - Injection of unsupported locales
 *
 * @param paramsData - The params object to validate
 * @returns Valid locale or triggers notFound()
 */
function validateLocale(paramsData: unknown): Locale {
  // Ensure params is a plain object (prevents prototype pollution)
  if (
    !paramsData ||
    typeof paramsData !== 'object' ||
    Array.isArray(paramsData) ||
    Object.getPrototypeOf(paramsData) !== Object.prototype
  ) {
    notFound()
  }

  const resolvedLocale = (paramsData as { locale: unknown }).locale

  // Strict type and value validation
  if (
    typeof resolvedLocale !== 'string' ||
    resolvedLocale.length === 0 ||
    resolvedLocale.length > 10
  ) {
    notFound()
  }

  // Only allow aa-BB format (two lowercase letters, optionally followed by hyphen and two uppercase letters)
  if (!/^[a-z]{2}(-[A-Z]{2})?$/.test(resolvedLocale)) {
    notFound()
  }

  // Only allow explicitly supported locales
  if (!locales.includes(resolvedLocale as Locale)) {
    notFound()
  }

  return resolvedLocale as Locale
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ locale: string }>
}) {
  const paramsData = await params
  const locale = validateLocale(paramsData)
  const t = await getTranslations({ locale, namespace: 'common' })

  return {
    title: `${t('appName')} - ${t('welcomeDefault')}`,
    description: t('tagline'),
  }
}

export const generateStaticParams = () => locales.map((locale) => ({ locale }))

const LocaleLayout = async ({
  children,
  params,
}: {
  children: ReactNode
  params: Promise<{ locale: string }>
}) => {
  const paramsData = await params
  const locale = validateLocale(paramsData)
  const messages = await getMessages(locale)

  if (!messages) {
    notFound()
  }

  return (
    <html lang={locale} suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider>
          <QueryProvider>
            <NextIntlClientProvider locale={locale} messages={messages}>
              {children}
            </NextIntlClientProvider>
          </QueryProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}

export default LocaleLayout
