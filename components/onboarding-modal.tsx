"use client";

import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  Sparkles, 
  Atom, 
  LayoutDashboard, 
  FileText, 
  PieChart, 
  X, 
  ChevronRight, 
  ChevronLeft, 
  Check,
  TrendingUp,
  BrainCircuit
} from "lucide-react";

type OnboardingModalProps = {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (key: any) => void;
};

const slides = [
  {
    title: "Welcome to Velora",
    subtitle: "Your AI-Powered Investment Terminal",
    description: "Velora is a next-generation workspace designed to give you retail-accessible, institutional-grade financial analysis and portfolio intelligence.",
    icon: BrainCircuit,
    color: "from-blue-500 to-indigo-500",
    glowColor: "rgba(59, 130, 246, 0.15)",
    features: [
      "AI Equity Analyst at your fingertips",
      "Comprehensive market sentiment tracker",
      "Intelligent portfolio risk profiling"
    ]
  },
  {
    title: "Investment Research",
    subtitle: "Ask Questions. Get Conviction.",
    description: "Consult specialized AI agents to compare equities, analyze earnings transcripts, assess timing, and review fundamental health.",
    icon: Atom,
    color: "from-purple-500 to-pink-500",
    glowColor: "rgba(168, 85, 247, 0.15)",
    navKey: "research",
    features: [
      "Ask natural questions: 'Should I buy Nvidia?'",
      "Read complex earnings calls simplified in seconds",
      "Identify optimal buy & sell levels with AI guidance"
    ]
  },
  {
    title: "Command Dashboard",
    subtitle: "Real-Time Market Pulse",
    description: "Track macroeconomic health, trending topics across domestic and global markets, fear & greed gauges, and high-signal events.",
    icon: LayoutDashboard,
    color: "from-teal-500 to-emerald-500",
    glowColor: "rgba(20, 184, 166, 0.15)",
    navKey: "dashboard",
    features: [
      "Live Fear & Greed index tracker",
      "Curated trending list with instant AI briefing",
      "Real-time event calendars & earnings dates"
    ]
  },
  {
    title: "Sentiment Headlines",
    subtitle: "Cut Through the Noise",
    description: "Access real-time, categorized news feeds with instant AI-driven sentiment analysis (Positive, Neutral, Negative) to spot trends early.",
    icon: FileText,
    color: "from-amber-500 to-orange-500",
    glowColor: "rgba(245, 158, 11, 0.15)",
    navKey: "headlines",
    features: [
      "Filter by Country: US, India, Global, or Crypto",
      "Color-coded instant sentiment labels",
      "Concise summaries highlighting absolute truth"
    ]
  },
  {
    title: "Portfolio Intelligence",
    subtitle: "Optimize & Visualize Risk",
    description: "Model your holdings to analyze allocation weight, run risk profiling, and receive automated AI alerts based on technical indicators.",
    icon: PieChart,
    color: "from-rose-500 to-red-500",
    glowColor: "rgba(244, 63, 94, 0.15)",
    navKey: "portfolio",
    features: [
      "Advanced glassmorphic allocation rings",
      "Automated risk scoring (1 to 10)",
      "Technical breakout & decay signals"
    ]
  }
];

