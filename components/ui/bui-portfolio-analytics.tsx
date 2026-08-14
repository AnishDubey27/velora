"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { ShieldCheck, TrendingUp, AlertTriangle, Activity, PieChart, BarChart2, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type PortfolioRiskMetrics = {
  totalValue: number;
  dailyReturnPercent: number;
  sharpeRatio?: number;
  valueAtRisk95?: number; // e.g. 2.8% VaR
  maxHistoricalDrawdown?: number; // e.g. 14.2%
  betaVsSP500?: number; // e.g. 1.15
  sectorAllocation: { sector: string; percentage: number; color: string }[];
  monteCarloProjections?: { year: string; pessimistic: number; expected: number; optimistic: number }[];
};

const DEFAULT_PORTFOLIO_RISK: PortfolioRiskMetrics = {
  totalValue: 48250,
  dailyReturnPercent: 1.84,
  sharpeRatio: 2.14,
  valueAtRisk95: 2.85,
  maxHistoricalDrawdown: 12.4,
  betaVsSP500: 1.12,
  sectorAllocation: [
    { sector: "Semiconductors & AI", percentage: 42, color: "#00CED1" },
    { sector: "Mega-Cap Tech", percentage: 28, color: "#3B82F6" },
    { sector: "Digital Assets / Crypto", percentage: 18, color: "#8B5CF6" },
    { sector: "Cash & Defensives", percentage: 12, color: "#10B981" },
  ],
  monteCarloProjections: [
    { year: "Year 1", pessimistic: 44000, expected: 56500, optimistic: 68000 },
    { year: "Year 2", pessimistic: 49000, expected: 67800, optimistic: 89000 },
    { year: "Year 3", pessimistic: 55000, expected: 82000, optimistic: 118000 },
  ],
};

export function BuiPortfolioAnalytics({
  metrics = DEFAULT_PORTFOLIO_RISK,
}: {
  metrics?: PortfolioRiskMetrics;
}) {
  const [activeTab, setActiveTab] = useState<"risk" | "monteCarlo">("risk");

  return (
    <div className="rounded-2xl border border-white/10 bg-[#091122]/90 p-5 backdrop-blur-xl shadow-2xl space-y-5">
      {/* Header with Tab Switcher */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-white/10">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-lg bg-vel-teal/20 flex items-center justify-center">
            <Activity size={16} className="text-vel-teal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Portfolio Institutional Analytics</h3>
            <p className="text-[11px] text-white/50">Stress testing, VaR risk & Monte Carlo modeling</p>
          </div>
        </div>

        <div className="flex items-center gap-1 bg-white/5 p-1 rounded-xl border border-white/10">
          <button
            onClick={() => setActiveTab("risk")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition",
              activeTab === "risk"
                ? "bg-vel-teal/20 text-vel-teal border border-vel-teal/40"
                : "text-white/60 hover:text-white"
            )}
          >
            Risk Barometer
          </button>
          <button
            onClick={() => setActiveTab("monteCarlo")}
            className={cn(
              "px-3 py-1 rounded-lg text-xs font-semibold transition",
              activeTab === "monteCarlo"
                ? "bg-vel-teal/20 text-vel-teal border border-vel-teal/40"
                : "text-white/60 hover:text-white"
            )}
          >
            Monte Carlo 3Y
          </button>
        </div>
      </div>

      {activeTab === "risk" ? (
        <div className="space-y-4">
          {/* Institutional Metric Gauges Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block">Sharpe Ratio</span>
              <span className="text-base font-bold text-emerald-400 font-mono block mt-0.5">
                {metrics.sharpeRatio ?? 2.14}
              </span>
              <span className="text-[10px] text-white/40">Risk-Adjusted Return</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block">Value at Risk (95% VaR)</span>
              <span className="text-base font-bold text-amber-400 font-mono block mt-0.5">
                -{metrics.valueAtRisk95 ?? 2.85}%
              </span>
              <span className="text-[10px] text-white/40">1-Day Max Expected Loss</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block">Beta vs S&P 500</span>
              <span className="text-base font-bold text-teal-300 font-mono block mt-0.5">
                {metrics.betaVsSP500 ?? 1.12}x
              </span>
              <span className="text-[10px] text-white/40">Market Correlation</span>
            </div>

            <div className="p-3.5 rounded-xl bg-white/[0.03] border border-white/10">
              <span className="text-[11px] text-white/50 block">Max Drawdown</span>
              <span className="text-base font-bold text-rose-400 font-mono block mt-0.5">
                -{metrics.maxHistoricalDrawdown ?? 12.4}%
              </span>
              <span className="text-[10px] text-white/40">Peak-to-Trough Loss</span>
            </div>
          </div>

          {/* Sector Risk Distribution Bar */}
          <div>
            <div className="flex items-center justify-between text-xs mb-2">
              <span className="font-semibold text-white/90">Sector Risk Exposure Matrix</span>
              <span className="text-white/50">100% Calibrated</span>
            </div>

            {/* Segmented Bar */}
            <div className="flex h-3.5 w-full rounded-full overflow-hidden gap-0.5 bg-white/5 p-0.5 border border-white/10">
              {metrics.sectorAllocation.map((item, idx) => (
                <div
                  key={idx}
                  style={{ width: `${item.percentage}%`, backgroundColor: item.color }}
                  className="h-full rounded-sm transition-all duration-500"
                  title={`${item.sector}: ${item.percentage}%`}
                />
              ))}
            </div>

            {/* Legend Chips */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-2 mt-3">
              {metrics.sectorAllocation.map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 text-xs">
                  <span className="h-2 w-2 rounded-full flex-none" style={{ backgroundColor: item.color }} />
                  <span className="text-white/70 truncate">{item.sector}</span>
                  <span className="font-mono font-bold text-white ml-auto">{item.percentage}%</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Monte Carlo Projections View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white/90">
              1,000 Iteration Monte Carlo Simulation (95% CI)
            </span>
            <span className="text-[11px] text-teal-400 font-mono">Expected CAGR: +19.3%</span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {metrics.monteCarloProjections?.map((proj, idx) => (
              <div key={idx} className="p-4 rounded-xl bg-white/[0.03] border border-white/10 space-y-2">
                <div className="flex items-center justify-between border-b border-white/10 pb-1.5">
                  <span className="text-xs font-bold text-white uppercase tracking-wider">{proj.year}</span>
                  <span className="text-[11px] font-mono text-emerald-400 font-semibold">
                    ${proj.expected.toLocaleString()}
                  </span>
                </div>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between text-white/50">
                    <span>Optimistic (Top 5%)</span>
                    <span className="font-mono text-emerald-300 font-medium">${proj.optimistic.toLocaleString()}</span>
                  </div>
                  <div className="flex justify-between text-white/50">
                    <span>Pessimistic (Bottom 5%)</span>
                    <span className="font-mono text-rose-300 font-medium">${proj.pessimistic.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
