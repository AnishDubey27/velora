"use client";

import { useMemo, useState } from "react";
import useSWR from "swr";
import { BarChart3, FileText, Users, FileBarChart } from "lucide-react";
import { formatLargeNumber } from "@/lib/utils";
import { AnalystGauge } from "./analyst-gauge";
import type { KeyStats, IncomeStatementEntry, AnalystRating, StockProfile } from "@/lib/types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Line,
  ComposedChart
} from "recharts";
import { cn } from "@/lib/utils";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

export function StockProfileTab({ symbol }: { symbol: string }) {
  const [isAnnual, setIsAnnual] = useState(true);

  const { data: keyStats, isLoading: isLoadingStats } = useSWR<KeyStats[]>(`/api/stock/key-stats?symbol=${symbol}`, fetcher);
  const { data: incomeStatement, isLoading: isLoadingIncome } = useSWR<IncomeStatementEntry[]>(`/api/stock/income-statement?symbol=${symbol}&period=${isAnnual ? 'annual' : 'quarterly'}&limit=5`, fetcher);
  const { data: analystRatings, isLoading: isLoadingAnalyst } = useSWR<AnalystRating[]>(`/api/stock/analyst?symbol=${symbol}`, fetcher);
  const { data: profile, isLoading: isLoadingProfile } = useSWR<StockProfile>(`/api/stock/profile?symbol=${symbol}`, fetcher);

  const stats = keyStats?.[0];
  const analyst = analystRatings?.[0];
  const companyProfile = profile;

  const chartData = useMemo(() => {
    if (!Array.isArray(incomeStatement) || incomeStatement.length === 0) return [];
    // API returns latest first, we want oldest first for chart
    return [...incomeStatement].reverse().map(item => ({
      name: isAnnual ? item.calendarYear : item.period + " " + item.calendarYear,
      Revenue: item.revenue,
      "Net Income": item.netIncome,
      "Margin %": item.netIncomeRatio * 100
    }));
  }, [incomeStatement, isAnnual]);

  return (
    <div className="flex flex-col gap-6 animate-in fade-in slide-in-from-bottom-4 duration-500 pb-12">
      {/* Key Stats */}
      <section className="glassy p-5 rounded-2xl">
        <h3 className="flex items-center gap-2 font-medium text-vel-text mb-4 text-lg">
          <BarChart3 className="w-5 h-5 text-vel-teal" />
          Key Stats
        </h3>
        
        {isLoadingStats ? (
          <div className="animate-pulse space-y-3">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="h-6 bg-white/5 rounded w-full"></div>
            ))}
          </div>
        ) : (
          <div className="flex flex-col text-sm">
            <StatRow label="Market Cap" value={formatLargeNumber(stats?.marketCap || 0)} />
            <StatRow label="P/E Ratio (TTM)" value={stats?.peRatio?.toFixed(2) || "-"} />
            <StatRow label="EPS (TTM)" value={`$${stats?.eps?.toFixed(2) || "-"}`} />
            <StatRow label="Beta" value={stats?.beta?.toFixed(2) || "-"} />
            <StatRow label="52 Week Range" value={stats?.weekRange52 || "-"} />
            <StatRow label="Dividend Yield" value={stats?.dividendYield ? (stats.dividendYield * 100).toFixed(2) + "%" : "-"} />
            <StatRow label="Average Volume" value={formatLargeNumber(stats?.avgVolume || 0).replace("$", "")} border={false} />
          </div>
        )}
      </section>

      {/* Income Statement */}
      <section className="glassy p-5 rounded-2xl">
        <div className="flex items-center justify-between mb-6">
          <h3 className="flex items-center gap-2 font-medium text-vel-text text-lg">
            <FileBarChart className="w-5 h-5 text-vel-teal" />
            Income Statement
          </h3>
          
          <div className="flex bg-black/40 rounded-full p-1 border border-white/5">
            <button 
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", isAnnual ? "bg-vel-tealSoft text-vel-teal" : "text-vel-muted hover:text-white")}
              onClick={() => setIsAnnual(true)}
            >
              Annual
            </button>
            <button 
              className={cn("px-3 py-1 rounded-full text-xs font-medium transition-colors", !isAnnual ? "bg-vel-tealSoft text-vel-teal" : "text-vel-muted hover:text-white")}
              onClick={() => setIsAnnual(false)}
            >
              Quarterly
            </button>
          </div>
        </div>

        {isLoadingIncome ? (
          <div className="h-64 animate-pulse bg-white/5 rounded-xl w-full"></div>
        ) : (
          <div className="h-64 w-full text-xs">
            <ResponsiveContainer width="100%" height="100%">
              <ComposedChart data={chartData} margin={{ top: 5, right: 0, left: -20, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#252B3E" vertical={false} />
                <XAxis dataKey="name" stroke="#8E96A7" tick={{ fill: "#8E96A7" }} tickLine={false} axisLine={false} />
                <YAxis yAxisId="left" stroke="#8E96A7" tick={{ fill: "#8E96A7" }} tickLine={false} axisLine={false} tickFormatter={(value) => formatLargeNumber(value).replace(".00", "")} />
                <YAxis yAxisId="right" orientation="right" stroke="#F6C45F" tick={{ fill: "#F6C45F" }} tickLine={false} axisLine={false} tickFormatter={(value) => `${value}%`} />
                <Tooltip 
                  contentStyle={{ backgroundColor: "#101524", border: "1px solid #252B3E", borderRadius: "8px", color: "#F4F7FB" }}
                  itemStyle={{ color: "#F4F7FB" }}
                  formatter={(value: number, name: string) => [name === "Margin %" ? `${value.toFixed(2)}%` : formatLargeNumber(value), name]}
                />
                <Legend iconType="circle" wrapperStyle={{ paddingTop: "10px" }} />
                <Bar yAxisId="left" dataKey="Revenue" fill="#143E4D" radius={[4, 4, 0, 0]} barSize={20} />
                <Bar yAxisId="left" dataKey="Net Income" fill="#00D4FF" radius={[4, 4, 0, 0]} barSize={20} />
                <Line yAxisId="right" type="monotone" dataKey="Margin %" stroke="#F6C45F" strokeWidth={2} dot={{ r: 4, fill: "#F6C45F", strokeWidth: 0 }} />
              </ComposedChart>
            </ResponsiveContainer>
          </div>
        )}
      </section>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Analyst Ratings */}
        <section className="glassy p-5 rounded-2xl flex flex-col">
          <h3 className="flex items-center gap-2 font-medium text-vel-text mb-4 text-lg">
            <Users className="w-5 h-5 text-vel-teal" />
            Analyst Ratings
          </h3>
          
          {isLoadingAnalyst ? (
            <div className="flex-1 flex items-center justify-center min-h-[160px]">
              <div className="animate-pulse bg-white/5 rounded-full w-32 h-32"></div>
            </div>
          ) : analyst ? (
            <div className="flex-1 flex items-center justify-center py-4">
              <AnalystGauge rating={analyst} />
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-vel-muted text-sm py-8">
              No rating data available
            </div>
          )}
        </section>

        {/* About Section */}
        <section className="glassy p-5 rounded-2xl flex flex-col">
          <h3 className="flex items-center gap-2 font-medium text-vel-text mb-4 text-lg">
            <FileText className="w-5 h-5 text-vel-teal" />
            About
          </h3>
          
          {isLoadingProfile ? (
            <div className="animate-pulse space-y-2 flex-1">
              <div className="h-4 bg-white/5 rounded w-3/4"></div>
              <div className="h-4 bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/5 rounded w-5/6"></div>
              <div className="h-4 bg-white/5 rounded w-full"></div>
              <div className="h-4 bg-white/5 rounded w-2/3"></div>
            </div>
          ) : (
            <div className="flex flex-col h-full">
              <div className="mb-2">
                <span className="font-medium text-vel-text block">{companyProfile?.companyName}</span>
                <span className="text-vel-muted text-sm">{companyProfile?.sector} • {companyProfile?.industry}</span>
              </div>
              <p className="text-sm text-vel-faint mt-2 line-clamp-6 leading-relaxed">
                {companyProfile?.description || "No description available."}
              </p>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

function StatRow({ label, value, border = true }: { label: string; value: string | number; border?: boolean }) {
  return (
    <div className={cn("flex justify-between items-center py-3", border && "border-b border-white/5")}>
      <span className="text-vel-muted">{label}</span>
      <span className="font-medium text-vel-text">{value}</span>
    </div>
  );
}
