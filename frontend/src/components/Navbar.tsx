"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { api } from "@/lib/api";
import { BrokerLensLogo } from "@/components/BrokerLensLogo";
import {
  ShieldCheck,
  ShieldAlert,
  UploadCloud,
  BarChart3,
  Layers,
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
    if (href === "/shipments") {
      return pathname === "/shipments" || pathname.startsWith("/shipments/");
    }
    return pathname.startsWith(href);
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-200/60 bg-white/90 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        {/* Left: Brand Mark & Clean Navigation with Generous Breathing Room */}
        <div className="flex items-center space-x-6 lg:space-x-8">
          <BrokerLensLogo size="sm" href="/" animated={true} />

          {/* Primary Nav Links */}
          <nav className="hidden md:flex items-center space-x-1">
            <Link
              href="/shipments"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                isNavActive("/shipments") && !pathname.includes("/new")
                  ? "bg-slate-100 text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <Layers className="h-3.5 w-3.5" />
              <span>Shipments</span>
            </Link>

            <Link
              href="/shipments/new"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                pathname === "/shipments/new"
                  ? "bg-slate-100 text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <UploadCloud className="h-3.5 w-3.5" />
              <span>New Upload</span>
            </Link>

            <Link
              href="/analytics"
              className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                pathname === "/analytics"
                  ? "bg-slate-100 text-slate-900 font-semibold shadow-2xs"
                  : "text-slate-600 hover:bg-slate-50 hover:text-slate-900"
              }`}
            >
              <BarChart3 className="h-3.5 w-3.5" />
              <span>Accuracy & Audit</span>
            </Link>
          </nav>
        </div>

        {/* Right: Consolidated Operational Controls Toolbar */}
        <div className="flex items-center gap-2 sm:gap-2.5">
          {/* DPDP Act 2023 Masking Toggle Pill */}
          <button
            onClick={toggleMaskPii}
            title="Toggle DPDP Act 2023 Importer Contact & IEC Masking"
            className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs font-medium transition-all shadow-2xs ${
              maskPii
                ? "border-emerald-300 bg-emerald-50/90 text-emerald-800"
                : "border-slate-200/80 bg-white text-slate-700 hover:bg-slate-50"
            }`}
          >
            {maskPii ? (
              <>
                <ShieldCheck className="h-3.5 w-3.5 text-emerald-600" />
                <span className="hidden sm:inline">DPDP Masked</span>
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

          {/* 1-Click Role Switcher Segmented Control */}
          <div className="flex items-center rounded-lg border border-slate-200/80 bg-slate-100/70 p-0.5 text-xs font-medium shadow-2xs">
            <button
              onClick={() => switchDemoRole("DOCUMENTATION_EXECUTIVE")}
              disabled={isLoading}
              title="Documentation Executive Role (Upload, Confirm & Sync)"
              className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 transition-all ${
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
              title="Documentation Manager Role (Sign-Off & Analytics Override)"
              className={`flex items-center gap-1 rounded-md px-2.5 py-0.5 transition-all ${
                user?.role === "DOCUMENTATION_MANAGER"
                  ? "bg-white text-slate-900 shadow-xs font-semibold"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              <span className="hidden lg:inline">Priya (Mgr)</span>
              <span className="lg:hidden">Mgr</span>
            </button>
          </div>

          {/* 1-Click Demo Reset Button with Subtle Outline Styling */}
          <button
            onClick={handleResetDemo}
            disabled={isResetting}
            title="Reset SHP-24811..24814 and audit logs to initial seed baseline"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-600 hover:bg-slate-50 hover:text-slate-900 hover:border-slate-300 transition-all shadow-2xs disabled:opacity-50"
          >
            <RotateCcw className={`h-3.5 w-3.5 ${isResetting ? "animate-spin text-emerald-600" : "text-slate-400"}`} />
            <span className="hidden sm:inline">Reset Demo</span>
          </button>

          {/* Account Profile / Switch Portal Link */}
          <Link
            href="/login"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:border-slate-300 transition-all shadow-2xs"
            title="Switch credentials or view login details"
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
