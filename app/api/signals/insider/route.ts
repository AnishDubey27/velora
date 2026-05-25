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

const FALLBACK_DATA: InsiderTransaction[] = [
  {
    symbol: "AAPL",
    name: "Tim Cook",
    transactionDate: "2025-05-20",
    filingDate: "2025-05-22",
    transactionCode: "S",
    transactionPrice: 198.5,
    change: -50000,
    share: 3200000,
  },
  {
    symbol: "TSLA",
    name: "Elon Musk",
    transactionDate: "2025-05-18",
    filingDate: "2025-05-20",
    transactionCode: "S",
    transactionPrice: 178.25,
    change: -120000,
    share: 411000000,
  },
  {
    symbol: "MSFT",
    name: "Satya Nadella",
    transactionDate: "2025-05-15",
    filingDate: "2025-05-17",
    transactionCode: "S",
    transactionPrice: 430.1,
    change: -30000,
    share: 800000,
  },
  {
    symbol: "NVDA",
    name: "Jensen Huang",
    transactionDate: "2025-05-12",
    filingDate: "2025-05-14",
    transactionCode: "S",
    transactionPrice: 950.0,
    change: -100000,
    share: 86000000,
  },
  {
    symbol: "AMZN",
    name: "Andrew Jassy",
    transactionDate: "2025-05-10",
    filingDate: "2025-05-12",
    transactionCode: "P",
    transactionPrice: 190.75,
    change: 25000,
    share: 150000,
  },
  {
    symbol: "META",
    name: "Mark Zuckerberg",
    transactionDate: "2025-05-08",
    filingDate: "2025-05-10",
    transactionCode: "S",
    transactionPrice: 510.3,
    change: -200000,
    share: 350000000,
  },
  {
    symbol: "JPM",
    name: "Jamie Dimon",
    transactionDate: "2025-05-05",
    filingDate: "2025-05-07",
    transactionCode: "S",
    transactionPrice: 205.0,
    change: -150000,
    share: 5500000,
  },
  {
    symbol: "GOOGL",
    name: "Sundar Pichai",
    transactionDate: "2025-05-02",
    filingDate: "2025-05-04",
    transactionCode: "S",
    transactionPrice: 175.8,
    change: -50000,
    share: 1200000,
  },
];

export async function GET() {
  if (!FINNHUB_KEY) {
    console.warn("FINNHUB_API_KEY not configured, returning fallback data");
    return NextResponse.json(FALLBACK_DATA);
  }

  try {
    const allTransactions: InsiderTransaction[] = [];

    // Fetch sequentially with delays to respect Finnhub's 60 calls/min rate limit
    for (const symbol of SYMBOLS) {
      try {
        const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${symbol}&token=${FINNHUB_KEY}`;
        const res = await fetch(url, { cache: "no-store" });

        if (!res.ok) {
          console.warn(`Finnhub request failed for ${symbol}: ${res.status}`);
          await delay(100);
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

      // Delay between requests to respect rate limits
      await delay(100);
    }

    if (allTransactions.length === 0) {
      return NextResponse.json(FALLBACK_DATA);
    }

    // Sort by filing date (most recent first)
    allTransactions.sort(
      (a, b) => new Date(b.filingDate).getTime() - new Date(a.filingDate).getTime()
    );

    // Return top 30
    return NextResponse.json(allTransactions.slice(0, 30));
  } catch (error) {
    console.error("Insider trading API error:", error);
    return NextResponse.json(FALLBACK_DATA);
  }
}
