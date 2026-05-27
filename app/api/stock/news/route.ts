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
  const limit = searchParams.get("limit") || "20";

  if (!symbol) {
    return NextResponse.json(
      { error: "Query parameter 'symbol' is required." },
      { status: 400 }
    );
  }

  try {
    const url = `${BASE}/stable/stock-news?symbol=${encodeURIComponent(symbol)}&limit=${encodeURIComponent(limit)}&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403 || res.status === 402) {
        return NextResponse.json([]);
      }
      throw new Error(`FMP request failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data : []);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? error.message
            : "Failed to fetch stock news.",
      },
      { status: 502 }
    );
  }
}
