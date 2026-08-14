"use client";

import { motion } from "framer-motion";
import { Sparkles, TrendingUp, TrendingDown, ExternalLink, Globe, Zap, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

export type BentoNewsItem = {
  title: string;
  summary: string;
  source: string;
  time: string;
  sentiment?: "Bullish" | "Bearish" | "Neutral";
  sentimentScore?: number;
  symbol?: string;
  price?: number;
  changePercent?: number;
  url?: string | null;
  impact?: "Positive" | "Negative" | "Critical";
};

export function BuiNewsBento({
  items,
  onAskAI,
}: {
  items: BentoNewsItem[];
  onAskAI?: (prompt: string) => void;
}) {
  if (!items || items.length === 0) return null;

  const hero = items[0];
  const secondary = items.slice(1, 3);
  const regular = items.slice(3, 7);

  return (
    <div className="space-y-4">
      {/* Top Bento Row: Hero Catalyst + Secondary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Hero Card (Spans 2 columns on desktop) */}
        {hero && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="md:col-span-2 relative group flex flex-col justify-between p-5 rounded-2xl border border-vel-teal/40 bg-gradient-to-br from-[#0B1728]/95 via-[#08101E]/90 to-[#05080F] shadow-2xl backdrop-blur-xl overflow-hidden hover:border-vel-teal/60 transition-all duration-300"
          >
            {/* Ambient Radial Accent */}
            <div className="absolute top-0 right-0 w-48 h-48 bg-vel-teal/10 rounded-full blur-3xl pointer-events-none" />

            <div>
              {/* Badges Row */}
              <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-vel-teal/20 border border-vel-teal/40 text-[11px] font-bold text-vel-teal uppercase tracking-wider">
                    <Zap size={11} />
                    Lead Market Catalyst
                  </span>
                  <span className="text-[11px] text-white/50 flex items-center gap-1">
                    <Clock size={11} /> {hero.time || "Just now"}
                  </span>
                </div>

                {hero.sentimentScore && (
                  <span
                    className={cn(
                      "text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 border",
                      hero.sentiment === "Bullish"
                        ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                        : hero.sentiment === "Bearish"
                        ? "bg-rose-500/20 text-rose-400 border-rose-500/30"
                        : "bg-white/10 text-white/70 border-white/20"
                    )}
                  >
                    {hero.sentiment === "Bullish" ? <TrendingUp size={11} /> : <TrendingDown size={11} />}
                    {hero.sentiment || "Bullish"} {hero.sentimentScore}%
                  </span>
                )}
              </div>

              {/* Title */}
              <h2 className="text-lg md:text-xl font-bold text-white leading-snug group-hover:text-teal-300 transition-colors">
                {hero.title}
              </h2>

              {/* Summary */}
              <p className="mt-2.5 text-sm leading-relaxed text-white/75 line-clamp-3">
                {hero.summary}
              </p>
            </div>

            {/* Footer Row */}
            <div className="mt-5 pt-3.5 border-t border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="h-6 w-6 rounded-md bg-white/10 flex items-center justify-center text-xs font-bold text-white">
                  {hero.source ? hero.source.slice(0, 1).toUpperCase() : "V"}
                </div>
                <span className="text-xs font-medium text-white/60">{hero.source || "Velora Market Wire"}</span>
              </div>

              <div className="flex items-center gap-2">
                {onAskAI && (
                  <button
                    onClick={() => onAskAI(`Analyze the market impact of this headline: "${hero.title}"`)}
                    className="px-3 py-1.5 rounded-xl bg-vel-teal/10 hover:bg-vel-teal/20 border border-vel-teal/30 text-xs font-semibold text-vel-teal flex items-center gap-1.5 transition"
                  >
                    <Sparkles size={12} />
                    Analyze Impact
                  </button>
                )}
                {hero.url && (
                  <a
                    href={hero.url}
                    target="_blank"
                    rel="noreferrer"
                    className="p-1.5 rounded-xl bg-white/5 hover:bg-white/10 text-white/60 hover:text-white transition"
                    title="Read Original"
                  >
                    <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </motion.div>
        )}

        {/* Secondary Column */}
        <div className="flex flex-col gap-4">
          {secondary.map((item, idx) => (
            <motion.div
              key={idx}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 * (idx + 1) }}
              className="flex-1 flex flex-col justify-between p-4 rounded-2xl border border-white/10 bg-[#091122]/90 hover:border-white/20 transition-all duration-200"
            >
              <div>
                <div className="flex items-center justify-between text-[11px] text-white/50 mb-1.5">
                  <span>{item.source || "News"}</span>
                  <span>{item.time || "Recent"}</span>
                </div>
                <h3 className="text-sm font-semibold text-white leading-tight line-clamp-2">
                  {item.title}
                </h3>
              </div>

              <div className="mt-3 flex items-center justify-between pt-2 border-t border-white/5">
                {item.symbol ? (
                  <span className="text-[11px] font-bold text-vel-teal bg-vel-teal/10 px-2 py-0.5 rounded-md">
                    ${item.symbol}
                  </span>
                ) : (
                  <span className="text-[11px] text-white/40">Market Context</span>
                )}

                {item.url && (
                  <a
                    href={item.url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-xs text-white/50 hover:text-white flex items-center gap-1 transition"
                  >
                    Read <ExternalLink size={11} />
                  </a>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      </div>

      {/* Regular Headlines Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
        {regular.map((item, idx) => (
          <motion.div
            key={idx}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.05 * idx }}
            className="p-3.5 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/15 transition flex flex-col justify-between"
          >
            <div className="flex items-start justify-between gap-2">
              <h4 className="text-xs md:text-sm font-medium text-white/90 leading-snug line-clamp-2">
                {item.title}
              </h4>
              <span className="text-[10px] text-white/40 whitespace-nowrap flex-none">
                {item.time || "Recent"}
              </span>
            </div>

            <div className="mt-2.5 flex items-center justify-between text-[11px] text-white/50">
              <span>{item.source || "Financial Press"}</span>
              {item.url && (
                <a
                  href={item.url}
                  target="_blank"
                  rel="noreferrer"
                  className="hover:text-vel-teal flex items-center gap-1 transition"
                >
                  Source <ExternalLink size={10} />
                </a>
              )}
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
}
