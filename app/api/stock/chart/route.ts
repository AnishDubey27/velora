export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FMP_KEY = getEnv("FMP_API_KEY");
const BASE = "https://financialmodelingprep.com";

type RangeConfig = {
  interval: string;
  type: "intraday" | "daily";
  daysBack: number;
};

function getRangeConfig(range: string): RangeConfig {
  switch (range) {
    case "1D":
      return { interval: "5min", type: "intraday", daysBack: 1 };
    case "1W":
      return { interval: "15min", type: "intraday", daysBack: 7 };
    case "1M":
      return { interval: "1hour", type: "intraday", daysBack: 30 };
    case "3M":
      return { interval: "daily", type: "daily", daysBack: 90 };
    case "6M":
      return { interval: "daily", type: "daily", daysBack: 180 };
    case "YTD": {
      const now = new Date();
      const startOfYear = new Date(now.getFullYear(), 0, 1);
      const diffMs = now.getTime() - startOfYear.getTime();
      const daysBack = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      return { interval: "daily", type: "daily", daysBack };
    }
    case "1Y":
      return { interval: "daily", type: "daily", daysBack: 365 };
    case "2Y":
      return { interval: "daily", type: "daily", daysBack: 730 };
    default:
      return { interval: "5min", type: "intraday", daysBack: 1 };
  }
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

export async function GET(request: Request) {
  if (!FMP_KEY) {
    return NextResponse.json(
      { error: "FMP_API_KEY not configured." },
      { status: 500 }
    );
  }

  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1D";

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  const config = getRangeConfig(range);
  const to = new Date();
  const from = new Date();
  from.setDate(from.getDate() - config.daysBack);

  const fromStr = formatDate(from);
  const toStr = formatDate(to);

  try {
    let url: string;

    if (config.type === "intraday") {
      url = `${BASE}/stable/historical-chart/${config.interval}?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&apikey=${encodeURIComponent(FMP_KEY)}`;
    } else {
      url = `${BASE}/stable/historical-price-eod/full?symbol=${encodeURIComponent(symbol)}&from=${fromStr}&to=${toStr}&apikey=${encodeURIComponent(FMP_KEY)}`;
    }

    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 402 || res.status === 403 || res.status === 404) {
        return NextResponse.json([]);
      }
      throw new Error(`FMP request failed with status ${res.status}`);
    }

    const data = await res.json();

    // Intraday returns an array directly; daily EOD returns { symbol, historical: [...] }
    let chartData: unknown[];
    if (Array.isArray(data)) {
      chartData = data;
    } else if (data && Array.isArray(data.historical)) {
      chartData = data.historical;
    } else {
      chartData = [];
    }

    // Sort oldest-first for charting
    chartData.sort((a: unknown, b: unknown) => {
      const dateA = (a as { date: string }).date;
      const dateB = (b as { date: string }).date;
      return dateA < dateB ? -1 : dateA > dateB ? 1 : 0;
    });

    return NextResponse.json(chartData);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch chart data.",
      },
      { status: 502 }
    );
  }
}
