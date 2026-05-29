"use client";

import { ArrowUp, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

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
  const popular = skills.filter((skill) => skill.popular).slice(0, 3);
  const shouldCenterPopular = popular.length <= 3;

  return (
    <div className="bg-[#05080F] flex flex-col justify-between min-h-[calc(100dvh-152px)] md:min-h-[calc(100dvh-136px)] pb-4 pt-0 md:pb-6">
      <div className="flex-1 flex flex-col justify-center">
        {/* Title */}
        <div className="flex flex-col items-center justify-center pt-0 pb-3 md:pt-0 md:pb-4">
          <h1 className="text-center text-2xl md:text-[31px] font-medium leading-snug md:leading-[1.16] tracking-[0.01em] text-white">
            Where should<br />we start?
          </h1>
        </div>

        {/* Popular Skills */}
        <div className="px-4 pb-4 md:pb-6">
          <p className="mb-2 md:mb-3 px-1 text-xs font-bold uppercase tracking-[1.5px] text-zinc-400">
            POPULAR SKILLS
          </p>

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
                  className="snap-start w-[158px] flex-none rounded-2xl bg-zinc-900/70 border border-white/5 p-3.5 md:p-4 text-left backdrop-blur-xl transition hover:border-teal-500/30 active:scale-[0.985]"
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
        className="w-full px-4 pb-2 mx-auto max-w-md md:max-w-lg md:pb-4"
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
