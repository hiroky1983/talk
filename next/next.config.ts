import type { NextConfig } from "next";
import { defaultLocale, supportedLngs } from "./src/lib/i18n";

const nextConfig: NextConfig = {
  i18n: {
    defaultLocale,
    locales: [...supportedLngs],
  },
};

export default nextConfig;
