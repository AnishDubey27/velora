"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Users } from "lucide-react";
import { cn } from "@/lib/utils";
import type { InsiderTrade } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatLargeNumber(num: number): string {
  if (num >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (num >= 1e9) return `$${(num / 1e9).toFixed(1)}B`;
  if (num >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (num >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function isBuyType(type: string): boolean {
  const t = type.toLowerCase();
  return t.includes("purchase") || t.includes("buy") || t.includes("p-purchase") || t === "p";
}

export function StockInsiderTab({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<InsiderTrade[]>(
    `/api/stock/insider?symbol=${symbol}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const sorted = useMemo(() => {
    if (!Array.isArray(data)) return [];
    return [...data].sort(
      (a, b) =>
        new Date(b.transactionDate).getTime() - new Date(a.transactionDate).getTime()
    );
  }, [data]);

  const summary = useMemo(() => {
    if (!sorted.length) return { buys: 0, sells: 0, buyValue: 0, sellValue: 0 };
    let buys = 0, sells = 0, buyValue = 0, sellValue = 0;
    for (const t of sorted) {
      const val = t.securitiesTransacted * t.price;
      if (isBuyType(t.transactionType)) {
        buys++;
        buyValue += val;
      } else {
        sells++;
        sellValue += val;
      }
    }
    return { buys, sells, buyValue, sellValue };
  }, [sorted]);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <div className="glassy rounded-2xl p-5 animate-pulse">
          <div className="h-4 bg-white/[0.06] rounded w-1/2 mb-3" />
          <div className="grid grid-cols-2 gap-4">
            <div className="h-16 bg-white/[0.04] rounded-xl" />
            <div className="h-16 bg-white/[0.04] rounded-xl" />
          </div>
        </div>
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="glassy rounded-2xl p-5 animate-pulse">
            <div className="h-4 bg-white/[0.06] rounded w-2/3 mb-2" />
            <div className="h-3 bg-white/[0.04] rounded w-1/2" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glassy rounded-2xl p-8 text-center">
        <p className="text-sm text-vel-red">Failed to load insider data.</p>
      </div>
    );
  }

  if (!sorted.length) {
    return (
      <div className="glassy rounded-2xl p-8 text-center">
        <Users size={32} className="text-white/15 mx-auto mb-3" />
        <p className="text-sm text-white/40">No insider transactions found for {symbol}.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-3"
    >
      {/* ─── Summary ─── */}
      <div className="glassy rounded-2xl p-5">
        <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-3">
          Insider Summary
        </h3>
        <div className="grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-vel-green/[0.08] border border-vel-green/[0.15] p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingUp size={14} className="text-vel-green" />
              <span className="text-[11px] font-bold text-vel-green uppercase">
                {summary.buys} Buy{summary.buys !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{formatLargeNumber(summary.buyValue)}</p>
          </div>
          <div className="rounded-xl bg-vel-red/[0.08] border border-vel-red/[0.15] p-3">
            <div className="flex items-center gap-2 mb-1.5">
              <TrendingDown size={14} className="text-vel-red" />
              <span className="text-[11px] font-bold text-vel-red uppercase">
                {summary.sells} Sell{summary.sells !== 1 ? "s" : ""}
              </span>
            </div>
            <p className="text-lg font-bold text-white">{formatLargeNumber(summary.sellValue)}</p>
          </div>
        </div>
      </div>

      {/* ─── Transaction list ─── */}
      {sorted.map((trade, i) => {
        const buy = isBuyType(trade.transactionType);
        const totalValue = trade.securitiesTransacted * trade.price;
        const date = new Date(trade.transactionDate);
        const dateStr = !isNaN(date.getTime())
          ? date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
          : trade.transactionDate;

        return (
          <motion.div
            key={`${trade.reportingName}-${trade.transactionDate}-${i}`}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.04 }}
            className="glassy rounded-2xl p-4 hover:bg-white/[0.03] transition-colors"
          >
            <div className="flex items-start justify-between mb-2">
              <div className="min-w-0">
                <p className="text-sm font-semibold text-white truncate">{trade.reportingName}</p>
                <p className="text-[10px] text-white/35 capitalize">{trade.typeOfOwner}</p>
              </div>
              <span
                className={cn(
                  "text-[10px] font-bold uppercase px-2.5 py-1 rounded-full flex-shrink-0",
                  buy
                    ? "bg-vel-green/20 text-vel-green"
                    : "bg-vel-red/20 text-vel-red"
                )}
              >
                {buy ? "Purchase" : "Sale"}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3">
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Shares</p>
                <p className="text-[13px] font-semibold text-white">
                  {trade.securitiesTransacted.toLocaleString()}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Price</p>
                <p className="text-[13px] font-semibold text-white">
                  ${trade.price.toFixed(2)}
                </p>
              </div>
              <div>
                <p className="text-[9px] text-white/30 uppercase tracking-wider">Value</p>
                <p className="text-[13px] font-bold text-white">
                  {formatLargeNumber(totalValue)}
                </p>
              </div>
            </div>

            <p className="text-[10px] text-white/25 mt-2.5">{dateStr}</p>
          </motion.div>
        );
      })}
    </motion.div>
  );
}
