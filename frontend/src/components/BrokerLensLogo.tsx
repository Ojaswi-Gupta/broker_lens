"use client";

import React from "react";
import Link from "next/link";

export interface BrokerLensLogoProps {
  size?: "sm" | "md" | "lg" | "hero";
  animated?: boolean;
  showSubtitle?: boolean;
  variant?: "dark" | "light"; // "dark" = for light background (slate-900 text), "light" = for dark background (white text)
  className?: string;
  href?: string;
}

export function BrokerLensLogo({
  size = "md",
  animated = false,
  showSubtitle = false,
  variant = "dark",
  className = "",
  href,
}: BrokerLensLogoProps) {
  // Sizing definitions
  const dimensions = {
    sm: { icon: 30, text: "text-sm", badge: "text-[11px] px-1.5 py-0.5", sub: "text-[9px]" },
    md: { icon: 40, text: "text-lg", badge: "text-xs px-2 py-0.5", sub: "text-[10px]" },
    lg: { icon: 54, text: "text-2xl", badge: "text-sm px-2.5 py-1", sub: "text-xs" },
    hero: { icon: 84, text: "text-4xl md:text-5xl", badge: "text-lg md:text-xl px-3 py-1", sub: "text-xs md:text-sm" },
  }[size];

  const isLight = variant === "light";

  const content = (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* Precision Customs-Scanner SVG Emblem */}
      <div
        className="relative flex items-center justify-center shrink-0"
        style={{ width: dimensions.icon, height: dimensions.icon }}
      >
        <svg
          viewBox="0 0 80 80"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="w-full h-full drop-shadow-sm"
        >
          <defs>
            {/* Linear gradients for documents & laser */}
            <linearGradient id="laserGrad" x1="0%" y1="0%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#10B981" stopOpacity="0.1" />
              <stop offset="30%" stopColor="#34D399" stopOpacity="0.8" />
              <stop offset="50%" stopColor="#6EE7B7" stopOpacity="1" />
              <stop offset="70%" stopColor="#34D399" stopOpacity="0.8" />
              <stop offset="100%" stopColor="#10B981" stopOpacity="0.1" />
            </linearGradient>

            <linearGradient id="doc1Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? "#1E293B" : "#F1F5F9"} />
              <stop offset="100%" stopColor={isLight ? "#0F172A" : "#E2E8F0"} />
            </linearGradient>
            <linearGradient id="doc2Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? "#334155" : "#FFFFFF"} />
              <stop offset="100%" stopColor={isLight ? "#1E293B" : "#F8FAFC"} />
            </linearGradient>
            <linearGradient id="doc3Grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={isLight ? "#0F172A" : "#FFFFFF"} />
              <stop offset="100%" stopColor={isLight ? "#020617" : "#F1F5F9"} />
            </linearGradient>

            {/* Glowing laser filter */}
            <filter id="laserGlow" x="-20%" y="-100%" width="140%" height="300%">
              <feGaussianBlur stdDeviation="1.5" result="glow" />
              <feMerge>
                <feMergeNode in="glow" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Optical Targeting Corner Brackets (Reticle) */}
          <path
            d="M 6,18 L 6,6 L 18,6"
            stroke={isLight ? "#38BDF8" : "#0284C7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? "animate-pulse" : ""}
          />
          <path
            d="M 62,6 L 74,6 L 74,18"
            stroke={isLight ? "#38BDF8" : "#0284C7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? "animate-pulse" : ""}
          />
          <path
            d="M 6,62 L 6,74 L 18,74"
            stroke={isLight ? "#38BDF8" : "#0284C7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? "animate-pulse" : ""}
          />
          <path
            d="M 62,74 L 74,74 L 74,62"
            stroke={isLight ? "#38BDF8" : "#0284C7"}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
            className={animated ? "animate-pulse" : ""}
          />

          {/* Subdued Central Reticle Ring */}
          <circle
            cx="40"
            cy="40"
            r="35"
            stroke={isLight ? "rgba(255,255,255,0.08)" : "rgba(15,23,42,0.06)"}
            strokeWidth="1"
            strokeDasharray="3 3"
          />

          {/* Layer 1: Back Document (Ocean Bill of Lading - Maritime Indigo) */}
          <g transform="translate(12, 10)">
            <rect
              x="0"
              y="0"
              width="36"
              height="48"
              rx="3"
              fill="url(#doc1Grad)"
              stroke={isLight ? "#475569" : "#CBD5E1"}
              strokeWidth="1.2"
            />
            {/* BoL Header Lines */}
            <line x1="6" y1="8" x2="22" y2="8" stroke="#3B82F6" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="14" x2="30" y2="14" stroke={isLight ? "#64748B" : "#94A3B8"} strokeWidth="1" />
            <line x1="6" y1="18" x2="26" y2="18" stroke={isLight ? "#64748B" : "#94A3B8"} strokeWidth="1" />
          </g>

          {/* Layer 2: Middle Document (Packing List - Amber Cargo Accent) */}
          <g transform="translate(22, 16)">
            <rect
              x="0"
              y="0"
              width="36"
              height="48"
              rx="3"
              fill="url(#doc2Grad)"
              stroke={isLight ? "#64748B" : "#94A3B8"}
              strokeWidth="1.2"
            />
            {/* Packing List Header & Rows */}
            <line x1="6" y1="8" x2="24" y2="8" stroke="#F59E0B" strokeWidth="1.5" strokeLinecap="round" />
            <line x1="6" y1="14" x2="30" y2="14" stroke={isLight ? "#94A3B8" : "#CBD5E1"} strokeWidth="1" />
            <line x1="6" y1="18" x2="24" y2="18" stroke={isLight ? "#94A3B8" : "#CBD5E1"} strokeWidth="1" />
            <line x1="6" y1="22" x2="28" y2="22" stroke={isLight ? "#94A3B8" : "#CBD5E1"} strokeWidth="1" />
          </g>

          {/* Layer 3: Front Document (Commercial Invoice - High Precision Emerald Accent) */}
          <g transform="translate(32, 22)">
            <rect
              x="0"
              y="0"
              width="36"
              height="48"
              rx="3"
              fill="url(#doc3Grad)"
              stroke={isLight ? "#10B981" : "#059669"}
              strokeWidth="1.5"
            />
            {/* Commercial Invoice Header & Table Grid */}
            <line x1="6" y1="8" x2="20" y2="8" stroke="#10B981" strokeWidth="1.8" strokeLinecap="round" />
            <line x1="6" y1="14" x2="30" y2="14" stroke={isLight ? "#CBD5E1" : "#475569"} strokeWidth="1.2" />
            <line x1="6" y1="19" x2="30" y2="19" stroke={isLight ? "#64748B" : "#94A3B8"} strokeWidth="1" />
            <line x1="6" y1="23" x2="25" y2="23" stroke={isLight ? "#64748B" : "#94A3B8"} strokeWidth="1" />
            {/* Verified Stamp Pip */}
            <circle cx="28" cy="38" r="3.5" fill="#10B981" />
            <path d="M 26.5,38 L 27.5,39.2 L 29.5,36.8" stroke="#FFFFFF" strokeWidth="0.9" strokeLinecap="round" strokeLinejoin="round" />
          </g>

          {/* Dynamic Laser Scanline Sweeping Across Document Planes */}
          <g className={animated ? "animate-scan-beam" : ""}>
            <line
              x1="8"
              y1="36"
              x2="72"
              y2="36"
              stroke="url(#laserGrad)"
              strokeWidth="2.5"
              filter="url(#laserGlow)"
            />
            <circle cx="40" cy="36" r="2" fill="#6EE7B7" filter="url(#laserGlow)" />
          </g>
        </svg>
      </div>

      {/* Wordmark Typography & Technical Badge */}
      <div className="flex flex-col">
        <div className="flex items-center gap-1.5 leading-none">
          <span
            className={`font-extrabold tracking-tight ${dimensions.text} ${
              isLight ? "text-white" : "text-slate-900"
            }`}
          >
            BROKER
          </span>
          <span
            className={`font-mono font-bold tracking-tight rounded-md border ${dimensions.badge} ${
              isLight
                ? "bg-emerald-950/80 text-emerald-400 border-emerald-700/60 shadow-[0_0_12px_rgba(16,185,129,0.3)]"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            }`}
          >
            LENS
          </span>
        </div>

        {showSubtitle && (
          <div
            className={`mt-1 font-mono font-medium tracking-wider uppercase ${dimensions.sub} ${
              isLight ? "text-slate-400" : "text-slate-500"
            }`}
          >
            NHAVA SHEVA (INNSA) • 3-WAY AI CUSTOMS WORKBENCH
          </div>
        )}
      </div>
    </div>
  );

  if (href) {
    return (
      <Link href={href} className="group inline-flex items-center focus:outline-none">
        {content}
      </Link>
    );
  }

  return content;
}
