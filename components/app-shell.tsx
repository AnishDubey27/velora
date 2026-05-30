"use client";

import { ReactNode, useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { GlobalSearchModal } from "@/components/global-search";
import { OnboardingModal } from "@/components/onboarding-modal";
import { WatchlistDrawer } from "@/components/watchlist-drawer";
import type { NavKey } from "@/lib/types";
import { Atom, LayoutDashboard, FileText, PieChart, HelpCircle, LogOut, PanelLeftClose, PanelLeftOpen } from "lucide-react";
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
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);

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

  useEffect(() => {
    const collapsed = localStorage.getItem("velora_sidebar_collapsed");
    if (collapsed === "true") {
      setSidebarCollapsed(true);
    }
  }, []);

  const toggleSidebar = () => {
    const nextVal = !sidebarCollapsed;
    setSidebarCollapsed(nextVal);
    localStorage.setItem("velora_sidebar_collapsed", String(nextVal));
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <div className="h-dvh overflow-hidden bg-[#05070C] text-vel-text">
      <section className="relative mx-auto h-dvh w-full max-w-[1480px] overflow-hidden bg-[#070A11] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl flex">
        
        {/* Background gradient */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.09),transparent_40%),linear-gradient(180deg,rgba(7,10,17,0.3),#070A11_75%)] z-0" />
        
        {/* Persistent Desktop Sidebar */}
        <div 
          className={cn(
            "hidden md:flex flex-col border-r border-white/10 bg-[#0A0F1C]/95 backdrop-blur-xl transition-all duration-300 relative z-20 h-full flex-none",
            sidebarCollapsed ? "w-[72px]" : "w-64"
          )}
        >
          {/* Sidebar Header */}
          <div className={cn(
            "flex items-center border-b border-white/10 p-5 h-[64px] flex-none",
            sidebarCollapsed ? "justify-center" : "justify-between"
          )}>
            {!sidebarCollapsed && (
              <span className="text-[15px] font-extrabold tracking-[0.2em] text-white bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
                VELORA
              </span>
            )}
            <button 
              onClick={toggleSidebar} 
              className="text-white/60 hover:text-white transition rounded-lg p-1.5 hover:bg-white/5"
              title={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              {sidebarCollapsed ? <PanelLeftOpen size={19} /> : <PanelLeftClose size={19} />}
            </button>
          </div>

          {/* Navigation Items */}
          <nav className="p-3 pt-6 flex-1 overflow-y-auto no-scrollbar flex flex-col gap-1.5">
            {navItems.map(({ key, label, icon: Icon }) => {
              const isActive = active === key;
              return (
                <button
                  key={key}
                  onClick={() => onNavigate(key)}
                  className={cn(
                    "flex items-center rounded-2xl transition-all relative group",
                    sidebarCollapsed ? "h-12 w-12 justify-center" : "w-full gap-3.5 px-5 py-3.5 text-[15px] font-medium",
                    isActive 
                      ? "bg-white/10 text-[#00D4FF]" 
                      : "text-white/70 hover:bg-white/5 hover:text-white"
                  )}
                  title={sidebarCollapsed ? label : undefined}
                >
                  <Icon size={21} strokeWidth={isActive ? 2.3 : 2} />
                  {!sidebarCollapsed && <span>{label}</span>}
                  
                  {/* Tooltip for collapsed state */}
                  {sidebarCollapsed && (
                    <div className="absolute left-16 scale-0 rounded-lg bg-zinc-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50 pointer-events-none">
                      {label}
                    </div>
                  )}
                </button>
              );
            })}
          </nav>

          {/* Sidebar Footer */}
          <div className="p-3 border-t border-white/10 bg-[#0A0F1C]/50 flex flex-col gap-1.5 flex-none">
            {/* Walkthrough */}
            <button
              onClick={() => setOnboardingOpen(true)}
              className={cn(
                "flex items-center rounded-xl transition-all border group relative",
                sidebarCollapsed 
                  ? "h-12 w-12 justify-center border-cyan-500/10 bg-cyan-500/[0.02] text-cyan-400/80 hover:text-cyan-400 hover:bg-cyan-500/10" 
                  : "w-full gap-3.5 px-5 py-3 text-[14px] font-medium text-cyan-400/80 border-cyan-500/10 bg-cyan-500/[0.02] hover:bg-white/5 hover:text-cyan-400",
              )}
              title={sidebarCollapsed ? "App Walkthrough" : undefined}
            >
              <HelpCircle size={18} strokeWidth={2} />
              {!sidebarCollapsed && <span>App Walkthrough</span>}
              {sidebarCollapsed && (
                <div className="absolute left-16 scale-0 rounded-lg bg-zinc-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50 pointer-events-none">
                  App Walkthrough
                </div>
              )}
            </button>

            {/* Logout */}
            <button
              onClick={handleLogout}
              className={cn(
                "flex items-center rounded-xl transition-all border group relative",
                sidebarCollapsed 
                  ? "h-12 w-12 justify-center border-red-500/10 bg-red-500/[0.02] text-red-400/80 hover:text-red-400 hover:bg-red-500/10" 
                  : "w-full gap-3.5 px-5 py-3 text-[14px] font-medium text-red-400/80 border-red-500/10 bg-red-500/[0.02] hover:bg-white/5 hover:text-red-400",
              )}
              title={sidebarCollapsed ? "Log Out" : undefined}
            >
              <LogOut size={18} strokeWidth={2} />
              {!sidebarCollapsed && <span>Log Out</span>}
              {sidebarCollapsed && (
                <div className="absolute left-16 scale-0 rounded-lg bg-zinc-900 border border-white/10 px-3 py-1.5 text-xs font-semibold text-white shadow-xl transition-all group-hover:scale-100 whitespace-nowrap z-50 pointer-events-none">
                  Log Out
                </div>
              )}
            </button>
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
