export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");
const FMP_KEY = getEnv("FMP_API_KEY");

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getFmpKeyStats(symbol: string) {
  const [quoteRes, ratiosRes] = await Promise.all([
    fetch(`https://financialmodelingprep.com/api/v3/quote/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`, { cache: "no-store" }),
    fetch(`https://financialmodelingprep.com/api/v3/ratios-ttm/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`, { next: { revalidate: 300 } }),
  ]);

  const quoteData = quoteRes.ok ? await quoteRes.json() : [];
  const ratiosData = ratiosRes.ok ? await ratiosRes.json() : [];
  const q = Array.isArray(quoteData) ? quoteData[0] : quoteData;
  const r = Array.isArray(ratiosData) ? ratiosData[0] : ratiosData;

  if (!q) throw new Error("FMP key stats not found");

  return [{
    avgVolume: q.avgVolume || 0,
    marketCap: q.marketCap || 0,
    peRatio: q.pe || r?.peRatioTTM || 0,
    weekRange52: `${(q.yearLow || 0).toFixed(2)} - ${(q.yearHigh || 0).toFixed(2)}`,
    eps: q.eps || 0,
    revenue: 0,
    netIncome: 0,
    beta: 0,
    dividendYield: r?.dividendYielTTM || r?.dividendYieldTTM || 0,
    profitMargin: r?.netProfitMarginTTM || 0,
  }];
}

async function getYahooKeyStats(symbol: string) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=1y`;
  const res = await fetch(url, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) throw new Error(`Yahoo chart request failed: ${res.status}`);

  const data = await res.json();
  const meta = data?.chart?.result?.[0]?.meta || {};
  const weekLow = meta.fiftyTwoWeekLow || 0;
  const weekHigh = meta.fiftyTwoWeekHigh || 0;

  return [{
    avgVolume: meta.averageDailyVolume3Month || 0,
    marketCap: 0,
    peRatio: 0,
    weekRange52: weekLow || weekHigh ? `${weekLow.toFixed(2)} - ${weekHigh.toFixed(2)}` : "0 - 0",
    eps: 0,
    revenue: 0,
    netIncome: 0,
    beta: 0,
    dividendYield: 0,
    profitMargin: 0,
  }];
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpKeyStats(symbol)); } catch { /* fall through */ }
    }
    try { return NextResponse.json(await getYahooKeyStats(symbol)); } catch { /* fall through */ }
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
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpKeyStats(symbol)); } catch { /* continue */ }
    }
    try { return NextResponse.json(await getYahooKeyStats(symbol)); } catch { /* continue */ }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch key stats." }, { status: 502 });
  }
}
