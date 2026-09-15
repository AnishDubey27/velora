"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { Zap, TrendingUp, TrendingDown, Target, ShieldAlert, Sparkles, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";
import type { StockQuote, StockProfile } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StockAiSetupCard({
  symbol,
  quote,
  profile,
  onStartChat,
}: {
  symbol: string;
  quote?: StockQuote;
  profile?: StockProfile;
  onStartChat?: (prompt: string) => void;
}) {
  const currentPrice = quote?.price ?? 0;

  const { data: signalData } = useSWR(
    symbol ? `/api/dashboard/signals?symbol=${encodeURIComponent(symbol)}` : null,
    fetcher,
    { revalidateOnFocus: false }
  );

  const priceTarget = signalData?.priceTarget;
  const recs = signalData?.recommendations;

  // Real targets from Wall Street consensus
  const targetPrice = typeof priceTarget?.mean === "number" && priceTarget.mean > 0
    ? priceTarget.mean
    : typeof priceTarget?.median === "number" && priceTarget.median > 0
    ? priceTarget.median
    : null;

  const upsidePercent = priceTarget?.upsidePercent != null
    ? `${priceTarget.upsidePercent >= 0 ? "+" : ""}${priceTarget.upsidePercent.toFixed(1)}%`
    : null;

  // Support / stop-loss based on analyst low target or 52W support
  const stopLoss = typeof priceTarget?.low === "number" && priceTarget.low > 0 && priceTarget.low < currentPrice
    ? priceTarget.low
    : currentPrice > 0
    ? currentPrice * 0.92
    : null;

  const downsidePercent = stopLoss && currentPrice > 0
    ? `${(((stopLoss - currentPrice) / currentPrice) * 100).toFixed(1)}%`
    : null;

  // Real conviction calculation from analyst recommendation breakdown
  const strongBuy = recs?.strongBuy || 0;
  const buy = recs?.buy || 0;
  const hold = recs?.hold || 0;
  const sell = recs?.sell || 0;
  const strongSell = recs?.strongSell || 0;
  const totalRecs = strongBuy + buy + hold + sell + strongSell;

  const convictionScore = totalRecs > 0
    ? Number((((strongBuy * 5 + buy * 4 + hold * 3 + sell * 2 + strongSell * 1) / (totalRecs * 5)) * 10).toFixed(1))
    : 7.0;

  const convictionLabel = totalRecs > 0
    ? convictionScore >= 8.0
      ? "Strong Buy Consensus"
      : convictionScore >= 6.5
      ? "Buy Consensus"
      : convictionScore >= 4.5
      ? "Hold Consensus"
      : "Underperform Consensus"
    : "Live Strategic Setup";

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="relative group rounded-2xl border border-vel-teal/40 bg-gradient-to-br from-[#0B1728]/95 via-[#08101E]/90 to-[#05080F] p-4 shadow-xl backdrop-blur-xl overflow-hidden my-2"
    >
      {/* Ambient Glow */}
      <div className="absolute -top-12 -right-12 w-36 h-36 bg-vel-teal/15 rounded-full blur-2xl pointer-events-none" />

      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5 mb-3">
        <div className="flex items-center gap-2">
          <div className="h-6 w-6 rounded-md bg-vel-teal/20 flex items-center justify-center">
            <Zap size={13} className="text-vel-teal" />
          </div>
          <div>
            <span className="text-xs font-bold text-white uppercase tracking-wider block">
              Velora AI Strategic Setup
            </span>
          </div>
        </div>

        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">
          {convictionScore}/10 {convictionLabel}
        </span>
      </div>

      {/* 3-Pillar Trade Parameters */}
      <div className="grid grid-cols-3 gap-2 text-center mb-3.5">
        <div className="p-2.5 rounded-xl bg-white/[0.04] border border-white/10">
          <span className="text-[10px] text-white/50 block font-medium">Accumulation Zone</span>
          <span className="text-xs md:text-sm font-bold text-white font-mono block mt-0.5">
            {currentPrice > 0 ? `$${currentPrice.toFixed(2)}` : "—"}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
          <span className="text-[10px] text-emerald-400/80 block font-medium flex items-center justify-center gap-0.5">
            Target <TrendingUp size={10} />
          </span>
          <span className="text-xs md:text-sm font-bold text-emerald-400 font-mono block mt-0.5">
            {targetPrice ? `$${targetPrice.toFixed(2)}` : "—"} {upsidePercent && <span className="text-[10px] opacity-80">({upsidePercent})</span>}
          </span>
        </div>

        <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/20">
          <span className="text-[10px] text-rose-400/80 block font-medium flex items-center justify-center gap-0.5">
            Stop Loss <TrendingDown size={10} />
          </span>
          <span className="text-xs md:text-sm font-bold text-rose-400 font-mono block mt-0.5">
            {stopLoss ? `$${stopLoss.toFixed(2)}` : "—"} {downsidePercent && <span className="text-[10px] opacity-80">({downsidePercent})</span>}
          </span>
        </div>
      </div>

      {/* CTA Button */}
      {onStartChat && (
        <button
          onClick={() =>
            onStartChat(
              `Provide a quantitative deep-dive strategy on ${symbol} (${profile?.companyName || symbol}). Include risk/reward profile, upcoming earnings catalysts, key technical support/resistance levels, and recommended position sizing.`
            )
          }
          className="w-full py-2 px-3 rounded-xl bg-vel-teal/15 hover:bg-vel-teal/25 border border-vel-teal/40 text-xs font-semibold text-vel-teal flex items-center justify-center gap-1.5 transition active:scale-[0.99]"
        >
          <Sparkles size={13} />
          <span>Ask Velora AI Full Position Analysis</span>
          <ArrowRight size={13} />
        </button>
      )}
    </motion.div>
  );
}
