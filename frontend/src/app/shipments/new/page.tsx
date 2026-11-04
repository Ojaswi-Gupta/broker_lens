"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { api } from "@/lib/api";
import { useApp } from "@/context/AppContext";
import {
  UploadCloud,
  FileText,
  Sparkles,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  FileWarning,
  Layers,
  ArrowLeft,
  Info,
  ShieldAlert,
} from "lucide-react";

type ScenarioType = "weight_mismatch" | "skewed_bilingual" | "unreadable_scan" | "clean_verified";

export default function NewShipmentPage() {
  const router = useRouter();
  const { showToast } = useApp();

  // Fast-track state
  const [fastTrackLoading, setFastTrackLoading] = useState<string | null>(null);
  const [progressStep, setProgressStep] = useState<string>("");

  // Custom Form state
  const [title, setTitle] = useState("Solar Inverter Assemblies & Power Controllers");
  const [supplierName, setSupplierName] = useState("Shenzhen SunPower Tech Ltd.");
  const [supplierCountry, setSupplierCountry] = useState("China");
  const [importerName, setImporterName] = useState("Tata Power Renewable Microgrids Ltd.");
  const [importerIec, setImporterIec] = useState("0318029174");
  const [portOfLoading, setPortOfLoading] = useState("Yantian, Shenzhen (CNYTN)");
  const [portOfDischarge, setPortOfDischarge] = useState("Nhava Sheva / JNPT (INNSA)");
  const [currency, setCurrency] = useState("USD");
  const [incoterm, setIncoterm] = useState("CIF Nhava Sheva");

  // Files
  const [invoiceFile, setInvoiceFile] = useState<File | null>(null);
  const [packingListFile, setPackingListFile] = useState<File | null>(null);
  const [bolFile, setBolFile] = useState<File | null>(null);
  const [customUploadLoading, setCustomUploadLoading] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // 1-Click Fast-Track Handler
  const handleFastTrack = async (scenario: ScenarioType) => {
    setFastTrackLoading(scenario);
    try {
      setProgressStep("1/3 Generating authentic customs PDFs on disk...");
      await new Promise((r) => setTimeout(r, 400));

      setProgressStep("2/3 Running Vision AI extraction & confidence scoring...");
      const result = await api.triggerDemoBundle(scenario);

      setProgressStep("3/3 Computing 3-way cross-checks & loading review workbench...");
      await new Promise((r) => setTimeout(r, 300));

      showToast(`Consignment ${result.shipment_code} prepared successfully!`);
      router.push(`/shipments/${result.shipment_code}/review`);
    } catch (err: any) {
      showToast(`Fast-track failed: ${err.message}`);
      setFastTrackLoading(null);
      setProgressStep("");
    }
  };

  // Custom Form Submission
  const handleCustomSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!invoiceFile && !packingListFile && !bolFile) {
      setFormError("Please select at least one customs document (Invoice, Packing List, or Bill of Lading).");
      return;
    }

    setCustomUploadLoading(true);
    try {
      // 1. Create shipment
      const newShipment = await api.createShipment({
        title,
        supplier_name: supplierName,
        supplier_country: supplierCountry,
        importer_name: importerName,
        importer_iec: importerIec,
        port_of_loading: portOfLoading,
        port_of_discharge: portOfDischarge,
        currency,
        incoterm,
      });

      // 2. Upload available files
      if (invoiceFile) {
        await api.uploadShipmentDocument(newShipment.shipment_code, "INVOICE", invoiceFile);
      }
      if (packingListFile) {
        await api.uploadShipmentDocument(newShipment.shipment_code, "PACKING_LIST", packingListFile);
      }
      if (bolFile) {
        await api.uploadShipmentDocument(newShipment.shipment_code, "BILL_OF_LADING", bolFile);
      }

      // 3. Trigger extraction pipeline
      await api.extractShipmentDocuments(newShipment.shipment_code);

      showToast(`Consignment ${newShipment.shipment_code} created and extracted!`);
      router.push(`/shipments/${newShipment.shipment_code}/review`);
    } catch (err: any) {
      setFormError(err.message || "Failed to process custom document upload.");
      setCustomUploadLoading(false);
    }
  };

  const prefillSample = () => {
    setTitle("Industrial Centrifugal Water Pumps DN100");
    setSupplierName("KSB Armaturen GmbH");
    setSupplierCountry("Germany");
    setImporterName("Larsen & Toubro Hydrocarbon Engineering");
    setImporterIec("0388102941");
    setPortOfLoading("Hamburg (DEHAM)");
    setPortOfDischarge("Nhava Sheva (INNSA)");
    setCurrency("EUR");
    setIncoterm("CIF Nhava Sheva");
    showToast("Form pre-filled with sample consignment metadata");
  };

  return (
    <div className="mx-auto max-w-5xl px-4 py-6 sm:px-6 space-y-8">
      {/* HEADER BREADCRUMB */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link
            href="/shipments"
            className="flex h-8 w-8 items-center justify-center rounded-md border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition-colors shadow-xs"
          >
            <ArrowLeft className="h-4 w-4" />
          </Link>
          <div>
            <h1 className="text-xl font-bold tracking-tight text-slate-900">
              New Customs Consignment
            </h1>
            <p className="text-xs text-slate-500">
              Upload 3-way customs document set or launch 1-click live evaluator scenarios
            </p>
          </div>
        </div>
      </div>

      {/* SECTION 1: 1-CLICK EVALUATOR SCENARIOS (TOP PRIORITY) */}
      <div className="rounded-xl border border-slate-200 bg-gradient-to-b from-white to-slate-50/50 p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <div className="flex h-6 w-6 items-center justify-center rounded-md bg-amber-100 text-amber-800">
              <Sparkles className="h-3.5 w-3.5" />
            </div>
            <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider font-mono">
              ⚡ 1-Click Evaluator Scenarios (Zero File Upload Needed)
            </h2>
          </div>
          <span className="text-[11px] text-slate-500 font-mono">
            Directly test AI Vision, Scan Skew & 3-Way Cross-Checks
          </span>
        </div>

        {fastTrackLoading && (
          <div className="rounded-lg border border-blue-200 bg-blue-50 p-3.5 text-xs text-blue-900 flex items-center gap-3 animate-pulse">
            <div className="h-4 w-4 rounded-full border-2 border-blue-600 border-t-transparent animate-spin shrink-0" />
            <div className="font-mono font-medium">{progressStep}</div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
          {/* Scenario A: Weight Mismatch */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition-all shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-900">
                  Scenario A: Weight Mismatch
                </span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700 border border-rose-200">
                  45 kg Delta
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Company B (China): Invoice lists <span className="font-mono font-semibold">3,120 kg</span> while bilingual Packing List and BoL list <span className="font-mono font-semibold">3,165 kg</span>. Demonstrates deterministic discrepancy interception.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFastTrack("weight_mismatch")}
              disabled={!!fastTrackLoading}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>{fastTrackLoading === "weight_mismatch" ? "Generating..." : "Launch Weight Mismatch Scenario"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scenario B: Skewed Bilingual Scan */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition-all shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-900">
                  Scenario B: Skewed Scan (-2.8°)
                </span>
                <span className="rounded bg-amber-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-amber-800 border border-amber-300">
                  Tilt & Low-Conf
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Company C (Sweden): Flatbed scan with <span className="font-mono font-semibold">-2.8° tilt</span> and Swedish <span className="font-mono font-semibold">FAKTURA</span> headers. Tests interactive de-skewing and amber field confirmation.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFastTrack("skewed_bilingual")}
              disabled={!!fastTrackLoading}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>{fastTrackLoading === "skewed_bilingual" ? "Generating..." : "Launch Skewed Scan Scenario"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scenario C: Unreadable Scan Fallback */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition-all shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-900">
                  Scenario C: Degraded Scan Fallback
                </span>
                <span className="rounded bg-rose-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-rose-700 border border-rose-200">
                  Manual Entry
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Hamburg Chemie: Thermal paper fax with heavy contrast degradation (<span className="font-mono font-semibold">31% confidence</span>). Safely routes operator into guided manual entry mode.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFastTrack("unreadable_scan")}
              disabled={!!fastTrackLoading}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>{fastTrackLoading === "unreadable_scan" ? "Generating..." : "Launch Degraded Scan Scenario"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>

          {/* Scenario D: Clean Verified Consignment */}
          <div className="rounded-lg border border-slate-200 bg-white p-4 hover:border-slate-400 transition-all shadow-xs flex flex-col justify-between space-y-3">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold font-mono text-slate-900">
                  Scenario D: Clean Verified Consignment
                </span>
                <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-mono font-bold text-emerald-700 border border-emerald-200">
                  Export Ready
                </span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                Shenzhen Precision Motors: 100% matching 3-way documents with high AI confidence (<span className="font-mono font-semibold">98.5%</span>). Demonstrates 1-click ICEGATE flat export.
              </p>
            </div>
            <button
              type="button"
              onClick={() => handleFastTrack("clean_verified")}
              disabled={!!fastTrackLoading}
              className="inline-flex w-full items-center justify-center gap-1.5 rounded-md bg-slate-900 py-2 px-3 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>{fastTrackLoading === "clean_verified" ? "Generating..." : "Launch Clean Verified Scenario"}</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* SECTION 2: CUSTOM 3-DOCUMENT UPLOAD FORM */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs space-y-6">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div>
            <h2 className="text-sm font-bold text-slate-900">
              Custom Consignment Metadata & 3-Way Document Upload
            </h2>
            <p className="text-xs text-slate-500">
              Enter clearance job details and attach Commercial Invoice, Packing List, and Ocean Bill of Lading
            </p>
          </div>
          <button
            type="button"
            onClick={prefillSample}
            className="flex items-center gap-1 rounded-md border border-slate-200 bg-slate-50 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <Sparkles className="h-3.5 w-3.5 text-amber-600" />
            <span>Pre-fill Sample Data</span>
          </button>
        </div>

        {formError && (
          <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-800 flex items-center gap-2">
            <ShieldAlert className="h-4 w-4 text-rose-600 shrink-0" />
            <span>{formError}</span>
          </div>
        )}

        <form onSubmit={handleCustomSubmit} className="space-y-6">
          {/* Metadata Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs font-medium text-slate-700">Consignment Job Title</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Foreign Supplier / Exporter</label>
              <input
                type="text"
                value={supplierName}
                onChange={(e) => setSupplierName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Supplier Country</label>
              <input
                type="text"
                value={supplierCountry}
                onChange={(e) => setSupplierCountry(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Invoice Currency</label>
              <select
                value={currency}
                onChange={(e) => setCurrency(e.target.value)}
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              >
                <option value="USD">USD — US Dollar</option>
                <option value="EUR">EUR — Euro</option>
                <option value="GBP">GBP — British Pound</option>
                <option value="JPY">JPY — Japanese Yen</option>
                <option value="CNY">CNY — Chinese Yuan</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Indian Importer (Consignee)</label>
              <input
                type="text"
                value={importerName}
                onChange={(e) => setImporterName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Importer 10-Digit IEC</label>
              <input
                type="text"
                value={importerIec}
                onChange={(e) => setImporterIec(e.target.value)}
                required
                maxLength={10}
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Incoterm</label>
              <input
                type="text"
                value={incoterm}
                onChange={(e) => setIncoterm(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Port of Loading</label>
              <input
                type="text"
                value={portOfLoading}
                onChange={(e) => setPortOfLoading(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Port of Discharge</label>
              <input
                type="text"
                value={portOfDischarge}
                onChange={(e) => setPortOfDischarge(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border border-slate-300 py-1.5 px-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900"
              />
            </div>
          </div>

          {/* 3 Dedicated Document Dropzones Side-by-Side */}
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-700 mb-2">
              Attach 3-Way Customs Documents (.pdf, .png, .jpg)
            </label>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Dropzone 1: Invoice */}
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-slate-400 transition-colors bg-slate-50/50 flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-semibold text-xs text-slate-900 flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span>Commercial Invoice</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Rates, line totals, currency, incoterm</p>
                </div>

                <div className="mt-3">
                  {invoiceFile ? (
                    <div className="flex items-center justify-between rounded bg-white p-1.5 border border-slate-200 text-xs">
                      <span className="truncate max-w-[150px] font-mono text-[11px]">{invoiceFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setInvoiceFile(null)}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs">
                      <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                      <span>Select Invoice</span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => setInvoiceFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Dropzone 2: Packing List */}
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-slate-400 transition-colors bg-slate-50/50 flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-semibold text-xs text-slate-900 flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span>Packing List</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Gross & net weights, package counts</p>
                </div>

                <div className="mt-3">
                  {packingListFile ? (
                    <div className="flex items-center justify-between rounded bg-white p-1.5 border border-slate-200 text-xs">
                      <span className="truncate max-w-[150px] font-mono text-[11px]">{packingListFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setPackingListFile(null)}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs">
                      <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                      <span>Select Packing List</span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => setPackingListFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>

              {/* Dropzone 3: Bill of Lading */}
              <div className="rounded-lg border-2 border-dashed border-slate-200 p-4 text-center hover:border-slate-400 transition-colors bg-slate-50/50 flex flex-col justify-between min-h-[140px]">
                <div>
                  <div className="font-semibold text-xs text-slate-900 flex items-center justify-center gap-1.5">
                    <FileText className="h-4 w-4 text-slate-600" />
                    <span>Ocean Bill of Lading</span>
                  </div>
                  <p className="text-[11px] text-slate-500 mt-1">Container numbers, ocean manifest weights</p>
                </div>

                <div className="mt-3">
                  {bolFile ? (
                    <div className="flex items-center justify-between rounded bg-white p-1.5 border border-slate-200 text-xs">
                      <span className="truncate max-w-[150px] font-mono text-[11px]">{bolFile.name}</span>
                      <button
                        type="button"
                        onClick={() => setBolFile(null)}
                        className="text-rose-600 hover:text-rose-800 text-[11px] font-bold ml-1"
                      >
                        ✕
                      </button>
                    </div>
                  ) : (
                    <label className="cursor-pointer inline-flex items-center gap-1 rounded bg-white px-2.5 py-1 text-xs font-medium text-slate-700 border border-slate-200 hover:bg-slate-50 shadow-xs">
                      <UploadCloud className="h-3.5 w-3.5 text-slate-500" />
                      <span>Select BoL</span>
                      <input
                        type="file"
                        accept=".pdf,image/png,image/jpeg"
                        onChange={(e) => setBolFile(e.target.files?.[0] || null)}
                        className="hidden"
                      />
                    </label>
                  )}
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end pt-2 border-t border-slate-100">
            <button
              type="submit"
              disabled={customUploadLoading}
              className="inline-flex items-center gap-1.5 rounded-md bg-slate-900 py-2.5 px-5 text-xs font-semibold text-white hover:bg-slate-800 disabled:opacity-50 transition-colors shadow-xs"
            >
              <span>{customUploadLoading ? "Uploading & Running Vision AI..." : "Create Consignment & Run 3-Way Extraction"}</span>
              <ArrowRight className="h-4 w-4" />
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
