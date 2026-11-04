import type { Metadata } from "next";
import "./globals.css";
import { AppProvider } from "@/context/AppContext";
import { Navbar } from "@/components/Navbar";

export const metadata: Metadata = {
  title: "BrokerLens — Customs Broker AI Document Extraction & 3-Way Cross-Check Workbench",
  description:
    "Nhava Sheva Customs Documentation Workbench for Company A: automated extraction, 3-way cross-check (Invoice vs PL vs BoL), and ICEGATE customs filing export.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-slate-50 text-slate-900 antialiased flex flex-col">
        <AppProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
        </AppProvider>
      </body>
    </html>
  );
}
