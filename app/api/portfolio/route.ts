export const dynamic = 'force-dynamic';
// app/api/portfolio/route.ts
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

type QuoteEntry = {
  symbol: string;
  price: number;
  change: number;
  changePercent: number;
  source?: "finnhub" | "yahoo" | "unavailable";
};

// Short-lived in-memory quote cache (20s TTL) to keep Dashboard + Portfolio fast
// and avoid Finnhub per-minute rate limits when loading multiple holdings.
const QUOTE_CACHE_TTL_MS = 20_000;
const quoteCache = new Map<string, { entry: QuoteEntry; expiresAt: number }>();

async function fetchYahooFallback(symbol: string): Promise<QuoteEntry | null> {
  try {
    const res = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?range=5d&interval=1d`,
      {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0 (compatible; VeloraBot/1.0)" },
        signal: AbortSignal.timeout(3500),
      }
    );
    if (!res.ok) return null;
    const json = await res.json();
    const meta = json?.chart?.result?.[0]?.meta;
    const price = Number(meta?.regularMarketPrice);
    if (!Number.isFinite(price) || price <= 0) return null;

    // Derive previous session close from completed daily closes when available
    const closes: number[] = (json?.chart?.result?.[0]?.indicators?.quote?.[0]?.close || [])
      .filter((v: any) => typeof v === "number" && Number.isFinite(v) && v > 0);
    const prevClose =
      closes.length >= 2
        ? closes[closes.length - 2]
        : Number(meta?.previousClose || meta?.chartPreviousClose || price);
    const change = Number.isFinite(prevClose) && prevClose > 0 ? price - prevClose : 0;
    const changePercent = Number.isFinite(prevClose) && prevClose > 0 ? (change / prevClose) * 100 : 0;

    return {
      symbol,
      price,
      change: Number(change.toFixed(4)),
      changePercent: Number(changePercent.toFixed(4)),
      source: "yahoo",
    };
  } catch {
    return null;
  }
}

async function fetchSingleQuote(symbol: string, finnhubKey: string | undefined): Promise<QuoteEntry> {
  const sym = symbol.trim().toUpperCase();
  const cached = quoteCache.get(sym);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.entry;
  }

  // Primary: Finnhub live quote with strict timeout
  if (finnhubKey) {
    try {
      const res = await fetch(
        `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`,
        { cache: "no-store", signal: AbortSignal.timeout(3500) }
      );
      if (res.ok) {
        const data = await res.json();
        const price = Number(data?.c);
        if (Number.isFinite(price) && price > 0) {
          const entry: QuoteEntry = {
            symbol: sym,
            price,
            change: Number(data?.d) || 0,
            changePercent: Number(data?.dp) || 0,
            source: "finnhub",
          };
          quoteCache.set(sym, { entry, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
          return entry;
        }
      }
    } catch {
      // Fall through to Yahoo Finance fallback
    }
  }

  // Secondary: Yahoo Finance chart API fallback
  const yahooEntry = await fetchYahooFallback(sym);
  if (yahooEntry) {
    quoteCache.set(sym, { entry: yahooEntry, expiresAt: Date.now() + QUOTE_CACHE_TTL_MS });
    return yahooEntry;
  }

  return {
    symbol: sym,
    price: 0,
    change: 0,
    changePercent: 0,
    source: "unavailable",
  };
}

export async function GET(request: Request) {
  const finnhubKey = getEnv('FINNHUB_API_KEY');

  const { searchParams } = new URL(request.url);
  const symbolsParam = searchParams.get("symbols");
  const rawSymbols = symbolsParam ? symbolsParam.split(",") : ["NVDA", "MSFT", "AAPL", "TSLA"];
  const symbols = Array.from(
    new Set(
      rawSymbols
        .map((s) => s.trim().toUpperCase())
        .filter((s) => s.length > 0 && /^[A-Z0-9.\-^]{1,12}$/.test(s))
    )
  );

  if (symbols.length === 0) {
    return NextResponse.json({ quotes: {} });
  }

  try {
    const quotes = await Promise.all(
      symbols.map((symbol) => fetchSingleQuote(symbol, finnhubKey))
    );

    const validCount = quotes.filter((q) => q.price > 0).length;
    if (validCount === 0) {
      return NextResponse.json(
        { error: "Live quote providers are temporarily unavailable", quotes: {} },
        { status: 503 }
      );
    }

    // Convert array to a key-value map for O(1) client lookups
    const quoteMap = quotes.reduce((acc, curr) => {
      acc[curr.symbol] = curr;
      return acc;
    }, {} as Record<string, QuoteEntry>);

    return NextResponse.json({
      quotes: quoteMap,
      partial: validCount < symbols.length,
      fetchedAt: new Date().toISOString(),
    });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to fetch portfolio quotes" },
      { status: 500 }
    );
  }
}
