import Link from "next/link";
import { ArrowRight, ShieldCheck, FileCheck, Layers } from "lucide-react";

export default function HomePage() {
  return (
    <main className="min-h-screen flex flex-col justify-between p-8 md:p-16 max-w-6xl mx-auto">
      <header className="flex justify-between items-center border-b border-slate-200 pb-6">
        <div>
          <span className="text-xs uppercase tracking-widest font-mono text-slate-500 font-semibold">
            Company A • JNPT / Nhava Sheva Port
          </span>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Broker<span className="text-blue-600">Lens</span>
          </h1>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 border border-emerald-300">
            DPDP 2023 Compliant
          </span>
          <Link
            href="/login"
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-md bg-slate-900 text-white text-sm font-medium hover:bg-slate-800 transition"
          >
            Launch Workbench <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </header>

      <section className="my-16 space-y-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 text-xs font-mono font-medium rounded-full bg-slate-100 text-slate-700 border border-slate-300">
          Problem Statement #3 • Production Release
        </div>
        <h2 className="text-4xl md:text-5xl font-extrabold tracking-tight text-slate-900 max-w-3xl leading-tight">
          Customs Broker AI Document Extraction & 3-Way Cross-Check Workbench
        </h2>
        <p className="text-lg text-slate-600 max-w-2xl leading-relaxed">
          Eliminates ₹70.29 lakh/year manual retyping bleed across 1,100 shipments/month.
          Validates Commercial Invoices, Packing Lists, and Bills of Lading with 
          deterministic cross-checks before ICEGATE customs filing.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-8">
          <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center">
              <FileCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Vision AI & Deterministic Fallback</h3>
            <p className="text-sm text-slate-600">
              Extracts parties, items, 8-digit HSNs, container numbers, and weights with confidence scoring and skew handling.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-md bg-emerald-50 text-emerald-600 flex items-center justify-center">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">Deterministic 3-Way Cross-Check</h3>
            <p className="text-sm text-slate-600">
              Catches weight, quantity, and currency discrepancies between Invoice, Packing List, and BoL before port clearance.
            </p>
          </div>

          <div className="p-6 rounded-lg border border-slate-200 bg-white shadow-sm space-y-3">
            <div className="w-10 h-10 rounded-md bg-indigo-50 text-indigo-600 flex items-center justify-center">
              <Layers className="w-5 h-5" />
            </div>
            <h3 className="font-semibold text-slate-900">1-Click Filing Export</h3>
            <p className="text-sm text-slate-600">
              Strictly gatekeeps export until human confirmation of low-confidence fields and outputs ready-to-import CSV/Excel.
            </p>
          </div>
        </div>
      </section>

      <footer className="border-t border-slate-200 pt-6 flex flex-col sm:flex-row justify-between text-xs text-slate-500 gap-2">
        <p>BrokerLens © 2026 • Navi Mumbai (JNPT / Nhava Sheva CHA Operations)</p>
        <p className="font-mono">Decoupled Monorepo • Next.js 14 + FastAPI + SQLAlchemy</p>
      </footer>
    </main>
  );
}
