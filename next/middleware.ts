import createMiddleware from "next-intl/middleware";

import { defaultLocale, localePrefix, locales } from "./src/lib/i18n/config";

export default createMiddleware({
  defaultLocale,
  locales,
  localePrefix,
});

export const config = {
  matcher: ["/((?!_next|.*\\..*).*)"],
};
