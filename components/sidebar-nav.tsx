"use client";

import { Atom, LayoutDashboard, FileText, PieChart } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NavKey } from "@/lib/types";

const navItems = [
  { key: "research" as NavKey, label: "Research", icon: Atom },
  { key: "dashboard" as NavKey, label: "Dashboard", icon: LayoutDashboard },
  { key: "headlines" as NavKey, label: "Headlines", icon: FileText },
  { key: "portfolio" as NavKey, label: "Portfolio", icon: PieChart },
];

type SidebarNavProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
};

export function SidebarNav({ active, onNavigate }: SidebarNavProps) {
  return (
    <nav className="px-3">
      {navItems.map(({ key, label, icon: Icon }) => {
        const isActive = active === key;
        return (
          <button
            key={key}
            onClick={() => onNavigate(key)}
            className={cn(
              "flex w-full items-center gap-3 rounded-xl px-4 py-3 text-left text-[15px] font-medium transition-all mb-1",
              isActive 
                ? "bg-white/10 text-white" 
                : "text-white/60 hover:bg-white/5 hover:text-white/90"
            )}
          >
            <Icon size={22} strokeWidth={2.1} />
            <span>{label}</span>
          </button>
        );
      })}
    </nav>
  );
}