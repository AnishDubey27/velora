"use client";

import { ReactNode, useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { GlobalSearchModal } from "@/components/global-search";
import { OnboardingModal } from "@/components/onboarding-modal";
import { WatchlistDrawer } from "@/components/watchlist-drawer";
import type { NavKey } from "@/lib/types";
import { Atom, LayoutDashboard, FileText, PieChart, HelpCircle, LogOut, Sparkles } from "lucide-react";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";

const navItems = [
  { key: "research" as NavKey, label: "Research", icon: Atom },
  { key: "dashboard" as NavKey, label: "Dashboard", icon: LayoutDashboard },
  { key: "headlines" as NavKey, label: "Headlines", icon: FileText },
  { key: "portfolio" as NavKey, label: "Portfolio", icon: PieChart },
];

type AppShellProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onDashboard: () => void;
  onViewStock?: (symbol: string) => void;
  onStartChat?: (prompt: string) => void;
  children: ReactNode;
};

export function AppShell({ 
  active, 
  onNavigate, 
  onDashboard, 
  onViewStock,
  onStartChat,
  children 
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);
  const [watchlistOpen, setWatchlistOpen] = useState(false);

  const router = useRouter();
  const supabase = createClient();

  useEffect(() => {
    // Check if it's the first visit to open drawer & tour automatically
    const hasVisited = localStorage.getItem("velora_has_visited");
    if (hasVisited !== "true") {
      setDrawerOpen(true);
      setOnboardingOpen(true);
      localStorage.setItem("velora_has_visited", "true");
    }
  }, []);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#05070C] text-vel-text">
      <section className="relative mx-auto h-dvh w-full max-w-[1480px] overflow-hidden bg-[#070A11] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl flex">
        
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.09),transparent_40%),linear-gradient(180deg,rgba(7,10,17,0.3),#070A11_75%)] z-0" />
        
        {/* Persistent Desktop Sidebar with Hardware-Accelerated 120fps CSS Hover Overlay */}
        <div className="group/sidebar hidden md:block relative z-30 flex-none w-[72px] h-full">
          <div className="absolute top-0 left-0 bottom-0 flex flex-col border-r border-white/10 bg-[#0A0F1C] transition-[width,box-shadow] duration-200 ease-[cubic-bezier(0.16,1,0.3,1)] w-[72px] group-hover/sidebar:w-64 group-hover/sidebar:shadow-[20px_0_50px_rgba(0,0,0,0.85)] group-hover/sidebar:border-r-white/20 h-full overflow-hidden will-change-[width]">
            
            {/* Sidebar Header */}
            <div className="flex items-center border-b border-white/10 px-4 h-[64px] flex-none overflow-hidden">
              <div className="flex items-center gap-3 min-w-max">
                <div className="h-9 w-9 rounded-xl bg-vel-teal/15 flex items-center justify-center border border-vel-teal/30 shadow-glow shrink-0">
                  <span className="font-black text-base text-vel-teal">V</span>
                </div>
                <span className="text-[15px] font-extrabold tracking-[0.2em] text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-all duration-150 translate-x-[-6px] group-hover/sidebar:translate-x-0">
                  VELORA
                </span>
              </div>
            </div>

            {/* Navigation Items */}
            <nav className="p-2.5 pt-5 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5">
              {navItems.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => onNavigate(key)}
                    className={cn(
                      "flex items-center h-12 w-full rounded-2xl transition-all relative px-3 gap-3.5 min-w-max text-left",
                      isActive 
                        ? "bg-white/10 text-[#00D4FF]" 
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <div className="h-6 w-6 flex items-center justify-center shrink-0">
                      <Icon size={21} strokeWidth={isActive ? 2.3 : 2} />
                    </div>
                    <span className="text-[15px] font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-all duration-150 translate-x-[-6px] group-hover/sidebar:translate-x-0 pointer-events-none group-hover/sidebar:pointer-events-auto">
                      {label}
                    </span>
                  </button>
                );
              })}
            </nav>

            {/* Sidebar Footer */}
            <div className="p-2.5 border-t border-white/10 bg-[#0A0F1C]/80 flex flex-col gap-1.5 flex-none">
              {/* Walkthrough */}
              <button
                onClick={() => setOnboardingOpen(true)}
                className="flex items-center h-11 w-full rounded-xl transition-all border border-cyan-500/10 bg-cyan-500/[0.02] text-cyan-400/80 hover:text-cyan-400 hover:bg-cyan-500/10 px-3 gap-3.5 min-w-max text-left"
              >
                <div className="h-5 w-5 flex items-center justify-center shrink-0">
                  <HelpCircle size={18} strokeWidth={2} />
                </div>
                <span className="text-[13.5px] font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-all duration-150 translate-x-[-6px] group-hover/sidebar:translate-x-0 pointer-events-none group-hover/sidebar:pointer-events-auto">
                  App Walkthrough
                </span>
              </button>

              {/* Logout */}
              <button
                onClick={handleLogout}
                className="flex items-center h-11 w-full rounded-xl transition-all border border-red-500/10 bg-red-500/[0.02] text-red-400/80 hover:text-red-400 hover:bg-red-500/10 px-3 gap-3.5 min-w-max text-left"
              >
                <div className="h-5 w-5 flex items-center justify-center shrink-0">
                  <LogOut size={18} strokeWidth={2} />
                </div>
                <span className="text-[13.5px] font-medium whitespace-nowrap opacity-0 group-hover/sidebar:opacity-100 transition-all duration-150 translate-x-[-6px] group-hover/sidebar:translate-x-0 pointer-events-none group-hover/sidebar:pointer-events-auto">
                  Log Out
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Main Content Pane */}
        <div className="relative z-10 flex h-dvh flex-1 flex-col overflow-hidden">
          <TopBar 
            onDashboard={onDashboard} 
            onMenuClick={() => setDrawerOpen(true)} 
            onSearchClick={() => setSearchOpen(true)}
            onWatchlistClick={() => setWatchlistOpen(true)}
          />

          {/* Main scrollable area */}
          <main className="flex-1 overflow-y-auto overscroll-y-contain px-4 pb-20 pt-2 md:px-8 md:pb-12 md:pt-6 app-scroll z-10">
            <div className="mx-auto max-w-5xl">
              {children}
            </div>
          </main>

          <div className="md:hidden">
            <BottomNav active={active} onNavigate={onNavigate} />
          </div>
        </div>

        <SidebarDrawer 
          active={active}
          onNavigate={onNavigate}
          isOpen={drawerOpen}
          onClose={() => setDrawerOpen(false)}
          onOpenTour={() => setOnboardingOpen(true)}
        />

        <OnboardingModal
          isOpen={onboardingOpen}
          onClose={() => setOnboardingOpen(false)}
          onNavigate={onNavigate}
        />

        <GlobalSearchModal
          isOpen={searchOpen}
          onClose={() => setSearchOpen(false)}
          onSelect={(symbol) => {
            setSearchOpen(false);
            if (onViewStock) {
              onViewStock(symbol);
            } else if (onStartChat) {
              onStartChat(`Give me an analysis on ${symbol}`);
            }
          }}
        />

        <WatchlistDrawer
          isOpen={watchlistOpen}
          onClose={() => setWatchlistOpen(false)}
          onSelect={(symbol) => {
            if (onViewStock) onViewStock(symbol);
          }}
        />
      </section>
    </div>
  );
}
