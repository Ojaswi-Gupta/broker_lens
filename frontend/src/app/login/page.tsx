"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useApp } from "@/context/AppContext";
import { UserRole } from "@/types";
import {
  ShieldCheck,
  UserCheck,
  Lock,
  Mail,
  ArrowRight,
  Server,
  FileCheck2,
  AlertCircle,
  Building2,
} from "lucide-react";

export default function LoginPage() {
  const router = useRouter();
  const { loginWithCredentials, switchDemoRole } = useApp();

  const [email, setEmail] = useState("exec@companya-cha.in");
  const [password, setPassword] = useState("DemoExec!2026");
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleStandardLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setLoading(true);
    try {
      await loginWithCredentials(email, password);
      router.push("/shipments");
    } catch (err: any) {
      setErrorMsg(err.message || "Invalid credentials. Please verify email and password.");
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (role: UserRole) => {
    setErrorMsg(null);
    setLoading(true);
    try {
      await switchDemoRole(role);
      router.push("/shipments");
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to authenticate demo account.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-[calc(100vh-3.5rem)] flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-50">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        {/* Header Badge */}
        <div className="flex justify-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-900 text-white font-mono font-bold text-xl shadow-xs">
            BL
          </div>
        </div>
        <h2 className="mt-4 text-center text-xl font-bold tracking-tight text-slate-900">
          BrokerLens CHA Portal
        </h2>
        <p className="mt-1 text-center text-xs text-slate-500">
          Company A • Nhava Sheva Customs Documentation & 3-Way Cross-Check
        </p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        <div className="rounded-xl border border-slate-200/80 bg-white p-6 sm:p-8 shadow-xs space-y-6">
          {/* 1-CLICK EVALUATOR QUICK LOGIN SECTION */}
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                1-Click Evaluator Fast-Track
              </span>
              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[10px] font-medium text-emerald-700 border border-emerald-200">
                No Password Needed
              </span>
            </div>

            <div className="mt-3 grid grid-cols-1 gap-2.5">
              {/* Option 1: Executive */}
              <button
                type="button"
                onClick={() => handleQuickLogin("DOCUMENTATION_EXECUTIVE")}
                disabled={loading}
                className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-left transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 group-hover:border-slate-400">
                    <UserCheck className="h-4 w-4" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Rohan Deshmukh
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Documentation Executive • Primary Reviewer
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>

              {/* Option 2: Manager */}
              <button
                type="button"
                onClick={() => handleQuickLogin("DOCUMENTATION_MANAGER")}
                disabled={loading}
                className="group flex w-full items-center justify-between rounded-lg border border-slate-200 bg-slate-50/50 p-3 text-left transition-all hover:border-slate-400 hover:bg-slate-50 active:scale-[0.99]"
              >
                <div className="flex items-center gap-3">
                  <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white border border-slate-200 text-slate-700 group-hover:border-slate-400">
                    <ShieldCheck className="h-4 w-4 text-emerald-600" />
                  </div>
                  <div>
                    <div className="text-xs font-semibold text-slate-900">
                      Priya Nair
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono">
                      Documentation Manager • Discrepancy Sign-Off
                    </div>
                  </div>
                </div>
                <ArrowRight className="h-4 w-4 text-slate-400 group-hover:translate-x-0.5 transition-transform" />
              </button>
            </div>
          </div>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <div className="w-full border-t border-slate-200" />
            </div>
            <div className="relative flex justify-center text-xs">
              <span className="bg-white px-2 text-slate-400 font-medium">
                Or Sign In with Email & Password
              </span>
            </div>
          </div>

          {/* STANDARD CREDENTIAL FORM */}
          <form onSubmit={handleStandardLogin} className="space-y-4">
            {errorMsg && (
              <div className="rounded-md border border-rose-200 bg-rose-50 p-3 text-xs text-rose-700 flex items-start gap-2">
                <AlertCircle className="h-4 w-4 text-rose-600 shrink-0 mt-0.5" />
                <span>{errorMsg}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-700">Email Address</label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Mail className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                  placeholder="exec@companya-cha.in"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-700">Password</label>
              <div className="mt-1 relative rounded-md shadow-xs">
                <div className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3">
                  <Lock className="h-4 w-4 text-slate-400" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="block w-full rounded-md border border-slate-300 py-2 pl-9 pr-3 text-xs text-slate-900 focus:border-slate-900 focus:outline-none focus:ring-1 focus:ring-slate-900 font-mono"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="flex w-full justify-center rounded-md bg-slate-900 py-2 px-4 text-xs font-semibold text-white shadow-xs hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-900 focus:ring-offset-2 disabled:opacity-50 transition-colors"
            >
              {loading ? "Authenticating..." : "Sign In to Workbench"}
            </button>
          </form>
        </div>

        {/* COMPLIANCE & SECURITY FOOTER */}
        <div className="mt-6 text-center space-y-2">
          <div className="flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[11px] text-slate-500">
            <span className="flex items-center gap-1">
              <Server className="h-3 w-3 text-slate-400" />
              AWS ap-south-1 (Mumbai)
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <FileCheck2 className="h-3 w-3 text-slate-400" />
              Zero AI Data Retention
            </span>
            <span>•</span>
            <span className="flex items-center gap-1">
              <ShieldCheck className="h-3 w-3 text-emerald-600" />
              DPDP Act 2023 Compliant
            </span>
          </div>
          <p className="text-[10px] text-slate-400 font-mono">
            Nhava Sheva Port (INNSA) Customs Clearance Station
          </p>
        </div>
      </div>
    </div>
  );
}
