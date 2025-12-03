import type { Metadata } from "next";
import type { ReactNode } from "react";

export const metadata: Metadata = {
  title: "AI Language Practice - Talk",
  description: "Practice languages with AI conversation",
};

const TalkLayout = ({
  children,
}: {
  children: ReactNode;
}) => {
  return <div className="min-h-screen bg-gray-50 flex flex-col">{children}</div>;
};

export default TalkLayout;
