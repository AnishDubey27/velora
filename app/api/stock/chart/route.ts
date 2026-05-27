export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

type YahooParams = { interval: string; range: string };

function getYahooParams(range: string): YahooParams {
  switch (range) {
    case "1D":
      return { interval: "5m", range: "1d" };
    case "1W":
      return { interval: "15m", range: "5d" };
    case "1M":
      return { interval: "1h", range: "1mo" };
    case "3M":
      return { interval: "1d", range: "3mo" };
    case "6M":
      return { interval: "1d", range: "6mo" };
    case "YTD":
      return { interval: "1d", range: "ytd" };
    case "1Y":
      return { interval: "1d", range: "1y" };
    case "2Y":
      return { interval: "1wk", range: "2y" };
    default:
      return { interval: "5m", range: "1d" };
  }
}

interface ChartEntry {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  const range = searchParams.get("range") || "1D";

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  const params = getYahooParams(range);

  try {
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=${params.interval}&range=${params.range}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 404 || res.status === 422) {
        return NextResponse.json([]);
      }
      throw new Error(`Yahoo Finance request failed with status ${res.status}`);
    }

    const data = await res.json();
    const result = data?.chart?.result?.[0];

    if (!result || !result.timestamp) {
      return NextResponse.json([]);
    }

    const timestamps: number[] = result.timestamp;
    const quote = result.indicators?.quote?.[0];

    if (!quote) {
      return NextResponse.json([]);
    }

    const opens: (number | null)[] = quote.open ?? [];
    const highs: (number | null)[] = quote.high ?? [];
    const lows: (number | null)[] = quote.low ?? [];
    const closes: (number | null)[] = quote.close ?? [];
    const volumes: (number | null)[] = quote.volume ?? [];

    const chartData: ChartEntry[] = [];

    for (let i = 0; i < timestamps.length; i++) {
      const close = closes[i];
      if (close == null) continue;

      chartData.push({
        date: new Date(timestamps[i] * 1000).toISOString(),
        open: opens[i] ?? close,
        high: highs[i] ?? close,
        low: lows[i] ?? close,
        close,
        volume: volumes[i] ?? 0,
      });
    }

    // Sort oldest first
    chartData.sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0));

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
