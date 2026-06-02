export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

import _yahooFinance from "yahoo-finance2";
const yahooFinance = new (_yahooFinance as any)() as any;

async function getYahooQuote(symbol: string) {
  const quote = await yahooFinance.quote(symbol);
  if (!quote) throw new Error("Yahoo quote not found");
  
  return {
    symbol: symbol.toUpperCase(),
    name: quote.longName || quote.shortName || symbol.toUpperCase(),
    price: quote.regularMarketPrice || 0,
    change: quote.regularMarketChange || 0,
    changesPercentage: quote.regularMarketChangePercent || 0,
    dayLow: quote.regularMarketDayLow || 0,
    dayHigh: quote.regularMarketDayHigh || 0,
    yearLow: quote.fiftyTwoWeekLow || 0,
    yearHigh: quote.fiftyTwoWeekHigh || 0,
    volume: quote.regularMarketVolume || 0,
    avgVolume: quote.averageDailyVolume10Day || quote.averageDailyVolume3Month || 0,
    marketCap: quote.marketCap || 0,
    pe: quote.trailingPE || 0,
    eps: quote.epsTrailingTwelveMonths || 0,
    open: quote.regularMarketOpen || 0,
    previousClose: quote.regularMarketPreviousClose || 0,
    timestamp: Math.floor(Date.now() / 1000),
    currency: quote.currency || "USD",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    try {
      return NextResponse.json(await getYahooQuote(symbol));
    } catch {
      // Fall through to Finnhub when Yahoo is temporarily unavailable.
    }
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
    try {
      return NextResponse.json(await getYahooQuote(symbol));
    } catch {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch quote." }, { status: 502 });
    }
  }
}
