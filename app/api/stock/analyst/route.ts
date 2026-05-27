export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

interface FinnhubRecommendation {
  buy: number;
  hold: number;
  sell: number;
  strongBuy: number;
  strongSell: number;
  period: string;
  symbol: string;
}

interface AnalystRating {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
}

function calcConsensus(rec: FinnhubRecommendation): string {
  const total =
    rec.strongBuy + rec.buy + rec.hold + rec.sell + rec.strongSell;

  if (total === 0) return "Hold";

  const score =
    (rec.strongBuy * 5 +
      rec.buy * 4 +
      rec.hold * 3 +
      rec.sell * 2 +
      rec.strongSell * 1) /
    total;

  if (score >= 4.5) return "Strong Buy";
  if (score >= 3.5) return "Buy";
  if (score <= 1.5) return "Strong Sell";
  if (score <= 2.5) return "Sell";
  return "Hold";
}

export async function GET(request: Request) {
  if (!FINNHUB_KEY) {
    return NextResponse.json(
      { error: "FINNHUB_API_KEY not configured." },
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
    const url = `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(FINNHUB_KEY)}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403) {
        return NextResponse.json([]);
      }
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }

    const data: FinnhubRecommendation[] = await res.json();

    if (!Array.isArray(data) || data.length === 0) {
      return NextResponse.json([]);
    }

    const latest = data[0];

    const rating: AnalystRating = {
      strongBuy: latest.strongBuy,
      buy: latest.buy,
      hold: latest.hold,
      sell: latest.sell,
      strongSell: latest.strongSell,
      consensus: calcConsensus(latest),
    };

    return NextResponse.json([rating]);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch analyst recommendations.",
      },
      { status: 502 }
    );
  }
}
