export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

const TRANSACTION_CODE_MAP: Record<string, string> = {
  P: "Purchase",
  S: "Sale",
  G: "Gift",
  M: "Exercise",
  A: "Award",
  F: "Tax",
};

interface FinnhubInsiderTransaction {
  change: number;
  currency: string;
  filingDate: string;
  id: string;
  isDerivative: boolean;
  name: string;
  share: number;
  source: string;
  symbol: string;
  transactionCode: string;
  transactionDate: string;
  transactionPrice: number;
}

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  // For Indian stocks, Finnhub doesn't have insider data — return empty gracefully
  if (isIndianExchangeSymbol(symbol)) {
    return NextResponse.json([]);
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const url = `https://finnhub.io/api/v1/stock/insider-transactions?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(FINNHUB_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403 || res.status === 429) {
        return NextResponse.json([]);
      }
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }

    const json = await res.json();
    const raw: FinnhubInsiderTransaction[] = Array.isArray(json?.data) ? json.data : [];

    const mapped = raw
      .filter((t) => !t.isDerivative && t.transactionPrice != null && t.transactionPrice > 0)
      .slice(0, 30)
      .map((t) => ({
        symbol: t.symbol,
        reportingName: t.name,
        transactionType: TRANSACTION_CODE_MAP[t.transactionCode] ?? t.transactionCode,
        securitiesTransacted: Math.abs(t.change),
        price: t.transactionPrice ?? 0,
        transactionDate: t.transactionDate,
        filingDate: t.filingDate,
        typeOfOwner: "officer",
        link: "",
      }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch insider trading data." }, { status: 502 });
  }
}
