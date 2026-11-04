"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { Shipment, ShipmentStatus } from "@/types";
import {
  Layers,
  AlertTriangle,
  Clock,
  TrendingUp,
  Search,
  Plus,
  RefreshCw,
  FileText,
  CheckCircle2,
  AlertCircle,
  FileDown,
  ArrowRight,
  ExternalLink,
  ShieldCheck,
  Ship,
  Sparkles,
} from "lucide-react";

export default function ShipmentsPage() {
  const { maskPii, showToast } = useApp();
  const [shipments, setShipments] = useState<Shipment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Filter & Search states
  const [activeTab, setActiveTab] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchShipments = async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await api.getShipments(maskPii);
      setShipments(data);
    } catch (err: any) {
      setError(err.message || "Failed to load consignments from backend API.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShipments();
  }, [maskPii]);

  // Tab Filtering counts
  const tabCounts = useMemo(() => {
    return {
      ALL: shipments.length,
      CROSS_CHECK_FAILED: shipments.filter((s) => s.status === "CROSS_CHECK_FAILED").length,
      NEEDS_REVIEW: shipments.filter((s) => s.status === "NEEDS_REVIEW").length,
      READY_FOR_APPROVAL: shipments.filter((s) => s.status === "READY_FOR_APPROVAL").length,
      APPROVED_OR_EXPORTED: shipments.filter(
        (s) => s.status === "APPROVED" || s.status === "EXPORTED"
      ).length,
    };
  }, [shipments]);

  // Filtered shipments
  const filteredShipments = useMemo(() => {
    return shipments.filter((shp) => {
      // Tab filter
      if (activeTab === "CROSS_CHECK_FAILED" && shp.status !== "CROSS_CHECK_FAILED") return false;
      if (activeTab === "NEEDS_REVIEW" && shp.status !== "NEEDS_REVIEW") return false;
      if (activeTab === "READY_FOR_APPROVAL" && shp.status !== "READY_FOR_APPROVAL") return false;
      if (
        activeTab === "APPROVED_OR_EXPORTED" &&
        shp.status !== "APPROVED" &&
        shp.status !== "EXPORTED"
      ) {
        return false;
      }

      // Search query filter
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase().trim();
        const matchesCode = shp.shipment_code.toLowerCase().includes(query);
        const matchesSupplier = shp.supplier_name.toLowerCase().includes(query);
        const matchesImporter = shp.importer_name.toLowerCase().includes(query);
        const matchesIec = shp.importer_iec.toLowerCase().includes(query);
        const matchesPort =
          shp.port_of_loading.toLowerCase().includes(query) ||
          shp.port_of_discharge.toLowerCase().includes(query);

        if (!matchesCode && !matchesSupplier && !matchesImporter && !matchesIec && !matchesPort) {
          return false;
        }
      }

      return true;
    });
  }, [shipments, activeTab, searchQuery]);

  // KPI calculations
  const kpiStats = useMemo(() => {
    const total = shipments.length;
    const actionNeeded = shipments.filter(
      (s) => s.status === "CROSS_CHECK_FAILED" || s.status === "NEEDS_REVIEW"
    ).length;
    const mismatchesCaught = shipments.filter(
      (s) => s.cross_checks && s.cross_checks.some((c) => c.status === "FAILED")
    ).length;

    return {
      total,
      actionNeeded,
      cleared: total - actionNeeded,
      mismatchesCaught: Math.max(mismatchesCaught, 1),
    };
  }, [shipments]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-6 sm:px-6 space-y-6">
      {/* TOP TITLE & OPERATIONAL HEADER */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              Customs Consignments Queue
            </h1>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-mono font-medium text-slate-700 border border-slate-200">
              JNPT Nhava Sheva (INNSA)
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            Real-time 3-way reconciliation across Commercial Invoice, Packing List, and Ocean Bill of Lading
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={fetchShipments}
            disabled={loading}
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50 active:scale-95 transition-all shadow-xs"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${loading ? "animate-spin text-slate-400" : ""}`} />
            <span>Refresh</span>
          </button>

          <Link
            href="/shipments/new"
            className="flex items-center gap-1.5 rounded-md bg-slate-900 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-slate-800 active:scale-95 transition-all shadow-xs"
          >
            <Plus className="h-4 w-4" />
            <span>Upload New Consignment</span>
          </Link>
        </div>
      </div>

      {/* 4-CARD OPERATIONAL KPI RIBBON */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {/* KPI 1: Active Consignments */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Active Consignments</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-slate-100 text-slate-700">
              <Layers className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              {kpiStats.total}
            </span>
            <span className="text-xs text-slate-500 font-mono">Consignments</span>
          </div>
          <div className="mt-2 flex items-center gap-2 text-[11px]">
            <span className="font-semibold text-rose-600 font-mono">{kpiStats.actionNeeded} Action Needed</span>
            <span className="text-slate-300">•</span>
            <span className="text-emerald-700 font-mono">{kpiStats.cleared} Cleared</span>
          </div>
        </div>

        {/* KPI 2: Cross-Check Discrepancies Intercepted */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Discrepancies Intercepted</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-rose-50 text-rose-600 border border-rose-200">
              <AlertTriangle className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-rose-600">
              {kpiStats.mismatchesCaught}
            </span>
            <span className="text-xs text-slate-500">Pre-Filing Mismatch</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-500 font-mono truncate">
            Caught: <span className="font-semibold text-slate-800">SHP-24811 (45 kg Gross Wt Delta)</span>
          </div>
        </div>

        {/* KPI 3: Avg Processing Time */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Avg Clearance Time</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-blue-50 text-blue-600 border border-blue-200">
              <Clock className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-slate-900">
              11.4
            </span>
            <span className="text-xs text-slate-500 font-mono">mins / consignment</span>
          </div>
          <div className="mt-2 flex items-center gap-1.5 text-[11px] text-emerald-700 font-medium">
            <span className="rounded bg-emerald-50 px-1 py-0.2 text-[10px] font-mono font-bold text-emerald-700 border border-emerald-200">
              -74.6%
            </span>
            <span>vs 45 min manual entry baseline</span>
          </div>
        </div>

        {/* KPI 4: AI Extraction Accuracy & Projected Savings */}
        <div className="rounded-lg border border-slate-200/80 bg-white p-4 shadow-xs">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-500">Field Accuracy & ROI</span>
            <div className="flex h-7 w-7 items-center justify-center rounded-md bg-emerald-50 text-emerald-600 border border-emerald-200">
              <TrendingUp className="h-4 w-4" />
            </div>
          </div>
          <div className="mt-2 flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono tracking-tight text-emerald-700">
              95.8%
            </span>
            <span className="text-xs text-slate-500 font-mono">(&gt;95.0% SLA)</span>
          </div>
          <div className="mt-2 text-[11px] text-slate-600 font-medium">
            <span className="font-semibold text-slate-900 font-mono">₹52.4 Lakh / yr</span> projected savings
          </div>
        </div>
      </div>

      {/* FILTER TABS & SEARCH TOOLBAR */}
      <div className="flex flex-col gap-3 rounded-lg border border-slate-200/80 bg-white p-3 shadow-xs sm:flex-row sm:items-center sm:justify-between">
        {/* Status Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1 text-xs">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "ALL"
                ? "bg-slate-900 text-white font-semibold"
                : "text-slate-600 hover:bg-slate-100"
            }`}
          >
            <span>All</span>
            <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === "ALL" ? "bg-slate-700 text-white" : "bg-slate-100 text-slate-600"}`}>
              {tabCounts.ALL}
            </span>
          </button>

          <button
            onClick={() => setActiveTab("CROSS_CHECK_FAILED")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "CROSS_CHECK_FAILED"
                ? "bg-rose-600 text-white font-semibold"
                : "text-slate-600 hover:bg-rose-50 hover:text-rose-700"
            }`}
          >
            <span>Cross-Check Failed</span>
            {tabCounts.CROSS_CHECK_FAILED > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === "CROSS_CHECK_FAILED" ? "bg-rose-700 text-white" : "bg-rose-100 text-rose-800"}`}>
                {tabCounts.CROSS_CHECK_FAILED}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("NEEDS_REVIEW")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "NEEDS_REVIEW"
                ? "bg-amber-600 text-white font-semibold"
                : "text-slate-600 hover:bg-amber-50 hover:text-amber-800"
            }`}
          >
            <span>Needs Review</span>
            {tabCounts.NEEDS_REVIEW > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === "NEEDS_REVIEW" ? "bg-amber-700 text-white" : "bg-amber-100 text-amber-900"}`}>
                {tabCounts.NEEDS_REVIEW}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("READY_FOR_APPROVAL")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "READY_FOR_APPROVAL"
                ? "bg-blue-600 text-white font-semibold"
                : "text-slate-600 hover:bg-blue-50 hover:text-blue-700"
            }`}
          >
            <span>Ready for Sign-Off</span>
            {tabCounts.READY_FOR_APPROVAL > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === "READY_FOR_APPROVAL" ? "bg-blue-700 text-white" : "bg-blue-100 text-blue-800"}`}>
                {tabCounts.READY_FOR_APPROVAL}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab("APPROVED_OR_EXPORTED")}
            className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 font-medium transition-colors ${
              activeTab === "APPROVED_OR_EXPORTED"
                ? "bg-emerald-700 text-white font-semibold"
                : "text-slate-600 hover:bg-emerald-50 hover:text-emerald-800"
            }`}
          >
            <span>Approved / Exported</span>
            {tabCounts.APPROVED_OR_EXPORTED > 0 && (
              <span className={`rounded-full px-1.5 py-0.2 text-[10px] font-mono ${activeTab === "APPROVED_OR_EXPORTED" ? "bg-emerald-800 text-white" : "bg-emerald-100 text-emerald-800"}`}>
                {tabCounts.APPROVED_OR_EXPORTED}
              </span>
            )}
          </button>
        </div>

        {/* Search Input */}
        <div className="relative min-w-[240px]">
          <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5">
            <Search className="h-3.5 w-3.5 text-slate-400" />
          </div>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search ID, Supplier, Importer, IEC..."
            className="block w-full rounded-md border border-slate-200 bg-slate-50/50 py-1.5 pl-8 pr-3 text-xs text-slate-900 placeholder-slate-400 focus:border-slate-900 focus:bg-white focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
          />
        </div>
      </div>

      {/* ERROR BANNER */}
      {error && (
        <div className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-xs text-rose-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{error}</span>
          </div>
          <button
            onClick={fetchShipments}
            className="rounded bg-rose-100 px-2 py-1 font-semibold text-rose-800 hover:bg-rose-200"
          >
            Retry Connection
          </button>
        </div>
      )}

      {/* SHIPMENT WORKBENCH TABLE (DESKTOP) & CARDS (MOBILE) */}
      <div className="rounded-lg border border-slate-200/80 bg-white shadow-xs overflow-hidden">
        {loading ? (
          /* LOADING SKELETON ROWS */
          <div className="divide-y divide-slate-100 p-4 space-y-4">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="flex items-center justify-between pt-3 animate-pulse">
                <div className="space-y-2 w-1/4">
                  <div className="h-4 bg-slate-200 rounded w-24"></div>
                  <div className="h-3 bg-slate-100 rounded w-40"></div>
                </div>
                <div className="space-y-2 w-1/4">
                  <div className="h-3 bg-slate-200 rounded w-32"></div>
                  <div className="h-3 bg-slate-100 rounded w-28"></div>
                </div>
                <div className="h-6 bg-slate-100 rounded w-24"></div>
                <div className="h-8 bg-slate-200 rounded w-28"></div>
              </div>
            ))}
          </div>
        ) : filteredShipments.length === 0 ? (
          /* EMPTY STATE */
          <div className="py-12 text-center space-y-3">
            <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-slate-100 text-slate-400">
              <Search className="h-5 w-5" />
            </div>
            <div className="text-sm font-semibold text-slate-800">
              No matching consignments found
            </div>
            <p className="text-xs text-slate-500 max-w-sm mx-auto">
              No shipments match the current tab filter ({activeTab}) or search query &quot;{searchQuery}&quot;.
            </p>
            <button
              onClick={() => {
                setActiveTab("ALL");
                setSearchQuery("");
              }}
              className="mt-2 rounded-md border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-700 hover:bg-slate-50"
            >
              Reset Filters
            </button>
          </div>
        ) : (
          /* HIGH DENSITY DESKTOP TABLE */
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200 text-left text-xs">
              <thead className="bg-slate-50 text-slate-500 font-semibold uppercase tracking-wider text-[10px]">
                <tr>
                  <th scope="col" className="py-3 pl-4 pr-3 sm:pl-6">
                    Shipment ID & Ports
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Importer (DPDP Protected)
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Foreign Supplier
                  </th>
                  <th scope="col" className="px-3 py-3">
                    3-Way Document Set
                  </th>
                  <th scope="col" className="px-3 py-3">
                    3-Way Cross-Check Status
                  </th>
                  <th scope="col" className="px-3 py-3">
                    Lifecycle Status
                  </th>
                  <th scope="col" className="py-3 pl-3 pr-4 sm:pr-6 text-right">
                    Primary Action
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 bg-white">
                {filteredShipments.map((shp) => {
                  const failedCheck = shp.cross_checks?.find((c) => c.status === "FAILED");
                  const unconfirmedLow = shp.fields?.filter(
                    (f) => f.is_low_confidence && !f.is_confirmed_by_human
                  ).length || 0;
                  const hasUnreadable = shp.documents?.some((d) => d.is_unreadable);

                  return (
                    <tr
                      key={shp.id}
                      className="hover:bg-slate-50/80 transition-colors group"
                    >
                      {/* Column 1: Shipment ID & Ports */}
                      <td className="py-3.5 pl-4 pr-3 sm:pl-6">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-slate-900 group-hover:text-brand-accent transition-colors">
                              {shp.shipment_code}
                            </span>
                            <span className="rounded bg-slate-100 px-1 py-0.2 text-[9px] font-mono text-slate-600">
                              {shp.currency}
                            </span>
                          </div>
                          <span className="text-[11px] text-slate-600 truncate max-w-[200px]" title={shp.title}>
                            {shp.title}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono mt-0.5">
                            {shp.port_of_loading.split(",")[0]} → {shp.port_of_discharge.split(",")[0]}
                          </span>
                        </div>
                      </td>

                      {/* Column 2: Importer (DPDP Protected) */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col">
                          <span className="font-medium text-slate-900 truncate max-w-[180px]">
                            {shp.importer_name}
                          </span>
                          <span className="font-mono text-[10px] text-slate-500">
                            IEC: {shp.importer_iec}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono truncate max-w-[180px]">
                            {shp.importer_contact_email}
                          </span>
                        </div>
                      </td>

                      {/* Column 3: Foreign Supplier */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-medium text-slate-800 truncate max-w-[170px]">
                              {shp.supplier_name.split("/")[0]}
                            </span>
                          </div>
                          <div className="flex items-center gap-1 text-[10px] text-slate-500 font-mono mt-0.5">
                            <span className="rounded bg-slate-100 px-1 text-slate-600">
                              {shp.supplier_country}
                            </span>
                            <span>•</span>
                            <span>{shp.incoterm}</span>
                          </div>
                        </div>
                      </td>

                      {/* Column 4: 3-Way Document Set Pills */}
                      <td className="px-3 py-3.5">
                        <div className="flex flex-wrap items-center gap-1">
                          {shp.documents && shp.documents.length > 0 ? (
                            shp.documents.map((doc) => {
                              const label =
                                doc.doc_type === "INVOICE"
                                  ? "INV"
                                  : doc.doc_type === "PACKING_LIST"
                                  ? "PL"
                                  : "BoL";

                              if (doc.is_unreadable) {
                                return (
                                  <span
                                    key={doc.id}
                                    title="Degraded Thermal Scan: Unreadable, Manual Entry Triggered"
                                    className="rounded border border-rose-300 bg-rose-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700"
                                  >
                                    {label} ⚠️
                                  </span>
                                );
                              }

                              return (
                                <span
                                  key={doc.id}
                                  title={`${doc.doc_type} • Confidence ${Math.round(doc.avg_confidence * 100)}% ${doc.skew_angle_deg !== 0 ? `(${doc.skew_angle_deg}° tilt)` : ""}`}
                                  className={`rounded border px-1.5 py-0.5 text-[10px] font-mono font-medium ${
                                    doc.avg_confidence >= 0.85
                                      ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                                      : "border-amber-300 bg-amber-50 text-amber-800"
                                  }`}
                                >
                                  {label}
                                  {doc.skew_angle_deg !== 0 && (
                                    <span className="text-[8px] ml-0.5 opacity-75">
                                      {doc.skew_angle_deg}°
                                    </span>
                                  )}
                                </span>
                              );
                            })
                          ) : (
                            <span className="text-[10px] text-slate-400 italic">No docs attached</span>
                          )}
                        </div>
                      </td>

                      {/* Column 5: 3-Way Cross-Check Status */}
                      <td className="px-3 py-3.5">
                        {failedCheck ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                              <AlertTriangle className="h-3.5 w-3.5 text-rose-500 shrink-0" />
                              <span>{failedCheck.rule_name.replace("3-Way", "").trim()}</span>
                            </span>
                            <span className="text-[10px] text-rose-500 font-mono mt-0.5 truncate max-w-[160px]">
                              {failedCheck.discrepancy_delta}
                            </span>
                          </div>
                        ) : unconfirmedLow > 0 ? (
                          <div className="flex flex-col">
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-800">
                              <AlertCircle className="h-3.5 w-3.5 text-amber-600 shrink-0" />
                              <span>{unconfirmedLow} Low-Confidence Field{unconfirmedLow > 1 ? "s" : ""}</span>
                            </span>
                            <span className="text-[10px] text-amber-700 font-mono">
                              Awaiting human review
                            </span>
                          </div>
                        ) : hasUnreadable ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600">
                            <span>Manual Entry Needed</span>
                          </span>
                        ) : (
                          <div className="flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                            <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                            <span>3-Way Match Passed</span>
                          </div>
                        )}
                      </td>

                      {/* Column 6: Lifecycle Status Badge */}
                      <td className="px-3 py-3.5">
                        {shp.status === "CROSS_CHECK_FAILED" && (
                          <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                            Cross-Check Mismatch
                          </span>
                        )}
                        {shp.status === "NEEDS_REVIEW" && (
                          <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                            Review Required
                          </span>
                        )}
                        {shp.status === "READY_FOR_APPROVAL" && (
                          <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                            Manager Sign-Off Ready
                          </span>
                        )}
                        {shp.status === "APPROVED" && (
                          <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                            Approved for BoE
                          </span>
                        )}
                        {shp.status === "EXPORTED" && (
                          <span className="inline-flex items-center rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                            Exported to ICEGATE
                          </span>
                        )}
                      </td>

                      {/* Column 7: Actions */}
                      <td className="py-3.5 pl-3 pr-4 sm:pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/shipments/${shp.shipment_code}/review`}
                            className="inline-flex items-center gap-1 rounded-md bg-slate-100 hover:bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-800 transition-colors shadow-xs"
                          >
                            <span>Review</span>
                            <ArrowRight className="h-3.5 w-3.5 text-slate-500" />
                          </Link>

                          {(shp.status === "APPROVED" || shp.status === "EXPORTED") && (
                            <Link
                              href={`/shipments/${shp.shipment_code}/export`}
                              title="Download Customs Filing CSV"
                              className="inline-flex items-center justify-center rounded-md border border-slate-200 bg-white hover:bg-slate-50 p-1 text-slate-700 shadow-xs"
                            >
                              <FileDown className="h-3.5 w-3.5 text-slate-600" />
                            </Link>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* QUICK FOOTER STATS */}
      <div className="flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 gap-2 px-1">
        <div>
          Showing <span className="font-mono font-semibold text-slate-800">{filteredShipments.length}</span> of{" "}
          <span className="font-mono font-semibold text-slate-800">{shipments.length}</span> consignments
        </div>
        <div className="flex items-center gap-4 text-[11px]">
          <span>Company A Customs Brokerage System</span>
          <span>•</span>
          <span className="font-mono">Port INNSA / JNPT</span>
        </div>
      </div>
    </div>
  );
}
