export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

export async function GET(request: Request) {
  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });
  
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch quote." }, { status: 502 });
  }
}
