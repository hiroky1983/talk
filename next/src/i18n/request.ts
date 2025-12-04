import { getRequestConfig } from 'next-intl/server';
import { getMessages } from '../lib/i18n/messages';
import { locales, defaultLocale, Locale } from '../lib/i18n/config';

export default getRequestConfig(async ({ requestLocale }) => {
  let locale = await requestLocale;

  // Validate that the incoming `locale` parameter is valid
  if (!locale || !locales.includes(locale as Locale)) {
    locale = defaultLocale;
  }

  const messages = await getMessages(locale);

  return {
    locale,
    messages: messages || {}
  };
});
