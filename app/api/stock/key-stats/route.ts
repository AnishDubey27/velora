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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch key stats." }, { status: 502 });
  }
}
