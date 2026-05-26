"use client";

import { Atom, LayoutDashboard, FileText, PieChart, X, HelpCircle, LogOut } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { createClient } from "@/utils/supabase/client";
import { cn } from "@/lib/utils";
import type { NavKey } from "@/lib/types";

const navItems = [
  { key: "research" as NavKey, label: "Research", icon: Atom },
  { key: "dashboard" as NavKey, label: "Dashboard", icon: LayoutDashboard },
  { key: "headlines" as NavKey, label: "Headlines", icon: FileText },
  { key: "portfolio" as NavKey, label: "Portfolio", icon: PieChart },
];

type SidebarDrawerProps = {
  active: NavKey;
  onNavigate: (key: NavKey) => void;
  isOpen: boolean;
  onClose: () => void;
  onOpenTour: () => void;
};

export function SidebarDrawer({ active, onNavigate, isOpen, onClose, onOpenTour }: SidebarDrawerProps) {
  const router = useRouter();
  const supabase = createClient();

  const handleLogout = async () => {
    await supabase.auth.signOut();
    router.push("/login");
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-50 bg-black/70 md:bg-black/60"
          />

          {/* Drawer */}
          <motion.div
            initial={{ x: "-100%" }}
            animate={{ x: 0 }}
            exit={{ x: "-100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed left-0 top-0 z-50 h-full w-72 bg-[#0A0F1C] border-r border-white/10 shadow-2xl md:w-80 flex flex-col"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-white/10 p-5 flex-none">
              <div className="flex items-center gap-2">
                <div className="text-xl font-bold tracking-[0.12em]">VELORA</div>
              </div>
              <button onClick={onClose} className="text-white/60 hover:text-white">
                <X size={24} />
              </button>
            </div>

            {/* Scrollable Navigation */}
            <nav className="p-3 pt-6 flex-1 overflow-y-auto no-scrollbar">
              {navItems.map(({ key, label, icon: Icon }) => {
                const isActive = active === key;
                return (
                  <button
                    key={key}
                    onClick={() => {
                      onNavigate(key);
                      onClose();
                    }}
                    className={cn(
                      "flex w-full items-center gap-3.5 rounded-2xl px-5 py-4 text-left text-[15px] font-medium transition-all mb-1",
                      isActive 
                        ? "bg-white/10 text-white" 
                        : "text-white/70 hover:bg-white/5 hover:text-white"
                    )}
                  >
                    <Icon size={22} strokeWidth={2.1} />
                    <span>{label}</span>
                  </button>
                );
              })}
            </nav>

            {/* Footer Walkthrough Button */}
            <div className="p-4 border-t border-white/10 bg-[#0A0F1C]/50 flex-none">
              <button
                onClick={() => {
                  onOpenTour();
                  onClose();
                }}
                className="flex w-full items-center gap-3.5 rounded-2xl px-5 py-3.5 text-left text-[14px] font-medium text-cyan-400/80 hover:bg-white/5 hover:text-cyan-400 transition-all border border-cyan-500/10 bg-cyan-500/[0.02]"
              >
                <HelpCircle size={20} strokeWidth={2.1} />
                <span>App Walkthrough</span>
              </button>
              <button
                onClick={() => {
                  handleLogout();
                  onClose();
                }}
                className="flex w-full mt-2 items-center gap-3.5 rounded-2xl px-5 py-3.5 text-left text-[14px] font-medium text-red-400/80 hover:bg-white/5 hover:text-red-400 transition-all border border-red-500/10 bg-red-500/[0.02]"
              >
                <LogOut size={20} strokeWidth={2.1} />
                <span>Log Out</span>
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}