export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import yahooFinance from "yahoo-finance2";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

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

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getYahooEarnings(symbol: string): Promise<EarningsEntry[]> {
  const summary = await yahooFinance.quoteSummary(symbol, { modules: ['earningsHistory'] }).catch(() => null);
  
  if (!summary) throw new Error("Yahoo earnings not found");
  
  const history = summary.earningsHistory?.history || [];
  
  return history.map(item => ({
    date: item.quarter?.toISOString() || "",
    symbol,
    fiscalDateEnding: item.quarter?.toISOString() || "",
    epsEstimated: item.epsEstimate,
    epsActual: item.epsActual,
    revenueEstimated: null,
    revenueActual: null,
    epsSurprise: item.epsDifference,
    revenueSurprise: null,
    updatedFromDate: "",
    fiscalPeriod: item.period || "",
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    try {
      return NextResponse.json(await getYahooEarnings(symbol));
    } catch {
      // Fall through
    }
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
    try {
      return NextResponse.json(await getYahooEarnings(symbol));
    } catch {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch earnings data." }, { status: 502 });
    }
  }
}
