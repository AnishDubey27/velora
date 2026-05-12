"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { HeadlinesScreen } from "@/components/screens/headlines-screen";
import { PortfolioScreen } from "@/components/screens/portfolio-screen";
import { ResearchScreen } from "@/components/screens/research-screen";
import { SkillLibraryScreen } from "@/components/screens/skill-library-screen";
import type { NavKey, Skill } from "@/lib/types";

const screenVariants = {
  enter: { opacity: 0, y: 12, filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(8px)" }
};

export default function Home() {
  const [active, setActive] = useState<NavKey>("research");
  const [skillLibraryOpen, setSkillLibraryOpen] = useState(false);
  const [skills, setSkills] = useState<Skill[]>([]);

  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(() => undefined);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;

    fetch("/api/skills")
      .then((res) => res.json())
      .then((rows) => {
        if (cancelled) return;
        if (Array.isArray(rows)) {
          setSkills(rows);
        }
      })
      .catch(() => undefined);

    return () => {
      cancelled = true;
    };
  }, []);

  const screen = useMemo(() => {
    if (skillLibraryOpen) {
      return <SkillLibraryScreen skills={skills} onClose={() => setSkillLibraryOpen(false)} />;
    }

    switch (active) {
      case "dashboard":
        return <DashboardScreen />;
      case "headlines":
        return <HeadlinesScreen />;
      case "portfolio":
        return <PortfolioScreen />;
      default:
        return (
          <ResearchScreen
            skills={skills}
            onOpenSkills={() => setSkillLibraryOpen(true)}
          />
        );
    }
  }, [active, skillLibraryOpen, skills]);

  return (
    <AppShell 
      active={active} 
      onNavigate={setActive}
      onDashboard={() => setActive("dashboard")}
    >
      <AnimatePresence mode="wait">
        <motion.main
          key={`${active}-${skillLibraryOpen ? "library" : "main"}`}
          variants={screenVariants}
          initial="enter"
          animate="center"
          exit="exit"
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
          className="min-h-full"
        >
          {screen}
        </motion.main>
      </AnimatePresence>
    </AppShell>
  );
}
