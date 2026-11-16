"use client";

import { useRef, useEffect, useState } from "react";
import { ArrowUp, Sparkles, Bot } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";
import { BuiModelSelector } from "@/components/ui/bui-model-selector";
import { DEFAULT_MODEL } from "@/lib/nvidia";

type ResearchScreenProps = {
  skills: Skill[];
  onOpenSkills: () => void;
  onStartChat: (prompt: string) => void;
  onSelectSkill: (skill: Skill) => void;
};

const iconMap: any = {
  compare: Sparkles,
  timing: Sparkles,
  quality: Sparkles,
  news: Sparkles,
};

export function ResearchScreen({ skills, onOpenSkills, onStartChat, onSelectSkill }: ResearchScreenProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const popular = skills.filter((skill) => skill.popular).slice(0, 3);
  const shouldCenterPopular = popular.length <= 3;
  const [hasSavedChat, setHasSavedChat] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") {
      try {
        const saved = localStorage.getItem("velora_chat_model_v1");
        if (saved && (saved.includes("minimax") || saved.includes("nemotron"))) {
          return saved;
        }
      } catch {}
    }
    return DEFAULT_MODEL;
  });

  useEffect(() => {
    try {
      localStorage.setItem("velora_chat_model_v1", selectedModel);
    } catch {}
  }, [selectedModel]);

  useEffect(() => {
    try {
      const saved = typeof window !== "undefined" ? localStorage.getItem("velora_chat_history_v1") : null;
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          setHasSavedChat(true);
        }
      }
    } catch {}
  }, []);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.defaultMuted = true;
      videoRef.current.muted = true;
      videoRef.current.play().catch(() => undefined);
    }
  }, []);

  return (
    <div className="relative overflow-hidden bg-[#05080F] flex flex-col justify-between min-h-[calc(100dvh-152px)] md:min-h-[calc(100dvh-136px)] pb-4 pt-0 md:pb-6">
      {/* Header bar matching ChatScreen */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5 bg-[#05080F]/90 backdrop-blur-md z-20 relative">
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-vel-teal/20 flex items-center justify-center">
            <Bot size={16} className="text-vel-teal" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Velora AI</h2>
            <p className="text-[11px] text-white/50">Powered by NVIDIA NIM & Tavily</p>
          </div>
        </div>
        <div className="flex-1" />
        <BuiModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
      </div>
      {/* Layer 2: Seamless Atmospheric Financial Intelligence Network Video */}
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
        <video
          ref={videoRef}
          autoPlay
          loop
          muted
          playsInline
          preload="auto"
          poster="/financial-network-poster.webp"
          className="h-full w-full object-cover object-center opacity-55 sm:opacity-65 md:opacity-80 transition-opacity duration-1000 motion-reduce:hidden"
        >
          <source src="/financial_intelligent-network.mp4" type="video/mp4" />
        </video>

        {/* Static Fallback for prefers-reduced-motion */}
        <div className="pointer-events-none absolute inset-0 hidden motion-reduce:block bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.12),transparent_50%)]" />
      </div>

      {/* Layer 3: Dark Vignette & Edge Fading Mask for High Readability */}
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_top,_rgba(0,212,255,0.08)_0%,_transparent_65%),linear-gradient(180deg,rgba(5,8,15,0.2)_0%,rgba(5,8,15,0.6)_60%,#05080F_100%)]" />
      <div className="pointer-events-none absolute inset-0 z-[1] bg-[radial-gradient(circle_at_50%_35%,rgba(5,8,15,0.35)_0%,rgba(5,8,15,0.85)_85%)]" />

      {/* Layer 4: Existing Velora UI Content */}
      <div className="relative z-10 flex-1 flex flex-col justify-center">
        {/* Title */}
        <div className="flex flex-col items-center justify-center pt-0 pb-3 md:pt-0 md:pb-4">
          <h1 className="text-center text-2xl md:text-[31px] font-medium leading-snug md:leading-[1.16] tracking-[0.01em] text-white drop-shadow-md">
            Where should<br />we start?
          </h1>
        </div>

        {/* Popular Skills */}
        <div className="px-4 pb-4 md:pb-6">
          <div
            className={cn(
              "pb-3 md:pb-6 no-scrollbar touch-pan-x snap-x snap-mandatory flex gap-3 overflow-x-auto",
              shouldCenterPopular && "sm:justify-center sm:overflow-visible"
            )}
          >
            {popular.length === 0 && (
              <div className="w-full rounded-2xl border border-white/10 bg-white/[0.03] px-4 py-6 text-sm text-white/60 sm:max-w-md sm:text-center">
                Loading popular skills...
              </div>
            )}
            {popular.map((skill, index) => {
              const Icon = iconMap[skill.icon] || Sparkles;
              return (
                <motion.button
                  key={skill.id}
                  onClick={() => onSelectSkill(skill)}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.08 }}
                  className="snap-start w-[158px] flex-none rounded-2xl bg-zinc-900/80 border border-white/10 p-3.5 md:p-4 text-left backdrop-blur-xl transition hover:border-teal-500/40 hover:bg-zinc-900/90 active:scale-[0.985] shadow-lg shadow-black/40"
                >
                  <div className="mb-3 md:mb-5 h-9 w-9 rounded-full bg-white/5 flex items-center justify-center">
                    <Icon className="text-white/70" size={20} strokeWidth={1.8} />
                  </div>
                  <div className="text-[15px] font-semibold leading-tight text-white">
                    {skill.title}
                  </div>
                  <div className="mt-1.5 md:mt-2 text-[13px] leading-snug text-zinc-400 line-clamp-2 md:line-clamp-3">
                    {skill.description}
                  </div>
                </motion.button>
              );
            })}
          </div>
        </div>
      </div>

      {/* Floating Ask Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="relative z-10 w-full px-4 pb-2 mx-auto max-w-md md:max-w-lg md:pb-4"
      >
        <div className="rounded-2xl border border-[#00D4FF]/30 bg-[#0A0F1C]/95 p-4 shadow-2xl shadow-black/80 backdrop-blur-2xl">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              const input = (e.currentTarget.elements.namedItem("query") as HTMLInputElement).value;
              if (input.trim()) onStartChat(input);
            }}
            className="flex items-center gap-3"
          >
            <input
              name="query"
              type="text"
              placeholder="Ask me anything..."
              className="flex-1 bg-transparent text-[16px] text-white/70 placeholder:text-white/40 focus:outline-none"
            />
            <button
              type="submit"
              className="h-9 w-9 rounded-xl bg-white/10 flex items-center justify-center active:bg-white/20 transition"
            >
              <ArrowUp size={18} className="text-white" />
            </button>
          </form>

          <div className="mt-3 flex items-center justify-between">
            <button
              onClick={onOpenSkills}
              className="flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/80 active:bg-white/10 hover:bg-white/10 transition"
            >
              <Sparkles size={16} />
              Skills
            </button>
            {hasSavedChat && (
              <button
                type="button"
                onClick={() => onStartChat("")}
                className="flex items-center gap-1.5 rounded-xl bg-vel-teal/15 border border-vel-teal/30 px-3.5 py-2 text-xs font-semibold text-teal-300 hover:bg-vel-teal/25 transition shadow-sm"
              >
                <span>Resume Chat</span>
                <ArrowUp className="rotate-45" size={13} />
              </button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
