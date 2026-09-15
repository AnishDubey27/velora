"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { TrendingUp, TrendingDown, Layers, Zap } from "lucide-react";
import { cn } from "@/lib/utils";

export type HeatmapItem = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: string;
  sector: "Mega Tech" | "Semiconductors" | "Crypto" | "Financials" | "Healthcare";
  sparkline: number[];
};

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

function MiniSparkline({ data, isPositive }: { data: number[]; isPositive: boolean }) {
  if (!data || data.length < 2) return null;
  const min = Math.min(...data);
  const max = Math.max(...data);
  const range = max - min || 1;

  const points = data
    .map((val, idx) => {
      const x = (idx / (data.length - 1)) * 48;
      const y = 18 - ((val - min) / range) * 14;
      return `${x},${y}`;
    })
    .join(" ");

  return (
    <svg width="48" height="20" className="overflow-visible">
      <polyline
        fill="none"
        stroke={isPositive ? "#34d399" : "#f87171"}
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        points={points}
      />
    </svg>
  );
}

export function BuiMarketHeatmap({
  data: initialData,
  onSelectStock,
}: {
  data?: HeatmapItem[];
  onSelectStock?: (symbol: string) => void;
}) {
  const [selectedSector, setSelectedSector] = useState<string>("All");

  const { data: apiData, isLoading } = useSWR<HeatmapItem[]>(
    "/api/market/heatmap",
    fetcher,
    { refreshInterval: 60000, revalidateOnFocus: false }
  );

  const data = initialData || apiData || [];
  const sectors = ["All", "Mega Tech", "Semiconductors", "Crypto", "Financials", "Healthcare"];
  const filtered = selectedSector === "All" ? data : data.filter((d) => d.sector === selectedSector);

  return (
    <div className="rounded-2xl border border-white/10 bg-[#0A0F1C]/90 p-4 backdrop-blur-xl shadow-2xl">
      {/* Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 mb-4">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-vel-teal/20 flex items-center justify-center">
            <Layers size={15} className="text-vel-teal" />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">Market Sector Heatmap</h3>
            <p className="text-[11px] text-white/50">Live treemap performance by market cap</p>
          </div>
        </div>

        {/* Sector Filter Chips */}
        <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
          {sectors.map((sec) => (
            <button
              key={sec}
              onClick={() => setSelectedSector(sec)}
              className={cn(
                "px-2.5 py-1 rounded-lg text-[11px] font-medium transition whitespace-nowrap",
                selectedSector === sec
                  ? "bg-vel-teal/20 text-vel-teal border border-vel-teal/40"
                  : "bg-white/5 text-white/60 hover:bg-white/10 hover:text-white border border-transparent"
              )}
            >
              {sec}
            </button>
          ))}
        </div>
      </div>

      {/* Grid Heatmap */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-2.5">
        {isLoading && filtered.length === 0 ? (
          Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="h-24 rounded-xl border border-white/5 bg-white/[0.03] p-3 animate-pulse flex flex-col justify-between">
              <div className="flex justify-between">
                <div className="h-4 w-12 rounded bg-white/10" />
                <div className="h-4 w-10 rounded bg-white/10" />
              </div>
              <div className="flex justify-between items-end">
                <div className="h-3 w-14 rounded bg-white/10" />
                <div className="h-4 w-10 rounded bg-white/10" />
              </div>
            </div>
          ))
        ) : (
          <AnimatePresence>
            {filtered.map((item, idx) => {
              const isPos = item.changePercent >= 0;
              return (
                <motion.div
                  key={item.symbol}
                  layout
                  initial={{ opacity: 0, scale: 0.95 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  transition={{ duration: 0.2, delay: idx * 0.02 }}
                  onClick={() => onSelectStock?.(item.symbol)}
                  className={cn(
                    "relative group flex flex-col justify-between p-3 rounded-xl border transition-all duration-200 cursor-pointer overflow-hidden",
                    isPos
                      ? "bg-gradient-to-br from-emerald-950/40 to-emerald-900/10 border-emerald-500/30 hover:border-emerald-400 hover:shadow-lg hover:shadow-emerald-950/50"
                      : "bg-gradient-to-br from-rose-950/40 to-rose-900/10 border-rose-500/30 hover:border-rose-400 hover:shadow-lg hover:shadow-rose-950/50"
                  )}
                >
                  {/* Symbol + Sector */}
                  <div className="flex items-start justify-between">
                    <div>
                      <span className="text-sm font-bold text-white tracking-wide block">
                        {item.symbol}
                      </span>
                      <span className="text-[10px] text-white/50 truncate max-w-[80px] block">
                        {item.name}
                      </span>
                    </div>
                    <span
                      className={cn(
                        "text-[11px] font-bold px-1.5 py-0.5 rounded-md flex items-center gap-0.5",
                        isPos ? "bg-emerald-500/20 text-emerald-400" : "bg-rose-500/20 text-rose-400"
                      )}
                    >
                      {isPos ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                      {isPos ? "+" : ""}
                      {item.changePercent.toFixed(2)}%
                    </span>
                  </div>

                  {/* Sparkline + Price */}
                  <div className="flex items-end justify-between mt-3">
                    <div>
                      <span className="text-xs font-semibold text-white/90 font-mono">
                        ${item.price >= 1000 ? item.price.toLocaleString() : item.price.toFixed(2)}
                      </span>
                      <span className="text-[10px] text-white/40 block font-mono">
                        {item.marketCap}
                      </span>
                    </div>
                    <MiniSparkline data={item.sparkline} isPositive={isPos} />
                  </div>
                </motion.div>
              );
            })}
          </AnimatePresence>
        )}
      </div>
    </div>
  );
}
