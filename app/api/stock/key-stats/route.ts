export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getYahooKeyStats(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetch(url, { next: { revalidate: 300 } });

  if (!res.ok) {
    throw new Error(`Yahoo Finance key stats request failed with status ${res.status}`);
  }

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta || {};
  const weekLow = meta.fiftyTwoWeekLow || 0;
  const weekHigh = meta.fiftyTwoWeekHigh || 0;

  return [{
    avgVolume: meta.averageDailyVolume3Month || 0,
    marketCap: meta.marketCap || 0,
    peRatio: meta.trailingPE || 0,
    weekRange52: weekLow || weekHigh ? `${weekLow.toFixed(2)} - ${weekHigh.toFixed(2)}` : "0 - 0",
    eps: meta.epsTrailingTwelveMonths || 0,
    revenue: 0,
    netIncome: 0,
    beta: meta.beta || 0,
    dividendYield: meta.trailingAnnualDividendYield || 0,
    profitMargin: 0,
  }];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    try {
      return NextResponse.json(await getYahooKeyStats(symbol));
    } catch {
      // Fall through to Finnhub when Yahoo is temporarily unavailable.
    }
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const [profileRes, metricRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } })
    ]);

    const profile = await profileRes.json();
    const metricData = await metricRes.json();
    const metric = metricData?.metric || {};
    
    const sharesOutstanding = profile?.shareOutstanding ? profile.shareOutstanding * 1000000 : 0;
    const eps = metric["epsTTM"] || 0;
    const revPerShare = metric["revenuePerShareTTM"] || 0;

    const stats = {
      avgVolume: metric["3MonthAverageTradingVolume"] ? metric["3MonthAverageTradingVolume"] * 1000000 : 0,
      marketCap: profile?.marketCapitalization ? profile.marketCapitalization * 1000000 : 0,
      peRatio: metric["peTTM"] || 0,
      weekRange52: `${metric["52WeekLow"]?.toFixed(2) || '0'} - ${metric["52WeekHigh"]?.toFixed(2) || '0'}`,
      eps: eps,
      revenue: revPerShare * sharesOutstanding,
      netIncome: eps * sharesOutstanding,
      beta: metric["beta"] || 0,
      dividendYield: metric["dividendYieldIndicatedAnnual"] || 0,
      profitMargin: (metric["netProfitMarginTTM"] || 0) / 100
    };

    return NextResponse.json([stats]);
  } catch (error) {
    try {
      return NextResponse.json(await getYahooKeyStats(symbol));
    } catch {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch key stats." }, { status: 502 });
    }
  }
}
