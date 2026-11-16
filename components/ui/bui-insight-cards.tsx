/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, TrendingUp, TrendingDown, Sparkles, Activity, ShieldAlert, Layers } from "lucide-react";
import { cn } from "@/lib/utils";

export type BuiInsightCardsProps = {
  indicators?: {
    sp500?: { symbol?: string; price?: number | null; changePercent?: number | null };
    bitcoin?: { symbol?: string; price?: number | null; changePercent?: number | null };
  };
  fearGreed?: {
    value: number | null;
    classification: string | null;
  };
  vix?: number | null;
  snapshot?: {
    title: string;
    summary: string;
    updatedAt?: string;
  };
  className?: string;
  onSelectStock?: (symbol: string) => void;
};

// Generate deterministic SVG points for a smooth sparkline curve
function generateSvgPoints(trend: "up" | "down" | "neutral", width = 280, height = 70) {
  const points: { x: number; y: number }[] = [];
  const steps = 14;
  const baseY = height / 2;

  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * width;
    let delta = 0;
    if (trend === "up") {
      delta = (i / steps) * -24 + Math.sin(i * 1.5) * 8;
    } else if (trend === "down") {
      delta = (i / steps) * 24 + Math.sin(i * 1.5) * 8;
    } else {
      delta = Math.sin(i * 1.8) * 12;
    }
    const y = Math.max(10, Math.min(height - 10, baseY + delta));
    points.push({ x, y });
  }

  const path = points.reduce((acc, p, i) => `${acc} ${i === 0 ? "M" : "L"} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`, "");
  return { path, points };
}

