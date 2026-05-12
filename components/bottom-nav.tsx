"use client";

import { Atom, LayoutDashboard, FileText, PieChart } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/lib/utils";
import type { NavKey } from "@/lib/types";

type Item = {
  key: NavKey;
  label: string;
  Icon: typeof Atom;
};

const items: Item[] = [
  { key: "research", label: "RESEARCH", Icon: Atom },
  { key: "dashboard", label: "DASHBOARD", Icon: LayoutDashboard },
  { key: "headlines", label: "HEADLINES", Icon: FileText },
  { key: "portfolio", label: "PORTFOLIO", Icon: PieChart },
];

type BottomNavProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
};

export function BottomNav({ active, onNavigate }: BottomNavProps) {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-white/[0.06] bg-[#0A0F1C]/95 px-3 pb-[calc(10px+env(safe-area-inset-bottom))] pt-2 backdrop-blur-2xl">
      <div className="grid grid-cols-4 max-w-md mx-auto">
        {items.map(({ key, label, Icon }) => {
          const selected = active === key;
          return (
            <button
              key={key}
              onClick={() => onNavigate(key)}
              className={cn(
                "relative flex h-[58px] flex-col items-center justify-center gap-1 rounded-xl text-[10px] font-medium tracking-widest transition-all",
                selected ? "text-[#00D4FF]" : "text-zinc-400 hover:text-zinc-300"
              )}
            >
              {selected && (
                <motion.span
                  layoutId="nav-active"
                  className="absolute inset-x-4 top-1 h-0.5 rounded-full bg-[#00D4FF]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <Icon size={24} strokeWidth={2.25} />
              <span className="text-[10px]">{label}</span>
            </button>
          );
        })}
      </div>
      <div className="mx-auto mt-1 h-1 w-12 rounded-full bg-white/20" />
    </nav>
  );
}