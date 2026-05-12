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

function deriveTrends(news: NewsItem[]) {
  const stop = new Set([
    "stock",
    "stocks",
    "market",
    "markets",
    "shares",
    "company",
    "companies",
    "today",
    "week",
    "weekly",
    "us",
    "usa",
    "u.s.",
    "wall",
    "street",
    "amid",
    "as",
    "to",
    "in",
    "of",
    "for",
    "and",
    "on",
    "with",
    "after",
    "before",
    "from",
    "at",
  ]);

  const counts = new Map<string, number>();
  for (const item of news) {
    const raw = typeof item.keywords === "string" ? item.keywords : "";
    for (const part of raw.split(",")) {
      const normalized = part.trim().toLowerCase();
      if (!normalized) continue;
      if (normalized.length < 3) continue;
      if (stop.has(normalized)) continue;
      counts.set(normalized, (counts.get(normalized) ?? 0) + 1);
    }
  }

  const top = [...counts.entries()]
    .sort((a, b) => b[1] - a[1])
    .map(([k]) => titleCase(k))
    .slice(0, 2);

  const midTerm = top[0] ?? (news[0]?.symbol ? `${news[0].symbol} Momentum` : "Market Momentum");
  const longTerm = top[1] ?? "Macro & Rates";

  return { midTerm, longTerm };
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
  const [signalsBySymbol, setSignalsBySymbol] = useState<Record<string, SignalsResponse | null>>({});

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
  }, []);

  const topSymbols = useMemo(() => {
    const counts = new Map<string, number>();
    for (const item of news) {
      const symbol = typeof item.symbol === "string" ? item.symbol.trim().toUpperCase() : "";
      if (!symbol) continue;
      if (symbol === "N/A") continue;
      counts.set(symbol, (counts.get(symbol) ?? 0) + 1);
    }

    const sorted = [...counts.entries()].sort((a, b) => b[1] - a[1]).map(([s]) => s);
    if (sorted.length >= 2) return sorted.slice(0, 2);
    if (sorted.length === 1) return [sorted[0], sorted[0] === "NVDA" ? "TSLA" : "NVDA"];
    return ["NVDA", "TSLA"];
  }, [news]);

  const trends = useMemo(() => deriveTrends(news), [news]);

  useEffect(() => {
    let cancelled = false;

    Promise.all(
      topSymbols.slice(0, 2).map(async (symbol) => {
        try {
          const res = await fetch(`/api/dashboard/signals?symbol=${encodeURIComponent(symbol)}`);
          const json = await res.json();
          if (res.ok) return { symbol, data: json as SignalsResponse };
          return {
            symbol,
            data: { error: typeof json?.error === "string" ? json.error : "Failed to load signals." } as SignalsResponse,
          };
        } catch {
          return { symbol, data: { error: "Failed to load signals." } as SignalsResponse };
        }
      })
    ).then((entries) => {
      if (cancelled) return;
      setSignalsBySymbol((prev) => {
        const next = { ...prev };
        for (const entry of entries) next[entry.symbol] = entry.data;
        return next;
      });
    });

    return () => {
      cancelled = true;
    };
  }, [topSymbols]);

  const mainHeadline =
    news[0] || {
      title: "No market snapshot available yet.",
      summary: "Check back in a moment for the latest headline.",
      url: null,
    };

  const mainHeadlineHref = mainHeadline.url || mainHeadline.link || mainHeadline.source_url || null;
  const snapshotUpdated = indicators?.asOf ? formatDateTime(indicators.asOf) : null;

  return (
    <section className="space-y-4 pb-6 pt-1">
      {/* Market Snapshot */}
      {mainHeadlineHref ? (
        <a
          href={mainHeadlineHref}
          target="_blank"
          rel="noreferrer"
          className="glassy block rounded-2xl p-5 hover:bg-white/[0.04]"
        >
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">MARKET SNAPSHOT</p>
            <p className="text-xs text-white/40">{snapshotUpdated ? `Updated ${snapshotUpdated}` : "Updated now"}</p>
          </div>
          <h2 className="text-[19px] leading-tight font-semibold text-white">{mainHeadline.title}</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">{mainHeadline.summary}</p>
        </a>
      ) : (
        <div className="glassy rounded-2xl p-5">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-black uppercase tracking-widest text-white/60">MARKET SNAPSHOT</p>
            <p className="text-xs text-white/40">{snapshotUpdated ? `Updated ${snapshotUpdated}` : "Updated now"}</p>
          </div>
          <h2 className="text-[19px] leading-tight font-semibold text-white">{mainHeadline.title}</h2>
          <p className="mt-3 text-[13px] leading-relaxed text-white/70">{mainHeadline.summary}</p>
        </div>
      )}

      {/* Fear & Greed + Indicators */}
      <div className="glassy rounded-2xl p-5">
        <div className="flex justify-between items-baseline mb-3">
          <p className="text-xs font-black uppercase tracking-widest text-white/60">FEAR & GREED INDEX</p>
          <p className="text-lg font-bold text-orange-400">
            {fearGreed.value ?? "\u2014"} {fearGreed.classification ?? ""}
          </p>
        </div>

        <div className="relative h-2.5 bg-gradient-to-r from-red-500 via-yellow-500 to-emerald-500 rounded-full mb-5">
          <motion.div
            initial={{ left: "50%" }}
            animate={{ left: `${fearGreed.value ?? 50}%` }}
            className="absolute -top-1.5 h-5 w-5 -translate-x-1/2 rounded-full border-2 border-white bg-[#070A11]"
          />
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
        <div className="grid grid-cols-2 gap-3 mt-3">
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-white/50">Mid-Term (1-3 mo)</p>
            <p className="mt-1 font-medium text-white">{trends.midTerm}</p>
          </div>
          <div className="rounded-xl bg-white/5 p-4">
            <p className="text-xs text-white/50">Long-Term (6-12 mo)</p>
            <p className="mt-1 font-medium text-white">{trends.longTerm}</p>
          </div>
        </div>
      </div>

      {/* Potential Early Signals */}
      <div className="glassy rounded-2xl p-5">
        <SectionTitle>Potential Early Signals</SectionTitle>
        <div className="grid grid-cols-2 gap-3 mt-3">
          {topSymbols.slice(0, 2).map((symbol) => {
            const signal = signalsBySymbol[symbol] ?? null;
            const loading = !signal;
            const error = typeof signal?.error === "string" ? signal.error : null;

            const upside = signal?.priceTarget?.upsidePercent ?? null;
            const upsideText = formatPercent(upside);

            const score =
              (signal?.recommendations?.strongBuy ?? 0) +
              (signal?.recommendations?.buy ?? 0) -
              (signal?.recommendations?.sell ?? 0) -
              (signal?.recommendations?.strongSell ?? 0);

            const stance = error ? "Error" : score > 0 ? "Bullish" : score < 0 ? "Bearish" : "Neutral";

            return (
              <div key={symbol} className="rounded-xl bg-white/5 p-4">
                <p className="text-xs text-white/60">{symbol}</p>
                {loading ? (
                  <p className="mt-1 text-sm font-semibold text-white/50">Loading...</p>
                ) : error ? (
                  <p className="mt-1 text-sm font-semibold text-red-400">{error}</p>
                ) : (
                  <>
                    <p
                      className={cn(
                        "mt-1 font-semibold",
                        (upside ?? 0) > 0 ? "text-green-400" : (upside ?? 0) < 0 ? "text-red-400" : "text-white"
                      )}
                    >
                      {signal?.priceTarget?.mean
                        ? `Target ${formatNumber(signal.priceTarget.mean, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 0,
                          })}${upsideText ? ` (${upsideText})` : ""}`
                        : "Target \u2014"}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {signal?.quote?.price
                        ? `Price ${formatNumber(signal.quote.price, {
                            style: "currency",
                            currency: "USD",
                            maximumFractionDigits: 2,
                          })} ${formatPercent(signal.quote.changePercent) ?? ""}`.trim()
                        : "Price \u2014"}
                    </p>
                    <p className="mt-1 text-xs text-white/50">
                      {stance}
                      {signal?.recommendations?.period ? ` \u00b7 ${signal.recommendations.period}` : ""}
                    </p>
                  </>
                )}
              </div>
            );
          })}
        </div>
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