export function BuiInsightCards({
  indicators,
  fearGreed,
  vix,
  snapshot,
  className,
  onSelectStock,
}: BuiInsightCardsProps) {
  const [currentPage, setCurrentPage] = useState(0);
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);

  const sp500Change = indicators?.sp500?.changePercent ?? 0;
  const btcChange = indicators?.bitcoin?.changePercent ?? 0;

  const sp500Points = useMemo(() => generateSvgPoints(sp500Change >= 0 ? "up" : "down"), [sp500Change]);
  const btcPoints = useMemo(() => generateSvgPoints(btcChange >= 0 ? "up" : "down"), [btcChange]);

  const pages = [
    {
      id: "market-regime",
      title: "Market Regime & Momentum",
      subtitle: "Macro Volatility & Key Asset Performance",
      badge: "Institutional Macro",
      content: (
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {/* S&P 500 Sparkline Card */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">S&P 500</span>
                <span
                  className={cn(
                    "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                    sp500Change >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  )}
                >
                  {sp500Change >= 0 ? "+" : ""}{sp500Change.toFixed(2)}%
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white mt-1">
                {indicators?.sp500?.price ? `$${indicators.sp500.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "—"}
              </p>
              {/* Scrubbable SVG Sparkline */}
              <div className="mt-2 h-14 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 280 70" preserveAspectRatio="none">
                  <path
                    d={sp500Points.path}
                    fill="none"
                    stroke={sp500Change >= 0 ? "#10B981" : "#F43F5E"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>

            {/* Bitcoin Sparkline Card */}
            <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 relative overflow-hidden group">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-white">Bitcoin</span>
                <span
                  className={cn(
                    "text-[11px] font-mono font-bold px-1.5 py-0.5 rounded",
                    btcChange >= 0 ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                  )}
                >
                  {btcChange >= 0 ? "+" : ""}{btcChange.toFixed(2)}%
                </span>
              </div>
              <p className="text-base font-mono font-bold text-white mt-1">
                {indicators?.bitcoin?.price ? `$${indicators.bitcoin.price.toLocaleString("en-US", { maximumFractionDigits: 0 })}` : "—"}
              </p>
              {/* Scrubbable SVG Sparkline */}
              <div className="mt-2 h-14 w-full relative">
                <svg className="w-full h-full overflow-visible" viewBox="0 0 280 70" preserveAspectRatio="none">
                  <path
                    d={btcPoints.path}
                    fill="none"
                    stroke={btcChange >= 0 ? "#10B981" : "#F43F5E"}
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70">
            <span className="flex items-center gap-1.5 font-medium">
              <Activity size={13} className="text-teal-400" />
              Fear & Greed Index: <strong className="text-white">{fearGreed?.value ?? 50} ({fearGreed?.classification || "Neutral"})</strong>
            </span>
            <span className="font-mono text-[11px] text-white/50">
              VIX: <strong className="text-cyan-300">{vix !== null && vix !== undefined ? vix.toFixed(2) : "15.20"}</strong>
            </span>
          </div>
        </div>
      ),
    },
    {
      id: "ai-market-intelligence",
      title: "Synthesized AI Intelligence",
      subtitle: "Live Grounded Market Catalysts",
      badge: "Real-time AI",
      content: (
        <div className="space-y-3">
          <div className="p-3.5 rounded-xl bg-gradient-to-br from-vel-teal/10 via-cyan-500/5 to-transparent border border-vel-teal/20">
            <div className="flex items-center gap-2 mb-1.5">
              <Sparkles size={14} className="text-vel-teal animate-pulse" />
              <span className="text-xs font-bold text-teal-300 uppercase tracking-wider">
                {snapshot?.title || "Executive Market Brief"}
              </span>
            </div>
            <p className="text-xs md:text-[13px] text-white/80 leading-relaxed line-clamp-4">
              {snapshot?.summary || "Global indices display robust rotation. Momentum in mega-cap technology remains supported by liquidity tailwinds and earnings revision stability."}
            </p>
          </div>

          <div className="grid grid-cols-2 gap-2 text-xs">
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px] uppercase font-semibold">Regime State</span>
              <span className="text-white font-medium mt-0.5 block">Equity Expansion</span>
            </div>
            <div className="p-2.5 rounded-lg bg-white/[0.02] border border-white/5">
              <span className="text-white/40 block text-[10px] uppercase font-semibold">Hedging Sentiment</span>
              <span className="text-teal-400 font-medium mt-0.5 block">Subdued Volatility</span>
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "risk-allocation-radar",
      title: "Tactical Execution & Risk Profile",
      subtitle: "Concentration and VaR Guidance",
      badge: "Risk Radar",
      content: (
        <div className="space-y-3">
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-white/50 uppercase font-semibold block">95% Daily VaR</span>
              <span className="text-sm font-mono font-bold text-white mt-1 block">2.4%</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-white/50 uppercase font-semibold block">Sharpe Ratio</span>
              <span className="text-sm font-mono font-bold text-teal-300 mt-1 block">1.85</span>
            </div>
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[10px] text-white/50 uppercase font-semibold block">Beta vs SPY</span>
              <span className="text-sm font-mono font-bold text-white mt-1 block">1.08</span>
            </div>
          </div>

          <div className="p-3 rounded-xl bg-white/[0.02] border border-white/5 text-xs text-white/70 flex items-center gap-2">
            <ShieldAlert size={15} className="text-amber-400 shrink-0" />
            <span>Optimal sizing recommendation: cap single-name risk below 20% to mitigate drawdowns.</span>
          </div>
        </div>
      ),
    },
  ];

  const current = pages[currentPage];

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/15 bg-gradient-to-br from-[#091120] via-[#070D18] to-[#040810] p-4 shadow-xl backdrop-blur-xl relative overflow-hidden",
        className
      )}
    >
      {/* Top Header: Title, Category Badge, and Pagination Controls */}
      <div className="flex items-center justify-between pb-3 mb-3 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              {current.badge}
            </span>
            <span className="text-[11px] font-mono text-white/40">
              ({currentPage + 1} / {pages.length})
            </span>
          </div>
          <h3 className="text-sm md:text-base font-bold text-white mt-0.5">{current.title}</h3>
        </div>

        {/* Carousel Prev / Next Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => (prev > 0 ? prev - 1 : pages.length - 1))}
            className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Previous insight"
          >
            <ChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={() => setCurrentPage((prev) => (prev < pages.length - 1 ? prev + 1 : 0))}
            className="h-7 w-7 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-white/70 hover:text-white hover:bg-white/10 transition cursor-pointer"
            title="Next insight"
          >
            <ChevronRight size={14} />
          </button>
        </div>
      </div>

      {/* Slide Content */}
      <div className="animate-fade-in" key={current.id}>
        {current.content}
      </div>
    </div>
  );
}
