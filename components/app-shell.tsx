"use client";

import { ReactNode, useState, useEffect } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import { GlobalSearchModal } from "@/components/global-search";
import { OnboardingModal } from "@/components/onboarding-modal";
import type { NavKey } from "@/lib/types";

type AppShellProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onDashboard: () => void;
  onStartChat?: (prompt: string) => void;
  children: ReactNode;
};

export function AppShell({ 
  active, 
  onNavigate, 
  onDashboard, 
  onStartChat,
  children 
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [onboardingOpen, setOnboardingOpen] = useState(false);

  useEffect(() => {
    // Check if it's the first visit to open drawer & tour automatically
    const hasVisited = localStorage.getItem("velora_has_visited");
    if (hasVisited !== "true") {
      setDrawerOpen(true);
      setOnboardingOpen(true);
      localStorage.setItem("velora_has_visited", "true");
    }
  }, []);

  return (
    <div className="h-dvh overflow-hidden bg-[#05070C] text-vel-text">
      <section className="relative mx-auto h-dvh w-full max-w-[1480px] overflow-hidden bg-[#070A11] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl">
        
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.09),transparent_40%),linear-gradient(180deg,rgba(7,10,17,0.3),#070A11_75%)]" />
        
        <div className="relative z-10 flex h-dvh flex-col">
          <TopBar 
            onDashboard={onDashboard} 
            onMenuClick={() => setDrawerOpen(true)} 
            onSearchClick={() => setSearchOpen(true)}
          />

          {/* Main scrollable area - this is the critical part */}
          <main className="flex-1 overflow-y-scroll overscroll-y-contain px-4 pb-20 pt-2 md:px-8 md:pb-12 md:pt-6 app-scroll">
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
            if (onStartChat) {
              onStartChat(`Give me an analysis on ${symbol}`);
            }
          }}
        />
      </section>
    </div>
  );
}
