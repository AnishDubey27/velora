"use client";

import { Award, ArrowUpRight, ShieldCheck, Plus, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

type BuiRecommendationCardProps = {
  ticker?: string;
  score?: number; // out of 10
  bias?: "Bullish" | "Bearish" | "Neutral";
  targetPrice?: string;
  catalysts?: string[];
  onAction?: (action: string) => void;
  className?: string;
};

export function BuiRecommendationCard({
  ticker = "NVDA",
  score = 8.8,
  bias = "Bullish",
  targetPrice = "$145.00 (+18.2%)",
  catalysts = ["SpaceX AI Datacenter Supply Win", "Blackwell B200 Margin Expansion"],
  onAction,
  className,
}: BuiRecommendationCardProps) {
  const isBullish = bias === "Bullish";

  return (
    <div className={cn("my-4 rounded-2xl border border-white/15 bg-gradient-to-br from-[#0A1224] via-[#080D1A] to-[#040710] p-4.5 shadow-2xl backdrop-blur-xl", className)}>
      {/* Card Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
        <div className="flex items-center gap-2.5">
          <div className="h-8 w-8 rounded-xl bg-vel-teal/20 flex items-center justify-center border border-vel-teal/30">
            <Award size={18} className="text-vel-teal" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-extrabold text-white tracking-wide">{ticker}</span>
              <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                {bias}
              </span>
            </div>
            <p className="text-[11px] text-white/50">Beautiful UI Trade Conviction</p>
          </div>
        </div>

        {/* Conviction Score Gauge */}
        <div className="text-right">
          <div className="flex items-baseline gap-1">
            <span className="text-lg md:text-xl font-extrabold font-mono text-cyan-300">{score}</span>
            <span className="text-xs text-white/40 font-mono">/10</span>
          </div>
          <span className="text-[10px] font-semibold uppercase text-emerald-400 tracking-wider">
            High Conviction
          </span>
        </div>
      </div>

      {/* Target Level */}
      <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 mb-3 flex items-center justify-between">
        <span className="text-xs text-white/60 font-medium">Price Target</span>
        <span className="text-sm font-bold font-mono text-emerald-300 flex items-center gap-1">
          {targetPrice} <ArrowUpRight size={14} />
        </span>
      </div>

      {/* Catalysts List */}
      <div className="space-y-1.5 mb-3.5">
        <span className="text-[11px] font-semibold text-white/50 uppercase tracking-wider block">Key Catalysts:</span>
        {catalysts.map((cat, idx) => (
          <div key={idx} className="flex items-start gap-2 text-xs text-white/85">
            <Sparkles size={12} className="text-cyan-400 mt-0.5 shrink-0" />
            <span>{cat}</span>
          </div>
        ))}
      </div>

      {/* Action CTA Buttons */}
      <div className="flex flex-wrap gap-2 pt-2 border-t border-white/10">
        <button
          type="button"
          onClick={() => onAction && onAction("watchlist")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-vel-teal/20 border border-vel-teal/40 text-xs font-semibold text-teal-300 hover:bg-vel-teal/30 transition cursor-pointer"
        >
          <Plus size={13} /> Add to Watchlist
        </button>
        <button
          type="button"
          onClick={() => onAction && onAction("risk")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-medium text-white/80 hover:bg-white/10 transition cursor-pointer"
        >
          <ShieldCheck size={13} className="text-amber-400" /> Risk Radar
        </button>
      </div>
    </div>
  );
}
