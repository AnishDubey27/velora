"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, Landmark, TrendingUp, TrendingDown, ArrowRightLeft } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";

interface CongressTrade {
  politician: string;
  party: string;
  chamber: "House" | "Senate";
  ticker: string;
  action: "BUY" | "SELL" | "EXCHANGE";
  amount: string;
  date: string;
}

const chamberTabs = ["All", "House", "Senate"] as const;
type ChamberFilter = (typeof chamberTabs)[number];

function formatDate(dateStr: string) {
  if (!dateStr) return "N/A";
  try {
    const d = new Date(dateStr);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  } catch {
    return dateStr;
  }
}

function getPartyColor(party: string) {
  switch (party.toUpperCase()) {
    case "D":
      return { bg: "bg-blue-500/15", text: "text-blue-400", label: "DEM" };
    case "R":
      return { bg: "bg-red-500/15", text: "text-red-400", label: "REP" };
    case "I":
      return { bg: "bg-yellow-500/15", text: "text-yellow-400", label: "IND" };
    default:
      return { bg: "bg-white/10", text: "text-white/70", label: party };
  }
}

function getActionIcon(action: string) {
  switch (action) {
    case "BUY":
      return <TrendingUp size={14} />;
    case "SELL":
      return <TrendingDown size={14} />;
    default:
      return <ArrowRightLeft size={14} />;
  }
}

function getActionStyle(action: string) {
  switch (action) {
    case "BUY":
      return "bg-emerald-400/15 text-emerald-400";
    case "SELL":
      return "bg-red-400/15 text-red-400";
    default:
      return "bg-amber-400/15 text-amber-400";
  }
}

function SkeletonCard() {
  return (
    <div className="glassy rounded-2xl p-5 animate-pulse">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-3">
          <div className="h-11 w-11 rounded-xl bg-white/10" />
          <div>
            <div className="h-5 w-32 rounded bg-white/10 mb-1.5" />
            <div className="flex gap-2">
              <div className="h-4 w-12 rounded-md bg-white/10" />
              <div className="h-4 w-14 rounded-md bg-white/10" />
            </div>
          </div>
        </div>
        <div className="h-7 w-16 rounded-lg bg-white/10" />
      </div>
      <div className="flex gap-4 mt-3">
        <div className="h-4 w-16 rounded bg-white/10" />
        <div className="h-4 w-32 rounded bg-white/10" />
        <div className="h-4 w-24 rounded bg-white/10" />
      </div>
    </div>
  );
}

export function CongressTradingScreen({ onBack }: { onBack: () => void }) {
  const [trades, setTrades] = useState<CongressTrade[]>([]);
  const [loading, setLoading] = useState(true);
  const [chamberFilter, setChamberFilter] = useState<ChamberFilter>("All");

  useEffect(() => {
    fetch("/api/signals/congress")
      .then((res) => res.json())
      .then((data) => {
        setTrades(Array.isArray(data) ? data : []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredTrades =
    chamberFilter === "All"
      ? trades
      : trades.filter((t) => t.chamber === chamberFilter);

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
          Congress Trading
        </h1>
      </div>

      {/* Chamber Filter Tabs */}
      <div className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3">
        {chamberTabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setChamberFilter(tab)}
            className={cn(
              "whitespace-nowrap rounded-2xl px-6 py-2.5 text-sm font-semibold transition",
              chamberFilter === tab
                ? "bg-vel-teal/20 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Section Heading */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        className="mb-5 px-1"
      >
        <h2 className="text-base font-semibold text-white/80">
          🏛️ Recent Congressional Trades
        </h2>
        <p className="text-xs text-white/40 mt-1">
          Financial disclosures from US House & Senate members
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
        ) : filteredTrades.length === 0 ? (
          <div className="py-16 text-center text-white/50">
            No congressional trades found
          </div>
        ) : (
          filteredTrades.map((trade, index) => {
            const partyStyle = getPartyColor(trade.party);

            return (
              <motion.div
                key={`${trade.politician}-${trade.ticker}-${trade.date}-${index}`}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.04, duration: 0.35 }}
                className="glassy rounded-2xl p-5"
              >
                {/* Top Row: Politician + Party + Action */}
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    {/* Avatar */}
                    <div className="h-11 w-11 rounded-xl bg-white/10 flex items-center justify-center">
                      <Landmark size={18} className="text-white/60" />
                    </div>
                    <div>
                      <p className="text-[15px] font-bold text-white leading-tight max-w-[200px] truncate">
                        {trade.politician}
                      </p>
                      <div className="flex items-center gap-1.5 mt-1">
                        {/* Party Badge */}
                        <span
                          className={cn(
                            "px-2 py-0.5 rounded-md text-[10px] font-bold uppercase",
                            partyStyle.bg,
                            partyStyle.text
                          )}
                        >
                          {partyStyle.label}
                        </span>
                        {/* Chamber Badge */}
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase bg-white/10 text-white/60">
                          {trade.chamber}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Action Badge */}
                  <span
                    className={cn(
                      "flex items-center gap-1 px-3 py-1 rounded-lg text-xs font-bold uppercase tracking-wider",
                      getActionStyle(trade.action)
                    )}
                  >
                    {getActionIcon(trade.action)}
                    {trade.action}
                  </span>
                </div>

                {/* Details Row */}
                <div className="flex items-center gap-3 text-xs text-white/60 flex-wrap">
                  {/* Ticker */}
                  <span className="text-sm font-bold text-white tracking-wide">
                    {trade.ticker}
                  </span>

                  <span className="text-white/20">•</span>

                  {/* Amount */}
                  <span className="text-white/50">{trade.amount}</span>

                  {/* Date */}
                  <span className="ml-auto text-white/40">
                    {formatDate(trade.date)}
                  </span>
                </div>
              </motion.div>
            );
          })
        )}
      </div>
    </section>
  );
}
