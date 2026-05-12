"use client";

import { Menu, Search, Star } from "lucide-react";

export function TopBar({ 
  onDashboard, 
  onMenuClick,
  onSearchClick
}: { 
  onDashboard: () => void; 
  onMenuClick: () => void;
  onSearchClick?: () => void;
}) {
  return (
    <header className="sticky top-0 z-40 flex h-[64px] items-center justify-between bg-[#070A11]/95 px-4 pt-[env(safe-area-inset-top)] backdrop-blur-xl border-b border-white/10">
      <button
        onClick={onMenuClick}
        className="grid h-10 w-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/5"
      >
        <Menu size={20} strokeWidth={2.4} />
      </button>

      <span className="text-[13px] font-bold tracking-[0.16em] text-white">VELORA</span>

      <div className="flex items-center gap-2">
        <button 
          onClick={onSearchClick}
          className="grid h-10 w-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/5"
        >
          <Search size={19} strokeWidth={2.1} />
        </button>
        <button className="grid h-10 w-10 place-items-center rounded-xl text-white/80 transition hover:bg-white/5">
          <Star size={19} strokeWidth={1.9} />
        </button>
      </div>
    </header>
  );
}
