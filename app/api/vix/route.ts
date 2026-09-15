export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

// In-memory cache for last known live reading to handle momentary network blips
let lastKnownVix: { value: number; change?: number; changePercent?: number; updatedAt: string } | null = null;

export async function GET() {
  // 1. Primary Source: Yahoo Finance CBOE Volatility Index (^VIX) - Real-time & Keyless
  try {
    const res = await fetch(
      "https://query1.finance.yahoo.com/v8/finance/chart/%5EVIX?interval=1d&range=1d",
      {
        cache: "no-store",
        headers: { "User-Agent": "Mozilla/5.0" },
      }
    );

    if (res.ok) {
      const data = await res.json();
      const meta = data?.chart?.result?.[0]?.meta;
      const price = meta?.regularMarketPrice ?? meta?.chartPreviousClose;

      if (typeof price === "number" && !isNaN(price) && price > 0) {
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose;
        const change = prevClose ? price - prevClose : undefined;
        const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : undefined;

        lastKnownVix = {
          value: Number(price.toFixed(2)),
          change: typeof change === "number" ? Number(change.toFixed(2)) : undefined,
          changePercent: typeof changePercent === "number" ? Number(changePercent.toFixed(2)) : undefined,
          updatedAt: new Date().toISOString(),
        };

        return NextResponse.json({
          ...lastKnownVix,
          source: "CBOE (Yahoo Finance)",
        });
      }
    }
  } catch (err) {
    console.warn("Live Yahoo Finance VIX fetch error:", err);
  }

  // 2. Secondary Source: St. Louis Fed (FRED) if user provided a FRED_API_KEY
  const fredKey = getEnv("FRED_API_KEY");
  if (fredKey && fredKey !== "your_fred_key") {
    try {
      const res = await fetch(
        `https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=${encodeURIComponent(
          fredKey
        )}&file_type=json&limit=1&sort_order=desc`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();
        const obs = data?.observations?.[0]?.value;
        const val = parseFloat(obs);
        if (!isNaN(val) && val > 0) {
          lastKnownVix = {
            value: Number(val.toFixed(2)),
            updatedAt: new Date().toISOString(),
          };
          return NextResponse.json({
            ...lastKnownVix,
            source: "FRED",
          });
        }
      }
    } catch (e) {
      console.warn("FRED VIX fetch error:", e);
    }
  }

  // 3. If upstream is temporarily down, serve the last verified live quote
  if (lastKnownVix) {
    return NextResponse.json({
      ...lastKnownVix,
      source: "Cached Live Data",
      isCached: true,
    });
  }

  // 4. Honest error response rather than fake mock number
  return NextResponse.json(
    { error: "VIX index data is temporarily unavailable from upstream providers." },
    { status: 503 }
  );
}