"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { BrokerLensLogo } from "@/components/BrokerLensLogo";
import {
  ShieldAlert,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  FileText,
  Sparkles,
  RotateCcw,
  Layers,
  Scale,
  Clock,
  TrendingDown,
  Building2,
  Lock,
  Cpu,
  ChevronRight,
  FileCheck,
  FileSpreadsheet,
  UploadCloud,
} from "lucide-react";

const SPLASH_TICKER_ITEMS = [
  "INITIALIZING VISION OCR ENGINE (STSong-Light CJK + De-Skew)...",
  "LOADING 6-RULE DETERMINISTIC 3-WAY CROSS-CHECK MATRIX...",
  "VERIFYING DPDP ACT 2023 & ICEGATE FLAT-FILE GATEKEEPER...",
  "READY — NHAVA SHEVA (INNSA) OPERATIONS WORKBENCH",
];

export default function LandingPage() {
  const [mounted, setMounted] = useState(false);
  const [showSplash, setShowSplash] = useState(false);
  const [splashProgress, setSplashProgress] = useState(0);
  const [tickerIndex, setTickerIndex] = useState(0);

  useEffect(() => {
    setMounted(true);
    const seen = sessionStorage.getItem("brokerlens_intro_seen");
    if (!seen) {
      setShowSplash(true);
    }
  }, []);

  // Splash sequence runner (~1.6 seconds total)
  useEffect(() => {
    if (!showSplash) return;

    // Progress bar runner
    const duration = 1600;
    const interval = 25;
    const step = 100 / (duration / interval);

    const progressTimer = setInterval(() => {
      setSplashProgress((prev) => {
        const next = prev + step;
        if (next >= 100) {
          clearInterval(progressTimer);
          sessionStorage.setItem("brokerlens_intro_seen", "true");
          setTimeout(() => setShowSplash(false), 150);
          return 100;
        }
        return next;
      });
    }, interval);

    // Status ticker runner
    const tickerTimer = setInterval(() => {
      setTickerIndex((prev) => (prev + 1) % SPLASH_TICKER_ITEMS.length);
    }, 380);

    return () => {
      clearInterval(progressTimer);
      clearInterval(tickerTimer);
    };
  }, [showSplash]);

  const handleSkipIntro = () => {
    sessionStorage.setItem("brokerlens_intro_seen", "true");
    setShowSplash(false);
  };

  const handleReplayIntro = () => {
    setSplashProgress(0);
    setTickerIndex(0);
    setShowSplash(true);
  };

  // Prevent hydration mismatch
  if (!mounted) {
    return (
      <div className="min-h-screen bg-slate-950 flex items-center justify-center">
        <BrokerLensLogo size="lg" variant="light" animated={true} />
      </div>
    );
  }

  // ============================================================================
  // STAGE A: Kinetic Opening Splash Sequence (Full Viewport Dark Canvas)
  // ============================================================================
  if (showSplash) {
    return (
      <div className="fixed inset-0 z-50 flex flex-col items-center justify-between bg-slate-950 text-white p-6 md:p-12 overflow-hidden bg-grid-blueprint-dark animate-grid-pan">
        {/* Top Bar: Live Status & Skip Button */}
        <div className="w-full max-w-5xl flex items-center justify-between z-10">
          <div className="flex items-center gap-2">
            <span className="flex h-2 w-2 rounded-full bg-emerald-400 animate-ping" />
            <span className="font-mono text-xs text-slate-400 tracking-wider">
              PORT CODE: <span className="text-white font-bold">INNSA</span> (NHAVA SHEVA / JNPT)
            </span>
          </div>

          <button
            onClick={handleSkipIntro}
            className="group flex items-center gap-1.5 rounded-md border border-slate-800 bg-slate-900/80 px-3 py-1.5 text-xs font-mono text-slate-300 hover:border-slate-700 hover:text-white transition-all shadow-sm"
          >
            <span>Skip Intro</span>
            <span className="text-slate-500 group-hover:text-emerald-400 transition-colors">↵</span>
          </button>
        </div>

        {/* Centerpiece: Hero Emblem, Scanline, Document Planes */}
        <div className="flex flex-col items-center justify-center my-auto text-center z-10 max-w-3xl">
          <div className="relative mb-8 transform transition-transform duration-500 scale-105">
            <BrokerLensLogo size="hero" variant="light" animated={true} showSubtitle={true} />
          </div>

          {/* 3 Document Plane Badges Swept by Laser */}
          <div className="flex flex-wrap items-center justify-center gap-3 mb-8">
            <div className="flex items-center gap-2 rounded-md border border-emerald-800/60 bg-emerald-950/40 px-3 py-1.5 text-xs font-mono text-emerald-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-400" />
              <span>COMMERCIAL INVOICE</span>
            </div>
            <span className="text-slate-600 font-mono text-xs">•</span>
            <div className="flex items-center gap-2 rounded-md border border-amber-800/60 bg-amber-950/40 px-3 py-1.5 text-xs font-mono text-amber-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-amber-400" />
              <span>PACKING LIST / 装箱单</span>
            </div>
            <span className="text-slate-600 font-mono text-xs">•</span>
            <div className="flex items-center gap-2 rounded-md border border-blue-800/60 bg-blue-950/40 px-3 py-1.5 text-xs font-mono text-blue-300 shadow-sm">
              <span className="h-1.5 w-1.5 rounded-full bg-blue-400" />
              <span>OCEAN BILL OF LADING</span>
            </div>
          </div>

          {/* Kinetic Monospace Status Ticker */}
          <div className="h-8 flex items-center justify-center">
            <p className="font-mono text-xs md:text-sm text-emerald-400 tracking-wide transition-all duration-200">
              {SPLASH_TICKER_ITEMS[tickerIndex]}
            </p>
          </div>
        </div>

        {/* Bottom Progress Bar & Verification Specs */}
        <div className="w-full max-w-xl z-10 flex flex-col gap-2">
          <div className="flex items-center justify-between text-[11px] font-mono text-slate-400">
            <span>DETERMINISTIC 3-WAY VERIFICATION</span>
            <span className="text-emerald-400 font-bold">{Math.round(splashProgress)}%</span>
          </div>
          <div className="h-1.5 w-full rounded-full bg-slate-900 border border-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 via-teal-400 to-cyan-400 transition-all duration-75 ease-out"
              style={{ width: `${splashProgress}%` }}
            />
          </div>
        </div>
      </div>
    );
  }

  // ============================================================================
  // STAGE B: Swiss Industrial Utility Landing Page
  // ============================================================================
  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* 1. HERO SECTION (Split 2-Column Desktop, Stacked Mobile) */}
      <section className="relative border-b border-slate-200 bg-white bg-grid-blueprint overflow-hidden">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 lg:py-20">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 lg:gap-8 items-center">
            {/* Left Column (Value Proposition & CTAs) */}
            <div className="lg:col-span-7 flex flex-col items-start text-left">
              {/* Pilot Location Ribbon & Replay Intro Button */}
              <div className="flex flex-wrap items-center gap-2 mb-6">
                <span className="inline-flex items-center gap-2 rounded-full border border-emerald-300 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-800">
                  <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                  LIVE PILOT • COMPANY A (NHAVA SHEVA / JNPT PORT)
                </span>
                <button
                  onClick={handleReplayIntro}
                  className="inline-flex items-center gap-1 rounded-full border border-slate-300 bg-white px-2.5 py-1 text-xs font-mono font-medium text-slate-600 hover:border-slate-400 hover:text-slate-900 transition-colors shadow-2xs"
                  title="Replay opening sequence animation"
                >
                  <RotateCcw className="h-3 w-3 text-slate-500" />
                  <span>Replay Intro</span>
                </button>
              </div>

              {/* Display Headline */}
              <h1 className="text-3xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight text-slate-900 leading-[1.15] mb-5">
                Drop Three Consignment PDFs.
                <span className="block text-emerald-600">
                  Catch Every Mismatch Before Customs Filing.
                </span>
              </h1>

              {/* Subheadline */}
              <p className="text-base sm:text-lg text-slate-600 leading-relaxed mb-8 max-w-2xl">
                BrokerLens is the high-density operational workbench built for Indian Customs Brokers (CHAs).
                Vision AI extracts Parties, 8-digit HSN Line Items, Weights, and Container numbers from skewed
                or bilingual scans, while a <strong>deterministic 3-way cross-check engine</strong> guarantees
                zero unverified discrepancies reach ICEGATE.
              </p>

              {/* Primary Action Button Bar */}
              <div className="flex flex-wrap items-center gap-3 w-full sm:w-auto">
                <Link
                  href="/shipments"
                  className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-5 py-3 text-sm font-semibold text-white hover:bg-slate-800 transition-all shadow-sm hover:shadow"
                >
                  <Layers className="h-4 w-4 text-emerald-400" />
                  <span>Open Shipment Workbench</span>
                  <ArrowRight className="h-4 w-4" />
                </Link>

                <Link
                  href="/shipments/SHP-24811/review"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-rose-300 bg-rose-50/80 px-4 py-3 text-sm font-semibold text-rose-800 hover:bg-rose-100 transition-all shadow-2xs"
                >
                  <AlertTriangle className="h-4 w-4 text-rose-600" />
                  <span>Inspect Live 45kg Mismatch</span>
                  <span className="font-mono text-xs bg-rose-200/80 px-1.5 py-0.5 rounded text-rose-900">
                    SHP-24811
                  </span>
                </Link>

                <Link
                  href="/shipments/new"
                  className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 transition-all shadow-2xs"
                >
                  <UploadCloud className="h-4 w-4 text-slate-500" />
                  <span>+ Upload Documents</span>
                </Link>
              </div>

              {/* SLA Proof Badges */}
              <div className="mt-8 flex flex-wrap items-center gap-4 text-xs font-mono text-slate-500 border-t border-slate-200 pt-4 w-full">
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  11.4 min SLA Clearance
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" />
                  95.8% Vision Accuracy
                </span>
                <span className="text-slate-300">•</span>
                <span className="flex items-center gap-1.5">
                  <Lock className="h-3.5 w-3.5 text-emerald-600" />
                  DPDP Act 2023 Masking
                </span>
              </div>
            </div>

            {/* Right Column: Animated Interactive 3-Way Cross-Check Visual Card */}
            <div className="lg:col-span-5">
              <div className="relative rounded-2xl border border-slate-800 bg-slate-950 p-6 text-white shadow-2xl overflow-hidden">
                {/* Sweeping Laser Scanline */}
                <div className="absolute left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-400 to-transparent shadow-[0_0_12px_rgba(52,211,153,1)] animate-scan-card pointer-events-none" />

                {/* Card Header */}
                <div className="flex items-center justify-between border-b border-slate-800 pb-3 mb-4">
                  <div className="flex items-center gap-2">
                    <span className="flex h-2 w-2 rounded-full bg-rose-500 animate-pulse" />
                    <span className="font-mono text-xs font-bold text-slate-200">
                      LIVE 3-WAY CONSISTENCY SCAN
                    </span>
                  </div>
                  <span className="font-mono text-[11px] text-emerald-400 font-semibold">
                    SHP-24811
                  </span>
                </div>

                {/* Document Comparison Strips */}
                <div className="space-y-2.5 mb-5 font-mono text-xs">
                  {/* Doc 1: Commercial Invoice */}
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-emerald-400 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-200 text-[11px]">Commercial Invoice</div>
                        <div className="text-[10px] text-slate-400">INV-CB-2026-881</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-rose-400 tabular-nums">3,120.00 kg</div>
                      <div className="text-[10px] text-emerald-400">99% Conf</div>
                    </div>
                  </div>

                  {/* Doc 2: Packing List */}
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-amber-400 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-200 text-[11px]">Packing List / 装箱单</div>
                        <div className="text-[10px] text-slate-400">PL-CB-2026-881</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 tabular-nums">3,165.00 kg</div>
                      <div className="text-[10px] text-emerald-400">98% Conf</div>
                    </div>
                  </div>

                  {/* Doc 3: Ocean Bill of Lading */}
                  <div className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-900/90 px-3.5 py-2.5">
                    <div className="flex items-center gap-2">
                      <FileText className="h-4 w-4 text-blue-400 shrink-0" />
                      <div>
                        <div className="font-medium text-slate-200 text-[11px]">Ocean Bill of Lading</div>
                        <div className="text-[10px] text-slate-400">MAEU992817410</div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-emerald-400 tabular-nums">3,165.00 kg</div>
                      <div className="text-[10px] text-emerald-400">99% Conf</div>
                    </div>
                  </div>
                </div>

                {/* Animated Critical Mismatch Alert Banner */}
                <div className="rounded-lg border border-rose-600/70 bg-rose-950/60 p-3 mb-4 animate-pulse-ring">
                  <div className="flex items-start gap-2.5">
                    <ShieldAlert className="h-4 w-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <div className="font-mono text-xs font-bold text-rose-300">
                        CRITICAL 3-WAY MISMATCH: 45.00 kg DELTA
                      </div>
                      <div className="text-[11px] text-slate-300 mt-0.5 leading-snug">
                        Commercial Invoice specifies <span className="font-mono text-white font-semibold">3,120 kg</span> while Packing List &amp; Ocean BoL specify <span className="font-mono text-white font-semibold">3,165 kg</span>.
                      </div>
                    </div>
                  </div>
                </div>

                {/* Direct Action Link Inside Card */}
                <Link
                  href="/shipments/SHP-24811/review"
                  className="flex items-center justify-between w-full rounded-lg bg-emerald-600 hover:bg-emerald-500 px-4 py-2.5 font-semibold text-xs text-white transition-all shadow-md group"
                >
                  <span className="flex items-center gap-1.5">
                    <span>Resolve in Split-Screen Workbench</span>
                  </span>
                  <ArrowRight className="h-4 w-4 transform group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* 2. QUANTIFIED CLIENT ROI & SLA RIBBON (Exact Problem Statement #3 Math) */}
      <section className="border-b border-slate-200 bg-slate-900 text-white py-8">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
            {/* Metric 1 */}
            <div className="flex flex-col border-l-2 border-emerald-500 pl-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Entry Time / Shipment
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  11.4m
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">-74.7%</span>
              </div>
              <span className="mt-1 text-xs text-slate-400">Down from 45.0 min baseline</span>
            </div>

            {/* Metric 2 */}
            <div className="flex flex-col border-l-2 border-emerald-500 pl-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Field Vision Accuracy
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  95.8%
                </span>
                <span className="text-xs font-mono text-emerald-400 font-bold">SLA MET</span>
              </div>
              <span className="mt-1 text-xs text-slate-400">Target: ≥ 95.0% across 13 fields</span>
            </div>

            {/* Metric 3 */}
            <div className="flex flex-col border-l-2 border-amber-500 pl-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Total Baseline Bleed
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-white font-mono tabular-nums">
                  ₹70.29L
                </span>
                <span className="text-xs font-mono text-amber-400 font-bold">/ YEAR</span>
              </div>
              <span className="mt-1 text-xs text-slate-400">₹34.65L labor + ₹35.64L demurrage</span>
            </div>

            {/* Metric 4 */}
            <div className="flex flex-col border-l-2 border-emerald-400 pl-4">
              <span className="text-[11px] font-mono text-slate-400 uppercase tracking-wider">
                Net Annual Savings
              </span>
              <div className="mt-1 flex items-baseline gap-2">
                <span className="text-2xl sm:text-3xl font-extrabold text-emerald-400 font-mono tabular-nums">
                  ₹52.40L
                </span>
                <span className="text-xs font-mono text-emerald-300 font-bold">698% ROI</span>
              </div>
              <span className="mt-1 text-xs text-slate-400">Payback in ~1.7 months</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3. INTERACTIVE 4-CONSIGNMENT EVALUATOR LAUNCHPAD */}
      <section className="py-12 lg:py-16 bg-slate-50">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row md:items-end justify-between mb-8 gap-4">
            <div>
              <div className="flex items-center gap-2 mb-2">
                <span className="h-1.5 w-1.5 rounded-full bg-slate-900" />
                <span className="font-mono text-xs text-slate-600 font-bold uppercase tracking-wider">
                  Reviewer Quick Launchpad
                </span>
              </div>
              <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 tracking-tight">
                Inspect 4 Seeded Customs Scenarios
              </h2>
              <p className="text-sm text-slate-600 mt-1">
                Jump directly into real customs consignment documents tested with Vision AI and the 3-Way Cross-Check Engine.
              </p>
            </div>

            <Link
              href="/shipments"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-900 hover:text-emerald-700 transition-colors"
            >
              <span>View All Consignments in Table</span>
              <ChevronRight className="h-4 w-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
            {/* Scenario 1: SHP-24811 */}
            <div className="flex flex-col justify-between rounded-xl border border-rose-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    SHP-24811
                  </span>
                  <span className="rounded-full bg-rose-50 border border-rose-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-rose-700">
                    Weight Mismatch
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Apex Industrial ← Waystone China
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Invoice indicates <strong>3,120 kg</strong> while Packing List &amp; BoL specify <strong>3,165 kg</strong>. Bilingual Mandarin/EN packing list (装箱单).
                </p>
              </div>
              <Link
                href="/shipments/SHP-24811/review"
                className="inline-flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <span>Inspect 3-Way Cross-Check</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Scenario 2: SHP-24812 */}
            <div className="flex flex-col justify-between rounded-xl border border-amber-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    SHP-24812
                  </span>
                  <span className="rounded-full bg-amber-50 border border-amber-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-amber-700">
                    Skewed Scan
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Nordic Spares ← SKF Sweden
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Flatbed scanned at <strong>-2.8° tilt</strong>. Low-confidence Incoterm (78%) and HSN (74%) trigger manual eyeball confirmation and inline de-skew rotation.
                </p>
              </div>
              <Link
                href="/shipments/SHP-24812/review"
                className="inline-flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <span>Test De-Skew Controls</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Scenario 3: SHP-24813 */}
            <div className="flex flex-col justify-between rounded-xl border border-emerald-200 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    SHP-24813
                  </span>
                  <span className="rounded-full bg-emerald-50 border border-emerald-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-emerald-700">
                    100% Verified
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Shenzhen Precision Motors
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Zero discrepancies across all 6 cross-check rules. Ready for 1-click 27-column ICEGATE CSV and TSV Excel clipboard export.
                </p>
              </div>
              <Link
                href="/shipments/SHP-24813/export"
                className="inline-flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <span>Preview ICEGATE Export</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>

            {/* Scenario 4: SHP-24814 */}
            <div className="flex flex-col justify-between rounded-xl border border-slate-300 bg-white p-5 shadow-xs hover:shadow-md transition-shadow">
              <div>
                <div className="flex items-center justify-between mb-3">
                  <span className="font-mono font-bold text-xs text-slate-900 bg-slate-100 px-2 py-0.5 rounded border border-slate-200">
                    SHP-24814
                  </span>
                  <span className="rounded-full bg-slate-100 border border-slate-200 px-2 py-0.5 text-[10px] font-mono font-semibold text-slate-700">
                    Degraded Print
                  </span>
                </div>
                <h3 className="font-bold text-sm text-slate-900 mb-1">
                  Hamburg Chemie GmbH
                </h3>
                <p className="text-xs text-slate-600 leading-relaxed mb-4">
                  Low-contrast thermal paper scan (confidence: 31%). Automatically activates Guided Manual Entry fallback to prevent hallucination.
                </p>
              </div>
              <Link
                href="/shipments/SHP-24814/review"
                className="inline-flex items-center justify-between w-full rounded-md border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-800 hover:bg-slate-900 hover:text-white transition-colors"
              >
                <span>Test Guided Fallback</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* 4. HOW THE ARCHITECTURE WORKS (3-Pillar Technical Strip) */}
      <section className="py-12 border-t border-slate-200 bg-white">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto mb-10">
            <h2 className="text-2xl font-bold tracking-tight text-slate-900">
              Architected for Nhava Sheva Customs Clearance
            </h2>
            <p className="text-sm text-slate-600 mt-2">
              Three tightly integrated engines working in concert to eliminate manual typing and block erroneous filings.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {/* Pillar 1 */}
            <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-emerald-100 text-emerald-800 mb-4">
                <Cpu className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                1. Vision AI + Skew Resilience
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Google Gemini 2.5 Flash with structured Pydantic schemas extracts 8-digit HSNs, invoice line items, and container codes. Includes zero-retention privacy headers and an air-gapped deterministic regex layout fallback engine.
              </p>
            </div>

            {/* Pillar 2 */}
            <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-100 text-blue-800 mb-4">
                <Scale className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                2. Deterministic 3-Way Cross-Check
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                Evaluates 6 mathematical consistency rules across Commercial Invoice, Packing List, and Bill of Lading. Automatically detects container transposition errors and weight deltas down to 0.01 kg.
              </p>
            </div>

            {/* Pillar 3 */}
            <div className="flex flex-col items-start p-6 rounded-xl border border-slate-200 bg-slate-50/50">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900 text-white mb-4">
                <Lock className="h-5 w-5" />
              </div>
              <h3 className="font-bold text-base text-slate-900 mb-2">
                3. HTTP 422 Gatekeeper &amp; DPDP
              </h3>
              <p className="text-xs text-slate-600 leading-relaxed">
                A hard non-bypassable backend gatekeeper strictly returns HTTP 422 until all cross-check flags are synchronized or manager-approved. Complies with DPDP Act 2023 with real-time tokenized PII masking.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* 5. FOOTER */}
      <footer className="mt-auto border-t border-slate-200 bg-slate-100 py-6 text-xs text-slate-600">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <BrokerLensLogo size="sm" showSubtitle={false} />
            <span className="text-slate-400">|</span>
            <span>Developed for Company A CHA Operations (Nhava Sheva / JNPT Port)</span>
          </div>

          <div className="flex items-center gap-4 font-mono text-[11px]">
            <Link href="/shipments" className="hover:text-slate-900 transition-colors">
              Workbench
            </Link>
            <Link href="/shipments/new" className="hover:text-slate-900 transition-colors">
              Intake
            </Link>
            <Link href="/analytics" className="hover:text-slate-900 transition-colors">
              Analytics
            </Link>
            <Link href="/login" className="hover:text-slate-900 transition-colors">
              Switch Role
            </Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
