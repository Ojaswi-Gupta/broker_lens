"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import {
  ShieldCheck,
  ShieldAlert,
  UserCheck,
  UploadCloud,
  FileSpreadsheet,
  BarChart3,
  Layers,
  ArrowRightLeft,
  LogIn,
  RotateCcw,
} from "lucide-react";

export function Navbar() {
  const pathname = usePathname();
  const { user, maskPii, toggleMaskPii, switchDemoRole, isLoading, showToast } = useApp();
  const [isResetting, setIsResetting] = React.useState(false);

  const handleResetDemo = async () => {
    if (isResetting) return;
    setIsResetting(true);
    try {
      await api.resetDemoData();
      showToast("✓ Demo consignments & audit trail reset to baseline seed state.");
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch (err: any) {
      showToast(err?.message || "Failed to reset demo data");
      setIsResetting(false);
    }
  };

  const isNavActive = (href: string) => {
    if (href === "/shipments" && (pathname === "/shipments" || pathname === "/")) return true;
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-7xl items-center justify-between px-4 sm:px-6">
        {/* Left: Brand & Navigation */}
        <div className="flex items-center gap-8">
          <Link href="/shipments" className="flex items-center gap-2.5 group">
            <div className="flex h-8 w-8 items-center justify-center rounded-md bg-slate-900 text-white font-mono font-bold text-sm shadow-xs group-hover:bg-brand-accent transition-colors">
              BL
            </div>
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5">
                <span className="font-semibold text-sm tracking-tight text-slate-900">BrokerLens</span>
                <span className="rounded bg-slate-100 px-1.5 py-0.5 text-[10px] font-mono font-medium text-slate-600 border border-slate-200">
                  JNPT/Nhava Sheva
                </span>
              </div>
              <span className="text-[10px] text-slate-500 font-medium">Customs CHA 3-Way Workbench</span>
            </div>
          </Link>

          {/* Nav links */}
          <nav className="hidden md:flex items-center gap-1">
            <Link
              href="/shipments"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                isNavActive("/shipments") && !pathname.includes("/new")
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Shipments</span>
            </Link>

            <Link
              href="/shipments/new"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pathname === "/shipments/new"
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>New Upload</span>
            </Link>

            <Link
              href="/analytics"
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                pathname === "/analytics"
                  ? "bg-slate-100 text-slate-900 font-semibold"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Accuracy & Audit</span>
            </Link>
          </nav>
        </div>

        {/* Right: Operational Controls (DPDP Masking & Role Fast-Switcher) */}
        <div className="flex items-center gap-2.5 sm:gap-3">
          {/* DPDP Act 2023 Masking Toggle */}
          <button
            onClick={toggleMaskPii}
            title="Toggle DPDP Act 2023 Importer Contact & IEC Masking"
            className={`flex items-center gap-1.5 rounded-md border px-2.5 py-1 text-xs font-medium transition-all ${
              maskPii
                ? "border-emerald-300 bg-emerald-50 text-emerald-800 shadow-xs"
                : "border-slate-200 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {maskPii ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">DPDP PII Masked</span>
                <span className="sm:hidden font-mono">PII ON</span>
              </>
            ) : (
              <>
                <ShieldAlert className="h-3.5 w-3.5 text-slate-400" />
                <span className="hidden sm:inline text-slate-600">PII Visible</span>
                <span className="sm:hidden font-mono text-slate-600">PII OFF</span>
              </>
            )}
          </button>

          {/* 1-Click Demo Reset Button */}
          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            title="Reset SHP-24811..24814 and audit logs to initial seed state"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 transition-colors disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin text-blue-600" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* 1-Click Role Switcher */}
          <div className="flex items-center rounded-md border border-slate-200 bg-slate-50 p-0.5 text-xs font-medium">
            <button
              onClick={() => switchDemoRole("DOCUMENTATION_EXECUTIVE")}
              disabled={isLoading}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
                user?.role === "DOCUMENTATION_EXECUTIVE"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="hidden lg:inline">Rohan (Exec)</span>
              <span className="lg:hidden">Exec</span>
            </button>
            <button
              onClick={() => switchDemoRole("DOCUMENTATION_MANAGER")}
              disabled={isLoading}
              className={`flex items-center gap-1 rounded px-2 py-0.5 transition-colors ${
                user?.role === "DOCUMENTATION_MANAGER"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="hidden lg:inline">Priya (Mgr)</span>
              <span className="lg:hidden">Mgr</span>
            </button>
          </div>

          {/* User Profile / Login Link */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-md border border-slate-200 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors"
            title="Switch account or view sign-in portal"
          >
            <LogIn className="h-3.5 w-3.5 text-slate-500" />
            <span className="hidden xl:inline">
              {user ? user.full_name.split(" ")[0] : "Sign In"}
            </span>
          </Link>
        </div>
      </div>
    </header>
  );
}
