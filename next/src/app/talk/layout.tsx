import { Metadata } from "next";

export const metadata: Metadata = {
  title: "AI Language Practice - Talk",
  description: "Practice languages with AI conversation",
};

export default function TalkLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">{children}</div>
  );
}
