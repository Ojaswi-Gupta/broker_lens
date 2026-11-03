import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BrokerLens — Customs Broker AI Document Extraction & Cross-Check",
  description:
    "AI-assisted customs document extraction and 3-way cross-check workbench for customs brokers (CHA).",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased">
        {children}
      </body>
    </html>
  );
}
