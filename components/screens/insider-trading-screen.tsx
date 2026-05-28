"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, TrendingUp, TrendingDown, DollarSign, Calendar } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface InsiderTrade {
  symbol: string;
  name: string;
  transactionDate: string;
  filingDate: string;
  transactionCode: string;
  transactionPrice: number;
  change: number;
  share: number;
}

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function formatShares(num: number) {
  const abs = Math.abs(num);
  if (abs >= 1_000_000) return `${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${(abs / 1_000).toFixed(1)}K`;
  return abs.toLocaleString();
}

function SkeletonCard() {
  return (
    <div className="glassy rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div>
            <div className="h-5 w-16 rounded bg-white/10 mb-1.5" />
            <div className="h-3.5 w-28 rounded bg-white/10" />
          </div>
        </div>
        <div className="h-7 w-16 rounded-lg bg-white/10" />
      </div>
      <div className="flex gap-4 mt-3">
        <div className="h-4 w-24 rounded bg-white/10" />
        <div className="h-4 w-20 rounded bg-white/10" />
        <div className="h-4 w-28 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function InsiderTradingScreen({ onBack }: { onBack: () => void }) {
  const [trades, setTrades] = useState<InsiderTrade[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Scroll to top when this screen mounts
    const scrollContainer = document.querySelector('.app-scroll');
    if (scrollContainer) scrollContainer.scrollTop = 0;

    fetch("/api/signals/insider")
      .then((res) => res.json())
      .then((data) => {
        setTrades(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  return (
    <section className="min-h-screen bg-[#070A11] pb-24 pt-2">
      {/* Header */}
      <div className="flex items-center gap-3 mb-6 px-1">
        <button
          onClick={onBack}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <ArrowLeft size={22} className="text-white" />
        </button>
        <h1 className="text-xl font-black uppercase tracking-[0.1em] text-white">
          Insider Trading
        </h1>
      </div>

      {/* Section Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 px-1"
      >
        <h2 className="text-base font-semibold text-white/80">
          🏛️ Recent Insider Transactions
        </h2>
        <p className="text-xs text-white/40 mt-1">
          SEC Form 4 filings from top company executives
        </p>
      </motion.div>

      {/* Trade Cards */}
      <div className="space-y-3">
        {loading ? (
          <>
            {Array.from({ length: 5 }).map((_, i) => (
              <SkeletonCard key={i} />
            ))}
          </>
        ) : trades.length === 0 ? (
          <div className="py-16 text-center text-white/50">
            No insider trading data available
          </div>
        ) : (
          trades.map((trade, index) => {
            const isBuy = trade.transactionCode === "P" || trade.change > 0;

            return (
              <motion.div
                key={`${trade.symbol}-${trade.filingDate}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className="glassy rounded-2xl p-5"
              >
                {/* Top Row: Symbol + Name + Badge */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Symbol Icon */}
                    <div
                      className={cn(
                        "h-11 w-11 rounded-xl flex items-center justify-center text-sm font-bold",
                        isBuy
                          ? "bg-emerald-400/15 text-emerald-400"
                          : "bg-red-400/15 text-red-400"
                      )}
                    >
                      {isBuy ? (
                        <TrendingUp size={20} />
                      ) : (
                        <TrendingDown size={20} />
                      )}
                    </div>
                    <div>
                      <a 
                        href={`https://finance.yahoo.com/quote/${trade.symbol}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-lg font-bold text-white tracking-wide hover:text-[#00D4FF] hover:underline cursor-pointer"
                      >
                        {trade.symbol}
                      </a>
                      <p className="text-xs text-white/50 max-w-[180px] truncate">
                        {trade.name}
                      </p>
                    </div>
                  </div>

                  {/* Action Badge */}
                  <span
                    className={cn(
                      "px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      isBuy
                        ? "bg-emerald-400/15 text-emerald-400"
                        : "bg-red-400/15 text-red-400"
                    )}
                  >
                    {isBuy ? "BUY" : "SELL"}
                  </span>
                </div>

                {/* Details Row */}
                <div className="flex items-center gap-4 text-xs text-white/60 flex-wrap">
                  {trade.transactionPrice > 0 && (
                    <div className="flex items-center gap-1">
                      <DollarSign size={12} className="text-white/40" />
                      <span>${trade.transactionPrice.toFixed(2)}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-1">
                    <span
                      className={cn(
                        "font-semibold",
                        isBuy ? "text-emerald-400" : "text-red-400"
                      )}
                    >
                      {isBuy ? "+" : "-"}{formatShares(trade.change)} shares
                    </span>
                  </div>
                  <div className="flex items-center gap-1 ml-auto">
                    <Calendar size={12} className="text-white/40" />
                    <span>{formatDate(trade.filingDate)}</span>
                  </div>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}
