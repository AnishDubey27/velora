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

const DEFAULT_HEATMAP_DATA: HeatmapItem[] = [
  {
    symbol: "NVDA",
    name: "NVIDIA Corp",
    price: 128.5,
    changePercent: 3.42,
    marketCap: "$3.15T",
    sector: "Semiconductors",
    sparkline: [122, 123.5, 125, 124.8, 127.2, 128.5],
  },
  {
    symbol: "AAPL",
    name: "Apple Inc",
    price: 224.2,
    changePercent: 1.15,
    marketCap: "$3.42T",
    sector: "Mega Tech",
    sparkline: [220, 221, 222.5, 223, 223.8, 224.2],
  },
  {
    symbol: "MSFT",
    name: "Microsoft Corp",
    price: 418.9,
    changePercent: -0.65,
    marketCap: "$3.11T",
    sector: "Mega Tech",
    sparkline: [422, 421, 420.5, 419, 419.5, 418.9],
  },
  {
    symbol: "BTC",
    name: "Bitcoin",
    price: 64250,
    changePercent: 2.88,
    marketCap: "$1.27T",
    sector: "Crypto",
    sparkline: [62100, 62800, 63400, 63100, 63900, 64250],
  },
  {
    symbol: "ETH",
    name: "Ethereum",
    price: 3450,
    changePercent: 4.12,
    marketCap: "$415B",
    sector: "Crypto",
    sparkline: [3310, 3340, 3380, 3410, 3420, 3450],
  },
  {
    symbol: "TSLA",
    name: "Tesla Inc",
    price: 215.6,
    changePercent: -2.34,
    marketCap: "$685B",
    sector: "Mega Tech",
    sparkline: [221, 220, 218, 217.5, 216, 215.6],
  },
  {
    symbol: "AMD",
    name: "Advanced Micro Devices",
    price: 148.3,
    changePercent: 2.15,
    marketCap: "$240B",
    sector: "Semiconductors",
    sparkline: [144, 145.2, 146, 147.1, 147.8, 148.3],
  },
  {
    symbol: "JPM",
    name: "JPMorgan Chase",
    price: 212.4,
    changePercent: 0.82,
    marketCap: "$608B",
    sector: "Financials",
    sparkline: [210, 210.5, 211, 211.8, 212, 212.4],
  },
  {
    symbol: "LLY",
    name: "Eli Lilly & Co",
    price: 924.1,
    changePercent: 1.45,
    marketCap: "$878B",
    sector: "Healthcare",
    sparkline: [905, 910, 915, 918, 921, 924.1],
  },
  {
    symbol: "SOL",
    name: "Solana",
    price: 154.2,
    changePercent: 5.62,
    marketCap: "$72B",
    sector: "Crypto",
    sparkline: [142, 145, 148, 150, 152, 154.2],
  },
];

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
  data = DEFAULT_HEATMAP_DATA,
  onSelectStock,
}: {
  data?: HeatmapItem[];
  onSelectStock?: (symbol: string) => void;
}) {
  const [selectedSector, setSelectedSector] = useState<string>("All");

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
      </div>
    </div>
  );
}
