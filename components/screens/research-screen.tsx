"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

type ResearchScreenProps = {
  skills: Skill[];
  onOpenSkills: () => void;
  onStartChat: (prompt: string) => void;
};

const iconMap: any = {
  compare: Sparkles,
  timing: Sparkles,
  quality: Sparkles,
  news: Sparkles,
};

export function ResearchScreen({ skills, onOpenSkills, onStartChat }: ResearchScreenProps) {
  const popular = skills.filter((skill) => skill.popular).slice(0, 3);
  const shouldCenterPopular = popular.length <= 3;

  return (
    <div className="min-h-screen bg-[#05080F] pb-20 pt-2 md:pb-12">
      <div className="h-3" />

      {/* Logo + Title */}
      <div className="flex flex-col items-center justify-center pt-6 pb-8">
        <motion.svg
          width="76"
          height="76"
          viewBox="0 0 88 88"
          fill="none"
          className="mb-5 drop-shadow-[0_0_26px_rgba(220,236,255,0.22)]"
          animate={{ y: [0, -5, 0], opacity: [0.86, 1, 0.86] }}
          transition={{ duration: 2.4, repeat: Infinity, ease: "easeInOut" }}
        >
          <path d="M44 7L76 57L44 42L12 57L44 7Z" fill="url(#homeMarkA)" />
          <path d="M44 39L68 81L44 61L20 81L44 39Z" fill="url(#homeMarkB)" />
          <defs>
            <linearGradient id="homeMarkA" x1="44" x2="44" y1="7" y2="57" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FAFC" />
              <stop offset=".5" stopColor="#8C96A8" />
              <stop offset="1" stopColor="#0B0F19" />
            </linearGradient>
            <linearGradient id="homeMarkB" x1="44" x2="44" y1="39" y2="81" gradientUnits="userSpaceOnUse">
              <stop stopColor="#F8FAFC" />
              <stop offset=".52" stopColor="#CBD5E1" />
              <stop offset="1" stopColor="#111827" />
            </linearGradient>
          </defs>
        </motion.svg>

        <h1 className="text-center text-[31px] font-medium leading-[1.16] tracking-[0.01em] text-white">
          Where should<br />we start?
        </h1>
      </div>

      {/* Popular Skills */}
      <div className="px-4 pb-6">
        <p className="mb-3 px-1 text-xs font-bold uppercase tracking-[1.5px] text-zinc-400">
          POPULAR SKILLS
        </p>

        <div
          className={cn(
            "pb-6 no-scrollbar touch-pan-x snap-x snap-mandatory flex gap-3 overflow-x-auto",
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
                onClick={() => onStartChat(skill.description)}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: index * 0.08 }}
                className="snap-start w-[158px] flex-none rounded-2xl bg-zinc-900/70 border border-white/5 p-4 text-left backdrop-blur-xl transition hover:border-teal-500/30 active:scale-[0.985]"
              >
                <div className="mb-5 h-9 w-9 rounded-full bg-white/5 flex items-center justify-center">
                  <Icon className="text-white/70" size={20} strokeWidth={1.8} />
                </div>
                <div className="text-[15px] font-semibold leading-tight text-white">
                  {skill.title}
                </div>
                <div className="mt-2 text-[13px] leading-snug text-zinc-400 line-clamp-3">
                  {skill.description}
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>

      {/* Floating Ask Bar */}
      <motion.div
        initial={{ y: 20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="fixed bottom-20 left-4 right-4 z-40 mx-auto max-w-md md:max-w-lg"
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

          <button
            onClick={onOpenSkills}
            className="mt-3 flex items-center gap-2 rounded-xl bg-white/5 px-4 py-2 text-sm font-medium text-white/80 active:bg-white/10"
          >
            <Sparkles size={16} />
            Skills
          </button>
        </div>
      </motion.div>
    </div>
  );
}
