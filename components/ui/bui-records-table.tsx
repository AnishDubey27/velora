/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useState, useMemo } from "react";
import { ArrowUpDown, ArrowUp, ArrowDown, Search, SlidersHorizontal, TrendingUp, TrendingDown } from "lucide-react";
import { cn, formatCurrency } from "@/lib/utils";

export type HoldingRow = {
  id?: string;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  value: number;
  totalCost: number;
  totalReturn: number;
  totalReturnPercent: number;
  weight?: number;
};

export type BuiRecordsTableProps = {
  holdings: HoldingRow[];
  totalPortfolioValue: number;
  onSelectStock?: (symbol: string) => void;
  className?: string;
};

type SortField = "symbol" | "value" | "totalCost" | "totalReturn" | "totalReturnPercent" | "weight";
type SortDirection = "asc" | "desc";
type Density = "compact" | "normal" | "spacious";

export function BuiRecordsTable({
  holdings,
  totalPortfolioValue,
  onSelectStock,
  className,
}: BuiRecordsTableProps) {
  const [sortField, setSortField] = useState<SortField>("value");
  const [sortDirection, setSortDirection] = useState<SortDirection>("desc");
  const [searchQuery, setSearchQuery] = useState("");
  const [density, setDensity] = useState<Density>("normal");

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortField(field);
      setSortDirection("desc");
    }
  };

  const filteredAndSorted = useMemo(() => {
    let result = holdings.map((h) => {
      const weight = totalPortfolioValue > 0 ? (h.value / totalPortfolioValue) * 100 : 0;
      return { ...h, weight };
    });

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(
        (h) => h.symbol.toLowerCase().includes(q) || h.name.toLowerCase().includes(q)
      );
    }

    result.sort((a, b) => {
      let aVal = a[sortField];
      let bVal = b[sortField];
      if (typeof aVal === "string") {
        aVal = (aVal as string).toLowerCase();
        bVal = ((bVal as string) || "").toLowerCase();
      }
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });

    return result;
  }, [holdings, totalPortfolioValue, searchQuery, sortField, sortDirection]);

  return (
    <div
      className={cn(
        "rounded-2xl border border-white/10 bg-[#070B14]/90 backdrop-blur-xl shadow-2xl overflow-hidden",
        className
      )}
    >
      {/* Table Toolbar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 border-b border-white/10 bg-white/[0.01]">
        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/40" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Filter holdings..."
            className="w-full bg-white/[0.04] border border-white/10 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder:text-white/40 focus:outline-none focus:border-teal-500/50"
          />
        </div>

        {/* Density Selector */}
        <div className="flex items-center gap-1 self-end sm:self-auto">
          <span className="text-[11px] text-white/40 mr-1.5 font-medium flex items-center gap-1">
            <SlidersHorizontal size={11} /> Density:
          </span>
          {(["compact", "normal", "spacious"] as Density[]).map((d) => (
            <button
              key={d}
              type="button"
              onClick={() => setDensity(d)}
              className={cn(
                "px-2 py-1 text-[11px] font-semibold rounded-lg capitalize transition cursor-pointer",
                density === d
                  ? "bg-teal-500/20 text-teal-300 border border-teal-500/30"
                  : "text-white/50 hover:text-white hover:bg-white/5"
              )}
            >
              {d}
            </button>
          ))}
        </div>
      </div>

      {/* Responsive Table Container */}
      <div className="overflow-x-auto app-scroll">
        <table className="w-full text-left border-collapse text-xs">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-semibold uppercase tracking-wider text-[10.5px]">
              <th
                className="py-2.5 px-3.5 cursor-pointer hover:text-white transition select-none"
                onClick={() => handleSort("symbol")}
              >
                <div className="flex items-center gap-1">
                  <span>Symbol / Asset</span>
                  {sortField === "symbol" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
              </th>

              <th
                className="py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none"
                onClick={() => handleSort("value")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Market Value</span>
                  {sortField === "value" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
              </th>

              <th
                className="py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none"
                onClick={() => handleSort("totalCost")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Cost</span>
                  {sortField === "totalCost" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
              </th>

              <th
                className="py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none"
                onClick={() => handleSort("totalReturn")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Total Return ($ / %)</span>
                  {sortField === "totalReturn" || sortField === "totalReturnPercent" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
              </th>

              <th
                className="py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none"
                onClick={() => handleSort("weight")}
              >
                <div className="flex items-center justify-end gap-1">
                  <span>Portfolio Weight</span>
                  {sortField === "weight" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5 font-mono">
            {filteredAndSorted.map((holding) => {
              const isProfit = holding.totalReturn >= 0;
              const isWinner = holding.totalReturnPercent >= 0;

              return (
                <tr
                  key={holding.symbol}
                  onClick={() => onSelectStock?.(holding.symbol)}
                  className={cn(
                    "hover:bg-white/[0.04] transition-colors group cursor-pointer",
                    density === "compact" ? "h-9" : density === "spacious" ? "h-14" : "h-11"
                  )}
                >
                  {/* Symbol & Name */}
                  <td className="py-2 px-3.5">
                    <div className="flex items-center gap-2">
                      <div className="font-bold text-white font-sans text-xs group-hover:text-teal-300 transition">
                        {holding.symbol}
                      </div>
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[10px] font-semibold uppercase tracking-wider font-sans border",
                          isWinner
                            ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                            : "bg-rose-500/10 text-rose-400 border-rose-500/20"
                        )}
                      >
                        {isWinner ? "Winner" : "Lagging"}
                      </span>
                    </div>
                    <div className="text-[11px] text-white/40 font-sans truncate max-w-[140px]">
                      {holding.shares} shrs @ ${holding.purchasePrice?.toFixed(2)}
                    </div>
                  </td>

                  {/* Market Value */}
                  <td className="py-2 px-3.5 text-right text-white font-semibold">
                    {formatCurrency(holding.value)}
                  </td>

                  {/* Total Cost */}
                  <td className="py-2 px-3.5 text-right text-white/70">
                    {formatCurrency(holding.totalCost)}
                  </td>

                  {/* Total Return ($ / %) */}
                  <td className="py-2 px-3.5 text-right">
                    <div
                      className={cn(
                        "font-semibold flex items-center justify-end gap-1",
                        isProfit ? "text-emerald-400" : "text-rose-400"
                      )}
                    >
                      {isProfit ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                      <span>
                        {isProfit ? "+" : "-"}${Math.abs(holding.totalReturn).toFixed(2)}
                      </span>
                    </div>
                    <div
                      className={cn(
                        "text-[10.5px] font-medium",
                        isProfit ? "text-emerald-400/80" : "text-rose-400/80"
                      )}
                    >
                      {isProfit ? "+" : ""}{holding.totalReturnPercent.toFixed(2)}%
                    </div>
                  </td>

                  {/* Portfolio Weight */}
                  <td className="py-2 px-3.5 text-right">
                    <span className="text-white font-medium">
                      {(holding.weight || 0).toFixed(1)}%
                    </span>
                    <div className="w-16 h-1.5 bg-white/10 rounded-full ml-auto mt-1 overflow-hidden">
                      <div
                        className="h-full bg-teal-400 rounded-full"
                        style={{ width: `${Math.min(100, Math.max(2, holding.weight || 0))}%` }}
                      />
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
