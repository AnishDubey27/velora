"use client";

import { useState, useRef, useEffect } from "react";
import { ChevronDown, Check, Zap, Brain, Rocket, BarChart3, Microchip, Lightbulb, Sparkles } from "lucide-react";
import { cn } from "@/lib/utils";

export type ModelOption = {
  id: string;
  name: string;
  badge: string;
  badgeColor: string;
  latency: string;
  description: string;
  icon: any;
  isDefault?: boolean;
};

export const MODEL_OPTIONS: ModelOption[] = [
  {
    id: "stepfun-ai/step-3.7-flash",
    name: "Fast Mode",
    badge: "⚡ Fast • 800ms",
    badgeColor: "bg-emerald-500/20 text-emerald-400 border-emerald-500/30",
    latency: "⚡ Fast",
    description: "Ultra-fast market reasoning & instant answers. Automatic Llama 3.1 8B fallback.",
    icon: Zap,
    isDefault: true,
  },
  {
    id: "meta/llama-3.3-70b-instruct",
    name: "Deep Mode",
    badge: "🧠 Deep • 70B",
    badgeColor: "bg-cyan-500/20 text-cyan-400 border-cyan-500/30",
    latency: "🧠 Deep",
    description: "Flagship 70B Wall Street quantitative analyst. Automatic Step 3.7 & 8B fallbacks.",
    icon: Brain,
  },
];

type BuiModelSelectorProps = {
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  className?: string;
};

export function BuiModelSelector({ selectedModel, onSelectModel, className }: BuiModelSelectorProps) {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const activeOption = MODEL_OPTIONS.find((m) => m.id === selectedModel) || MODEL_OPTIONS[0];
  const ActiveIcon = activeOption.icon;

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div ref={containerRef} className={cn("relative inline-block text-left", className)}>
      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.05] border border-white/10 hover:bg-white/[0.09] transition-all cursor-pointer shadow-lg backdrop-blur-md"
      >
        <div className="h-5 w-5 rounded-md bg-vel-teal/20 flex items-center justify-center border border-vel-teal/30">
          <ActiveIcon size={12} className="text-vel-teal" />
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-semibold text-white">{activeOption.name}</span>
          <span className="text-[10px] font-mono text-cyan-300 bg-cyan-500/10 border border-cyan-500/20 px-1.5 py-0.5 rounded-full">
            {activeOption.latency}
          </span>
        </div>
        <ChevronDown size={13} className={cn("text-white/50 transition-transform duration-200", isOpen && "rotate-180")} />
      </button>

      {/* Popover Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-72 md:w-80 rounded-2xl border border-white/15 bg-[#0B1222]/95 p-2 shadow-2xl shadow-black/90 backdrop-blur-2xl z-50 animate-fade-in">
          <div className="px-3 py-2 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-1.5 text-xs font-bold text-teal-300 uppercase tracking-wider">
              <Sparkles size={13} className="text-vel-teal" />
              <span>NVIDIA NIM Engine</span>
            </div>
            <span className="text-[10px] text-white/40 font-mono">6 Models Available</span>
          </div>

          <div className="mt-1 space-y-1 max-h-72 overflow-y-auto app-scroll">
            {MODEL_OPTIONS.map((option) => {
              const Icon = option.icon;
              const isSelected = option.id === selectedModel;

              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => {
                    onSelectModel(option.id);
                    setIsOpen(false);
                  }}
                  className={cn(
                    "w-full text-left p-2.5 rounded-xl transition-all flex items-start gap-2.5 group cursor-pointer border",
                    isSelected
                      ? "bg-vel-teal/15 border-vel-teal/40 text-white shadow-md shadow-vel-teal/10"
                      : "bg-transparent border-transparent hover:bg-white/[0.05] hover:border-white/10 text-white/80"
                  )}
                >
                  <div className={cn(
                    "h-7 w-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5 border",
                    isSelected ? "bg-vel-teal/30 border-vel-teal/50" : "bg-white/5 border-white/10 group-hover:bg-white/10"
                  )}>
                    <Icon size={14} className={isSelected ? "text-vel-teal" : "text-white/60 group-hover:text-white"} />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <span className="text-xs font-bold text-white truncate">{option.name}</span>
                      <span className={cn("text-[10px] font-semibold px-1.5 py-0.5 rounded-full border shrink-0", option.badgeColor)}>
                        {option.badge}
                      </span>
                    </div>
                    <p className="text-[11px] text-white/50 leading-tight mt-1 line-clamp-2">
                      {option.description}
                    </p>
                  </div>

                  {isSelected && (
                    <Check size={14} className="text-vel-teal shrink-0 mt-1" />
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
