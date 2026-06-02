export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");
const FMP_KEY = getEnv("FMP_API_KEY");

interface EarningsEntry {
  date: string;
  symbol: string;
  fiscalDateEnding: string;
  epsEstimated: number | null;
  epsActual: number | null;
  revenueEstimated: number | null;
  revenueActual: number | null;
  epsSurprise: number | null;
  revenueSurprise: number | null;
  updatedFromDate: string;
  fiscalPeriod: string;
}

interface FinnhubEarning {
  actual: number | null;
  estimate: number | null;
  period: string;
  quarter: number;
  surprise: number | null;
  surprisePercent: number | null;
  symbol: string;
  year: number;
}

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getFmpEarnings(symbol: string): Promise<EarningsEntry[]> {
  const url = `https://financialmodelingprep.com/api/v3/earnings-surprises/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`FMP earnings request failed: ${res.status}`);
  const data = await res.json();
  if (!Array.isArray(data) || data.length === 0) throw new Error("FMP earnings not found");

  return data.slice(0, 12).map((item: any) => ({
    date: item.date || "",
    symbol: item.symbol || symbol,
    fiscalDateEnding: item.date || "",
    epsEstimated: item.estimatedEarning ?? null,
    epsActual: item.actualEarningResult ?? null,
    revenueEstimated: null,
    revenueActual: null,
    epsSurprise: item.actualEarningResult != null && item.estimatedEarning != null
      ? item.actualEarningResult - item.estimatedEarning
      : null,
    revenueSurprise: null,
    updatedFromDate: "",
    fiscalPeriod: item.date || "",
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpEarnings(symbol)); } catch { /* fall through */ }
    }
    return NextResponse.json([]);
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const url = `https://finnhub.io/api/v1/stock/earnings?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(FINNHUB_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403 || res.status === 429) {
        return NextResponse.json([]);
      }
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }

    const data: FinnhubEarning[] = await res.json();
    if (!Array.isArray(data)) return NextResponse.json([]);

    const mapped: EarningsEntry[] = data.map((item) => ({
      date: item.period,
      symbol: item.symbol,
      fiscalDateEnding: item.period,
      epsEstimated: item.estimate ?? null,
      epsActual: item.actual ?? null,
      revenueEstimated: null,
      revenueActual: null,
      epsSurprise: item.surprise ?? null,
      revenueSurprise: null,
      updatedFromDate: "",
      fiscalPeriod: `Q${item.quarter} FY${item.year.toString().slice(-2)}`,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpEarnings(symbol)); } catch { /* continue */ }
    }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch earnings data." }, { status: 502 });
  }
}