export function OnboardingModal({ isOpen, onClose, onNavigate }: OnboardingModalProps) {
  const [currentSlide, setCurrentSlide] = useState(0);

  if (!isOpen) return null;

  const slide = slides[currentSlide];
  const Icon = slide.icon;

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(prev => prev + 1);
    } else {
      onClose();
    }
  };

  const handlePrev = () => {
    if (currentSlide > 0) {
      setCurrentSlide(prev => prev - 1);
    }
  };

  const handleQuickJump = (navKey: string) => {
    if (navKey) {
      onNavigate(navKey);
      onClose();
    }
  };

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-black/80 backdrop-blur-md"
        />

        {/* Modal Window */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 15 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 15 }}
          transition={{ type: "spring", damping: 25, stiffness: 350 }}
          className="relative w-full max-w-lg overflow-hidden rounded-3xl border border-white/10 bg-[#0A0F1D] shadow-2xl"
          style={{
            boxShadow: `0 0 50px -12px ${slide.glowColor}`
          }}
        >
          {/* Close button */}
          <button 
            onClick={onClose}
            className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-2 text-white/60 hover:bg-white/10 hover:text-white transition"
          >
            <X size={18} />
          </button>

          {/* Slide Content */}
          <div className="p-6 md:p-8 pt-10">
            {/* Slide Indicator Bar */}
            <div className="mb-8 flex gap-1.5 justify-center">
              {slides.map((_, idx) => (
                <button
                  key={idx}
                  onClick={() => setCurrentSlide(idx)}
                  className={`h-1.5 rounded-full transition-all duration-300 ${
                    idx === currentSlide ? "w-8 bg-cyan-400" : "w-2 bg-white/20 hover:bg-white/40"
                  }`}
                />
              ))}
            </div>

            {/* Visual Icon Header */}
            <div className="mb-6 flex justify-center">
              <motion.div 
                key={currentSlide}
                initial={{ scale: 0.8, opacity: 0, rotate: -10 }}
                animate={{ scale: 1, opacity: 1, rotate: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 20 }}
                className={`relative flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-tr ${slide.color} p-5 shadow-xl`}
              >
                <div className="absolute inset-0 rounded-2xl bg-current opacity-10 blur-xl" />
                <Icon size={40} className="text-white" strokeWidth={1.8} />
              </motion.div>
            </div>

            {/* Titles */}
            <div className="text-center">
              <span className="text-[11px] font-bold uppercase tracking-[2px] text-cyan-400/90">
                {slide.subtitle}
              </span>
              <h2 className="mt-1.5 text-2xl font-bold tracking-tight text-white md:text-3xl">
                {slide.title}
              </h2>
              <p className="mt-3 text-sm leading-relaxed text-zinc-400 md:text-base">
                {slide.description}
              </p>
            </div>

            {/* Feature List */}
            <motion.div 
              key={`features-${currentSlide}`}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.15 }}
              className="mt-6 space-y-2.5 rounded-2xl bg-white/[0.02] border border-white/5 p-4"
            >
              {slide.features.map((feat, index) => (
                <div key={index} className="flex items-start gap-3 text-xs md:text-sm text-zinc-300">
                  <span className="mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full bg-cyan-500/10 text-cyan-400">
                    <Check size={11} strokeWidth={3} />
                  </span>
                  <span>{feat}</span>
                </div>
              ))}
            </motion.div>

            {/* Action buttons */}
            <div className="mt-8 flex items-center justify-between gap-3">
              <button
                onClick={handlePrev}
                disabled={currentSlide === 0}
                className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-semibold transition ${
                  currentSlide === 0 
                    ? "opacity-0 pointer-events-none" 
                    : "text-zinc-400 hover:text-white"
                }`}
              >
                <ChevronLeft size={16} />
                Back
              </button>

              {slide.navKey ? (
                <button
                  onClick={() => handleQuickJump(slide.navKey!)}
                  className="flex items-center gap-1.5 rounded-full bg-white/5 border border-white/10 px-4 py-2 text-xs font-semibold text-cyan-400 hover:bg-white/10 transition"
                >
                  <TrendingUp size={13} />
                  Jump to {slide.title}
                </button>
              ) : null}

              <button
                onClick={handleNext}
                className="flex items-center gap-1.5 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-500 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-cyan-500/20 hover:brightness-110 active:scale-[0.98] transition"
              >
                {currentSlide === slides.length - 1 ? "Start Exploring" : "Next"}
                {currentSlide === slides.length - 1 ? null : <ChevronRight size={16} />}
              </button>
            </div>
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
