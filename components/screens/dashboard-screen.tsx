"use client";

import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { SectionTitle } from "@/components/ui/section-title";
import { cn } from "@/lib/utils";

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



export function DashboardScreen() {
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
  }, []);



  const snapshotTitle = snapshot?.title || "Loading Snapshot...";
  const snapshotBody = snapshot?.summary || "Generating market summary...";
  const snapshotUpdated = indicators?.asOf ? formatDateTime(indicators.asOf) : null;
  const snapshotTime = snapshot?.updatedAt ? formatDateTime(snapshot.updatedAt) : snapshotUpdated;

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
        {!dynamicData ? (
          <div className="mt-3 text-sm text-white/50">Loading signals...</div>
        ) : (
          <div className="grid grid-cols-2 gap-3 mt-3">
            {/* Congress */}
            <div className="rounded-xl bg-white/5 p-4 relative">
              <div className="absolute top-3 right-3 text-white/20">↗</div>
              <p className="font-semibold text-white">Congress</p>
              <p className="text-xs text-white/40 mb-2">Most recent</p>
              <p className="font-bold text-white mb-1">{dynamicData?.signals?.congress?.symbol}</p>
              <p className="text-[13px] font-semibold mb-2">
                <span className={dynamicData?.signals?.congress?.action === "BUY" ? "text-emerald-400" : "text-red-400"}>
                  {dynamicData?.signals?.congress?.action}
                </span> <span className="text-white/60">{dynamicData?.signals?.congress?.amount}</span>
              </p>
              <p className="text-xs text-white/40">{dynamicData?.signals?.congress?.person}</p>
            </div>
            {/* Reddit */}
            <div className="rounded-xl bg-white/5 p-4 relative">
              <div className="absolute top-3 right-3 text-white/20">↗</div>
              <p className="font-semibold text-white">Reddit</p>
              <p className="text-xs text-white/40 mb-2">Trending</p>
              <p className="font-bold text-white mb-1">{dynamicData?.signals?.reddit?.symbol}</p>
              <p className="text-[13px] font-semibold text-emerald-400 mb-2">
                {dynamicData?.signals?.reddit?.rankChange}
              </p>
              <p className="text-xs text-white/40">{dynamicData?.signals?.reddit?.mentions}</p>
            </div>
            {/* Insider */}
            <div className="rounded-xl bg-white/5 p-4 relative">
              <div className="absolute top-3 right-3 text-white/20">↗</div>
              <p className="font-semibold text-white">Insider</p>
              <p className="text-xs text-white/40 mb-2">Most recent</p>
              <p className="font-bold text-white mb-1">{dynamicData?.signals?.insider?.symbol}</p>
              <p className="text-[13px] font-semibold mb-2">
                <span className={dynamicData?.signals?.insider?.action === "BUY" ? "text-emerald-400" : "text-red-400"}>
                  {dynamicData?.signals?.insider?.action}
                </span> <span className="text-white/60">{dynamicData?.signals?.insider?.price}</span>
              </p>
              <p className="text-xs text-white/40">{dynamicData?.signals?.insider?.person}</p>
            </div>
            {/* Super Investors */}
            <div className="rounded-xl bg-white/5 p-4 relative">
              <div className="absolute top-3 right-3 text-white/20">↗</div>
              <p className="font-semibold text-white">Super Investors</p>
              <p className="text-xs text-white/40 mb-2">Added to</p>
              <p className="font-bold text-white mb-1">{dynamicData?.signals?.superInvestors?.symbol}</p>
              <p className="text-[13px] font-semibold text-emerald-400 mb-2">
                {dynamicData?.signals?.superInvestors?.action}
              </p>
              <p className="text-xs text-white/40 truncate">{dynamicData?.signals?.superInvestors?.firm}</p>
            </div>
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
