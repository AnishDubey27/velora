// lib/index-grounding.ts
/**
 * Velora Verified Index Grounding & Market Temporal Engine
 * 
 * Provides verified index quotes (S&P 500, Nasdaq, Dow, Nifty 50, Sensex)
 * with server-computed session awareness, temporal freshness checks,
 * historical daily candle verification, and strict anti-hallucination rules.
 */

export type MarketCode = "US" | "IN";

export type SessionPhase = 
  | "PRE_MARKET"
  | "REGULAR_HOURS"
  | "POST_CLOSE"
  | "WEEKEND_CLOSED";

export type FreshnessStatus = "FRESH" | "STALE" | "UNVERIFIED";

export type QuoteType = 
  | "OFFICIAL_CLOSE"
  | "INTRADAY_LIVE"
  | "INTRADAY_SNAPSHOT";

export interface MarketSessionInfo {
  market: MarketCode;
  timeZone: string;
  localTimeStr: string;
  localDateStr: string; // YYYY-MM-DD
  dayOfWeek: string;    // Mon, Tue, ...
  isOpen: boolean;
  phase: SessionPhase;
  latestCompletedSessionDate: string; // YYYY-MM-DD
  latestCompletedSessionLabel: string; // e.g. "Monday, Nov 16, 2026 Close" or "Friday, Nov 13, 2026 Close"
  nextSessionOpensLabel: string;
}

export interface HistoricalCandle {
  date: string; // YYYY-MM-DD
  close: number;
  open?: number;
  high?: number;
  low?: number;
  previousClose?: number;
  change?: number;
  changePercent?: number;
}

export interface VerifiedIndexQuote {
  id: string;
  symbol: string;
  name: string;
  market: MarketCode;
  price: number;
  previousClose: number;
  previousCloseDateStr: string; // YYYY-MM-DD of candle previousClose was derived from
  change: number;
  changePercent: number;
  dataTimestamp: Date;
  dataDateStr: string; // YYYY-MM-DD
  quoteType: QuoteType;
  freshness: FreshnessStatus;
  expectedSessionDate: string; // YYYY-MM-DD
  stalenessNote: string | null;
  candles: HistoricalCandle[];
  source: string;
}

export interface IndexDefinition {
  id: string;
  name: string;
  symbol: string;
  market: MarketCode;
  keywords: RegExp;
}

