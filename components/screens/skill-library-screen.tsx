"use client";

import { useMemo, useState } from "react";
import {
  BarChart3,
  ChevronRight,
  GitCompare,
  LineChart,
  Newspaper,
  Search,
  Sparkles,
  X
} from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

type SkillLibraryScreenProps = {
  skills: Skill[];
  onClose: () => void;
};

const iconMap = {
  compare: GitCompare,
  timing: BarChart3,
  quality: LineChart,
  news: Newspaper
};

const tabs = ["Popular", "Explore", "Analyze"] as const;

export function SkillLibraryScreen({ skills, onClose }: SkillLibraryScreenProps) {
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<(typeof tabs)[number]>("Popular");

  const filtered = useMemo(() => {
    const normalized = query.trim().toLowerCase();
    return skills.filter((skill) => {
      const tabMatch =
        tab === "Popular" ? skill.popular : skill.mode.toLowerCase() === tab.toLowerCase();
      const queryMatch =
        !normalized ||
        skill.title.toLowerCase().includes(normalized) ||
        skill.description.toLowerCase().includes(normalized) ||
        skill.category.toLowerCase().includes(normalized);
      return tabMatch && queryMatch;
    });
  }, [query, skills, tab]);

  const groups = useMemo(() => {
    return filtered.reduce<Record<string, Skill[]>>((acc, skill) => {
      acc[skill.category] ||= [];
      acc[skill.category].push(skill);
      return acc;
    }, {});
  }, [filtered]);

  return (
    <section className="pb-6 pt-1">
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-[22px] font-semibold tracking-[-0.01em] text-white/90">
          Skill Library
        </h1>
        <button
          onClick={onClose}
          aria-label="Close skill library"
          className="grid h-9 w-9 place-items-center rounded-md bg-white/[0.04] text-white/40"
        >
          <X size={15} />
        </button>
      </div>

      <label className="mb-3 flex items-center gap-2 rounded-lg border border-white/[0.06] bg-black/20 px-3 py-3">
        <Search size={17} className="text-white/40" />
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Search prompts"
          className="w-full bg-transparent text-[14px] text-white/80 outline-none placeholder:text-white/40"
        />
      </label>

      <div className="mb-4 flex gap-2">
        {tabs.map((item) => (
          <button
            key={item}
            onClick={() => setTab(item)}
            className={cn(
              "inline-flex h-9 items-center gap-1.5 rounded-lg px-3 text-[13px] transition",
              tab === item
                ? "bg-bone-teal/20 text-white shadow-glow"
                : "bg-white/[0.045] text-white/70"
            )}
          >
            {item === "Popular" && <Sparkles size={12} />}
            {item === "Explore" && <Search size={12} />}
            {item === "Analyze" && <BarChart3 size={12} />}
            {item}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {Object.entries(groups).map(([category, group], groupIndex) => (
          <motion.div
            key={category}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.05 }}
          >
            <h2 className="mb-1 text-[14px] font-medium text-white/75">{category}</h2>
            <div className="space-y-1">
              {group.map((skill) => {
                const Icon = iconMap[skill.icon] ?? Sparkles;
                return (
                  <button
                    key={skill.id}
                    className="flex w-full items-center gap-3 rounded-lg px-1 py-2.5 text-left transition hover:bg-white/[0.035]"
                  >
                    <span className="grid h-9 w-9 flex-none place-items-center rounded-full bg-white/[0.045] text-white/75">
                      <Icon size={16} strokeWidth={1.75} />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-[15px] font-semibold leading-tight text-white/90">
                        {skill.title}
                      </span>
                      <span className="mt-1 block text-[13px] leading-snug text-white/60">
                        {skill.description}
                      </span>
                    </span>
                    <ChevronRight size={18} className="text-white/50" />
                  </button>
                );
              })}
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}
