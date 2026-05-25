"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";
import type { NavKey } from "@/lib/types";

type NewsItem = {
  title?: string;
  summary?: string;
  description?: string;
  keywords?: string;
  time?: string | null;
  url?: string | null;
  link?: string | null;
  source_url?: string | null;
  symbol?: string | null;
};

type IndicatorsResponse = {
  asOf?: string;
  sp500?: { symbol?: string; price?: number | null; changePercent?: number | null };
  bitcoin?: { symbol?: string; price?: number | null; changePercent?: number | null };
  error?: string;
};

type SignalsResponse = {
  symbol?: string;
  quote?: { price?: number | null; changePercent?: number | null };
  priceTarget?: { mean?: number | null; upsidePercent?: number | null; lastUpdated?: string | null };
  recommendations?: {
    period?: string | null;
    strongBuy?: number | null;
    buy?: number | null;
    hold?: number | null;
    sell?: number | null;
    strongSell?: number | null;
  };
  error?: string;
};

type EventsResponse = {
  economic?: Array<{ time: string | null; event: string | null; impact: string | null; country: string | null }>;
  earnings?: Array<{ date: string | null; symbol: string | null; hour: string | null }>;
  error?: string;
};

// Signal preview types
type RedditPreview = {
  symbol: string;
  rankChange: string;
  mentions: string;
};

type InsiderPreview = {
  symbol: string;
  action: string;
  price: string;
  person: string;
};

type CongressPreview = {
  symbol: string;
  action: string;
  amount: string;
  person: string;
};

type SuperInvestorPreview = {
  symbol: string;
  action: string;
  firm: string;
};

function formatNumber(value: number | null | undefined, options?: Intl.NumberFormatOptions) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "\u2014";
  return new Intl.NumberFormat("en-US", options).format(value);
}

function formatPercent(value: number | null | undefined) {
  if (typeof value !== "number" || !Number.isFinite(value)) return null;
  const sign = value > 0 ? "+" : value < 0 ? "" : "";
  return `${sign}${value.toFixed(2)}%`;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return null;
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  try {
    return date.toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" });
  } catch {
    return value;
  }
}

function titleCase(value: string) {
  return value
    .split(/\s+/g)
    .filter(Boolean)
    .map(part => part.slice(0, 1).toUpperCase() + part.slice(1))
    .join(" ");
}

type DashboardScreenProps = {
  onNavigate?: (key: NavKey) => void;
};

