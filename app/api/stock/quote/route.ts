export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");
const FMP_KEY = getEnv("FMP_API_KEY");

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getFmpQuote(symbol: string) {
  const url = `https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) throw new Error(`FMP quote request failed: ${res.status}`);
  const data = await res.json();
  const q = Array.isArray(data) ? data[0] : data;
  if (!q || !q.symbol) throw new Error("FMP quote not found");

  return {
    symbol: q.symbol,
    name: q.name || symbol.toUpperCase(),
    price: q.price || 0,
    change: q.change || 0,
    changesPercentage: q.changesPercentage || 0,
    dayLow: q.dayLow || 0,
    dayHigh: q.dayHigh || 0,
    yearLow: q.yearLow || 0,
    yearHigh: q.yearHigh || 0,
    volume: q.volume || 0,
    avgVolume: q.avgVolume || 0,
    marketCap: q.marketCap || 0,
    pe: q.pe || 0,
    eps: q.eps || 0,
    open: q.open || 0,
    previousClose: q.previousClose || 0,
    timestamp: q.timestamp || Math.floor(Date.now() / 1000),
    currency: isIndianExchangeSymbol(symbol) ? "INR" : "USD",
  };
}

async function getYahooQuote(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) throw new Error(`Yahoo chart request failed: ${res.status}`);

  const data = await res.json();
  const result = data?.chart?.result?.[0];
  if (!result) throw new Error("No chart result");

  const meta = result.meta || {};
  const quote = result.indicators?.quote?.[0] || {};
  const timestamps: number[] = result.timestamp || [];
  const closes: (number | null)[] = quote.close || [];
  const opens: (number | null)[] = quote.open || [];
  const highs: (number | null)[] = quote.high || [];
  const lows: (number | null)[] = quote.low || [];
  const volumes: (number | null)[] = quote.volume || [];

  let latestIndex = -1;
  for (let i = closes.length - 1; i >= 0; i--) {
    if (closes[i] != null) { latestIndex = i; break; }
  }

  const price = meta.regularMarketPrice || (latestIndex >= 0 ? closes[latestIndex] : 0) || 0;
  const previousClose = meta.previousClose || meta.chartPreviousClose || 0;
  const change = previousClose ? price - previousClose : 0;
  const changesPercentage = previousClose ? (change / previousClose) * 100 : 0;

  return {
    symbol: symbol.toUpperCase(),
    name: meta.longName || meta.shortName || symbol.toUpperCase(),
    price,
    change,
    changesPercentage,
    dayLow: meta.regularMarketDayLow || (latestIndex >= 0 ? lows[latestIndex] : 0) || 0,
    dayHigh: meta.regularMarketDayHigh || (latestIndex >= 0 ? highs[latestIndex] : 0) || 0,
    yearLow: meta.fiftyTwoWeekLow || 0,
    yearHigh: meta.fiftyTwoWeekHigh || 0,
    volume: meta.regularMarketVolume || (latestIndex >= 0 ? volumes[latestIndex] : 0) || 0,
    avgVolume: 0,
    marketCap: 0,
    pe: 0,
    eps: 0,
    open: meta.regularMarketOpen || (latestIndex >= 0 ? opens[latestIndex] : 0) || 0,
    previousClose,
    timestamp: meta.regularMarketTime || (latestIndex >= 0 ? timestamps[latestIndex] : Math.floor(Date.now() / 1000)),
    currency: meta.currency || "USD",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    // Try FMP first (richer data), then Yahoo chart as fallback
    if (FMP_KEY) {
      try {
        return NextResponse.json(await getFmpQuote(symbol));
      } catch { /* fall through */ }
    }
    try {
      return NextResponse.json(await getYahooQuote(symbol));
    } catch { /* fall through */ }
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const [quoteRes, profileRes, metricRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`, { cache: "no-store" }),
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } })
    ]);

    if (!quoteRes.ok) throw new Error("Finnhub quote request failed");
    
    const quote = await quoteRes.json();
    const profile = await profileRes.json();
    const metricData = await metricRes.json();
    const metric = metricData?.metric || {};

    const stockQuote = {
      symbol: symbol.toUpperCase(),
      name: profile?.name || symbol.toUpperCase(),
      price: quote.c || 0,
      change: quote.d || 0,
      changesPercentage: quote.dp || 0,
      dayLow: quote.l || 0,
      dayHigh: quote.h || 0,
      yearLow: metric["52WeekLow"] || 0,
      yearHigh: metric["52WeekHigh"] || 0,
      volume: metric["10DayAverageTradingVolume"] ? metric["10DayAverageTradingVolume"] * 1000000 : 0,
      avgVolume: metric["3MonthAverageTradingVolume"] ? metric["3MonthAverageTradingVolume"] * 1000000 : 0,
      marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1000000 : 0,
      pe: metric["peTTM"] || 0,
      eps: metric["epsTTM"] || 0,
      open: quote.o || 0,
      previousClose: quote.pc || 0,
      timestamp: quote.t || Math.floor(Date.now() / 1000)
    };

    return NextResponse.json(stockQuote);
  } catch (error) {
    // Fallback chain: FMP → Yahoo
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpQuote(symbol)); } catch { /* continue */ }
    }
    try { return NextResponse.json(await getYahooQuote(symbol)); } catch { /* continue */ }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch quote." }, { status: 502 });
  }
}
