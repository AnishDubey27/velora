"use client";

import { Wrench, Search, LineChart, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";

type ToolChip = {
  name: string;
  query?: string;
  status?: "success" | "running";
};

type BuiToolChipsProps = {
  chips?: ToolChip[];
  className?: string;
};

export function BuiToolChips({ chips = [], className }: BuiToolChipsProps) {
  if (!chips || chips.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5 my-2", className)}>
      {chips.map((chip, idx) => {
        const isSearch = chip.name.toLowerCase().includes("search") || chip.name.toLowerCase().includes("tavily") || chip.name.toLowerCase().includes("brave");
        const isFinance = chip.name.toLowerCase().includes("finance") || chip.name.toLowerCase().includes("yahoo") || chip.name.toLowerCase().includes("stock");
        const Icon = isSearch ? Search : isFinance ? LineChart : Wrench;

        return (
          <div
            key={idx}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-white/[0.04] border border-white/10 text-[11.5px] text-white/80 font-mono backdrop-blur-md shadow-sm"
          >
            <Icon size={12} className="text-cyan-400" />
            <span className="font-semibold text-cyan-200">{chip.name}</span>
            {chip.query && (
              <span className="text-white/50 max-w-[150px] truncate">
                "{chip.query}"
              </span>
            )}
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 shadow-sm shadow-emerald-400" />
          </div>
        );
      })}
    </div>
  );
}