export const SUPPORTED_INDICES: IndexDefinition[] = [
  {
    id: "nifty",
    name: "Nifty 50",
    symbol: "^NSEI",
    market: "IN",
    keywords: /\b(nifty|nifty\s*50|nifty50|\^nsei|nse)\b/i,
  },
  {
    id: "sensex",
    name: "BSE Sensex",
    symbol: "^BSESN",
    market: "IN",
    keywords: /\b(sensex|bse\s*sensex|\^bsesn|bse)\b/i,
  },
  {
    id: "sp500",
    name: "S&P 500",
    symbol: "^GSPC",
    market: "US",
    keywords: /\b(s&p\s*500|sp500|s&p|spx|\^gspc|standard\s*(?:&|and)\s*poor(?:'?s)?(?:\s*500)?)\b/i,
  },
  {
    id: "nasdaq",
    name: "Nasdaq Composite",
    symbol: "^IXIC",
    market: "US",
    keywords: /\b(nasdaq|nasdaq\s*composite|nasdaq\s*100|\^ixic|\^ndx|qqq)\b/i,
  },
  {
    id: "dow",
    name: "Dow Jones Industrial Average",
    symbol: "^DJI",
    market: "US",
    keywords: /\b(dow|dow\s*jones|djia|\^dji)\b/i,
  },
];

// Helper: subtract trading days (weekend aware)
export function getPreviousTradingDay(date: Date): Date {
  const d = new Date(date);
  const day = d.getUTCDay();
  // Sunday (0) -> Friday (2 days back)
  // Monday (1) -> Friday (3 days back)
  // Saturday (6) -> Friday (1 day back)
  const diff = day === 1 ? 3 : day === 0 ? 2 : day === 6 ? 1 : 1;
  d.setUTCDate(d.getUTCDate() - diff);
  return d;
}

// Compute market session details for US or India at any given moment
export function getMarketSessionStatus(market: MarketCode, now: Date = new Date()): MarketSessionInfo {
  const timeZone = market === "IN" ? "Asia/Kolkata" : "America/New_York";
  
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: false,
  });

  const parts = Object.fromEntries(formatter.formatToParts(now).map((p) => [p.type, p.value]));
  const hours = parseInt(parts.hour, 10);
  const minutes = parseInt(parts.minute, 10);
  const timeMins = hours * 60 + minutes;
  const dayOfWeek = parts.weekday; // Mon, Tue, Wed, Thu, Fri, Sat, Sun
  const localDateStr = `${parts.year}-${parts.month}-${parts.day}`;
  const localTimeStr = `${parts.weekday}, ${parts.month}/${parts.day}/${parts.year} ${parts.hour}:${parts.minute} ${market === "IN" ? "IST" : "EST"}`;

  const isWeekend = dayOfWeek === "Sat" || dayOfWeek === "Sun";
  const openMins = market === "IN" ? 9 * 60 + 15 : 9 * 60 + 30; // 09:15 IST or 09:30 EST
  const closeMins = market === "IN" ? 15 * 60 + 30 : 16 * 60;     // 15:30 IST or 16:00 EST

  let phase: SessionPhase;
  let isOpen = false;
  let latestCompletedSessionDate: string;
  let latestCompletedSessionLabel: string;
  let nextSessionOpensLabel: string;

  if (isWeekend) {
    phase = "WEEKEND_CLOSED";
    const prevTradeDate = getPreviousTradingDay(now);
    const prevParts = Object.fromEntries(formatter.formatToParts(prevTradeDate).map((p) => [p.type, p.value]));
    latestCompletedSessionDate = `${prevParts.year}-${prevParts.month}-${prevParts.day}`;
    latestCompletedSessionLabel = `Friday's close (${prevParts.month}/${prevParts.day}/${prevParts.year})`;
    nextSessionOpensLabel = `Monday at ${market === "IN" ? "09:15 IST" : "09:30 EST (20:00 IST)"}`;
  } else if (timeMins < openMins) {
    phase = "PRE_MARKET";
    const prevTradeDate = getPreviousTradingDay(now);
    const prevParts = Object.fromEntries(formatter.formatToParts(prevTradeDate).map((p) => [p.type, p.value]));
    latestCompletedSessionDate = `${prevParts.year}-${prevParts.month}-${prevParts.day}`;
    const prevDayName = dayOfWeek === "Mon" ? "Friday's" : "yesterday's";
    latestCompletedSessionLabel = `${prevDayName} close (${prevParts.month}/${prevParts.day}/${prevParts.year})`;
    nextSessionOpensLabel = `today at ${market === "IN" ? "09:15 IST" : "09:30 EST (20:00 IST)"}`;
  } else if (timeMins >= openMins && timeMins < closeMins) {
    phase = "REGULAR_HOURS";
    isOpen = true;
    const prevTradeDate = getPreviousTradingDay(now);
    const prevParts = Object.fromEntries(formatter.formatToParts(prevTradeDate).map((p) => [p.type, p.value]));
    latestCompletedSessionDate = `${prevParts.year}-${prevParts.month}-${prevParts.day}`;
    latestCompletedSessionLabel = `previous close (${prevParts.month}/${prevParts.day}/${prevParts.year})`;
    nextSessionOpensLabel = `Session in progress (closes at ${market === "IN" ? "15:30 IST" : "16:00 EST"})`;
  } else {
    phase = "POST_CLOSE";
    latestCompletedSessionDate = localDateStr;
    latestCompletedSessionLabel = `today's close (${parts.month}/${parts.day}/${parts.year})`;
    const isFriday = dayOfWeek === "Fri";
    nextSessionOpensLabel = isFriday
      ? `Monday at ${market === "IN" ? "09:15 IST" : "09:30 EST (20:00 IST)"}`
      : `tomorrow at ${market === "IN" ? "09:15 IST" : "09:30 EST (20:00 IST)"}`;
  }

  return {
    market,
    timeZone,
    localTimeStr,
    localDateStr,
    dayOfWeek,
    isOpen,
    phase,
    latestCompletedSessionDate,
    latestCompletedSessionLabel,
    nextSessionOpensLabel,
  };
}

