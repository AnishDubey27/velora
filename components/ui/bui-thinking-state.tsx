"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, CheckCircle2, Search, Cpu, BarChart3 } from "lucide-react";
import { cn } from "@/lib/utils";

type Step = {
  id: string;
  label: string;
  icon?: "search" | "cpu" | "chart";
  detail?: string;
  status: "done" | "running" | "pending";
};

type BuiThinkingStateProps = {
  isThinking?: boolean;
  steps?: Step[];
  className?: string;
};

const DEFAULT_STEPS: Step[] = [
  { id: "1", label: "Searching live market data & news", icon: "search", detail: "Tavily / Brave API", status: "done" },
  { id: "2", label: "Evaluating financial ratios & fundamentals", icon: "chart", detail: "P/E, Debt/Equity, Free Cash Flow", status: "done" },
  { id: "3", label: "Synthesizing trade strategy & risk setup", icon: "cpu", detail: "NVIDIA NIM", status: "done" },
];

export function BuiThinkingState({ isThinking = false, steps = DEFAULT_STEPS, className }: BuiThinkingStateProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={cn("my-2 text-xs text-white/80 font-sans", className)}>
      {/* Header Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-2.5 py-1.5 rounded-lg bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] transition-colors group cursor-pointer"
      >
        <Sparkles size={13} className={cn("text-cyan-400 transition-transform", isThinking && "animate-spin")} />
        <span
          className="bg-clip-text font-medium text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.5) 25%, rgba(0,229,255,1) 50%, rgba(255,255,255,0.5) 75%)",
            backgroundSize: "200% 100%",
            animation: isThinking ? "shimmer-text 1.4s linear infinite" : "none",
          }}
        >
          {isThinking ? "Velora is thinking..." : "View reasoning steps"}
        </span>
        <span className="text-[11px] text-white/40 font-mono">({steps.length} steps)</span>
        <ChevronDown
          size={13}
          className={cn("text-white/40 group-hover:text-white transition-transform duration-200 ml-0.5", isOpen && "rotate-180")}
        />
      </button>

      {/* Expandable Trace Content */}
      {isOpen && (
        <div className="mt-2 ml-2 pl-3 border-l border-white/15 space-y-2 py-1.5 animate-fade-in">
          {steps.map((step) => {
            const Icon = step.icon === "search" ? Search : step.icon === "chart" ? BarChart3 : Cpu;
            return (
              <div key={step.id} className="flex items-center gap-2.5 text-[12px] text-white/80">
                <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                <Icon size={12} className="text-cyan-300 shrink-0" />
                <span className="font-medium text-white/90">{step.label}</span>
                {step.detail && (
                  <span className="ml-auto font-mono text-[10.5px] text-white/40 bg-white/[0.04] px-1.5 py-0.5 rounded border border-white/5">
                    {step.detail}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
