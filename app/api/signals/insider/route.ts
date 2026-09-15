import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const revalidate = 3600;
export const dynamic = "force-dynamic";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

const SYMBOLS = ["AAPL", "MSFT", "TSLA", "NVDA", "AMZN", "META", "GOOGL", "JPM"];

interface InsiderTransaction {
  symbol: string;
  name: string;
  transactionDate: string;
  filingDate: string;
  transactionCode: string;
  transactionPrice: number;
  change: number;
  share: number;
}

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// In-memory cache for insider transactions (TTL: 30 minutes)
let insiderCache: { data: InsiderTransaction[]; timestamp: number } | null = null;
const CACHE_TTL = 30 * 60 * 1000;

export async function GET() {
  if (insiderCache && Date.now() - insiderCache.timestamp < CACHE_TTL) {
    return NextResponse.json(insiderCache.data);
  }

  const finnhubKey = getEnv("FINNHUB_API_KEY");
  if (!finnhubKey) {
    if (insiderCache) return NextResponse.json(insiderCache.data);
    return NextResponse.json(
      { error: "FINNHUB_API_KEY not configured", trades: [] },
      { status: 500 }
    );
  }

  try {
    const allTransactions: InsiderTransaction[] = [];

    // Fetch sequentially with delays to respect Finnhub's 60 calls/min rate limit
    for (const symbol of SYMBOLS) {
      try {
        const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${finnhubKey}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          console.warn(`Finnhub request failed for ${symbol}: ${res.status}`);
          await delay(80);
          continue;
        }

        const data = await res.json();
        const transactions = Array.isArray(data?.data) ? data.data : [];

        for (const tx of transactions) {
          if (!tx.name || !tx.filingDate) continue;

          allTransactions.push({
            symbol,
            name: tx.name || "Unknown",
            transactionDate: tx.transactionDate || tx.filingDate,
            filingDate: tx.filingDate,
            transactionCode: tx.transactionCode || "S",
            transactionPrice: tx.transactionPrice ?? 0,
            change: tx.change ?? 0,
            share: tx.share ?? 0,
          });
        }
      } catch (err) {
        console.warn(`Error fetching insider data for ${symbol}:`, err);
      }

      await delay(80);
    }

    if (allTransactions.length === 0) {
      if (insiderCache) return NextResponse.json(insiderCache.data);
      return NextResponse.json([], { status: 200 });
    }

    // Sort by filing date (most recent first)
    allTransactions.sort(
      (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    );

    const top30 = allTransactions.slice(0, 30);
    insiderCache = { data: top30, timestamp: Date.now() };

    return NextResponse.json(top30);
  } catch (error) {
    console.error("Insider trading API error:", error);
    if (insiderCache) {
      return NextResponse.json(insiderCache.data);
    }
    return NextResponse.json(
      { error: "Insider trading data temporarily unavailable", trades: [] },
      { status: 503 }
    );
  }
}