// Fetch verified index chart and candles from Yahoo Finance
export async function fetchVerifiedIndex(def: IndexDefinition): Promise<VerifiedIndexQuote | null> {
  const session = getMarketSessionStatus(def.market);
  
  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(def.symbol)}?interval=1d&range=1mo`;
    const res = await fetch(url, {
      cache: "no-store",
      headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
      signal: AbortSignal.timeout(4500),
    });

    if (!res.ok) {
      throw new Error(`Yahoo returned HTTP ${res.status}`);
    }

    const json = await res.json();
    const result = json?.chart?.result?.[0];
    if (!result) return null;

    const meta = result.meta;
    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0] || {};

    const price = Number(meta.regularMarketPrice);
    if (!price || isNaN(price)) return null;

    const marketTimeSec = meta.regularMarketTime || (timestamps.length > 0 ? timestamps[timestamps.length - 1] : Math.floor(Date.now() / 1000));
    const dataTimestamp = new Date(marketTimeSec * 1000);

    // Format quote date in market's timezone
    const tzFormatter = new Intl.DateTimeFormat("en-US", {
      timeZone: session.timeZone,
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    });
    const tzParts = Object.fromEntries(tzFormatter.formatToParts(dataTimestamp).map((p) => [p.type, p.value]));
    const dataDateStr = `${tzParts.year}-${tzParts.month}-${tzParts.day}`;
    const quoteTimeMins = parseInt(tzParts.hour, 10) * 60 + parseInt(tzParts.minute, 10);
    const closeMins = def.market === "IN" ? 15 * 60 + 30 : 16 * 60;

    // Build historical candles (past 30 days)
    const candles: HistoricalCandle[] = [];
    for (let i = 0; i < timestamps.length; i++) {
      const cDate = new Date(timestamps[i] * 1000);
      const cParts = Object.fromEntries(tzFormatter.formatToParts(cDate).map((p) => [p.type, p.value]));
      const candleDateStr = `${cParts.year}-${cParts.month}-${cParts.day}`;
      const closeVal = quotes.close?.[i];
      if (typeof closeVal === "number" && !isNaN(closeVal)) {
        const prevCandleClose = i > 0 && typeof quotes.close?.[i - 1] === "number" ? quotes.close[i - 1] : closeVal;
        const cChange = closeVal - prevCandleClose;
        const cChangePct = prevCandleClose > 0 ? (cChange / prevCandleClose) * 100 : 0;

        candles.push({
          date: candleDateStr,
          close: Number(closeVal.toFixed(2)),
          open: quotes.open?.[i] != null ? Number(quotes.open[i].toFixed(2)) : undefined,
          high: quotes.high?.[i] != null ? Number(quotes.high[i].toFixed(2)) : undefined,
          low: quotes.low?.[i] != null ? Number(quotes.low[i].toFixed(2)) : undefined,
          previousClose: Number(prevCandleClose.toFixed(2)),
          change: Number(cChange.toFixed(2)),
          changePercent: Number(cChangePct.toFixed(2)),
        });
      }
    }

    // Derive previousClose strictly from the candle immediately preceding the quoted session.
    // CRITICAL: meta.chartPreviousClose from Yahoo Finance (range=1mo) returns the price 1 month ago.
    // It must NEVER be used for daily changes.
    const candleIndex = candles.findIndex((c) => c.date === dataDateStr);
    let priorCandle: HistoricalCandle | null = null;

    if (candleIndex > 0) {
      priorCandle = candles[candleIndex - 1];
    } else if (candleIndex === -1 && candles.length > 0) {
      // dataDateStr is today's live/intraday date not yet finalized as a completed daily candle;
      // the latest completed candle in the series is the prior session.
      priorCandle = candles[candles.length - 1];
    }

    const prevClose = priorCandle ? priorCandle.close : price;
    const previousCloseDateStr = priorCandle ? priorCandle.date : dataDateStr;
    const change = price - prevClose;
    const changePercent = prevClose > 0 ? (change / prevClose) * 100 : 0;

    // Determine Quote Type:
    // If session is POST_CLOSE and quote timestamp is at or past market close -> OFFICIAL_CLOSE
    // If session is POST_CLOSE but quote timestamp is before close -> INTRADAY_SNAPSHOT
    // If session is REGULAR_HOURS -> INTRADAY_LIVE
    let quoteType: QuoteType;
    if (session.phase === "POST_CLOSE") {
      if (quoteTimeMins >= closeMins - 5) {
        quoteType = "OFFICIAL_CLOSE";
      } else {
        quoteType = "INTRADAY_SNAPSHOT";
      }
    } else if (session.phase === "REGULAR_HOURS") {
      quoteType = "INTRADAY_LIVE";
    } else {
      // PRE_MARKET or WEEKEND_CLOSED -> This was the previous session's close
      quoteType = "OFFICIAL_CLOSE";
    }

    // Evaluate Freshness & Sanity Gate (§3):
    // For broad major market indices, single-session moves rarely exceed ±4.0%.
    // Any move > 4.0% in normal sessions flags the quote as UNVERIFIED to catch corrupted baselines.
    const MAX_ALLOWED_DAILY_INDEX_MOVE_PCT = 4.0;
    let freshness: FreshnessStatus = "FRESH";
    let stalenessNote: string | null = null;

    if (!priorCandle || candles.length < 2) {
      freshness = "UNVERIFIED";
      stalenessNote = `Prior trading session candle could not be established from historical series.`;
    } else if (Math.abs(changePercent) > MAX_ALLOWED_DAILY_INDEX_MOVE_PCT) {
      freshness = "UNVERIFIED";
      stalenessNote = `Computed daily change (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%) exceeds sane broad-market index bounds (±${MAX_ALLOWED_DAILY_INDEX_MOVE_PCT}%). Baseline discrepancy suspected; quote is unverified.`;
    } else if (session.isOpen) {
      if (dataDateStr !== session.localDateStr) {
        freshness = "STALE";
        stalenessNote = `Latest available data is from ${dataDateStr}; today's live session data is not yet reflected.`;
      }
    } else {
      if (dataDateStr < session.latestCompletedSessionDate) {
        freshness = "STALE";
        stalenessNote = `Latest available data is from ${dataDateStr}; the ${session.latestCompletedSessionLabel} isn't in yet.`;
      }
    }

    // Server-side audit logging
    console.log(
      `[AI Verified Index] ${def.name} (${def.symbol}): Quoted Session ${dataDateStr} (${price.toFixed(2)}) | Previous Session ${previousCloseDateStr} (${prevClose.toFixed(2)}) | Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%) | Freshness: ${freshness}`
    );

    return {
      id: def.id,
      symbol: def.symbol,
      name: def.name,
      market: def.market,
      price: Number(price.toFixed(2)),
      previousClose: Number(prevClose.toFixed(2)),
      previousCloseDateStr,
      change: Number(change.toFixed(2)),
      changePercent: Number(changePercent.toFixed(2)),
      dataTimestamp,
      dataDateStr,
      quoteType,
      freshness,
      expectedSessionDate: session.latestCompletedSessionDate,
      stalenessNote,
      candles,
      source: "Yahoo Finance Market Data Engine",
    };
  } catch (err) {
    console.warn(`[Index Grounding] Failed to fetch verified quote for ${def.symbol}:`, err);
    return null;
  }
}

