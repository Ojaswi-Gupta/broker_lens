"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import {
  BarChart3,
  TrendingUp,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Coins,
  ShieldCheck,
  FileSpreadsheet,
  Download,
  RefreshCw,
  Search,
  Filter,
  ArrowUpRight,
  ExternalLink,
  Building2,
  Globe,
  FileText,
  ChevronRight,
  Info,
  Sparkles,
  SlidersHorizontal,
  ArrowDownRight,
  Check,
} from "lucide-react";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import { AnalyticsOverview, FieldEditHistoryItem, AnalyticsFieldBreakdown, AnalyticsSupplierBreakdown } from "@/types";

export default function AnalyticsPage() {
  const { user } = useApp();
  const [data, setData] = useState<AnalyticsOverview | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filters
  const [selectedSupplier, setSelectedSupplier] = useState<string>("ALL");
  const [selectedFieldKey, setSelectedFieldKey] = useState<string>("ALL");
  const [auditSearchQuery, setAuditSearchQuery] = useState<string>("");
  const [auditOutcomeFilter, setAuditOutcomeFilter] = useState<"ALL" | "CORRECT" | "EDITED">("ALL");
  const [fieldSlaFilter, setFieldSlaFilter] = useState<"ALL" | "MET" | "NEEDS_REVIEW">("ALL");

  const fetchData = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const result = await api.getAnalyticsOverview();
      setData(result);
    } catch (err: any) {
      console.error("Failed to load analytics:", err);
      setError(err?.message || "Failed to load accuracy analytics.");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  // Filtered fields list
  const filteredFields = useMemo(() => {
    if (!data?.by_field) return [];
    return data.by_field.filter((f) => {
      if (fieldSlaFilter === "MET") return f.meets_95_target;
      if (fieldSlaFilter === "NEEDS_REVIEW") return !f.meets_95_target;
      return true;
    });
  }, [data?.by_field, fieldSlaFilter]);

  // Unique suppliers from recent edits and by_supplier
  const supplierOptions = useMemo(() => {
    if (!data?.by_supplier) return [];
    return data.by_supplier.map((s) => s.supplier_name);
  }, [data?.by_supplier]);

  // Unique field keys for filter dropdown
  const fieldKeyOptions = useMemo(() => {
    if (!data?.by_field) return [];
    return data.by_field.map((f) => ({ key: f.field_key, label: f.field_label }));
  }, [data?.by_field]);

  // Filtered audit history
  const filteredEdits = useMemo(() => {
    if (!data?.recent_edits) return [];
    return data.recent_edits.filter((edit) => {
      // Supplier filter
      if (selectedSupplier !== "ALL" && !edit.supplier_name.toLowerCase().includes(selectedSupplier.toLowerCase())) {
        return false;
      }
      // Field key filter
      if (selectedFieldKey !== "ALL" && edit.field_key !== selectedFieldKey) {
        return false;
      }
      // Outcome filter
      if (auditOutcomeFilter === "CORRECT" && !edit.was_ai_correct) return false;
      if (auditOutcomeFilter === "EDITED" && edit.was_ai_correct) return false;
      // Search query filter
      if (auditSearchQuery.trim()) {
        const q = auditSearchQuery.toLowerCase();
        const matchesCode = edit.shipment_code.toLowerCase().includes(q);
        const matchesSupplier = edit.supplier_name.toLowerCase().includes(q);
        const matchesField = edit.field_label.toLowerCase().includes(q);
        const matchesVal = (edit.updated_human_value || "").toLowerCase().includes(q);
        const matchesEditor = (edit.edited_by_name || "").toLowerCase().includes(q);
        if (!matchesCode && !matchesSupplier && !matchesField && !matchesVal && !matchesEditor) {
          return false;
        }
      }
      return true;
    });
  }, [data?.recent_edits, selectedSupplier, selectedFieldKey, auditOutcomeFilter, auditSearchQuery]);

  // Export full audit report as CSV
  const handleExportAuditCsv = () => {
    if (!data) return;

    const headers = [
      "Audit_ID",
      "Timestamp_UTC",
      "Shipment_Code",
      "Supplier_Name",
      "Document_Type",
      "Field_Key",
      "Field_Label",
      "Original_AI_Value",
      "Updated_Human_Value",
      "Was_AI_Correct",
      "AI_Confidence_Pct",
      "Edited_By_Name",
      "Edited_By_Role",
      "Edit_Reason",
    ];

    const rows = (data.recent_edits || []).map((h) => [
      h.id,
      `"${h.created_at}"`,
      `"${h.shipment_code}"`,
      `"${h.supplier_name.replace(/"/g, '""')}"`,
      `"${h.doc_type}"`,
      `"${h.field_key}"`,
      `"${h.field_label.replace(/"/g, '""')}"`,
      `"${(h.original_ai_value || "").replace(/"/g, '""')}"`,
      `"${(h.updated_human_value || "").replace(/"/g, '""')}"`,
      h.was_ai_correct ? "TRUE" : "FALSE",
      Math.round(h.ai_confidence * 100),
      `"${(h.edited_by_name || "").replace(/"/g, '""')}"`,
      `"${(h.edited_by_role || "").replace(/"/g, '""')}"`,
      `"${(h.edit_reason || "").replace(/"/g, '""')}"`,
    ]);

    const csvContent = "\ufeff" + [headers.join(","), ...rows.map((r) => r.join(","))].join("\r\n");
    const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute("download", `BrokerLens_Audit_Accuracy_Report_${new Date().toISOString().slice(0, 10)}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6 space-y-8">
      {/* ==================================================================== */}
      {/* 1. TOP EXECUTIVE HEADER */}
      {/* ==================================================================== */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider bg-slate-900 text-white">
              Executive Review
            </span>
            <span className="text-xs text-slate-500 font-mono">JNPT / Nhava Sheva (INNSA)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 mt-1">
            Manager Accuracy & Audit Analytics
          </h1>
          <p className="text-xs text-slate-500 max-w-2xl mt-0.5">
            Real-time customs extraction accuracy benchmarks against 95.0% SLA targets, per-supplier pattern diagnostics, and immutable human edit audit log.
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            onClick={fetchData}
            disabled={isLoading}
            className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-colors shadow-xs disabled:opacity-50"
            title="Refresh live metrics from backend database"
          >
            <RefreshCw className={`h-3.5 w-3.5 text-slate-500 ${isLoading ? "animate-spin" : ""}`} />
            <span>Refresh Metrics</span>
          </button>

          <button
            onClick={handleExportAuditCsv}
            disabled={!data}
            className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-2 text-xs font-semibold text-white hover:bg-slate-800 transition-colors shadow-xs disabled:opacity-50"
          >
            <Download className="h-3.5 w-3.5" />
            <span>Export Audit Report (.csv)</span>
          </button>
        </div>
      </div>

      {/* ERROR STATE */}
      {error && (
        <div className="rounded-lg border border-rose-300 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchData}
            className="rounded bg-rose-100 px-2.5 py-1 font-semibold text-rose-900 hover:bg-rose-200"
          >
            Retry
          </button>
        </div>
      )}

      {/* ==================================================================== */}
      {/* 2. 5-CARD SLA & BUSINESS CASE ROI RIBBON */}
      {/* ==================================================================== */}
      {data ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-5">
          {/* Card 1: Extraction Accuracy */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs relative overflow-hidden">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Field Accuracy
              </span>
              <span
                className={`inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-bold ${
                  data.summary.overall_accuracy_pct >= data.summary.target_accuracy_pct
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                    : "bg-amber-50 text-amber-800 border border-amber-300"
                }`}
              >
                {data.summary.overall_accuracy_pct >= data.summary.target_accuracy_pct ? (
                  <>
                    <CheckCircle2 className="h-3 w-3" /> SLA MET
                  </>
                ) : (
                  <>
                    <AlertTriangle className="h-3 w-3" /> BELOW TARGET
                  </>
                )}
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                {data.summary.overall_accuracy_pct.toFixed(1)}%
              </span>
              <span className="text-xs text-slate-500 font-mono">
                / {data.summary.target_accuracy_pct.toFixed(1)}% SLA
              </span>
            </div>
            <div className="mt-2 w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
              <div
                className={`h-full rounded-full ${
                  data.summary.overall_accuracy_pct >= 95 ? "bg-emerald-500" : "bg-amber-500"
                }`}
                style={{ width: `${Math.min(data.summary.overall_accuracy_pct, 100)}%` }}
              />
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Evaluated across all extracted customs fields
            </p>
          </div>

          {/* Card 2: Fields Audited & Human Edits */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Audited Fields
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-semibold text-slate-700">
                <ShieldCheck className="h-3 w-3 text-slate-600" /> Human in Loop
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                {data.summary.total_fields_audited}
              </span>
              <span className="text-xs text-slate-500">total checks</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-600">
              <span>{data.summary.total_human_edits} human edits logged</span>
              <span className="font-mono font-semibold text-slate-900">
                {Math.round(
                  (data.summary.total_human_edits / Math.max(data.summary.total_fields_audited, 1)) * 100
                )}
                % edit rate
              </span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              All edits logged with audit trail
            </p>
          </div>

          {/* Card 3: Entry Time Reduction */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Processing Time
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-50 text-emerald-700 border border-emerald-200 px-1.5 py-0.5 text-[10px] font-bold">
                <ArrowDownRight className="h-3 w-3" /> -74.7%
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
                {data.summary.avg_processing_time_mins.toFixed(1)}
              </span>
              <span className="text-xs font-semibold text-slate-500">min / shipment</span>
            </div>
            <div className="mt-2 flex items-center justify-between text-[11px] text-slate-500 font-mono">
              <span>Manual: 45.0m</span>
              <span className="text-emerald-700 font-semibold font-sans">-33.6m saved</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-500">
              Per-shipment documentation speedup
            </p>
          </div>

          {/* Card 4: Executive Data Entry Savings */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Direct Labor Savings
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-blue-50 text-blue-700 border border-blue-200 px-1.5 py-0.5 text-[10px] font-bold font-mono">
                14 EXECS
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-slate-900 tabular-nums">
                ₹25.87L
              </span>
              <span className="text-xs font-semibold text-slate-500">/ year</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600 line-clamp-2">
              1,100/mo × 0.75h (45m) × 12 = 9,900 hrs/yr @ ₹350/hr = ₹34.65L baseline. Cut to 11.4m saves 7,392 hrs.
            </p>
            <p className="mt-1 text-[10px] text-slate-400 font-mono">
              Formula: 7,392 hrs × ₹350/hr = ₹25.87 Lakh/yr
            </p>
          </div>

          {/* Card 5: Demurrage & BoE Amendment Savings */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 shadow-xs bg-linear-to-b from-white to-emerald-50/20">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Demurrage & Error Avoidance
              </span>
              <span className="inline-flex items-center gap-1 rounded bg-emerald-100 text-emerald-800 border border-emerald-300 px-1.5 py-0.5 text-[10px] font-bold">
                HIGH ROI
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-1.5">
              <span className="text-3xl font-extrabold font-mono text-emerald-700 tabular-nums">
                ₹26.53L
              </span>
              <span className="text-xs font-semibold text-slate-500">/ year</span>
            </div>
            <p className="mt-2 text-[11px] text-slate-600 line-clamp-2">
              396 cases/yr (3% of 13,200) × ₹9,000 = ₹35.64L bleed. Pre-filing cross-checks block mismatches.
            </p>
            <div className="mt-1 pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px] font-semibold">
              <span className="text-slate-500">Combined Value:</span>
              <span className="font-mono text-emerald-700">₹52.40 Lakh / yr</span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map((i) => (
            <div key={i} className="h-28 rounded-lg bg-slate-100 animate-pulse border border-slate-200" />
          ))}
        </div>
      )}

      {/* ISOCODE PROBLEM STATEMENT #3: CLIENT ROI & SIZING FORMULA */}
      <div className="rounded-lg border border-blue-200 bg-blue-50/50 p-4 text-xs text-blue-950">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 border-b border-blue-200/80 pb-3">
          <div className="flex items-center gap-2">
            <span className="rounded bg-blue-700 px-2 py-0.5 text-[10px] font-bold text-white uppercase tracking-wider font-mono">
              Problem Statement #3 Verified
            </span>
            <span className="font-semibold text-slate-900">
              Company A (Navi Mumbai / Nhava Sheva) Business Case Model
            </span>
          </div>
          <div className="flex items-center gap-3 font-mono text-[11px] text-blue-900">
            <span>Volume: <strong>1,100 shipments/mo (13,200/yr)</strong></span>
            <span>•</span>
            <span>Team: <strong>14 Documentation Executives</strong></span>
            <span>•</span>
            <span>Staff Rate: <strong>₹350/hour</strong></span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-3 text-[11px] leading-relaxed">
          <div className="rounded bg-white/90 p-3 border border-blue-200/60 space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>1. Baseline Manual Entry Cost</span>
              <span className="font-mono text-rose-700 font-bold">₹34.65 Lakh / yr</span>
            </div>
            <p className="text-slate-600">
              1,100 shipments/mo × 0.75h (45 mins) × 12 = <span className="font-mono font-medium">9,900 hours/yr</span> × ₹350/staff hour = <strong className="font-mono text-slate-900">₹34.65 Lakh/yr</strong>.
            </p>
          </div>

          <div className="rounded bg-white/90 p-3 border border-blue-200/60 space-y-1">
            <div className="font-bold text-slate-900 flex items-center justify-between">
              <span>2. Baseline Error & Demurrage Bleed</span>
              <span className="font-mono text-rose-700 font-bold">₹35.64 Lakh / yr</span>
            </div>
            <p className="text-slate-600">
              3% mismatch rate on 13,200 consignments = <span className="font-mono font-medium">396 cases/yr</span> × ₹9,000/case (Section 149 BoE amendments + port demurrage) = <strong className="font-mono text-slate-900">₹35.64 Lakh/yr</strong>.
            </p>
          </div>

          <div className="rounded bg-emerald-50/90 p-3 border border-emerald-200 space-y-1">
            <div className="font-bold text-emerald-950 flex items-center justify-between">
              <span>3. BrokerLens Solution Net ROI</span>
              <span className="font-mono text-emerald-700 font-bold">₹52.40 Lakh / yr</span>
            </div>
            <p className="text-emerald-900">
              Cut entry time to 11.4 min saves <strong className="font-mono">₹25.87L</strong>; 3-way cross-check blocks mismatches saving <strong className="font-mono">₹26.53L</strong>. Total Net ROI: <strong className="font-mono text-emerald-950">₹52.40L/yr</strong> on a <strong className="font-mono">₹7.5L, 6-week build (698% ROI)</strong>.
            </p>
          </div>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 3. SECTION 1: ACCURACY REPORT PER FIELD (WITH SLA PROGRESS BARS) */}
      {/* ==================================================================== */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                1. Customs Field Accuracy Breakdown
              </h2>
              <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                13 Standard Fields
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              Evaluated against client 95.0% SLA target. Low accuracy fields highlight recurring document variance.
            </p>
          </div>

          {/* Quick filter pills */}
          <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-md border border-slate-200 text-xs">
            <button
              onClick={() => setFieldSlaFilter("ALL")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                fieldSlaFilter === "ALL"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-600 hover:text-slate-900"
              }`}
            >
              All Fields ({data?.by_field?.length || 0})
            </button>
            <button
              onClick={() => setFieldSlaFilter("NEEDS_REVIEW")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                fieldSlaFilter === "NEEDS_REVIEW"
                  ? "bg-amber-100 text-amber-900 shadow-xs font-semibold"
                  : "text-amber-800 hover:text-amber-950"
              }`}
            >
              Below 95% SLA ({data?.by_field?.filter((f) => !f.meets_95_target).length || 0})
            </button>
            <button
              onClick={() => setFieldSlaFilter("MET")}
              className={`rounded px-2.5 py-1 text-xs font-medium transition-colors ${
                fieldSlaFilter === "MET"
                  ? "bg-emerald-100 text-emerald-900 shadow-xs font-semibold"
                  : "text-emerald-800 hover:text-emerald-950"
              }`}
            >
              SLA Met ({data?.by_field?.filter((f) => f.meets_95_target).length || 0})
            </button>
          </div>
        </div>

        {/* Highlight Alert Box for Problematic Fields */}
        <div className="mx-5 my-4 rounded-md border border-amber-200 bg-amber-50/70 p-3 text-xs text-amber-900 flex items-start gap-2.5">
          <Info className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="font-semibold text-amber-950">
              High-Attention Customs Fields Diagnosis:
            </p>
            <p className="text-amber-900/90 leading-relaxed">
              <strong className="font-mono">8-Digit HSN Code (91.4%)</strong> and{" "}
              <strong className="font-mono">Gross Weight (93.8%)</strong> represent 88% of human corrections.
              Chinese supplier invoices frequently exclude wooden pallet tare weight from gross weight figures, while Sweden flatbed scans feature slight rotation causing OCR character confusion on 8-digit tariff lines.
            </p>
          </div>
        </div>

        {/* Field Accuracy Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Field Name</th>
                <th className="py-2.5 px-3">Field Key</th>
                <th className="py-2.5 px-3 text-right">Evaluated</th>
                <th className="py-2.5 px-3 text-right">Exact Match</th>
                <th className="py-2.5 px-3 text-right">Human Corrected</th>
                <th className="py-2.5 px-3 text-right">Avg Confidence</th>
                <th className="py-2.5 px-4 w-56">Accuracy vs 95% SLA</th>
                <th className="py-2.5 px-3 text-center">Status</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {filteredFields.map((field) => (
                <tr key={field.field_key} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-2.5 px-4 font-sans font-medium text-slate-900">
                    {field.field_label}
                  </td>
                  <td className="py-2.5 px-3 text-slate-500 text-[11px]">
                    {field.field_key}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-700">
                    {field.total_evaluated}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-emerald-700 font-semibold">
                    {field.ai_exact_match_count}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums">
                    {field.human_corrected_count > 0 ? (
                      <span className="font-semibold text-amber-700">
                        {field.human_corrected_count}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right tabular-nums text-slate-600">
                    {(field.avg_confidence * 100).toFixed(0)}%
                  </td>
                  <td className="py-2.5 px-4 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            field.meets_95_target ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(field.accuracy_pct, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                          field.meets_95_target ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {field.accuracy_pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-center font-sans">
                    {field.meets_95_target ? (
                      <span className="inline-flex items-center gap-0.5 rounded bg-emerald-50 px-2 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                        <Check className="h-3 w-3" /> SLA Met
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-0.5 rounded bg-amber-50 px-2 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                        <AlertTriangle className="h-3 w-3" /> Needs Review
                      </span>
                    )}
                  </td>
                  <td className="py-2.5 px-3 text-right font-sans">
                    <button
                      onClick={() => {
                        setSelectedFieldKey(field.field_key);
                        // scroll down to audit log
                        document.getElementById("audit-history-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Filter Log
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 4. SECTION 2: ACCURACY REPORT PER SUPPLIER */}
      {/* ==================================================================== */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
              2. Accuracy Breakdown by Shipper / Supplier
            </h2>
            <span className="rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
              Pattern Recognition
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Identify supplier-specific formatting variations, language anomalies, and OCR scanning degradation patterns.
          </p>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-y border-slate-200">
              <tr>
                <th className="py-2.5 px-4">Supplier Name</th>
                <th className="py-2.5 px-3">Country</th>
                <th className="py-2.5 px-3 text-right">Shipments</th>
                <th className="py-2.5 px-3 text-right">Fields Evaluated</th>
                <th className="py-2.5 px-3 text-right">Edits Logged</th>
                <th className="py-2.5 px-4 w-44">Accuracy %</th>
                <th className="py-2.5 px-4">Recurring Document Pattern & AI Diagnosis</th>
                <th className="py-2.5 px-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono">
              {data?.by_supplier?.map((supp) => (
                <tr key={supp.supplier_name} className="hover:bg-slate-50/80 transition-colors">
                  <td className="py-3 px-4 font-sans font-semibold text-slate-900">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{supp.supplier_name}</span>
                    </div>
                  </td>
                  <td className="py-3 px-3 font-sans">
                    <span className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-medium text-slate-700">
                      <Globe className="h-3 w-3 text-slate-500" />
                      {supp.country}
                    </span>
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {supp.shipments_count}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums text-slate-700">
                    {supp.fields_evaluated}
                  </td>
                  <td className="py-3 px-3 text-right tabular-nums">
                    {supp.human_edits_count > 0 ? (
                      <span className="font-semibold text-amber-700">
                        {supp.human_edits_count}
                      </span>
                    ) : (
                      <span className="text-slate-400">0</span>
                    )}
                  </td>
                  <td className="py-3 px-4 font-sans">
                    <div className="flex items-center gap-2">
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${
                            supp.accuracy_pct >= 95 ? "bg-emerald-500" : "bg-amber-500"
                          }`}
                          style={{ width: `${Math.min(supp.accuracy_pct, 100)}%` }}
                        />
                      </div>
                      <span
                        className={`text-xs font-mono font-bold tabular-nums shrink-0 ${
                          supp.accuracy_pct >= 95 ? "text-emerald-700" : "text-amber-800"
                        }`}
                      >
                        {supp.accuracy_pct.toFixed(1)}%
                      </span>
                    </div>
                  </td>
                  <td className="py-3 px-4 font-sans text-xs text-slate-600 max-w-md">
                    <p className="line-clamp-2 leading-relaxed">
                      {supp.recurring_pattern_note}
                    </p>
                  </td>
                  <td className="py-3 px-3 text-right font-sans">
                    <button
                      onClick={() => {
                        setSelectedSupplier(supp.supplier_name);
                        document.getElementById("audit-history-section")?.scrollIntoView({ behavior: "smooth" });
                      }}
                      className="inline-flex items-center gap-1 text-[11px] font-semibold text-blue-600 hover:text-blue-800 hover:underline"
                    >
                      Filter Log
                      <ChevronRight className="h-3 w-3" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* ==================================================================== */}
      {/* 5. SECTION 3: IMMUTABLE FIELD EDIT HISTORY & AUDIT LOG */}
      {/* ==================================================================== */}
      <div id="audit-history-section" className="rounded-lg border border-slate-200 bg-white shadow-xs overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 bg-slate-50/50 space-y-3">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wide">
                  3. Immutable Human Edit & Audit Log Trail
                </h2>
                <span className="rounded bg-emerald-100 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-800">
                  Live DB Records ({filteredEdits.length})
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">
                Every operator confirmation, low-confidence edit, and cross-check sync is recorded with full provenance.
              </p>
            </div>

            {/* Clear filters shortcut */}
            {(selectedSupplier !== "ALL" || selectedFieldKey !== "ALL" || auditOutcomeFilter !== "ALL" || auditSearchQuery) && (
              <button
                onClick={() => {
                  setSelectedSupplier("ALL");
                  setSelectedFieldKey("ALL");
                  setAuditOutcomeFilter("ALL");
                  setAuditSearchQuery("");
                }}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium underline self-start sm:self-auto"
              >
                Reset All Filters
              </button>
            )}
          </div>

          {/* Interactive Filter Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2 pt-2 border-t border-slate-200">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-slate-400" />
              <input
                type="text"
                placeholder="Search shipment, value, editor..."
                value={auditSearchQuery}
                onChange={(e) => setAuditSearchQuery(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs text-slate-800 placeholder-slate-400 focus:border-slate-400 focus:outline-none"
              />
            </div>

            {/* Supplier Select */}
            <div>
              <select
                value={selectedSupplier}
                onChange={(e) => setSelectedSupplier(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                <option value="ALL">All Suppliers ({supplierOptions.length})</option>
                {supplierOptions.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </div>

            {/* Field Key Select */}
            <div>
              <select
                value={selectedFieldKey}
                onChange={(e) => setSelectedFieldKey(e.target.value)}
                className="w-full rounded-md border border-slate-200 bg-white px-2.5 py-1.5 text-xs text-slate-700 focus:border-slate-400 focus:outline-none"
              >
                <option value="ALL">All Fields ({fieldKeyOptions.length})</option>
                {fieldKeyOptions.map((f) => (
                  <option key={f.key} value={f.key}>
                    {f.label} ({f.key})
                  </option>
                ))}
              </select>
            </div>

            {/* Outcome Filter */}
            <div className="flex rounded-md border border-slate-200 bg-white p-0.5 text-xs">
              <button
                onClick={() => setAuditOutcomeFilter("ALL")}
                className={`flex-1 rounded py-1 text-center font-medium transition-colors ${
                  auditOutcomeFilter === "ALL" ? "bg-slate-900 text-white font-semibold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                All
              </button>
              <button
                onClick={() => setAuditOutcomeFilter("EDITED")}
                className={`flex-1 rounded py-1 text-center font-medium transition-colors ${
                  auditOutcomeFilter === "EDITED" ? "bg-amber-100 text-amber-900 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                Edits Only
              </button>
              <button
                onClick={() => setAuditOutcomeFilter("CORRECT")}
                className={`flex-1 rounded py-1 text-center font-medium transition-colors ${
                  auditOutcomeFilter === "CORRECT" ? "bg-emerald-100 text-emerald-900 font-bold" : "text-slate-600 hover:text-slate-900"
                }`}
              >
                AI Correct
              </button>
            </div>
          </div>
        </div>

        {/* Audit Log Table */}
        <div className="overflow-x-auto max-h-[500px]">
          <table className="w-full text-left text-xs text-slate-600 border-collapse">
            <thead className="bg-slate-50 text-[11px] font-semibold text-slate-700 uppercase tracking-wider border-y border-slate-200 sticky top-0 z-10">
              <tr>
                <th className="py-2.5 px-3">Timestamp (UTC)</th>
                <th className="py-2.5 px-3">Shipment</th>
                <th className="py-2.5 px-3">Supplier</th>
                <th className="py-2.5 px-2">Doc</th>
                <th className="py-2.5 px-3">Field</th>
                <th className="py-2.5 px-4 min-w-[240px]">Original AI Value → Human Value</th>
                <th className="py-2.5 px-2 text-center">AI Conf</th>
                <th className="py-2.5 px-3">Edited By</th>
                <th className="py-2.5 px-4 min-w-[200px]">Audit Reason</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
              {filteredEdits.length === 0 ? (
                <tr>
                  <td colSpan={9} className="py-12 text-center text-slate-400 font-sans">
                    <div className="flex flex-col items-center justify-center gap-2">
                      <Filter className="h-6 w-6 text-slate-300" />
                      <p className="font-medium text-slate-600">No edit audit records match the selected filter.</p>
                      <button
                        onClick={() => {
                          setSelectedSupplier("ALL");
                          setSelectedFieldKey("ALL");
                          setAuditOutcomeFilter("ALL");
                          setAuditSearchQuery("");
                        }}
                        className="text-xs text-blue-600 underline font-semibold"
                      >
                        Reset filters
                      </button>
                    </div>
                  </td>
                </tr>
              ) : (
                filteredEdits.map((h) => (
                  <tr
                    key={h.id}
                    className={`hover:bg-slate-50/90 transition-colors ${
                      !h.was_ai_correct ? "bg-amber-50/30" : ""
                    }`}
                  >
                    {/* Timestamp */}
                    <td className="py-2 px-3 text-slate-500 whitespace-nowrap">
                      {h.created_at}
                    </td>

                    {/* Shipment Code (Clickable) */}
                    <td className="py-2 px-3 font-semibold">
                      <Link
                        href={`/shipments/${h.shipment_code}/review`}
                        className="inline-flex items-center gap-1 text-blue-700 hover:text-blue-900 hover:underline"
                        title="Open in Review Workbench"
                      >
                        <span>{h.shipment_code}</span>
                        <ArrowUpRight className="h-2.5 w-2.5" />
                      </Link>
                    </td>

                    {/* Supplier */}
                    <td className="py-2 px-3 font-sans text-slate-800 truncate max-w-[140px]" title={h.supplier_name}>
                      {h.supplier_name}
                    </td>

                    {/* Doc Type */}
                    <td className="py-2 px-2">
                      <span className="rounded bg-slate-100 px-1 py-0.5 text-[9px] font-semibold text-slate-700 uppercase">
                        {h.doc_type === "PACKING_LIST" ? "PL" : h.doc_type === "BILL_OF_LADING" ? "BOL" : "INV"}
                      </span>
                    </td>

                    {/* Field Label */}
                    <td className="py-2 px-3 font-sans font-medium text-slate-800">
                      {h.field_label}
                    </td>

                    {/* Value Diff */}
                    <td className="py-2 px-4">
                      {h.was_ai_correct ? (
                        <div className="flex items-center gap-1 text-slate-800">
                          <CheckCircle2 className="h-3 w-3 text-emerald-600 shrink-0" />
                          <span className="truncate max-w-[200px]" title={h.updated_human_value || h.original_ai_value}>
                            {h.updated_human_value || h.original_ai_value}
                          </span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="line-through text-rose-600 bg-rose-50 px-1 rounded truncate max-w-[100px]" title={h.original_ai_value}>
                            {h.original_ai_value || "(empty)"}
                          </span>
                          <span className="text-slate-400 font-sans">→</span>
                          <span className="font-bold text-emerald-700 bg-emerald-50 px-1 rounded truncate max-w-[120px]" title={h.updated_human_value}>
                            {h.updated_human_value}
                          </span>
                        </div>
                      )}
                    </td>

                    {/* AI Confidence */}
                    <td className="py-2 px-2 text-center">
                      <span
                        className={`rounded px-1.5 py-0.5 text-[10px] font-bold ${
                          h.ai_confidence >= 0.85
                            ? "bg-emerald-50 text-emerald-700"
                            : h.ai_confidence >= 0.45
                            ? "bg-amber-50 text-amber-800"
                            : "bg-rose-50 text-rose-700"
                        }`}
                      >
                        {Math.round(h.ai_confidence * 100)}%
                      </span>
                    </td>

                    {/* Edited By */}
                    <td className="py-2 px-3 font-sans text-slate-700 whitespace-nowrap">
                      <div>
                        <span className="font-medium text-slate-900">{h.edited_by_name}</span>
                        <div className="text-[10px] text-slate-400">
                          {h.edited_by_role === "DOCUMENTATION_MANAGER" ? "Doc Manager" : "Doc Executive"}
                        </div>
                      </div>
                    </td>

                    {/* Audit Reason */}
                    <td className="py-2 px-4 font-sans text-slate-600 text-[11px] leading-relaxed max-w-[220px]">
                      <p className="line-clamp-2" title={h.edit_reason}>
                        {h.edit_reason}
                      </p>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
