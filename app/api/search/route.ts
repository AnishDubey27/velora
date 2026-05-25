import { NextResponse } from "next/server";

const FINNHUB_KEY = process.env['FINNHUB_API_KEY'];

export async function GET(request: Request) {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const query = searchParams.get("q");

  if (!query) {
    return NextResponse.json({ error: "Query parameter 'q' is required." }, { status: 400 });
  }

  try {
    const url = `https://finnhub.io/api/v1/search?q=${encodeURIComponent(query)}&token=${encodeURIComponent(FINNHUB_KEY)}`;
    const res = await fetch(url, { cache: "no-store" });
    
    if (!res.ok) {
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }

    const data = await res.json();
    
    // Finnhub returns { count: number, result: [{ description, displaySymbol, symbol, type }] }
    return NextResponse.json({ results: data.result || [] });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to search symbols." },
      { status: 502 }
    );
  }
}
