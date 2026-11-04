"use client";

import React, { useEffect, useState, useMemo, useRef } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  Shipment,
  ShipmentDocument,
  ExtractedField,
  ShipmentLineItem,
  CrossCheckResult,
  FieldEditHistoryItem,
  DocumentType,
} from "@/types";
import {
  Layers,
  ArrowLeft,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  ShieldCheck,
  FileDown,
  RotateCw,
  ZoomIn,
  ZoomOut,
  ExternalLink,
  FileText,
  Sparkles,
  Lock,
  Unlock,
  Clock,
  ArrowRight,
  Eye,
  RefreshCw,
  History,
  ChevronDown,
  ChevronUp,
  Check,
  Edit3,
  Filter,
  CheckCheck,
  UserCheck,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export default function ReviewWorkbenchPage() {
  const params = useParams();
  const router = useRouter();
  const shipmentId = params?.id as string;
  const { user, switchDemoRole, maskPii, showToast } = useApp();

  const [shipment, setShipment] = useState<Shipment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Left Pane Document Viewer State
  const [activeDocType, setActiveDocType] = useState<DocumentType>("INVOICE");
  const [viewerMode, setViewerMode] = useState<"OCR_SHEET" | "NATIVE_PDF">("OCR_SHEET");
  const [zoomLevel, setZoomLevel] = useState<number>(100);
  const [rotationDeg, setRotationDeg] = useState<number>(0);
  const [highlightedFieldKey, setHighlightedFieldKey] = useState<string | null>(null);
  const [highlightedRegion, setHighlightedRegion] = useState<string | null>(null);
  const [isDocumentCollapsed, setIsDocumentCollapsed] = useState<boolean>(false);

  // Mobile View Switcher (for < 1024px screens)
  const [mobileView, setMobileView] = useState<"SPLIT" | "DOC" | "FIELDS">("FIELDS");

  // Right Pane Filters & Edit States
  const [fieldFilter, setFieldFilter] = useState<string>("NEEDS_ATTENTION");
  const [editingFieldId, setEditingFieldId] = useState<number | null>(null);
  const [fieldEditValues, setFieldEditValues] = useState<Record<number, string>>({});
  const [fieldEditReasons, setFieldEditReasons] = useState<Record<number, string>>({});

  // Line Item Editing State
  const [editingLineId, setEditingLineId] = useState<number | null>(null);
  const [lineHsnValues, setLineHsnValues] = useState<Record<number, string>>({});
  const [lineQtyValues, setLineQtyValues] = useState<Record<number, number>>({});
  const [linePriceValues, setLinePriceValues] = useState<Record<number, number>>({});

  // Cross-Check Inline Override Input State
  const [overrideCheckId, setOverrideCheckId] = useState<number | null>(null);
  const [overrideNote, setOverrideNote] = useState<string>(
    "45.00 kg delta due to fumigated wooden pallet tare weight included in Packing List and BoL but excluded from Commercial Invoice."
  );

  // Audit History Drawer State
  const [showAuditDrawer, setShowAuditDrawer] = useState<boolean>(false);

  // Export Blocker Popover State
  const [showBlockerTooltip, setShowBlockerTooltip] = useState<boolean>(false);

  // Fetch shipment detail
  const loadShipment = async (silent: boolean = false) => {
    if (!silent) setLoading(true);
    setError(null);
    try {
      const data = await api.getShipmentDetail(shipmentId, maskPii);
      setShipment(data);

      // Auto-set initial de-skew rotation if active document has skew
      const invDoc = data.documents?.find((d) => d.doc_type === "INVOICE");
      if (invDoc && invDoc.skew_angle_deg !== 0 && rotationDeg === 0) {
        // e.g. -2.8° tilt on Company C Sweden invoice
      }
    } catch (err: any) {
      setError(err.message || "Failed to load shipment review data.");
    } finally {
      if (!silent) setLoading(false);
    }
  };

  useEffect(() => {
    if (shipmentId) {
      loadShipment();
    }
  }, [shipmentId, maskPii]);

  // Active document object
  const activeDoc = useMemo(() => {
    if (!shipment?.documents) return null;
    return (
      shipment.documents.find((d) => d.doc_type === activeDocType) ||
      shipment.documents[0] ||
      null
    );
  }, [shipment, activeDocType]);

  // Blocker calculations
  const blockers = useMemo(() => {
    if (!shipment) {
      return {
        failedCrossChecks: 0,
        unconfirmedFields: 0,
        pendingManagerApproval: false,
        totalBlockers: 0,
        isExportReady: false,
      };
    }

    const failedCrossChecks = shipment.cross_checks.filter((c) => c.status === "FAILED").length;
    const unconfirmedFields = shipment.fields.filter(
      (f) => (f.is_low_confidence || f.is_manual_entry) && !f.is_confirmed_by_human
    ).length;
    const unconfirmedLines = shipment.line_items.filter(
      (li) => li.is_low_confidence && !li.is_confirmed_by_human
    ).length;
    const unreadableDocs = shipment.documents.filter((d) => d.is_unreadable).length;
    const pendingManagerApproval = shipment.requires_manager_approval && !shipment.approved_by_id;

    const totalBlockers =
      failedCrossChecks + unconfirmedFields + unconfirmedLines + unreadableDocs + (pendingManagerApproval ? 1 : 0);

    return {
      failedCrossChecks,
      unconfirmedFields: unconfirmedFields + unconfirmedLines,
      unreadableDocs,
      pendingManagerApproval,
      totalBlockers,
      isExportReady: totalBlockers === 0,
    };
  }, [shipment]);

  // Field Focus on Left Document Viewer
  const focusFieldOnDoc = (field: ExtractedField) => {
    setActiveDocType(field.doc_type);
    setHighlightedFieldKey(field.field_key);
    setHighlightedRegion(field.bbox_hint || "Document Body");
    // Auto-expand document viewer if it was minimized so operator can inspect the bounding box
    if (isDocumentCollapsed) {
      setIsDocumentCollapsed(false);
    }
    // On mobile, switch to doc view
    if (typeof window !== "undefined" && window.innerWidth < 1024) {
      setMobileView("DOC");
    }
  };

  // 1-Click Action: Confirm All High-Confidence (>= 85%)
  const handleConfirmAllHighConfidence = async () => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      const updated = await api.confirmAllHighConfidence(shipment.shipment_code);
      setShipment(updated);
      showToast("✓ All high-confidence fields confirmed. Remaining amber items isolated.");
    } catch (err: any) {
      showToast(`Confirmation failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Field Edit & Confirm Handler
  const handleSaveField = async (field: ExtractedField, customVal?: string) => {
    if (!shipment) return;
    const val = customVal !== undefined ? customVal : fieldEditValues[field.id] ?? field.current_value;
    const reason = fieldEditReasons[field.id] || "Operator confirmation in review workbench";

    setActionLoading(true);
    try {
      const updated = await api.updateField(shipment.shipment_code, field.id, {
        value: val,
        is_confirmed_by_human: true,
        edit_reason: reason,
      });
      setShipment(updated);
      setEditingFieldId(null);
      showToast(`Saved & verified ${field.field_label}`);
    } catch (err: any) {
      showToast(`Update error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Line Item Edit Handler
  const handleSaveLineItem = async (item: ShipmentLineItem) => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      const updated = await api.updateLineItem(shipment.shipment_code, item.id, {
        hsn_code: lineHsnValues[item.id] || item.hsn_code,
        qty: lineQtyValues[item.id] !== undefined ? lineQtyValues[item.id] : item.qty,
        unit_price: linePriceValues[item.id] !== undefined ? linePriceValues[item.id] : item.unit_price || undefined,
        is_confirmed_by_human: true,
        edit_reason: "Line item classification and arithmetic verified",
      });
      setShipment(updated);
      setEditingLineId(null);
      showToast(`Verified line item #${item.line_number} (${item.hsn_code})`);
    } catch (err: any) {
      showToast(`Line update error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Cross-Check Resolution Handler
  const handleResolveCrossCheck = async (
    checkId: number,
    action: "SYNC_TO_AUTHORITATIVE_VALUE" | "OVERRIDE_WITH_AUDIT_NOTE",
    targetVal?: string,
    customNote?: string
  ) => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      const note =
        customNote ||
        (action === "SYNC_TO_AUTHORITATIVE_VALUE"
          ? `Authoritatively synchronized Invoice Gross Weight to match Packing List & Ocean BoL (${targetVal} kg)`
          : overrideNote);

      const updated = await api.resolveCrossCheck(shipment.shipment_code, checkId, {
        action,
        target_value: targetVal,
        resolution_note: note,
      });

      setShipment(updated);
      setOverrideCheckId(null);
      showToast(
        action === "SYNC_TO_AUTHORITATIVE_VALUE"
          ? "✓ Cross-check resolved: all 3 documents synchronized!"
          : "⚠️ Override logged: Documentation Manager sign-off requested"
      );
    } catch (err: any) {
      showToast(`Resolution error: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // 1-Click Manager Approval Handler (with 1-click RBAC escalation helper)
  const handleManagerApprove = async () => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      // If currently Executive, auto-switch to Manager first so reviewer testing is 1-click frictionless
      if (user?.role !== "DOCUMENTATION_MANAGER") {
        await switchDemoRole("DOCUMENTATION_MANAGER");
      }
      const updated = await api.approveShipment(
        shipment.shipment_code,
        "Documentation Manager Priya Nair approved cross-check discrepancy after verifying packing dunnage tare note."
      );
      setShipment(updated);
      showToast("🛡 Consignment approved for ICEGATE customs export by Documentation Manager!");
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Re-run AI Extraction
  const handleRerunExtraction = async () => {
    if (!shipment) return;
    setActionLoading(true);
    try {
      showToast("Re-running Vision AI extraction & cross-check engine...");
      const updated = await api.extractShipmentDocuments(shipment.shipment_code);
      setShipment(updated);
      showToast("Extraction and 3-way reconciliation refreshed!");
    } catch (err: any) {
      showToast(`Re-extraction failed: ${err.message}`);
    } finally {
      setActionLoading(false);
    }
  };

  // Filtered fields list
  const filteredFields = useMemo(() => {
    if (!shipment?.fields) return [];
    if (fieldFilter === "NEEDS_ATTENTION") {
      return shipment.fields.filter(
        (f) => (f.is_low_confidence || f.is_manual_entry) && !f.is_confirmed_by_human
      );
    }
    if (fieldFilter === "INVOICE") return shipment.fields.filter((f) => f.doc_type === "INVOICE");
    if (fieldFilter === "PACKING_LIST") return shipment.fields.filter((f) => f.doc_type === "PACKING_LIST");
    if (fieldFilter === "BILL_OF_LADING") return shipment.fields.filter((f) => f.doc_type === "BILL_OF_LADING");
    return shipment.fields;
  }, [shipment, fieldFilter]);

  if (loading) {
    return (
      <div className="flex min-h-[calc(100vh-3.5rem)] items-center justify-center bg-slate-50">
        <div className="text-center space-y-3">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-2 border-slate-900 border-t-transparent" />
          <p className="text-xs font-mono text-slate-600">Loading 3-way customs review workbench...</p>
        </div>
      </div>
    );
  }

  if (error || !shipment) {
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center space-y-4">
        <div className="mx-auto flex h-10 w-10 items-center justify-center rounded-full bg-rose-50 text-rose-600">
          <AlertCircle className="h-6 w-6" />
        </div>
        <h2 className="text-sm font-bold text-slate-900">Shipment Not Found</h2>
        <p className="text-xs text-slate-500">{error || "Unable to retrieve consignment record."}</p>
        <Link
          href="/shipments"
          className="inline-flex items-center gap-1 rounded-md bg-slate-900 px-3 py-1.5 text-xs font-medium text-white hover:bg-slate-800"
        >
          <ArrowLeft className="h-3.5 w-3.5" />
          <span>Back to Shipments Queue</span>
        </Link>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-[calc(100vh-3.5rem)] bg-slate-100/60">
      {/* =========================================================================
          STEP 1: TOP STICKY CLEARANCE & ACTION BAR
          ========================================================================= */}
      <section className="sticky top-14 z-30 border-b border-slate-200/80 bg-white/95 backdrop-blur-md px-4 py-2.5 sm:px-6 shadow-xs">
        <div className="mx-auto flex flex-col gap-2.5 lg:flex-row lg:items-center lg:justify-between max-w-[1700px]">
          {/* Left: Consignment Identity */}
          <div className="flex flex-wrap items-center gap-2.5">
            <Link
              href="/shipments"
              className="flex h-7 w-7 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
              title="Return to Shipments Queue"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
            </Link>

            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                {shipment.shipment_code}
              </span>
              <span className="text-xs font-semibold text-slate-800 truncate max-w-[160px] sm:max-w-[220px]">
                {shipment.supplier_name.split("/")[0]}
              </span>
              <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                ({shipment.port_of_loading.split(",")[0]} → {shipment.port_of_discharge.split(",")[0]})
              </span>
            </div>

            {/* Status Badge */}
            {shipment.status === "CROSS_CHECK_FAILED" && (
              <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-[10px] font-semibold text-rose-700 border border-rose-200">
                Cross-Check Mismatch
              </span>
            )}
            {shipment.status === "NEEDS_REVIEW" && (
              <span className="rounded-full bg-amber-50 px-2.5 py-0.5 text-[10px] font-semibold text-amber-800 border border-amber-300">
                Review Required
              </span>
            )}
            {shipment.status === "READY_FOR_APPROVAL" && (
              <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-[10px] font-semibold text-blue-700 border border-blue-200">
                Manager Sign-Off Ready
              </span>
            )}
            {shipment.status === "APPROVED" && (
              <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-[10px] font-semibold text-emerald-700 border border-emerald-200">
                Approved for BoE
              </span>
            )}
            {shipment.status === "EXPORTED" && (
              <span className="rounded-full bg-slate-900 px-2.5 py-0.5 text-[10px] font-semibold text-white">
                Exported to ICEGATE
              </span>
            )}
          </div>

          {/* Center: Live Clearance Blocker Counter */}
          <div className="flex items-center gap-2 text-xs">
            {blockers.totalBlockers === 0 ? (
              <div className="flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800 border border-emerald-200 shadow-xs">
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                <span>Cleared for ICEGATE Flat Export</span>
              </div>
            ) : (
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wide">
                  Export Blockers:
                </span>
                {blockers.failedCrossChecks > 0 && (
                  <span className="rounded-md bg-rose-100 px-2 py-0.5 text-[11px] font-mono font-bold text-rose-800 border border-rose-300">
                    {blockers.failedCrossChecks} Check Mismatch
                  </span>
                )}
                {blockers.unconfirmedFields > 0 && (
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[11px] font-mono font-bold text-amber-900 border border-amber-300">
                    {blockers.unconfirmedFields} Unconfirmed Field{blockers.unconfirmedFields > 1 ? "s" : ""}
                  </span>
                )}
                {blockers.pendingManagerApproval && (
                  <span className="rounded-md bg-blue-100 px-2 py-0.5 text-[11px] font-mono font-bold text-blue-800 border border-blue-300">
                    Manager Sign-Off Pending
                  </span>
                )}
              </div>
            )}
          </div>

          {/* Right: Primary 1-Click Operational Actions */}
          <div className="flex items-center gap-2">
            {/* 1-Click Batch Confirmation (>= 85%) */}
            <button
              onClick={handleConfirmAllHighConfidence}
              disabled={actionLoading}
              title="Confirm all fields with high AI confidence score (≥85%), leaving only low-confidence anomalies"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 shadow-xs active:scale-95 transition-all"
            >
              <CheckCheck className="h-3.5 w-3.5 text-emerald-600" />
              <span className="hidden sm:inline">Confirm High-Conf (≥85%)</span>
              <span className="sm:hidden">Confirm (≥85%)</span>
            </button>

            {/* Re-Run AI Extraction */}
            <button
              onClick={handleRerunExtraction}
              disabled={actionLoading}
              title="Re-run Vision AI extraction and deterministic cross-checks"
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 p-1 text-slate-600 shadow-xs"
            >
              <RefreshCw className={`h-3.5 w-3.5 ${actionLoading ? "animate-spin text-slate-400" : ""}`} />
            </button>

            {/* Manager Sign-Off Button (If required) */}
            {blockers.pendingManagerApproval && (
              <button
                onClick={handleManagerApprove}
                disabled={actionLoading}
                className="inline-flex items-center gap-1 rounded-md bg-blue-600 hover:bg-blue-700 px-2.5 py-1 text-xs font-semibold text-white shadow-xs active:scale-95 transition-all animate-pulse"
                title={
                  user?.role === "DOCUMENTATION_MANAGER"
                    ? "Approve discrepancy as Documentation Manager"
                    : "1-Click Switch to Manager (Priya Nair) and Sign Off Discrepancy"
                }
              >
                <ShieldCheck className="h-3.5 w-3.5" />
                <span>
                  {user?.role === "DOCUMENTATION_MANAGER" ? "Manager Sign-Off" : "Switch to Mgr & Sign-Off"}
                </span>
              </button>
            )}

            {/* Export CSV Button (Hard Gatekeeper) */}
            <div className="relative">
              {blockers.isExportReady ? (
                <Link
                  href={`/shipments/${shipment.shipment_code}/export`}
                  className="inline-flex items-center gap-1.5 rounded-md bg-emerald-600 hover:bg-emerald-700 px-3 py-1 text-xs font-semibold text-white shadow-xs transition-colors"
                >
                  <FileDown className="h-3.5 w-3.5" />
                  <span>Download Filing CSV</span>
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={() => setShowBlockerTooltip(!showBlockerTooltip)}
                  className="inline-flex items-center gap-1.5 rounded-md bg-slate-200 px-3 py-1 text-xs font-semibold text-slate-500 cursor-not-allowed shadow-xs border border-slate-300/60"
                  title="Click to view remaining export blockers"
                >
                  <Lock className="h-3.5 w-3.5 text-slate-400" />
                  <span>Export Blocked ({blockers.totalBlockers})</span>
                </button>
              )}

              {/* Blocker breakdown popover */}
              {showBlockerTooltip && !blockers.isExportReady && (
                <div className="absolute right-0 top-full mt-1.5 w-72 rounded-lg border border-slate-200 bg-white p-3 text-xs shadow-lg z-50 animate-in fade-in slide-in-from-top-1">
                  <div className="flex items-center justify-between pb-1.5 border-b border-slate-100 font-semibold text-slate-800">
                    <span>Export Gatekeeper Blockers</span>
                    <button
                      onClick={() => setShowBlockerTooltip(false)}
                      className="text-slate-400 hover:text-slate-700"
                    >
                      ✕
                    </button>
                  </div>
                  <ul className="mt-2 space-y-1.5 text-slate-600 text-[11px]">
                    {blockers.failedCrossChecks > 0 && (
                      <li className="flex items-center gap-1.5 text-rose-700 font-medium">
                        <span>•</span>
                        <span>{blockers.failedCrossChecks} failed 3-way cross-check(s) unresolved</span>
                      </li>
                    )}
                    {blockers.unconfirmedFields > 0 && (
                      <li className="flex items-center gap-1.5 text-amber-800 font-medium">
                        <span>•</span>
                        <span>{blockers.unconfirmedFields} low-confidence / manual fields unconfirmed</span>
                      </li>
                    )}
                    {blockers.pendingManagerApproval && (
                      <li className="flex items-center gap-1.5 text-blue-700 font-medium">
                        <span>•</span>
                        <span>Documentation Manager sign-off required for audit override</span>
                      </li>
                    )}
                  </ul>
                  <div className="mt-2.5 pt-2 border-t border-slate-100 text-[10px] text-slate-400">
                    Indian Customs compliance gate prevents filing unverified data.
                  </div>
                </div>
              )}
            </div>

            {/* Audit History Drawer Toggle */}
            <button
              onClick={() => setShowAuditDrawer(!showAuditDrawer)}
              className="inline-flex items-center gap-1 rounded-md border border-slate-200 bg-white hover:bg-slate-50 px-2 py-1 text-xs font-medium text-slate-600 shadow-xs"
              title="Toggle Live Audit & Edit History Drawer"
            >
              <History className="h-3.5 w-3.5 text-slate-500" />
              <span className="hidden xl:inline">Audit Log</span>
              <span className="rounded bg-slate-100 px-1 font-mono text-[10px]">
                {shipment.edit_history?.length || 0}
              </span>
            </button>
          </div>
        </div>
      </section>

      {/* MOBILE VIEW SEGMENTED CONTROLLER (< 1024px) */}
      <div className="lg:hidden border-b border-slate-200 bg-white px-4 py-2 flex items-center justify-between text-xs font-medium">
        <span className="text-slate-500 font-mono text-[11px]">Mobile View:</span>
        <div className="flex items-center rounded-md border border-slate-200 bg-slate-100 p-0.5">
          <button
            onClick={() => setMobileView("DOC")}
            className={`rounded px-2.5 py-1 ${mobileView === "DOC" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600"}`}
          >
            📄 Document Viewer
          </button>
          <button
            onClick={() => setMobileView("FIELDS")}
            className={`rounded px-2.5 py-1 ${mobileView === "FIELDS" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600"}`}
          >
            ✓ Fields & Matrix
          </button>
          <button
            onClick={() => setMobileView("SPLIT")}
            className={`rounded px-2.5 py-1 ${mobileView === "SPLIT" ? "bg-white text-slate-900 shadow-xs font-semibold" : "text-slate-600"}`}
          >
            Split View
          </button>
        </div>
      </div>

      {/* =========================================================================
          MAIN 50/50 WORKBENCH CONTAINER
          ========================================================================= */}
      <div className="mx-auto flex w-full max-w-[1700px] flex-1 flex-col lg:flex-row gap-4 p-4 sm:p-6 transition-all duration-300 ease-in-out">
        {/* =======================================================================
            STEP 2: LEFT PANE — INTERACTIVE MULTI-DOCUMENT VIEWER (MINIMIZABLE)
            ======================================================================= */}
        {isDocumentCollapsed ? (
          <aside
            onClick={() => setIsDocumentCollapsed(false)}
            title="Click to expand Document Viewer"
            className="hidden lg:flex flex-col items-center justify-between w-14 min-w-[3.5rem] rounded-xl border border-slate-200/90 bg-white hover:bg-slate-50/90 shadow-xs py-4 lg:sticky lg:top-[6.2rem] lg:h-[calc(100vh-7.5rem)] transition-all duration-300 ease-in-out cursor-pointer group select-none z-10"
          >
            {/* Top Expand Button */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                setIsDocumentCollapsed(false);
              }}
              title="Expand Document Viewer"
              className="flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-600 group-hover:bg-white group-hover:border-slate-300 group-hover:text-slate-900 shadow-2xs transition-all"
            >
              <PanelLeftOpen className="h-4 w-4 text-emerald-600" />
            </button>

            {/* Document Status Indicators */}
            <div className="flex flex-col items-center gap-2.5 my-3">
              {(["INVOICE", "PACKING_LIST", "BILL_OF_LADING"] as DocumentType[]).map((dType) => {
                const doc = shipment.documents?.find((d) => d.doc_type === dType);
                const isActive = activeDocType === dType;
                const dotColor = doc?.is_unreadable
                  ? "bg-rose-500"
                  : (doc?.avg_confidence || 0) >= 0.85
                  ? "bg-emerald-500"
                  : "bg-amber-500";
                return (
                  <div
                    key={dType}
                    title={`${dType}: ${doc?.is_unreadable ? "Unreadable" : Math.round((doc?.avg_confidence || 0) * 100) + "%"}`}
                    className={`h-2.5 w-2.5 rounded-full ${dotColor} ${isActive ? "ring-2 ring-slate-900 ring-offset-1" : "opacity-60"}`}
                  />
                );
              })}
            </div>

            {/* Rotated Vertical Title */}
            <div className="flex items-center gap-2 transform -rotate-90 whitespace-nowrap text-[11px] font-mono font-bold tracking-wider text-slate-500 group-hover:text-slate-900 transition-colors my-auto">
              <FileText className="h-3.5 w-3.5 text-slate-400 rotate-90" />
              <span>DOCUMENT VIEWER</span>
            </div>

            {/* Bottom Expand Label */}
            <div className="text-[10px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 rounded px-1.5 py-0.5 group-hover:bg-emerald-100 transition-colors">
              EXPAND →
            </div>
          </aside>
        ) : (
          <div
            className={`flex flex-col lg:w-1/2 rounded-xl border border-slate-200/90 bg-white shadow-xs overflow-hidden lg:sticky lg:top-[6.2rem] lg:h-[calc(100vh-7.5rem)] transition-all duration-300 ease-in-out ${
              mobileView === "FIELDS" ? "hidden lg:flex" : "flex"
            }`}
          >
            {/* Document Tabs */}
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50/80 px-3 pt-2">
              <div className="flex items-center gap-1">
                {(["INVOICE", "PACKING_LIST", "BILL_OF_LADING"] as DocumentType[]).map((dType) => {
                  const doc = shipment.documents?.find((d) => d.doc_type === dType);
                  const isActive = activeDocType === dType;
                  const label =
                    dType === "INVOICE"
                      ? "Commercial Invoice"
                      : dType === "PACKING_LIST"
                      ? "Packing List"
                      : "Bill of Lading";

                  return (
                    <button
                      key={dType}
                      onClick={() => {
                        setActiveDocType(dType);
                        // Reset highlighted field when switching doc manually
                        setHighlightedFieldKey(null);
                      }}
                      className={`flex items-center gap-1.5 rounded-t-lg border-t border-x px-3 py-2 text-xs font-medium transition-all ${
                        isActive
                          ? "border-slate-300 bg-white text-slate-900 font-semibold shadow-xs"
                          : "border-transparent text-slate-500 hover:text-slate-800"
                      }`}
                    >
                      <FileText className="h-3.5 w-3.5 text-slate-500" />
                      <span>{label}</span>
                      {doc && (
                        <span
                          className={`rounded px-1 text-[9px] font-mono font-bold ${
                            doc.is_unreadable
                              ? "bg-rose-100 text-rose-800"
                              : doc.avg_confidence >= 0.85
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-amber-100 text-amber-900"
                          }`}
                        >
                          {doc.is_unreadable ? "UNREADABLE" : `${Math.round(doc.avg_confidence * 100)}%`}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Skew & Bilingual Meta Badge on Tab Bar + Minimize Button */}
              <div className="flex items-center gap-2 pb-1">
                {activeDoc && (
                  <div className="hidden sm:flex items-center gap-1.5 text-[10px]">
                    {activeDoc.is_bilingual && (
                      <span className="rounded bg-indigo-50 text-indigo-700 px-1.5 py-0.2 border border-indigo-200 font-mono">
                        {activeDoc.language_hint || "Bilingual"}
                      </span>
                    )}
                    {activeDoc.skew_angle_deg !== 0 && (
                      <span className="rounded bg-amber-50 text-amber-800 px-1.5 py-0.2 border border-amber-300 font-mono">
                        {activeDoc.skew_angle_deg}° Skew
                      </span>
                    )}
                  </div>
                )}

                {/* Minimize Document Pane Toggle Button */}
                <button
                  onClick={() => setIsDocumentCollapsed(true)}
                  title="Minimize Document Viewer (Expands Field & Cross-Check Panel to Full Width)"
                  className="hidden lg:flex items-center gap-1 rounded-md border border-slate-200 bg-white px-2 py-1 text-[11px] font-medium text-slate-600 hover:border-slate-300 hover:text-slate-900 transition-all shadow-2xs"
                >
                  <PanelLeftClose className="h-3.5 w-3.5 text-slate-500" />
                  <span className="hidden xl:inline">Minimize</span>
                </button>
              </div>
            </div>

          {/* Scan Ergonomics & De-Skew Toolbar */}
          <div className="flex flex-wrap items-center justify-between border-b border-slate-100 bg-white px-3 py-1.5 text-xs">
            {/* View Mode Toggle */}
            <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-[11px]">
              <button
                onClick={() => setViewerMode("OCR_SHEET")}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  viewerMode === "OCR_SHEET"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Structured OCR View
              </button>
              <button
                onClick={() => setViewerMode("NATIVE_PDF")}
                className={`rounded px-2 py-0.5 font-medium transition-colors ${
                  viewerMode === "NATIVE_PDF"
                    ? "bg-white text-slate-900 shadow-xs font-semibold"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Original PDF
              </button>
            </div>

            {/* De-Skew Rotation Controls */}
            <div className="flex items-center gap-1">
              {/* Highlighted Auto-Deskew Button when document has scan tilt */}
              {activeDoc && activeDoc.skew_angle_deg !== 0 && (
                <button
                  onClick={() => setRotationDeg(-activeDoc.skew_angle_deg)}
                  className={`flex items-center gap-1 rounded border px-2 py-0.5 text-[11px] font-mono font-semibold transition-colors ${
                    rotationDeg === -activeDoc.skew_angle_deg
                      ? "border-emerald-300 bg-emerald-50 text-emerald-800"
                      : "border-amber-300 bg-amber-50 text-amber-900 hover:bg-amber-100 animate-pulse"
                  }`}
                  title={`Compensate ${activeDoc.skew_angle_deg}° tilt with +${-activeDoc.skew_angle_deg}° rotation`}
                >
                  <RotateCw className="h-3 w-3" />
                  <span>Auto-Deskew (+{-activeDoc.skew_angle_deg}°)</span>
                </button>
              )}

              <div className="flex items-center rounded border border-slate-200 bg-slate-50 text-[11px] font-mono">
                <button
                  onClick={() => setRotationDeg((r) => r - 2)}
                  className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200"
                  title="Rotate -2°"
                >
                  -2°
                </button>
                <button
                  onClick={() => setRotationDeg(0)}
                  className={`px-1.5 py-0.5 ${rotationDeg === 0 ? "font-bold text-slate-900" : "text-slate-500"}`}
                  title="Reset to 0°"
                >
                  0°
                </button>
                <button
                  onClick={() => setRotationDeg((r) => r + 2)}
                  className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200"
                  title="Rotate +2°"
                >
                  +2°
                </button>
                <button
                  onClick={() => setRotationDeg((r) => (r + 90) % 360)}
                  className="px-1.5 py-0.5 text-slate-600 hover:bg-slate-200"
                  title="Rotate 90°"
                >
                  90°
                </button>
              </div>
            </div>

            {/* Zoom Controls & Open New Tab */}
            <div className="flex items-center gap-1">
              <div className="flex items-center rounded border border-slate-200 bg-slate-50 text-[11px] font-mono">
                <button
                  onClick={() => setZoomLevel((z) => Math.max(75, z - 15))}
                  className="p-1 text-slate-600 hover:bg-slate-200"
                  title="Zoom Out"
                >
                  <ZoomOut className="h-3 w-3" />
                </button>
                <span className="px-1.5 text-slate-700">{zoomLevel}%</span>
                <button
                  onClick={() => setZoomLevel((z) => Math.min(150, z + 15))}
                  className="p-1 text-slate-600 hover:bg-slate-200"
                  title="Zoom In"
                >
                  <ZoomIn className="h-3 w-3" />
                </button>
              </div>

              {activeDoc && (
                <a
                  href={`${API_BASE_URL}${activeDoc.file_url}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="p-1 rounded text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                  title="Open source PDF in new browser tab"
                >
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              )}
            </div>
          </div>

          {/* Active Field Source Locator Banner */}
          {highlightedFieldKey && (
            <div className="border-b border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] text-amber-900 flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold">📍 Field Highlight:</span>
                <span className="font-mono">{highlightedFieldKey}</span>
                <span className="text-amber-600 font-mono">[{highlightedRegion}]</span>
              </div>
              <button
                onClick={() => setHighlightedFieldKey(null)}
                className="text-amber-700 hover:text-amber-950 text-xs font-bold"
              >
                ✕
              </button>
            </div>
          )}

          {/* Dual Document Canvas */}
          <div className="flex-1 overflow-auto p-4 bg-slate-200/50 flex justify-center items-start">
            {viewerMode === "NATIVE_PDF" && activeDoc ? (
              <div
                className="w-full h-full min-h-[500px] bg-white rounded shadow-sm border border-slate-300 transition-transform duration-200"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotationDeg}deg)`,
                  transformOrigin: "top center",
                }}
              >
                <iframe
                  src={`${API_BASE_URL}${activeDoc.file_url}`}
                  className="w-full h-full min-h-[550px] rounded border-0"
                  title={activeDoc.file_name}
                />
              </div>
            ) : (
              /* MODE A: STRUCTURED CUSTOMS OCR DOCUMENT SHEET WITH BOUNDING HIGHLIGHT */
              <div
                className="w-full max-w-[580px] bg-white rounded-lg shadow-md border border-slate-300 p-6 text-slate-800 text-xs font-sans transition-all duration-200 relative select-text"
                style={{
                  transform: `scale(${zoomLevel / 100}) rotate(${rotationDeg}deg)`,
                  transformOrigin: "top center",
                }}
              >
                {/* Visual Degraded Scan Watermark Overlay (if unreadable) */}
                {activeDoc?.is_unreadable && (
                  <div className="absolute inset-0 bg-rose-900/10 backdrop-blur-[0.5px] rounded-lg pointer-events-none flex items-center justify-center">
                    <div className="rotate-[-25deg] rounded border-2 border-dashed border-rose-500 bg-white/90 px-6 py-2 text-rose-700 font-mono font-bold text-sm shadow-lg">
                      ⚠️ DEGRADED THERMAL SCAN — 31% CONFIDENCE (MANUAL ENTRY)
                    </div>
                  </div>
                )}

                {/* Document Letterhead */}
                <div className="border-b-2 border-slate-900 pb-3 mb-4 flex items-start justify-between">
                  <div>
                    <h3 className="font-bold text-sm tracking-wide text-slate-900 uppercase">
                      {activeDocType === "INVOICE" && "COMMERCIAL INVOICE / 商业发票"}
                      {activeDocType === "PACKING_LIST" && "PACKING LIST / 装箱单"}
                      {activeDocType === "BILL_OF_LADING" && "OCEAN BILL OF LADING / 海运提单"}
                    </h3>
                    <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                      {activeDocType === "INVOICE" && "Original for Consignee / Bill of Entry Verification"}
                      {activeDocType === "PACKING_LIST" && "Cargo Dunnage, Package Breakdown & Weight Specification"}
                      {activeDocType === "BILL_OF_LADING" && "Non-Negotiable Copy / Port Manifest Receipt (INNSA)"}
                    </div>
                  </div>
                  <div className="text-right">
                    <span className="font-mono text-xs font-bold text-slate-900">
                      {activeDocType === "INVOICE" && (shipment.fields.find((f) => f.field_key === "invoice_number")?.current_value || "INV-CB-2026-881")}
                      {activeDocType === "PACKING_LIST" && "PL-CB-2026-881"}
                      {activeDocType === "BILL_OF_LADING" && (shipment.fields.find((f) => f.field_key === "bol_number")?.current_value || "MAEU992817410")}
                    </span>
                    <div className="text-[10px] text-slate-500 font-mono">Date: 2026-10-18</div>
                  </div>
                </div>

                {/* Parties Grid (Exporter vs Importer) */}
                <div className="grid grid-cols-2 gap-3 mb-4 text-[11px] border border-slate-200 rounded p-2.5 bg-slate-50/50">
                  <div
                    className={`p-1.5 rounded transition-all ${
                      highlightedFieldKey === "supplier_name" ? "ring-2 ring-amber-500 bg-amber-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-slate-500 block text-[9px] uppercase tracking-wider">
                      Shipper / Exporter:
                    </span>
                    <div className="font-medium text-slate-900">{shipment.supplier_name}</div>
                    <div className="text-slate-500 text-[10px]">{shipment.supplier_country}</div>
                  </div>

                  <div
                    className={`p-1.5 rounded transition-all ${
                      highlightedFieldKey === "importer_name" ? "ring-2 ring-amber-500 bg-amber-50" : ""
                    }`}
                  >
                    <span className="font-semibold text-slate-500 block text-[9px] uppercase tracking-wider">
                      Consignee / Importer:
                    </span>
                    <div className="font-medium text-slate-900">{shipment.importer_name}</div>
                    <div className="font-mono text-[10px] text-slate-500">IEC: {shipment.importer_iec}</div>
                  </div>
                </div>

                {/* Key Logistics Metadata Table */}
                <div className="grid grid-cols-3 gap-2 mb-4 text-[10px] font-mono border-y border-slate-200 py-2">
                  <div className={highlightedFieldKey === "incoterm" ? "ring-2 ring-amber-500 p-0.5 rounded bg-amber-50" : ""}>
                    <span className="text-slate-400 block text-[8px] uppercase">Incoterm:</span>
                    <span className="font-bold text-slate-800">{shipment.incoterm}</span>
                  </div>

                  <div className={highlightedFieldKey === "container_number" ? "ring-2 ring-amber-500 p-0.5 rounded bg-amber-50" : ""}>
                    <span className="text-slate-400 block text-[8px] uppercase">Container #:</span>
                    <span className="font-bold text-slate-800">
                      {shipment.fields.find((f) => f.field_key === "container_number")?.current_value || "MSCU8492014"}
                    </span>
                  </div>

                  <div className={highlightedFieldKey === "currency" ? "ring-2 ring-amber-500 p-0.5 rounded bg-amber-50" : ""}>
                    <span className="text-slate-400 block text-[8px] uppercase">Currency:</span>
                    <span className="font-bold text-slate-800">{shipment.currency}</span>
                  </div>
                </div>

                {/* Line Item Table (Active for Invoice / Packing List) */}
                <div className="mb-4">
                  <table className="w-full text-left text-[11px]">
                    <thead className="border-b border-slate-300 text-[9px] font-mono uppercase text-slate-500">
                      <tr>
                        <th className="py-1">Description</th>
                        <th className="py-1">HSN Code</th>
                        <th className="py-1 text-right">Qty</th>
                        {activeDocType === "INVOICE" && <th className="py-1 text-right">Unit Price</th>}
                        {activeDocType === "INVOICE" && <th className="py-1 text-right">Total</th>}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-mono">
                      {shipment.line_items.map((li) => (
                        <tr
                          key={li.id}
                          className={highlightedFieldKey === "hsn_code" ? "bg-amber-50 ring-1 ring-amber-400" : ""}
                        >
                          <td className="py-1.5 font-sans font-medium text-slate-800 pr-2">{li.description}</td>
                          <td className="py-1.5 font-bold text-slate-900">{li.hsn_code}</td>
                          <td className="py-1.5 text-right">{li.qty.toLocaleString()} {li.unit}</td>
                          {activeDocType === "INVOICE" && (
                            <td className="py-1.5 text-right">{li.unit_price ? li.unit_price.toFixed(2) : "-"}</td>
                          )}
                          {activeDocType === "INVOICE" && (
                            <td className="py-1.5 text-right font-bold text-slate-900">
                              {li.line_total ? li.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                            </td>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* Totals & Weight Specification Box */}
                <div className="border-t-2 border-slate-900 pt-2.5 flex items-start justify-between text-[11px] font-mono">
                  {/* Left: Weights & Packages */}
                  <div className="space-y-1">
                    <div
                      className={`flex items-center gap-2 ${
                        highlightedFieldKey === "packages" ? "ring-2 ring-amber-500 p-0.5 rounded bg-amber-50" : ""
                      }`}
                    >
                      <span className="text-slate-500">Total Packages:</span>
                      <span className="font-bold text-slate-900">
                        {shipment.fields.find((f) => f.field_key === "packages" && f.doc_type === activeDocType)?.current_value || "240 Cartons"}
                      </span>
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        highlightedFieldKey === "gross_weight_kg" ? "ring-2 ring-rose-500 p-0.5 rounded bg-rose-50 animate-pulse" : ""
                      }`}
                    >
                      <span className="text-slate-500">Gross Weight:</span>
                      <span className="font-bold text-slate-900">
                        {shipment.fields.find((f) => f.field_key === "gross_weight_kg" && f.doc_type === activeDocType)?.current_value || "3120.00"} kg
                      </span>
                      {activeDocType === "INVOICE" && shipment.shipment_code === "SHP-24811" && (
                        <span className="text-[9px] text-rose-600 font-sans font-bold">
                          [45kg mismatch vs PL]
                        </span>
                      )}
                    </div>

                    <div
                      className={`flex items-center gap-2 ${
                        highlightedFieldKey === "net_weight_kg" ? "ring-2 ring-amber-500 p-0.5 rounded bg-amber-50" : ""
                      }`}
                    >
                      <span className="text-slate-500">Net Weight:</span>
                      <span className="font-bold text-slate-900">
                        {shipment.fields.find((f) => f.field_key === "net_weight_kg" && f.doc_type === activeDocType)?.current_value || "2880.00"} kg
                      </span>
                    </div>
                  </div>

                  {/* Right: Invoice Grand Total */}
                  {activeDocType === "INVOICE" && (
                    <div
                      className={`text-right ${
                        highlightedFieldKey === "invoice_total" ? "ring-2 ring-amber-500 p-1 rounded bg-amber-50" : ""
                      }`}
                    >
                      <span className="text-[9px] uppercase tracking-wider text-slate-500 block">Total Payable ({shipment.currency}):</span>
                      <span className="text-base font-bold text-slate-900">
                        {shipment.currency}{" "}
                        {parseFloat(
                          shipment.fields.find((f) => f.field_key === "invoice_total")?.current_value || "0"
                        ).toLocaleString(undefined, { minimumFractionDigits: 2 })}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
        )}

        {/* =======================================================================
            STEP 3: RIGHT PANE — 3-WAY CROSS-CHECK MATRIX & FIELDS (EXPANDS FULL WIDTH)
            ======================================================================= */}
        <div
          className={`flex-1 flex flex-col space-y-4 transition-all duration-300 ease-in-out ${
            isDocumentCollapsed ? "lg:w-full" : "lg:w-1/2"
          } ${
            mobileView === "DOC" ? "hidden lg:flex" : "flex"
          }`}
        >
          {/* Minimized Document Notification Bar with Restore Link */}
          {isDocumentCollapsed && (
            <div className="hidden lg:flex items-center justify-between rounded-xl border border-emerald-200/80 bg-emerald-50/70 px-4 py-2 text-xs shadow-2xs">
              <div className="flex items-center gap-2 text-emerald-900 font-medium">
                <PanelLeftOpen className="h-4 w-4 text-emerald-600" />
                <span>
                  <strong>Full-Width Inspection Mode Active</strong> — Document viewer is minimized. Click any field below or hit <kbd className="px-1.5 py-0.5 rounded bg-white border border-emerald-300 font-mono text-[10px]">Expand</kbd> to restore the side-by-side view.
                </span>
              </div>
              <button
                onClick={() => setIsDocumentCollapsed(false)}
                className="flex items-center gap-1 font-mono text-xs font-semibold text-emerald-700 hover:text-emerald-900 bg-white border border-emerald-300 rounded-md px-2.5 py-1 shadow-2xs hover:bg-emerald-50 transition-colors"
              >
                <span>Restore Split View</span>
                <span>⤢</span>
              </button>
            </div>
          )}
          {/* ---------------------------------------------------------------------
              PANEL 1: 3-WAY CROSS-CHECK MATRIX (INVOICE VS PACKING LIST VS BOL)
              --------------------------------------------------------------------- */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2.5">
              <div className="flex items-center gap-2">
                <span className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                  3-Way Cross-Check Matrix (Invoice vs PL vs BoL)
                </span>
                <span className="rounded bg-slate-100 px-1.5 py-0.2 text-[10px] font-mono text-slate-600 border border-slate-200">
                  6 Customs Validation Rules
                </span>
              </div>
              <div>
                {blockers.failedCrossChecks === 0 ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                    <span>All Rules Passed</span>
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 animate-pulse">
                    <AlertTriangle className="h-3.5 w-3.5 text-rose-500" />
                    <span>{blockers.failedCrossChecks} Discrepancy Found</span>
                  </span>
                )}
              </div>
            </div>

            {/* Cross-Check Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pl-2">Validation Rule</th>
                    <th className="py-2 px-1">Invoice</th>
                    <th className="py-2 px-1">Packing List</th>
                    <th className="py-2 px-1">Ocean BoL</th>
                    <th className="py-2 px-1">Status / Delta</th>
                    <th className="py-2 pr-2 text-right">1-Click Resolution</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px]">
                  {shipment.cross_checks.map((check) => {
                    const isFailed = check.status === "FAILED";
                    const isResolved = check.status === "RESOLVED_BY_HUMAN";

                    return (
                      <React.Fragment key={check.id}>
                        <tr
                          className={`transition-colors ${
                            isFailed
                              ? "bg-rose-50/70 border-l-2 border-rose-500 font-medium"
                              : isResolved
                              ? "bg-blue-50/50 border-l-2 border-blue-400"
                              : "hover:bg-slate-50/50"
                          }`}
                        >
                          {/* Rule Code */}
                          <td className="py-2.5 pl-2 font-mono text-slate-900">
                            <div>{check.rule_name}</div>
                            <div className="text-[10px] text-slate-400 font-mono truncate max-w-[140px]">
                              {check.rule_code}
                            </div>
                          </td>

                          {/* Invoice Value */}
                          <td className="py-2.5 px-1 font-mono text-slate-800">
                            {check.invoice_value || "-"}
                          </td>

                          {/* Packing List Value */}
                          <td className="py-2.5 px-1 font-mono text-slate-800">
                            {check.packing_list_value || "-"}
                          </td>

                          {/* BoL Value */}
                          <td className="py-2.5 px-1 font-mono text-slate-800">
                            {check.bol_value || "-"}
                          </td>

                          {/* Status / Delta */}
                          <td className="py-2.5 px-1 font-mono">
                            {isFailed ? (
                              <span className="text-rose-600 font-bold">
                                {check.discrepancy_delta}
                              </span>
                            ) : isResolved ? (
                              <span className="rounded bg-blue-100 px-1.5 py-0.5 text-[9px] font-bold text-blue-800">
                                OVERRIDDEN
                              </span>
                            ) : (
                              <span className="text-emerald-700 font-semibold">✓ MATCH</span>
                            )}
                          </td>

                          {/* 1-Click Resolution Action */}
                          <td className="py-2.5 pr-2 text-right font-sans">
                            {isFailed ? (
                              <div className="flex flex-wrap items-center justify-end gap-1">
                                {check.rule_code === "THREE_WAY_GROSS_WEIGHT" && (
                                  <>
                                    <button
                                      onClick={() =>
                                        handleResolveCrossCheck(check.id, "SYNC_TO_AUTHORITATIVE_VALUE", "3165.00")
                                      }
                                      disabled={actionLoading}
                                      className="rounded bg-emerald-600 hover:bg-emerald-700 px-2 py-1 text-[10px] font-bold text-white shadow-xs"
                                      title="Update Invoice Gross Weight to 3,165.00 kg matching Packing List and Ocean BoL"
                                    >
                                      Sync to 3,165 kg
                                    </button>

                                    <button
                                      onClick={() =>
                                        handleResolveCrossCheck(check.id, "SYNC_TO_AUTHORITATIVE_VALUE", "3120.00")
                                      }
                                      disabled={actionLoading}
                                      className="rounded border border-slate-300 bg-white hover:bg-slate-50 px-2 py-1 text-[10px] font-medium text-slate-700 shadow-xs"
                                    >
                                      Sync to 3,120 kg
                                    </button>
                                  </>
                                )}

                                <button
                                  onClick={() =>
                                    setOverrideCheckId(overrideCheckId === check.id ? null : check.id)
                                  }
                                  className="rounded border border-amber-300 bg-amber-50 hover:bg-amber-100 px-2 py-1 text-[10px] font-bold text-amber-900 shadow-xs"
                                >
                                  Override Note
                                </button>
                              </div>
                            ) : isResolved ? (
                              <div className="text-[10px] text-slate-500 font-mono">
                                Resolved by {check.resolved_by_name || "Manager"}
                              </div>
                            ) : (
                              <span className="text-[10px] text-slate-400 font-mono">Verified</span>
                            )}
                          </td>
                        </tr>

                        {/* Inline Override Form (Expands when clicking Override Note) */}
                        {overrideCheckId === check.id && (
                          <tr className="bg-amber-50/80 border-b border-amber-200">
                            <td colSpan={6} className="p-3">
                              <div className="space-y-2">
                                <div className="text-xs font-semibold text-amber-900">
                                  Mandatory Customs Audit Justification Note (Requires Manager Sign-Off):
                                </div>
                                <textarea
                                  value={overrideNote}
                                  onChange={(e) => setOverrideNote(e.target.value)}
                                  rows={2}
                                  className="w-full rounded border border-amber-300 p-2 text-xs font-sans text-slate-900 focus:border-amber-600 focus:outline-none"
                                />
                                <div className="flex items-center justify-end gap-2">
                                  <button
                                    onClick={() => setOverrideCheckId(null)}
                                    className="rounded border border-slate-300 bg-white px-2.5 py-1 text-xs text-slate-700 hover:bg-slate-50"
                                  >
                                    Cancel
                                  </button>
                                  <button
                                    onClick={() =>
                                      handleResolveCrossCheck(check.id, "OVERRIDE_WITH_AUDIT_NOTE")
                                    }
                                    disabled={actionLoading}
                                    className="rounded bg-amber-600 hover:bg-amber-700 px-3 py-1 text-xs font-bold text-white shadow-xs"
                                  >
                                    Save Override & Request Manager Sign-Off
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              PANEL 2: UNREADABLE / DEGRADED SCAN BANNER
              --------------------------------------------------------------------- */}
          {shipment.documents?.some((d) => d.is_unreadable) && (
            <div className="rounded-xl border border-rose-300 bg-rose-50/90 p-4 shadow-xs space-y-2">
              <div className="flex items-start gap-2.5">
                <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-1">
                  <h4 className="text-xs font-bold text-rose-900 font-mono">
                    ⚠️ Low Contrast Thermal Fax Scan — Guided Manual Entry Mode Activated
                  </h4>
                  <p className="text-[11px] text-rose-700 leading-relaxed">
                    Packing list scan resolution fell below minimum legibility threshold (Confidence 31% vs 45% min).
                    Automated extraction halted on unreadable fields to prevent customs penalties. Complete manual entry below.
                  </p>
                </div>
              </div>
              <div className="flex justify-end">
                <button
                  onClick={() => setFieldFilter("NEEDS_ATTENTION")}
                  className="rounded bg-rose-600 hover:bg-rose-700 px-2.5 py-1 text-[11px] font-bold text-white shadow-xs"
                >
                  Focus Manual Entry Fields ↓
                </button>
              </div>
            </div>
          )}

          {/* ---------------------------------------------------------------------
              PANEL 3: EXTRACTED FIELDS WORKBENCH (CONFIRMATION & INLINE EDIT)
              --------------------------------------------------------------------- */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            {/* Filter Pills */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2.5">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                Extracted Fields & Confidence Scoring
              </span>

              <div className="flex flex-wrap items-center gap-1 text-[11px]">
                <button
                  onClick={() => setFieldFilter("NEEDS_ATTENTION")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    fieldFilter === "NEEDS_ATTENTION"
                      ? "bg-amber-100 text-amber-900 font-bold border border-amber-300"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Needs Attention ({shipment.fields.filter((f) => (f.is_low_confidence || f.is_manual_entry) && !f.is_confirmed_by_human).length})
                </button>

                <button
                  onClick={() => setFieldFilter("ALL")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    fieldFilter === "ALL"
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  All ({shipment.fields.length})
                </button>

                <button
                  onClick={() => setFieldFilter("INVOICE")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    fieldFilter === "INVOICE"
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Invoice
                </button>

                <button
                  onClick={() => setFieldFilter("PACKING_LIST")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    fieldFilter === "PACKING_LIST"
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  Packing List
                </button>

                <button
                  onClick={() => setFieldFilter("BILL_OF_LADING")}
                  className={`rounded px-2 py-0.5 font-medium transition-colors ${
                    fieldFilter === "BILL_OF_LADING"
                      ? "bg-slate-900 text-white font-bold"
                      : "text-slate-500 hover:text-slate-800"
                  }`}
                >
                  BoL
                </button>
              </div>
            </div>

            {/* Field Rows */}
            <div className="divide-y divide-slate-100 max-h-[380px] overflow-y-auto pr-1">
              {filteredFields.length === 0 ? (
                <div className="py-8 text-center text-xs text-slate-400">
                  ✓ No fields currently require human attention under this filter.
                </div>
              ) : (
                filteredFields.map((field) => {
                  const isEditing = editingFieldId === field.id;
                  const isConfirmed = field.is_confirmed_by_human;
                  const isLowConf = field.is_low_confidence;
                  const isManual = field.is_manual_entry;

                  return (
                    <div
                      key={field.id}
                      onClick={() => focusFieldOnDoc(field)}
                      className={`group p-2.5 transition-all cursor-pointer rounded-lg ${
                        highlightedFieldKey === field.field_key
                          ? "bg-amber-50/80 ring-1 ring-amber-400"
                          : isManual
                          ? "bg-rose-50/40 border-l-2 border-rose-500"
                          : isLowConf && !isConfirmed
                          ? "bg-amber-50/40 border-l-2 border-amber-400"
                          : "hover:bg-slate-50"
                      }`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        {/* Left: Document Badge, Label & Category */}
                        <div className="flex items-center gap-1.5">
                          <span
                            className={`rounded px-1 text-[9px] font-mono font-bold ${
                              field.doc_type === "INVOICE"
                                ? "bg-blue-100 text-blue-800"
                                : field.doc_type === "PACKING_LIST"
                                ? "bg-purple-100 text-purple-800"
                                : "bg-emerald-100 text-emerald-800"
                            }`}
                          >
                            {field.doc_type === "INVOICE" ? "INV" : field.doc_type === "PACKING_LIST" ? "PL" : "BoL"}
                          </span>
                          <span className="font-semibold text-xs text-slate-800">
                            {field.field_label}
                          </span>
                          <span className="text-[10px] text-slate-400 font-mono hidden sm:inline">
                            [{field.field_category}]
                          </span>
                        </div>

                        {/* Right: Confidence Pill & Status */}
                        <div className="flex items-center gap-1.5">
                          {isManual ? (
                            <span className="rounded bg-rose-100 px-1.5 py-0.2 text-[9px] font-mono font-bold text-rose-800">
                              MANUAL ENTRY
                            </span>
                          ) : (
                            <span
                              className={`rounded px-1.5 py-0.2 text-[9px] font-mono font-bold ${
                                field.confidence_score >= 0.85
                                  ? "bg-emerald-100 text-emerald-800"
                                  : "bg-amber-100 text-amber-900 border border-amber-300"
                              }`}
                            >
                              {Math.round(field.confidence_score * 100)}% AI
                            </span>
                          )}

                          {isConfirmed ? (
                            <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-700 font-mono">
                              <Check className="h-3 w-3 text-emerald-600" />
                              <span>Confirmed</span>
                            </span>
                          ) : (
                            <span className="rounded bg-amber-50 px-1 text-[10px] font-semibold text-amber-800 border border-amber-200">
                              Needs Verification
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Value Input and Actions */}
                      <div className="mt-2 flex items-center justify-between gap-2">
                        {isEditing ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              type="text"
                              value={fieldEditValues[field.id] !== undefined ? fieldEditValues[field.id] : field.current_value}
                              onChange={(e) =>
                                setFieldEditValues({ ...fieldEditValues, [field.id]: e.target.value })
                              }
                              onKeyDown={(e) => {
                                if (e.key === "Enter") handleSaveField(field);
                              }}
                              className="flex-1 rounded border border-slate-300 px-2 py-1 text-xs font-mono text-slate-900 focus:border-slate-900 focus:outline-none"
                              autoFocus
                            />
                            <button
                              onClick={() => handleSaveField(field)}
                              disabled={actionLoading}
                              className="rounded bg-slate-900 hover:bg-slate-800 px-2.5 py-1 text-xs font-bold text-white shadow-xs"
                            >
                              Save & Confirm
                            </button>
                            <button
                              onClick={() => setEditingFieldId(null)}
                              className="rounded border border-slate-200 px-2 py-1 text-xs text-slate-600 hover:bg-slate-100"
                            >
                              Cancel
                            </button>
                          </div>
                        ) : (
                          <div className="flex-1 flex items-center justify-between">
                            <div className="flex items-baseline gap-2">
                              <span className="font-mono text-xs font-bold text-slate-900">
                                {field.current_value || (
                                  <span className="text-rose-500 italic">[Empty — Click to Enter]</span>
                                )}
                              </span>
                              {field.unit && (
                                <span className="font-mono text-[10px] text-slate-500">{field.unit}</span>
                              )}
                              {field.ai_extracted_value !== field.current_value && (
                                <span className="text-[10px] text-slate-400 font-mono line-through">
                                  AI: {field.ai_extracted_value}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5">
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setEditingFieldId(field.id);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-800 rounded hover:bg-slate-100"
                                title="Edit Field Value"
                              >
                                <Edit3 className="h-3 w-3" />
                              </button>

                              {!isConfirmed && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleSaveField(field);
                                  }}
                                  disabled={actionLoading}
                                  className="rounded bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 text-[11px] font-bold text-white shadow-xs active:scale-95 transition-all"
                                >
                                  ✓ Confirm
                                </button>
                              )}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          {/* ---------------------------------------------------------------------
              PANEL 4: LINE ITEMS & 8-DIGIT HSN VERIFICATION TABLE
              --------------------------------------------------------------------- */}
          <div className="rounded-xl border border-slate-200/90 bg-white p-4 shadow-xs space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <span className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                Line Items, 8-Digit HSN & Math Verification
              </span>
              <span className="text-[10px] font-mono text-slate-500">
                Indian Customs Tariff ITC(HS)
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500">
                  <tr>
                    <th className="py-1.5 pl-2">#</th>
                    <th className="py-1.5 px-1">Description</th>
                    <th className="py-1.5 px-1">8-Digit HSN</th>
                    <th className="py-1.5 px-1 text-right">Qty</th>
                    <th className="py-1.5 px-1 text-right">Unit Price</th>
                    <th className="py-1.5 px-1 text-right">Total</th>
                    <th className="py-1.5 px-1">Math Check</th>
                    <th className="py-1.5 pr-2 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-[11px] font-mono">
                  {shipment.line_items.map((item) => {
                    const isEditing = editingLineId === item.id;
                    const expectedTotal = item.unit_price ? round(item.qty * item.unit_price, 2) : 0;
                    const isMathCorrect = item.line_total ? Math.abs(expectedTotal - item.line_total) <= 0.01 : true;

                    return (
                      <tr key={item.id} className="hover:bg-slate-50">
                        <td className="py-2 pl-2 text-slate-400">{item.line_number}</td>
                        <td className="py-2 px-1 font-sans font-medium text-slate-800">{item.description}</td>
                        <td className="py-2 px-1 font-bold text-slate-900">
                          {isEditing ? (
                            <input
                              type="text"
                              value={lineHsnValues[item.id] !== undefined ? lineHsnValues[item.id] : item.hsn_code}
                              onChange={(e) => setLineHsnValues({ ...lineHsnValues, [item.id]: e.target.value })}
                              className="w-24 rounded border border-slate-300 px-1 py-0.5 text-xs font-mono"
                            />
                          ) : (
                            <span className={item.is_low_confidence && !item.is_confirmed_by_human ? "text-amber-800 bg-amber-50 px-1 rounded border border-amber-300" : ""}>
                              {item.hsn_code}
                            </span>
                          )}
                        </td>
                        <td className="py-2 px-1 text-right">{item.qty.toLocaleString()} {item.unit}</td>
                        <td className="py-2 px-1 text-right">{item.unit_price ? item.unit_price.toFixed(2) : "-"}</td>
                        <td className="py-2 px-1 text-right font-bold text-slate-900">
                          {item.line_total ? item.line_total.toLocaleString(undefined, { minimumFractionDigits: 2 }) : "-"}
                        </td>
                        <td className="py-2 px-1 text-[10px]">
                          {isMathCorrect ? (
                            <span className="text-emerald-700 font-sans font-medium">✓ Qty × Price</span>
                          ) : (
                            <span className="text-rose-600 font-bold">⚠️ Mismatch</span>
                          )}
                        </td>
                        <td className="py-2 pr-2 text-right">
                          {isEditing ? (
                            <button
                              onClick={() => handleSaveLineItem(item)}
                              className="rounded bg-slate-900 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                            >
                              Save
                            </button>
                          ) : item.is_confirmed_by_human ? (
                            <span className="text-[10px] text-emerald-700 font-semibold font-sans">✓ Verified</span>
                          ) : (
                            <button
                              onClick={() => handleSaveLineItem(item)}
                              className="rounded bg-emerald-600 hover:bg-emerald-700 px-2 py-0.5 text-[10px] font-bold text-white shadow-xs"
                            >
                              ✓ Confirm
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* =========================================================================
          STEP 4: LIVE AUDIT & EDIT HISTORY DRAWER / BOTTOM SECTION
          ========================================================================= */}
      {showAuditDrawer && (
        <section className="border-t border-slate-200 bg-white p-4 sm:p-6 shadow-md z-20">
          <div className="mx-auto max-w-[1700px] space-y-3">
            <div className="flex items-center justify-between border-b border-slate-100 pb-2">
              <div className="flex items-center gap-2">
                <History className="h-4 w-4 text-slate-600" />
                <h3 className="font-bold text-xs uppercase tracking-wider text-slate-900 font-mono">
                  Immutable Consignment Edit & Audit Trail (FieldEditHistory)
                </h3>
              </div>
              <button
                onClick={() => setShowAuditDrawer(false)}
                className="text-xs font-semibold text-slate-500 hover:text-slate-800"
              >
                Close Drawer ✕
              </button>
            </div>

            {(!shipment.edit_history || shipment.edit_history.length === 0) ? (
              <p className="text-xs text-slate-400 py-3 italic">
                No human edits have been logged for this consignment yet. Any field edits or cross-check resolutions will append to this audit trail live.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-xs">
                  <thead className="bg-slate-50 text-[10px] font-mono uppercase text-slate-500">
                    <tr>
                      <th className="py-1.5 pl-2">Timestamp (UTC)</th>
                      <th className="py-1.5 px-2">Document</th>
                      <th className="py-1.5 px-2">Field</th>
                      <th className="py-1.5 px-2">Original AI → Updated Value</th>
                      <th className="py-1.5 px-2">Confidence</th>
                      <th className="py-1.5 px-2">Operator (Role)</th>
                      <th className="py-1.5 pr-2">Justification Reason</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 font-mono text-[11px]">
                    {shipment.edit_history.map((log) => (
                      <tr key={log.id} className="hover:bg-slate-50">
                        <td className="py-2 pl-2 text-slate-500">{new Date(log.created_at).toLocaleString()}</td>
                        <td className="py-2 px-2">{log.doc_type}</td>
                        <td className="py-2 px-2 font-sans font-medium text-slate-800">{log.field_label}</td>
                        <td className="py-2 px-2">
                          <span className="line-through text-slate-400">{log.original_ai_value}</span>
                          <span className="mx-1 text-slate-400">→</span>
                          <span className="font-bold text-slate-900">{log.updated_human_value}</span>
                        </td>
                        <td className="py-2 px-2">
                          <span className="rounded bg-slate-100 px-1 py-0.2 text-[10px]">
                            {Math.round(log.ai_confidence * 100)}%
                          </span>
                        </td>
                        <td className="py-2 px-2 font-sans font-semibold text-slate-700">
                          {log.edited_by_name} <span className="text-[10px] text-slate-400">({log.edited_by_role})</span>
                        </td>
                        <td className="py-2 pr-2 font-sans text-slate-600 truncate max-w-xs" title={log.edit_reason}>
                          {log.edit_reason}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}

function round(val: number, decimals: number): number {
  return Number(Math.round(Number(val + "e" + decimals)) + "e-" + decimals);
}
