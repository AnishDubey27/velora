// app/api/portfolio/route.ts
import { NextResponse } from "next/server";

const FINNHUB_KEY = process.env['FINNHUB_API_KEY'];

export async function GET(request: Request) {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: "Finnhub key not configured" }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  const symbols = symbolsParam ? symbolsParam.split(",") : ["NVDA", "MSFT", "AAPL", "TSLA"];

  try {
    const quotes = await Promise.all(
      symbols.map(async (symbol) => {
        const res = await fetch(
          `https://finnhub.io/api/v1/quote?symbol=${symbol}&token=${FINNHUB_KEY}`,
          { cache: "no-store" }
        );
        const data = await res.json();

        return {
          symbol: symbol.toUpperCase(),
          price: data.c || 0,
          change: data.d || 0,
          changePercent: data.dp || 0,
        };
      })
    );

    // Convert array to a key-value map for O(1) client lookups
    const quoteMap = quotes.reduce((acc, curr) => {
      acc[curr.symbol] = curr;
      return acc;
    }, {} as Record<string, any>);

    return NextResponse.json({ quotes: quoteMap });
  } catch (error) {
    return NextResponse.json({ error: "Failed to fetch quotes" }, { status: 500 });
  }
}