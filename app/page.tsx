"use client";

import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { AppShell } from "@/components/app-shell";
import { DashboardScreen } from "@/components/screens/dashboard-screen";
import { HeadlinesScreen } from "@/components/screens/headlines-screen";
import { PortfolioScreen } from "@/components/screens/portfolio-screen";
import { ResearchScreen } from "@/components/screens/research-screen";
import { SkillLibraryScreen } from "@/components/screens/skill-library-screen";
import { ChatScreen, type SkillContext } from "@/components/screens/chat-screen";
import { SkillIntakeScreen } from "@/components/screens/skill-intake-screen";
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
  const [skillContext, setSkillContext] = useState<SkillContext | undefined>(undefined);
  const [selectedSkill, setSelectedSkill] = useState<Skill | undefined>(undefined);
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

  const handleSelectSkill = (skill: Skill) => {
    setSkillLibraryOpen(false);
    setSelectedSkill(skill);

    if (skill.inputType === "none") {
      setChatPrompt("");
      setSkillContext({
        systemPrompt: skill.systemPrompt,
        displayMessage: skill.displayMessage,
        hiddenPrompt: skill.hiddenPrompt,
        suggestions: skill.suggestions,
      });
      setActive("chat");
    } else {
      setActive("skill-intake");
    }
  };

  const handleSkillIntakeSubmit = (symbols: string[]) => {
    if (!selectedSkill) return;

    let { displayMessage, hiddenPrompt } = selectedSkill;
    
    // Replace {symbol} or {symbol1}, {symbol2}
    if (selectedSkill.inputType === "single_stock" && symbols[0]) {
      displayMessage = displayMessage.replace(/{symbol}/g, symbols[0]);
      hiddenPrompt = hiddenPrompt.replace(/{symbol}/g, symbols[0]);
    } else if (selectedSkill.inputType === "two_stocks" && symbols.length === 2) {
      displayMessage = displayMessage.replace(/{symbol1}/g, symbols[0]).replace(/{symbol2}/g, symbols[1]);
      hiddenPrompt = hiddenPrompt.replace(/{symbol1}/g, symbols[0]).replace(/{symbol2}/g, symbols[1]);
    }

    setChatPrompt("");
    setSkillContext({
      systemPrompt: selectedSkill.systemPrompt,
      displayMessage,
      hiddenPrompt,
      suggestions: selectedSkill.suggestions,
    });
    setActive("chat");
  };

  const handleAnalyzePortfolio = () => {
    const portfolioSkill = skills.find((skill) => skill.id === "portfolio-checkup");

    setChatPrompt("");
    setSkillContext({
      systemPrompt:
        portfolioSkill?.systemPrompt ||
        "You are a personal financial advisor at Velora. Analyze the user's actual portfolio holdings with care, precision, and a constructive tone.",
      displayMessage: portfolioSkill?.displayMessage || "Analyze my whole portfolio using Velora",
      hiddenPrompt:
        portfolioSkill?.hiddenPrompt ||
        "Analyze my entire portfolio. Assess diversification, concentration risk, overall risk/reward, and suggest specific improvements based on my current holdings.",
      suggestions: portfolioSkill?.suggestions || [
        "How should I rebalance this portfolio?",
        "Which position creates the most risk?",
        "What should I research next?",
      ],
    });
    setActive("chat");
  };

  const screen = useMemo(() => {
    if (skillLibraryOpen) {
      return (
        <SkillLibraryScreen 
          skills={skills} 
          onClose={() => setSkillLibraryOpen(false)} 
          onSelectSkill={handleSelectSkill}
        />
      );
    }

    switch (active) {
      case "dashboard":
        return <DashboardScreen onNavigate={handleNavigate} />;
      case "headlines":
        return <HeadlinesScreen />;
      case "portfolio":
        return <PortfolioScreen onViewStock={handleViewStock} onAnalyzePortfolio={handleAnalyzePortfolio} />;
      case "skill-intake":
        if (!selectedSkill) {
          setActive("research");
          return null;
        }
        return (
          <SkillIntakeScreen 
            skill={selectedSkill}
            onSubmit={handleSkillIntakeSubmit}
            onBack={() => setActive("research")}
          />
        );
      case "chat":
        return (
          <ChatScreen 
            initialPrompt={chatPrompt}
            skillContext={skillContext}
            onBack={() => {
              setActive("research");
              setChatPrompt("");
              setSkillContext(undefined);
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
              setSkillContext(undefined);
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
            onSelectSkill={handleSelectSkill}
            onStartChat={(prompt) => {
              setSkillContext(undefined);
              setChatPrompt(prompt);
              setActive("chat");
            }}
          />
        );
    }
  }, [active, skillLibraryOpen, skills, selectedInvestorCik, selectedStockSymbol, previousScreen, selectedSkill, chatPrompt, skillContext]);

  return (
    <AppShell 
      active={active} 
      onNavigate={handleNavigate}
      onDashboard={() => setActive("dashboard")}
      onViewStock={handleViewStock}
      onStartChat={(prompt) => {
        setSkillContext(undefined);
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
