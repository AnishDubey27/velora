"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { HeadlinesScreen } from "@/components/screens/headlines-screen";
import { PortfolioScreen } from "@/components/screens/portfolio-screen";
import { ResearchScreen } from "@/components/screens/research-screen";
import { SkillLibraryScreen } from "@/components/screens/skill-library-screen";
import { ChatScreen } from "@/components/screens/chat-screen";
import { RedditTrendingScreen } from "@/components/screens/reddit-trending-screen";
import { InsiderTradingScreen } from "@/components/screens/insider-trading-screen";
import { CongressTradingScreen } from "@/components/screens/congress-trading-screen";
import { SuperInvestorsScreen } from "@/components/screens/super-investors-screen";
import { SuperInvestorProfileScreen } from "@/components/screens/super-investor-profile-screen";
import { StockDetailScreen } from "@/components/screens/stock-detail-screen";
import type { NavKey, Skill } from "@/lib/types";

const screenVariants = {
  enter: { opacity: 0, y: 12, filter: "blur(8px)" },
  center: { opacity: 1, y: 0, filter: "blur(0px)" },
  exit: { opacity: 0, y: -10, filter: "blur(8px)" }
};

export default function Home() {
  const [active, setActive] = useState<NavKey>("research");
  const [skillLibraryOpen, setSkillLibraryOpen] = useState(false);
  const [chatPrompt, setChatPrompt] = useState<string>("");
  const [skills, setSkills] = useState<Skill[]>([]);
  const [selectedInvestorCik, setSelectedInvestorCik] = useState<string>("");
  const [selectedStockSymbol, setSelectedStockSymbol] = useState<string>("");
  const [previousScreen, setPreviousScreen] = useState<NavKey>("research");

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

  const handleNavigate = (key: NavKey) => {
    setSkillLibraryOpen(false);
    setActive(key);
  };

  const handleViewStock = (symbol: string) => {
    setPreviousScreen(active);
    setSelectedStockSymbol(symbol);
    setActive("stock-detail");
  };

  const screen = useMemo(() => {
    if (skillLibraryOpen) {
      return <SkillLibraryScreen skills={skills} onClose={() => setSkillLibraryOpen(false)} />;
    }

    switch (active) {
      case "dashboard":
        return <DashboardScreen onNavigate={handleNavigate} />;
      case "headlines":
        return <HeadlinesScreen />;
      case "portfolio":
        return <PortfolioScreen onViewStock={handleViewStock} />;
      case "chat":
        return (
          <ChatScreen 
            initialPrompt={chatPrompt} 
            onBack={() => {
              setActive("research");
              setChatPrompt("");
            }} 
          />
        );
      case "reddit-trending":
        return <RedditTrendingScreen onBack={() => setActive("dashboard")} />;
      case "insider-trading":
        return <InsiderTradingScreen onBack={() => setActive("dashboard")} />;
      case "congress-trading":
        return <CongressTradingScreen onBack={() => setActive("dashboard")} />;
      case "super-investors":
        return (
          <SuperInvestorsScreen 
            onBack={() => setActive("dashboard")} 
            onViewProfile={(cik: string) => {
              setSelectedInvestorCik(cik);
              setActive("super-investor-profile");
            }}
          />
        );
      case "super-investor-profile":
        return (
          <SuperInvestorProfileScreen 
            cik={selectedInvestorCik} 
            onBack={() => setActive("super-investors")} 
          />
        );
      case "stock-detail":
        return (
          <StockDetailScreen
            symbol={selectedStockSymbol}
            onBack={() => setActive(previousScreen)}
            onStartChat={(prompt) => {
              setChatPrompt(prompt);
              setActive("chat");
            }}
          />
        );
      default:
        return (
          <ResearchScreen
            skills={skills}
            onOpenSkills={() => setSkillLibraryOpen(true)}
            onStartChat={(prompt) => {
              setChatPrompt(prompt);
              setActive("chat");
            }}
          />
        );
    }
  }, [active, skillLibraryOpen, skills, selectedInvestorCik, selectedStockSymbol, previousScreen]);

  return (
    <AppShell 
      active={active} 
      onNavigate={handleNavigate}
      onDashboard={() => setActive("dashboard")}
      onViewStock={handleViewStock}
      onStartChat={(prompt) => {
        setChatPrompt(prompt);
        setActive("chat");
      }}
    >
      <AnimatePresence mode="wait">
        <motion.main
          key={`${active}-${skillLibraryOpen ? "library" : "main"}-${active === "super-investor-profile" ? selectedInvestorCik : ""}-${active === "stock-detail" ? selectedStockSymbol : ""}`}
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
