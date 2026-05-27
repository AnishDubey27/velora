export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FMP_KEY = getEnv("FMP_API_KEY");
const BASE = "https://financialmodelingprep.com";

export async function GET(request: Request) {
  if (!FMP_KEY) {
    return NextResponse.json(
      { error: "FMP_API_KEY not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  try {
    const [ratiosRes, profileRes, quoteRes] = await Promise.all([
      fetch(`${BASE}/stable/ratios-ttm?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`, { next: { revalidate: 300 } }),
      fetch(`${BASE}/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`, { next: { revalidate: 300 } }),
      fetch(`${BASE}/stable/quote?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`, { next: { revalidate: 300 } })
    ]);

    const ratios = await ratiosRes.json().then(d => Array.isArray(d) ? d[0] : null).catch(() => null);
    const profile = await profileRes.json().then(d => Array.isArray(d) ? d[0] : null).catch(() => null);
    const quote = await quoteRes.json().then(d => Array.isArray(d) ? d[0] : null).catch(() => null);

    const stats = {
      avgVolume: profile?.averageVolume || quote?.volume || 0,
      marketCap: profile?.marketCap || quote?.marketCap || 0,
      peRatio: ratios?.priceToEarningsRatioTTM || 0,
      weekRange52: profile?.range || `${quote?.yearLow || 0}-${quote?.yearHigh || 0}`,
      eps: ratios?.netIncomePerShareTTM || 0,
      beta: profile?.beta || 0,
      dividendYield: ratios?.dividendYieldTTM || 0,
      revenue: 0,
      netIncome: 0,
      profitMargin: ratios?.netProfitMarginTTM || 0,
    };

    return NextResponse.json([stats]);
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to fetch key metrics.",
      },
      { status: 502 }
    );
  }
}
