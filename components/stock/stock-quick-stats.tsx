"use client";

import { useMemo } from "react";
import useSWR from "swr";
import { formatLargeNumber } from "@/lib/utils";
import type { StockQuote, StockProfile, KeyStats } from "@/lib/types";
import { TrendingUp, BarChart2, DollarSign, Activity } from "lucide-react";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StockQuickStats({
  symbol,
  quote,
  profile,
  currencySymbol = "$",
}: {
  symbol: string;
  quote?: StockQuote;
  profile?: StockProfile;
  currencySymbol?: string;
}) {
  const { data: keyStats } = useSWR<KeyStats[]>(`/api/stock/key-stats?symbol=${symbol}`, fetcher);
  const stats = keyStats?.[0];

  const currentPrice = quote?.price ?? 0;
  const yearLow = quote?.yearLow ?? stats?.yearLow ?? (currentPrice * 0.75);
  const yearHigh = quote?.yearHigh ?? stats?.yearHigh ?? (currentPrice * 1.25);
  const range = yearHigh - yearLow || 1;
  const currentPosPercent = Math.min(100, Math.max(0, ((currentPrice - yearLow) / range) * 100));

  const marketCap = profile?.mktCap ?? quote?.marketCap ?? stats?.marketCap;
  const peRatio = stats?.peRatio ?? quote?.pe;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 my-2">
      {/* 1. Market Cap */}
      <div className="p-3 rounded-xl border border-white/10 bg-[#0A0F1C]/90 backdrop-blur-md">
        <span className="text-[11px] text-white/50 block font-medium">Market Cap</span>
        <span className="text-sm font-bold text-white font-mono mt-0.5 block">
          {marketCap ? `${currencySymbol}${formatLargeNumber(marketCap)}` : "—"}
        </span>
      </div>

      {/* 2. P/E Ratio */}
      <div className="p-3 rounded-xl border border-white/10 bg-[#0A0F1C]/90 backdrop-blur-md">
        <span className="text-[11px] text-white/50 block font-medium">P/E Ratio (TTM)</span>
        <span className="text-sm font-bold text-teal-300 font-mono mt-0.5 block">
          {peRatio ? `${peRatio.toFixed(1)}x` : "—"}
        </span>
      </div>

      {/* 3. 52-Week Range Slider (Spans 2 cols on mobile) */}
      <div className="col-span-2 p-3 rounded-xl border border-white/10 bg-[#0A0F1C]/90 backdrop-blur-md flex flex-col justify-between">
        <div className="flex items-center justify-between text-[11px] text-white/50 mb-1">
          <span>52W Low: {currencySymbol}{yearLow.toFixed(2)}</span>
          <span className="text-white/80 font-medium">52-Week Range</span>
          <span>52W High: {currencySymbol}{yearHigh.toFixed(2)}</span>
        </div>

        {/* Visual Range Bar with Current Price Marker */}
        <div className="relative h-2 w-full rounded-full bg-white/10 my-1 overflow-visible">
          <div
            className="absolute top-0 bottom-0 left-0 rounded-full bg-gradient-to-r from-teal-500 to-cyan-400 opacity-60"
            style={{ width: `${currentPosPercent}%` }}
          />
          <div
            className="absolute -top-1 h-4 w-1.5 rounded-full bg-white shadow-[0_0_8px_rgba(0,206,209,0.8)] -translate-x-1/2"
            style={{ left: `${currentPosPercent}%` }}
          />
        </div>
      </div>
    </div>
  );
}