export function DashboardScreen({ onNavigate }: DashboardScreenProps) {
  const [fearGreed, setFearGreed] = useState<{ value: number | null; classification: string | null }>({
    value: null,
    classification: null,
  });
  const [vix, setVix] = useState<number | null>(null);
  const [news, setNews] = useState<NewsItem[]>([]);
  const [indicators, setIndicators] = useState<IndicatorsResponse | null>(null);
  const [events, setEvents] = useState<EventsResponse | null>(null);
  const [snapshot, setSnapshot] = useState<{ title: string; summary: string; updatedAt?: string } | null>(null);
  const [dynamicData, setDynamicData] = useState<any>(null);

  // Signal preview states
  const [redditPreview, setRedditPreview] = useState<RedditPreview | null>(null);
  const [insiderPreview, setInsiderPreview] = useState<InsiderPreview | null>(null);
  const [congressPreview, setCongressPreview] = useState<CongressPreview | null>(null);
  const [superInvestorPreview, setSuperInvestorPreview] = useState<SuperInvestorPreview | null>(null);
  const [signalsLoaded, setSignalsLoaded] = useState(false);

  useEffect(() => {
    fetch("/api/fear-greed")
      .then(r => r.json())
      .then(d =>
        setFearGreed({
          value: typeof d?.value === "number" ? d.value : null,
          classification: typeof d?.classification === "string" ? d.classification : null,
        })
      )
      .catch(() => {});

    fetch("/api/vix")
      .then(r => r.json())
      .then(d => setVix(typeof d?.value === "number" ? d.value : null))
      .catch(() => {});

    fetch("/api/news")
      .then(r => r.json())
      .then(setNews)
      .catch(() => {});

    fetch("/api/dashboard/indicators")
      .then(r => r.json())
      .then(setIndicators)
      .catch(() => {});

    fetch("/api/dashboard/events")
      .then(r => r.json())
      .then(setEvents)
      .catch(() => {});

    fetch("/api/dashboard/snapshot")
      .then(r => r.json())
      .then(setSnapshot)
      .catch(() => {});

    fetch("/api/dashboard/dynamic-data")
      .then(r => r.json())
      .then(setDynamicData)
      .catch(() => {});

    // Fetch real signal previews
    fetchSignalPreviews();
  }, []);

  async function fetchSignalPreviews() {
    try {
      // Fetch Reddit trending
      fetch("/api/signals/reddit")
        .then(r => r.json())
        .then(data => {
          if (data?.results?.[0]) {
            const top = data.results[0];
            const rankChange = (top.rank_24h_ago || top.rankChange24h || 0) - (top.rank || 1);
            setRedditPreview({
              symbol: top.ticker || top.symbol || "—",
              rankChange: rankChange > 0 ? `+${rankChange} to #${top.rank}` : `${rankChange} to #${top.rank}`,
              mentions: `${Number(top.mentions || 0).toLocaleString()} mentions`,
            });
          }
        })
        .catch(() => {});

      // Fetch insider trading
      fetch("/api/signals/insider")
        .then(r => r.json())
        .then(data => {
          const trades = data?.trades || data?.data || data;
          if (Array.isArray(trades) && trades[0]) {
            const t = trades[0];
            const isBuy = (t.change > 0) || t.transactionCode === "P" || t.action === "BUY";
            setInsiderPreview({
              symbol: t.symbol || "—",
              action: isBuy ? "BUY" : "SELL",
              price: t.transactionPrice ? `$${Number(t.transactionPrice).toFixed(2)}` : "—",
              person: `${(t.name || t.insiderName || "Unknown").split(" ").slice(0, 2).join(" ")} • ${t.filingDate ? new Date(t.filingDate).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}`,
            });
          }
        })
        .catch(() => {});

      // Fetch congress trading
      fetch("/api/signals/congress")
        .then(r => r.json())
        .then(data => {
          const trades = data?.trades || data;
          if (Array.isArray(trades) && trades[0]) {
            const t = trades[0];
            const isBuy = (t.action || t.transaction_type || "").toLowerCase().includes("purchase") ||
                          (t.action || "").toUpperCase() === "BUY";
            setCongressPreview({
              symbol: t.ticker || t.symbol || "—",
              action: isBuy ? "BUY" : "SELL",
              amount: t.amount || "—",
              person: `${t.politician || t.representative || t.senator || "Unknown"} • ${t.date ? new Date(t.date).toLocaleDateString("en-US", { month: "short", day: "numeric" }) : "Recent"}`,
            });
          }
        })
        .catch(() => {});

      // Fetch super investors
      fetch("/api/signals/super-investors")
        .then(r => r.json())
        .then(data => {
          const plays = data?.convictionPlays || data?.topPlays;
          if (plays && plays[0]) {
            const p = plays[0];
            setSuperInvestorPreview({
              symbol: p.ticker || p.symbol || "—",
              action: p.investorCount ? `${p.investorCount} investors added` : p.action || "Added",
              firm: p.investors?.join(", ") || p.firm || "—",
            });
          } else if (data?.investors?.[0]) {
            setSuperInvestorPreview({
              symbol: data.investors[0].topHolding || "—",
              action: "Portfolio updated",
              firm: data.investors[0].name || "—",
            });
          }
        })
        .catch(() => {});
    } finally {
      setSignalsLoaded(true);
    }
  }



  const snapshotTitle = snapshot?.title || "Loading Snapshot...";
  const snapshotBody = snapshot?.summary || "Generating market summary...";
  const snapshotUpdated = indicators?.asOf ? formatDateTime(indicators.asOf) : null;
  const snapshotTime = snapshot?.updatedAt ? formatDateTime(snapshot.updatedAt) : snapshotUpdated;

  // Build signal card data — prefer real data, fall back to AI-generated
  const congressData = congressPreview || {
    symbol: dynamicData?.signals?.congress?.symbol || "—",
    action: dynamicData?.signals?.congress?.action || "—",
    amount: dynamicData?.signals?.congress?.amount || "—",
    person: dynamicData?.signals?.congress?.person || "—",
  };

  const redditData = redditPreview || {
    symbol: dynamicData?.signals?.reddit?.symbol || "—",
    rankChange: dynamicData?.signals?.reddit?.rankChange || "—",
    mentions: dynamicData?.signals?.reddit?.mentions || "—",
  };

  const insiderData = insiderPreview || {
    symbol: dynamicData?.signals?.insider?.symbol || "—",
    action: dynamicData?.signals?.insider?.action || "—",
    price: dynamicData?.signals?.insider?.price || "—",
    person: dynamicData?.signals?.insider?.person || "—",
  };

  const superInvestorData = superInvestorPreview || {
    symbol: dynamicData?.signals?.superInvestors?.symbol || "—",
    action: dynamicData?.signals?.superInvestors?.action || "—",
    firm: dynamicData?.signals?.superInvestors?.firm || "—",
  };

  const hasSignals = signalsLoaded || dynamicData;

  return (
    <section className="space-y-4 pb-6 pt-1">
      {/* Market Snapshot */}
      <div className="glassy rounded-2xl p-5 relative overflow-hidden">
        <div className="absolute top-0 right-0 p-4 opacity-10">
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1"><path d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3"></path><path d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5"></path></svg>
        </div>
        <div className="flex items-center gap-2 mb-2">
          <div className="h-1.5 w-1.5 rounded-full bg-yellow-500" />
          <p className="text-xs font-semibold text-white/60">
            Market Snapshot <span className="text-white/30 font-normal mx-1">&bull;</span> <span className="text-white/40 font-normal">Updated {snapshotTime || "now"}</span>
          </p>
        </div>
        <h2 className="text-[20px] leading-[1.15] font-bold text-white mt-3 mb-2">{snapshotTitle}</h2>
        <p className="text-[14px] leading-relaxed text-white/70">{snapshotBody}</p>
      </div>

      {/* Fear & Greed + Indicators */}
      <div className="glassy rounded-2xl p-5">
        <div className="flex justify-between items-baseline mb-3">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">FEAR & GREED INDEX</p>
          <p className={cn("text-[13px] font-bold uppercase tracking-wide", (fearGreed.value || 50) > 50 ? "text-emerald-400" : "text-red-400")}>
            {fearGreed.value ?? "\u2014"} {fearGreed.classification ?? ""}
          </p>
        </div>

        <div className="relative mb-5">
          <div 
            className="h-2.5 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-sm overflow-hidden"
            style={{ WebkitMaskImage: "repeating-linear-gradient(to right, black, black 2px, transparent 2px, transparent 4px)", maskImage: "repeating-linear-gradient(to right, black, black 2px, transparent 2px, transparent 4px)" }}
          />
          <div className="absolute inset-x-0 -top-1.5 bottom-0 pointer-events-none">
            <motion.div
              initial={{ left: "50%" }}
              animate={{ left: `${fearGreed.value ?? 50}%` }}
              className="absolute top-0 h-5 w-1 -translate-x-1/2 bg-white rounded-full shadow-[0_0_8px_rgba(255,255,255,0.8)]"
            />
          </div>
          <div className="flex justify-between text-[11px] text-white/40 font-medium px-0.5 pt-1.5 uppercase tracking-wide">
            <span>Fear</span>
            <span>Greed</span>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-4 text-center">
          <div>
            <p className="text-xs text-white/50">VIX</p>
            <p className="font-semibold text-white">{formatNumber(vix, { maximumFractionDigits: 2 })}</p>
          </div>
          <div>
            <p className="text-xs text-white/50">S&amp;P 500</p>
            <p className="font-semibold text-white">{formatNumber(indicators?.sp500?.price, { maximumFractionDigits: 2 })}</p>
            <p
              className={cn(
                "text-xs",
                (indicators?.sp500?.changePercent ?? 0) > 0
                  ? "text-green-400"
                  : (indicators?.sp500?.changePercent ?? 0) < 0
                    ? "text-red-400"
                    : "text-white/40"
              )}
            >
              {formatPercent(indicators?.sp500?.changePercent) ?? "\u2014"}
            </p>
          </div>
          <div>
            <p className="text-xs text-white/50">Bitcoin</p>
            <p className="font-semibold text-white">{formatNumber(indicators?.bitcoin?.price, { maximumFractionDigits: 0 })}</p>
            <p
              className={cn(
                "text-xs",
                (indicators?.bitcoin?.changePercent ?? 0) > 0
                  ? "text-green-400"
                  : (indicators?.bitcoin?.changePercent ?? 0) < 0
                    ? "text-red-400"
                    : "text-white/40"
              )}
            >
              {formatPercent(indicators?.bitcoin?.changePercent) ?? "\u2014"}
            </p>
          </div>
        </div>
      </div>

      {/* Market Summary */}
      <div className="glassy rounded-2xl p-5">
        <SectionTitle>Market Summary</SectionTitle>
        {news.length === 0 ? (
          <div className="mt-3 text-sm text-white/50">Loading summary...</div>
        ) : (
          <ul className="mt-3 space-y-2 text-[13px] text-white/75">
            {news.slice(0, 5).map((item, i) => {
              const href = item.url || item.link || item.source_url || null;
              return (
                <li key={i} className="flex gap-2">
                  <span aria-hidden>{"\u2022"}</span>
                  {href ? (
                    <a href={href} target="_blank" rel="noreferrer" className="hover:underline">
                      {item.title || item.description}
                    </a>
                  ) : (
                    <span>{item.title || item.description}</span>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {/* Market Trends */}
      <div className="glassy rounded-2xl p-5">
        <SectionTitle>Market Trends</SectionTitle>
        {!dynamicData ? (
          <div className="mt-3 text-sm text-white/50">Loading trends...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-semibold text-white">Mid-Term</p>
                <p className="text-xs text-white/40">1-3 mo</p>
              </div>
              <ul className="space-y-2.5">
                {(dynamicData?.trends?.midTerm || []).map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-white/80">
                    <span className="text-emerald-400 text-[10px] mt-1">▲</span> {t}
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-xl bg-white/5 p-4">
              <div className="flex justify-between items-baseline mb-3">
                <p className="font-semibold text-white">Long-Term</p>
                <p className="text-xs text-white/40">6-12 mo</p>
              </div>
              <ul className="space-y-2.5">
                {(dynamicData?.trends?.longTerm || []).map((t: string, i: number) => (
                  <li key={i} className="flex items-start gap-2 text-[13px] text-white/80">
                    <span className="text-emerald-400 text-[10px] mt-1">▲</span> {t}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>

      {/* Potential Early Signals */}
      <div className="glassy rounded-2xl p-5">
        <SectionTitle>Potential Early Signals</SectionTitle>
        {!hasSignals ? (
          <div className="mt-3 text-sm text-white/50">Loading signals...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Congress */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.("congress-trading")}
              className="rounded-xl bg-white/5 p-4 relative text-left transition-colors hover:bg-white/[0.08] cursor-pointer group"
            >
              <div className="absolute top-3 right-3 text-white/20 group-hover:text-white/40 transition-colors">↗</div>
              <p className="font-semibold text-white">Congress</p>
              <p className="text-xs text-white/40 mb-2">Most recent</p>
              <p className="font-bold text-white mb-1">{congressData.symbol}</p>
              <p className="text-[13px] font-semibold mb-2">
                <span className={congressData.action === "BUY" ? "text-emerald-400" : "text-red-400"}>
                  {congressData.action}
                </span> <span className="text-white/60">{congressData.amount}</span>
              </p>
              <p className="text-xs text-white/40">{congressData.person}</p>
            </motion.button>
            {/* Reddit */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.("reddit-trending")}
              className="rounded-xl bg-white/5 p-4 relative text-left transition-colors hover:bg-white/[0.08] cursor-pointer group"
            >
              <div className="absolute top-3 right-3 text-white/20 group-hover:text-white/40 transition-colors">↗</div>
              <p className="font-semibold text-white">Reddit</p>
              <p className="text-xs text-white/40 mb-2">Trending</p>
              <p className="font-bold text-white mb-1">{redditData.symbol}</p>
              <p className="text-[13px] font-semibold text-emerald-400 mb-2">
                {redditData.rankChange}
              </p>
              <p className="text-xs text-white/40">{redditData.mentions}</p>
            </motion.button>
            {/* Insider */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.("insider-trading")}
              className="rounded-xl bg-white/5 p-4 relative text-left transition-colors hover:bg-white/[0.08] cursor-pointer group"
            >
              <div className="absolute top-3 right-3 text-white/20 group-hover:text-white/40 transition-colors">↗</div>
              <p className="font-semibold text-white">Insider</p>
              <p className="text-xs text-white/40 mb-2">Most recent</p>
              <p className="font-bold text-white mb-1">{insiderData.symbol}</p>
              <p className="text-[13px] font-semibold mb-2">
                <span className={insiderData.action === "BUY" ? "text-emerald-400" : "text-red-400"}>
                  {insiderData.action}
                </span> <span className="text-white/60">{insiderData.price}</span>
              </p>
              <p className="text-xs text-white/40">{insiderData.person}</p>
            </motion.button>
            {/* Super Investors */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => onNavigate?.("super-investors")}
              className="rounded-xl bg-white/5 p-4 relative text-left transition-colors hover:bg-white/[0.08] cursor-pointer group"
            >
              <div className="absolute top-3 right-3 text-white/20 group-hover:text-white/40 transition-colors">↗</div>
              <p className="font-semibold text-white">Super Investors</p>
              <p className="text-xs text-white/40 mb-2">Added to</p>
              <p className="font-bold text-white mb-1">{superInvestorData.symbol}</p>
              <p className="text-[13px] font-semibold text-emerald-400 mb-2">
                {superInvestorData.action}
              </p>
              <p className="text-xs text-white/40 truncate">{superInvestorData.firm}</p>
            </motion.button>
          </div>
        )}
      </div>

      {/* Upcoming Events */}
      <div className="glassy rounded-2xl p-5">
        <SectionTitle>Upcoming Events</SectionTitle>
        {!events ? (
          <div className="mt-4 text-sm text-white/50">Loading events...</div>
        ) : events.error ? (
          <div className="mt-4 text-sm text-red-400">{events.error}</div>
        ) : (
          <div className="mt-4 space-y-3 text-sm text-white/80">
            {(events?.earnings ?? []).slice(0, 4).map((e, i) => (
              <div key={`earnings-${i}`}>
                {"\u2022"} Earnings: {e.symbol ?? "\u2014"} {e.date ? `\u2014 ${e.date}` : ""} {e.hour ? `(${e.hour})` : ""}
              </div>
            ))}
            {(events?.economic ?? []).slice(0, 4).map((e, i) => (
              <div key={`eco-${i}`}>
                {"\u2022"} {e.event ?? "\u2014"}
                {e.time ? ` \u2014 ${formatDateTime(e.time)}` : ""}
                {e.country ? ` \u00b7 ${e.country}` : ""}
                {e.impact ? ` \u00b7 ${e.impact}` : ""}
              </div>
            ))}
            {(events?.earnings ?? []).length === 0 && (events?.economic ?? []).length === 0 && (
              <div className="text-white/50">No upcoming events found.</div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}
