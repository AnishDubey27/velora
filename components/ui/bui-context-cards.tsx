"use client";

import { Paperclip, X, TrendingUp, PieChart, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ContextItem = {
  id: string;
  label: string;
  type: "portfolio" | "stock" | "skill";
  subLabel?: string;
};

type BuiContextCardsProps = {
  items?: ContextItem[];
  onRemove?: (id: string) => void;
  className?: string;
};

export function BuiContextCards({ items = [], onRemove, className }: BuiContextCardsProps) {
  if (!items || items.length === 0) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2 mb-2 px-1", className)}>
      <div className="flex items-center gap-1 text-[11px] font-semibold text-white/50 uppercase tracking-wider">
        <Paperclip size={12} className="text-cyan-400" />
        <span>Context Attached:</span>
      </div>

      {items.map((item) => {
        const isPortfolio = item.type === "portfolio";
        const isStock = item.type === "stock";
        const Icon = isPortfolio ? PieChart : isStock ? TrendingUp : Sparkles;

        return (
          <div
            key={item.id}
            className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-white/[0.05] border border-white/15 text-xs text-white backdrop-blur-md shadow-md"
          >
            <Icon size={12} className={isPortfolio ? "text-emerald-400" : isStock ? "text-cyan-400" : "text-amber-400"} />
            <span className="font-semibold text-white/95">{item.label}</span>
            {item.subLabel && (
              <span className="text-[10.5px] font-mono text-cyan-300/80 bg-white/5 px-1.5 py-0.5 rounded">
                {item.subLabel}
              </span>
            )}
            {onRemove && (
              <button
                type="button"
                onClick={() => onRemove(item.id)}
                className="text-white/40 hover:text-white transition p-0.5 rounded-full hover:bg-white/10 ml-0.5"
                title="Remove context"
              >
                <X size={12} />
              </button>
            )}
          </div>
        );
      })}
    </div>
  );
}