// Detect which indices the user query is asking about
export function detectIndicesInQuery(text: string): IndexDefinition[] {
  const matches: IndexDefinition[] = [];
  for (const def of SUPPORTED_INDICES) {
    if (def.keywords.test(text)) {
      matches.push(def);
    }
  }

  // If user asks a general market question (e.g. "how did the market perform today", "market wrap")
  if (matches.length === 0) {
    const isGeneralMarket = /\b(market\s*(?:perform|do|wrap|today|summary|close)|indices|indexes|overall market|stock market today)\b/i.test(text);
    if (isGeneralMarket) {
      // Include headline indices for US and India
      return [
        SUPPORTED_INDICES.find((i) => i.id === "sp500")!,
        SUPPORTED_INDICES.find((i) => i.id === "nifty")!,
      ].filter(Boolean);
    }
  }

  return matches;
}

// Extract explicit past date from query (e.g. "November 12, 2026", "Nov 12", "2026-11-12")
export function extractRequestedDateFromQuery(text: string): { dateStr: string; displayLabel: string } | null {
  // 1. Month Day Year or Month Day
  const monthNames = "January|February|March|April|May|June|July|August|September|October|November|December|Jan|Feb|Mar|Apr|Jun|Jul|Aug|Sep|Oct|Nov|Dec";
  const regexNamed = new RegExp(`(?:on|for|at)?\\s*(${monthNames})\\s*(\\d{1,2})(?:st|nd|rd|th)?(?:,?\\s*(\\d{4}))?`, "i");
  const match = text.match(regexNamed);

  if (match) {
    const monthStr = match[1];
    const dayNum = parseInt(match[2], 10);
    const yearNum = match[3] ? parseInt(match[3], 10) : new Date().getFullYear();

    const d = new Date(`${monthStr} ${dayNum}, ${yearNum} 12:00:00 UTC`);
    if (!isNaN(d.getTime())) {
      const pad = (n: number) => (n < 10 ? `0${n}` : `${n}`);
      const mNum = d.getUTCMonth() + 1;
      const dateStr = `${yearNum}-${pad(mNum)}-${pad(dayNum)}`;
      return {
        dateStr,
        displayLabel: `${monthStr} ${dayNum}, ${yearNum}`,
      };
    }
  }

  // 2. YYYY-MM-DD
  const regexIso = /\b(\d{4})-(\d{2})-(\d{2})\b/;
  const matchIso = text.match(regexIso);
  if (matchIso) {
    return {
      dateStr: matchIso[0],
      displayLabel: matchIso[0],
    };
  }

  return null;
}
