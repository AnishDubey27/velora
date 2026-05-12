"use client";

import { ReactNode, useState } from "react";
import { BottomNav } from "@/components/bottom-nav";
import { TopBar } from "@/components/top-bar";
import { SidebarDrawer } from "@/components/sidebar-drawer";
import type { NavKey } from "@/lib/types";

type AppShellProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  onDashboard: () => void;
  children: ReactNode;
};

export function AppShell({ 
  active, 
  onNavigate, 
  onDashboard, 
  children 
}: AppShellProps) {
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="h-dvh overflow-hidden bg-[#05070C] text-bone-text">
      <section className="relative mx-auto h-dvh w-full max-w-[1480px] overflow-hidden bg-[#070A11] md:rounded-3xl md:border md:border-white/10 md:shadow-2xl">
        
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_20%,rgba(0,212,255,0.09),transparent_40%),linear-gradient(180deg,rgba(7,10,17,0.3),#070A11_75%)]" />
        
        <div className="relative z-10 flex h-dvh flex-col">
          <TopBar 
            onDashboard={onDashboard} 
            onMenuClick={() => setDrawerOpen(true)} 
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
        />
      </section>
    </div>
  );
}
