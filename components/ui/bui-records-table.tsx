/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useState, useMemo, useRef } from "react";
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

  // Beautiful UI Resizable Columns state
  const [columnWidths, setColumnWidths] = useState<Record<string, number>>({
    symbol: 200,
    value: 140,
    totalCost: 140,
    totalReturn: 190,
    weight: 130,
  });

  const resizingRef = useRef<{ col: string; startX: number; startWidth: number } | null>(null);

  const handleResizeStart = (col: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    resizingRef.current = {
      col,
      startX: e.clientX,
      startWidth: columnWidths[col] || 140,
    };

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!resizingRef.current) return;
      const delta = moveEvent.clientX - resizingRef.current.startX;
      const newWidth = Math.max(80, resizingRef.current.startWidth + delta);
      setColumnWidths((prev) => ({
        ...prev,
        [resizingRef.current!.col]: newWidth,
      }));
    };

    const handleMouseUp = () => {
      resizingRef.current = null;
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("mouseup", handleMouseUp);
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("mouseup", handleMouseUp);
  };

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

      {/* Responsive Table Container with Resizable Columns */}
      <div className="overflow-x-auto app-scroll">
        <table className="w-full text-left border-collapse text-xs table-fixed">
          <thead>
            <tr className="border-b border-white/10 bg-white/[0.02] text-white/50 font-semibold uppercase tracking-wider text-[10.5px]">
              {/* Column 1: Symbol / Asset */}
              <th
                style={{ width: `${columnWidths.symbol}px` }}
                className="relative py-2.5 px-3.5 cursor-pointer hover:text-white transition select-none group"
                onClick={() => handleSort("symbol")}
              >
                <div className="flex items-center gap-1 pr-2">
                  <span>Symbol / Asset</span>
                  {sortField === "symbol" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
                {/* Drag Resize Affordance */}
                <div
                  onMouseDown={(e) => handleResizeStart("symbol", e)}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-teal-400/50 flex items-center justify-center transition"
                  title="Drag to resize column"
                >
                  <div className="w-[1.5px] h-3.5 bg-white/20 group-hover:bg-teal-300" />
                </div>
              </th>

              {/* Column 2: Market Value */}
              <th
                style={{ width: `${columnWidths.value}px` }}
                className="relative py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none group"
                onClick={() => handleSort("value")}
              >
                <div className="flex items-center justify-end gap-1 pr-2">
                  <span>Market Value</span>
                  {sortField === "value" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
                {/* Drag Resize Affordance */}
                <div
                  onMouseDown={(e) => handleResizeStart("value", e)}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-teal-400/50 flex items-center justify-center transition"
                  title="Drag to resize column"
                >
                  <div className="w-[1.5px] h-3.5 bg-white/20 group-hover:bg-teal-300" />
                </div>
              </th>

              {/* Column 3: Total Cost */}
              <th
                style={{ width: `${columnWidths.totalCost}px` }}
                className="relative py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none group"
                onClick={() => handleSort("totalCost")}
              >
                <div className="flex items-center justify-end gap-1 pr-2">
                  <span>Total Cost</span>
                  {sortField === "totalCost" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
                {/* Drag Resize Affordance */}
                <div
                  onMouseDown={(e) => handleResizeStart("totalCost", e)}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-teal-400/50 flex items-center justify-center transition"
                  title="Drag to resize column"
                >
                  <div className="w-[1.5px] h-3.5 bg-white/20 group-hover:bg-teal-300" />
                </div>
              </th>

              {/* Column 4: Total Return */}
              <th
                style={{ width: `${columnWidths.totalReturn}px` }}
                className="relative py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none group"
                onClick={() => handleSort("totalReturn")}
              >
                <div className="flex items-center justify-end gap-1 pr-2">
                  <span>Total Return</span>
                  {sortField === "totalReturn" || sortField === "totalReturnPercent" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
                {/* Drag Resize Affordance */}
                <div
                  onMouseDown={(e) => handleResizeStart("totalReturn", e)}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-teal-400/50 flex items-center justify-center transition"
                  title="Drag to resize column"
                >
                  <div className="w-[1.5px] h-3.5 bg-white/20 group-hover:bg-teal-300" />
                </div>
              </th>

              {/* Column 5: Portfolio Weight */}
              <th
                style={{ width: `${columnWidths.weight}px` }}
                className="relative py-2.5 px-3.5 text-right cursor-pointer hover:text-white transition select-none group"
                onClick={() => handleSort("weight")}
              >
                <div className="flex items-center justify-end gap-1 pr-2">
                  <span>Weight</span>
                  {sortField === "weight" ? (
                    sortDirection === "asc" ? <ArrowUp size={11} className="text-teal-400" /> : <ArrowDown size={11} className="text-teal-400" />
                  ) : (
                    <ArrowUpDown size={11} className="opacity-40" />
                  )}
                </div>
                {/* Drag Resize Affordance */}
                <div
                  onMouseDown={(e) => handleResizeStart("weight", e)}
                  className="absolute right-0 top-0 bottom-0 w-2.5 cursor-col-resize hover:bg-teal-400/50 flex items-center justify-center transition"
                  title="Drag to resize column"
                >
                  <div className="w-[1.5px] h-3.5 bg-white/20 group-hover:bg-teal-300" />
                </div>
              </th>
            </tr>
          </thead>

          <tbody className="divide-y divide-white/5">
            {filteredAndSorted.map((holding) => {
              const isProfit = holding.totalReturn >= 0;
              const paddingClass =
                density === "compact" ? "py-1.5 px-3.5" : density === "spacious" ? "py-4 px-3.5" : "py-2.5 px-3.5";

              return (
                <tr
                  key={holding.id || holding.symbol}
                  onClick={() => onSelectStock?.(holding.symbol)}
                  className="hover:bg-white/[0.03] transition-colors cursor-pointer group"
                >
                  {/* Symbol & Name */}
                  <td className={cn(paddingClass, "overflow-hidden text-ellipsis whitespace-nowrap")}>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-white font-mono group-hover:text-teal-300 transition">
                        {holding.symbol}
                      </span>
                      <span className="text-[11px] text-white/50 truncate max-w-[120px]">
                        {holding.name}
                      </span>
                      {/* Beautiful UI Status Chip */}
                      <span
                        className={cn(
                          "px-1.5 py-0.5 rounded text-[9.5px] font-bold uppercase tracking-wider ml-auto shrink-0",
                          isProfit ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20" : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        )}
                      >
                        {isProfit ? "WINNER" : "LAGGING"}
                      </span>
                    </div>
                  </td>

                  {/* Market Value */}
                  <td className={cn(paddingClass, "text-right font-mono font-medium text-white")}>
                    {formatCurrency(holding.value)}
                  </td>

                  {/* Total Cost */}
                  <td className={cn(paddingClass, "text-right font-mono text-white/60")}>
                    {formatCurrency(holding.totalCost)}
                  </td>

                  {/* Total Return Dollar and Percent */}
                  <td className={cn(paddingClass, "text-right font-mono font-medium")}>
                    <div className={cn("flex items-center justify-end gap-1", isProfit ? "text-emerald-400" : "text-rose-400")}>
                      {isProfit ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                      <span>
                        {isProfit ? "+" : ""}{formatCurrency(holding.totalReturn)} ({isProfit ? "+" : ""}{holding.totalReturnPercent.toFixed(2)}%)
                      </span>
                    </div>
                  </td>

                  {/* Portfolio Weight */}
                  <td className={cn(paddingClass, "text-right font-mono")}>
                    <span className="text-white/80 font-medium">
                      {(holding.weight ?? 0).toFixed(1)}%
                    </span>
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
