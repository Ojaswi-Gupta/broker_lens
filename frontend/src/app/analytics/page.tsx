"use client";

import React from "react";
import Link from "next/link";
import { ArrowLeft, BarChart3, TrendingUp } from "lucide-react";

export default function AnalyticsPagePlaceholder() {
  return (
    <div className="mx-auto max-w-5xl px-4 py-12 sm:px-6 text-center space-y-6">
      <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-blue-50 text-blue-700 border border-blue-200">
        <BarChart3 className="h-6 w-6" />
      </div>
      <div className="space-y-2">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Manager Accuracy & Audit History Report
        </h1>
        <p className="text-xs text-slate-500 max-w-md mx-auto">
          Per-field accuracy breakdown vs 95% SLA target, per-supplier recurring patterns, and immutable human edit audit logs (Scheduled for Phase 7).
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
