/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import { useState } from "react";
import { Sparkles, ChevronDown, CheckCircle2, Search, Database, Globe, Cpu } from "lucide-react";
import { cn } from "@/lib/utils";

export type ThinkingStep = {
  id: string;
  label: string;
  detail?: string;
  status: "done" | "running" | "pending";
};

export type BuiThinkingStateProps = {
  isThinking?: boolean;
  durationSeconds?: number;
  steps?: ThinkingStep[];
  className?: string;
};

// Real pipeline stages from Velora AI engine
export const REAL_PIPELINE_STEPS: ThinkingStep[] = [
  { id: "1", label: "Reading portfolio context", detail: "Supabase DB", status: "done" },
  { id: "2", label: "Fetching live market data", detail: "Finnhub / Yahoo Finance", status: "done" },
  { id: "3", label: "Searching real-time news", detail: "Tavily Search API", status: "done" },
  { id: "4", label: "Model completion", detail: "NVIDIA NIM", status: "done" },
];

export function BuiThinkingState({
  isThinking = false,
  durationSeconds,
  steps = REAL_PIPELINE_STEPS,
  className,
}: BuiThinkingStateProps) {
  const [isOpen, setIsOpen] = useState(false);

  const durationStr = durationSeconds !== undefined && durationSeconds > 0
    ? `${durationSeconds.toFixed(1)}s`
    : null;

  return (
    <div className={cn("my-2 text-xs text-white/80 font-sans", className)}>
      {/* Header Button - Accordion Trigger */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.04] border border-white/10 hover:bg-white/[0.08] hover:border-white/20 transition-all group cursor-pointer shadow-sm"
      >
        <Sparkles
          size={13}
          className={cn(
            "text-cyan-400 transition-transform",
            isThinking && "animate-spin"
          )}
        />
        <span
          className="bg-clip-text font-medium text-transparent"
          style={{
            backgroundImage:
              "linear-gradient(90deg, rgba(255,255,255,0.6) 25%, rgba(0,229,255,1) 50%, rgba(255,255,255,0.6) 75%)",
            backgroundSize: "200% 100%",
            animation: isThinking ? "shimmer-text 1.4s linear infinite" : "none",
          }}
        >
          {isThinking
            ? "Velora is thinking..."
            : durationStr
            ? `Thought for ${durationStr}`
            : "Thought for a few seconds"}
        </span>

        <span className="text-[11px] text-white/40 font-mono">
          ({steps.length} {steps.length === 1 ? "step" : "steps"})
        </span>

        <ChevronDown
          size={13}
          className={cn(
            "text-white/40 group-hover:text-white transition-transform duration-200 ml-0.5",
            isOpen && "rotate-180"
          )}
        />
      </button>

      {/* Expandable Trace Content with Vertical Timeline */}
      {isOpen && (
        <div
          className="mt-2 ml-3.5 pl-3 border-l-2 border-teal-500/30 space-y-2.5 py-1.5 animate-fade-in"
          style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
        >
          {steps.map((step) => {
            const isDb = step.label.toLowerCase().includes("portfolio");
            const isMarket = step.label.toLowerCase().includes("market");
            const isSearch = step.label.toLowerCase().includes("news") || step.label.toLowerCase().includes("search");
            const StepIcon = isDb ? Database : isMarket ? Globe : isSearch ? Search : Cpu;

            return (
              <div key={step.id} className="flex items-center gap-2.5 text-[12px] text-white/85">
                <div className="relative -left-[19px] bg-[#05080F] p-0.5 rounded-full">
                  <CheckCircle2 size={13} className="text-emerald-400 shrink-0" />
                </div>
                <div className="flex items-center gap-2 min-w-0 flex-1 -ml-2">
                  <StepIcon size={12} className="text-cyan-400 shrink-0" />
                  <span className="font-medium text-white/90 truncate">{step.label}</span>
                </div>
                {step.detail && (
                  <span className="shrink-0 font-mono text-[10.5px] text-teal-300/80 bg-teal-500/10 px-2 py-0.5 rounded border border-teal-500/20">
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
