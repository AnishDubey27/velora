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
    const url = `${BASE}/stable/profile?symbol=${encodeURIComponent(symbol)}&apikey=${encodeURIComponent(FMP_KEY)}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) {
      throw new Error(`FMP request failed with status ${res.status}`);
    }

    const data = await res.json();
    return NextResponse.json(Array.isArray(data) ? data[0] ?? null : data);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : "Failed to fetch profile.",
      },
      { status: 502 }
    );
  }
}
