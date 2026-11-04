"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, Layers, ShieldCheck, Clock } from "lucide-react";

export default function ReviewWorkbenchPlaceholder() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-center space-y-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-800">
        <Layers className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700 border border-slate-200">
          Consignment {id}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Split-Screen Document & Field Review Workbench
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Interactive Side-by-Side Multi-Document PDF Viewer, Scan Tilt De-Skewing (-2.8°), and Deterministic 3-Way Cross-Check Matrix (Scheduled for Phase 6).
        </p>
      </div>

      <div className="pt-4 flex justify-center gap-3">
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 shadow-xs"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Shipments</span>
        </Link>
      </div>
    </div>
  );
}
