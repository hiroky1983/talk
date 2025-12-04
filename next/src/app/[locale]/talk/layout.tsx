import type { Metadata } from "next";
import { getTranslations } from "next-intl/server";
import type { ReactNode } from "react";

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

const TalkLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <div className="min-h-screen bg-gray-50 flex flex-col">{children}</div>;
};

export default TalkLayout;
