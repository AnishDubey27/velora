"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { 
  AreaChart, 
  Area, 
  XAxis, 
  YAxis, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  Cell
} from "recharts";
import { cn } from "@/lib/utils";
import type { ChartDataPoint, ChartRange } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

const RANGES: ChartRange[] = ["1D", "1W", "1M", "3M", "6M", "YTD", "1Y", "2Y"];

export function StockChart({ symbol }: { symbol: string }) {
  const [range, setRange] = useState<ChartRange>("1M");
  
  const { data, isLoading } = useSWR<ChartDataPoint[]>(
    `/api/stock/chart?symbol=${symbol}&range=${range}`,
    fetcher
  );

  const { minPrice, maxPrice, isUp } = useMemo(() => {
    if (!Array.isArray(data) || data.length === 0) return { minPrice: 0, maxPrice: 0, isUp: true };
    
    let min = Infinity;
    let max = -Infinity;
    
    data.forEach(point => {
      if (point.close < min) min = point.close;
      if (point.close > max) max = point.close;
    });

    const firstPrice = data[0].close;
    const lastPrice = data[data.length - 1].close;
    
    // Add 5% padding to min/max
    const padding = (max - min) * 0.05;
    
    return {
      minPrice: Math.max(0, min - padding),
      maxPrice: max + padding,
      isUp: lastPrice >= firstPrice
    };
  }, [data]);

  const color = isUp ? "#3DF0A4" : "#FF4D5E";
  const stopColor = isUp ? "rgba(61, 240, 164, 0.2)" : "rgba(255, 77, 94, 0.2)";

  if (isLoading && !Array.isArray(data)) {
    return (
      <div className="w-full h-80 bg-white/5 animate-pulse rounded-xl"></div>
    );
  }

  return (
    <div className="w-full flex flex-col gap-4">
      {/* Chart Area */}
      <div className="h-64 w-full relative">
        {!Array.isArray(data) || data.length === 0 ? (
          <div className="absolute inset-0 flex items-center justify-center text-vel-muted">
            No chart data available
          </div>
        ) : (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor={color} stopOpacity={0.3} />
                  <stop offset="95%" stopColor={color} stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis 
                dataKey="date" 
                hide 
              />
              <YAxis 
                domain={[minPrice, maxPrice]} 
                hide 
              />
              <Tooltip 
                contentStyle={{ backgroundColor: "#101524", border: "1px solid #252B3E", borderRadius: "8px", color: "#F4F7FB" }}
                itemStyle={{ color: "#F4F7FB" }}
                labelStyle={{ color: "#8E96A7", marginBottom: "4px" }}
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Price"]}
                labelFormatter={(label) => {
                  const d = new Date(label);
                  if (range === "1D" || range === "1W") {
                    return d.toLocaleString('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
                  }
                  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                }}
              />
              <Area 
                type="monotone" 
                dataKey="close" 
                stroke={color} 
                strokeWidth={2}
                fillOpacity={1} 
                fill="url(#colorPrice)" 
                isAnimationActive={false}
              />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Volume Chart */}
      <div className="h-16 w-full relative">
        <div className="absolute top-0 left-0 text-[10px] text-vel-faint uppercase tracking-wider z-10">
          Volume
        </div>
        {Array.isArray(data) && data.length > 0 && (
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={data} margin={{ top: 15, right: 0, left: 0, bottom: 0 }}>
              <Tooltip cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }} content={<></>} />
              <Bar dataKey="volume" isAnimationActive={false}>
                {data.map((entry, index) => {
                  const prevClose = index === 0 ? entry.open : data[index - 1].close;
                  const isGreen = entry.close >= prevClose;
                  return <Cell key={`cell-${index}`} fill={isGreen ? "#143E4D" : "rgba(255, 77, 94, 0.2)"} />;
                })}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* Range Selector */}
      <div className="flex items-center justify-between mt-2 bg-black/40 rounded-xl p-1 overflow-x-auto no-scrollbar border border-white/5">
        {RANGES.map((r) => (
          <button
            key={r}
            onClick={() => setRange(r)}
            className={cn(
              "px-4 py-1.5 rounded-lg text-xs font-medium transition-colors whitespace-nowrap",
              range === r 
                ? (isUp ? "bg-vel-tealSoft text-vel-teal" : "bg-red-500/20 text-vel-red") 
                : "text-vel-muted hover:text-white"
            )}
          >
            {r}
          </button>
        ))}
      </div>
    </div>
  );
}
