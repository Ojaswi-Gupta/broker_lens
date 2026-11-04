"use client";

import React from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft, FileDown, CheckCircle2 } from "lucide-react";

export default function ExportPagePlaceholder() {
  const params = useParams();
  const id = params?.id as string;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-center space-y-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200">
        <FileDown className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-mono font-bold text-slate-700 border border-slate-200">
          Consignment {id}
        </span>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Customs Filing Software Excel/CSV Export
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          27-column ICEGATE/VisualIMPEX flat file download with UTF-8 BOM encoding and pre-flight clearance checklist (Scheduled for Phase 7).
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
