export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv('FINNHUB_API_KEY');

function toNumber(value: unknown) {
  if (typeof value === "number") return Number.isFinite(value) ? value : null;
  if (typeof value === "string") {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

async function fetchJson(url: string, init?: RequestInit) {
  const res = await fetch(url, init);
  const text = await res.text();
  let data: any = null;
  try {
    data = JSON.parse(text);
  } catch {
    data = text;
  }
  if (!res.ok) {
    throw new Error(`Request failed (${res.status}): ${typeof data === "string" ? data : "JSON"}`);
  }
  return data;
}

async function getSp500() {
  if (!FINNHUB_KEY) return { symbol: "SPY", price: null, changePercent: null, source: "Finnhub" };

  const data = await fetchJson(
    `https://finnhub.io/api/v1/quote?symbol=SPY&token=${encodeURIComponent(FINNHUB_KEY)}`,
    { cache: "no-store" }
  );

  return {
    symbol: "SPY",
    price: toNumber(data?.c),
    changePercent: toNumber(data?.dp),
    source: "Finnhub",
  };
}

async function getBitcoin() {
  // Keyless endpoint: Coinbase Exchange (BTC-USD stats)
  const data = await fetchJson("https://api.exchange.coinbase.com/products/BTC-USD/stats", {
    cache: "no-store",
  });

  const open = toNumber(data?.open);
  const last = toNumber(data?.last);
  const changePercent =
    open && last ? ((last - open) / open) * 100 : null;

  return {
    symbol: "BTC-USD",
    price: last,
    changePercent,
    source: "Coinbase Exchange",
  };
}

export async function GET() {
  try {
    const [sp500, bitcoin] = await Promise.all([getSp500(), getBitcoin()]);
    return NextResponse.json({ asOf: new Date().toISOString(), sp500, bitcoin });
  } catch (error) {
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to load indicators.",
        asOf: new Date().toISOString(),
      },
      { status: 502 }
    );
  }
}

