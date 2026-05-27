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

function clampSymbol(symbol: string) {
  const cleaned = symbol.trim().toUpperCase();
  if (!cleaned) return "NVDA";
  // keep it conservative to avoid SSRF tricks / weird characters
  if (!/^[A-Z0-9.\-:_]{1,15}$/.test(cleaned)) return "NVDA";
  return cleaned;
}

export async function GET(request: Request) {
  if (!FINNHUB_KEY) {
    return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });
  }

  const { searchParams } = new URL(request.url);
  const symbol = clampSymbol(searchParams.get("symbol") || "NVDA");

  const asOf = new Date().toISOString();

  const quoteUrl = `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(symbol)}&token=${encodeURIComponent(
    FINNHUB_KEY
  )}`;

  const priceTargetUrl = `https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(
    symbol
  )}&token=${encodeURIComponent(FINNHUB_KEY)}`;

  const recommendationUrl = `https://finnhub.io/api/v1/stock/recommendation?symbol=${encodeURIComponent(
    symbol
  )}&token=${encodeURIComponent(FINNHUB_KEY)}`;

  try {
    const [quoteRaw, priceTargetRaw, recommendationRaw] = await Promise.all([
      fetchJson(quoteUrl, { cache: "no-store" }).catch(() => null),
      fetchJson(priceTargetUrl, { cache: "no-store" }).catch(() => null),
      fetchJson(recommendationUrl, { cache: "no-store" }).catch(() => null),
    ]);

    const currentPrice = toNumber(quoteRaw?.c);
    const priceChangePercent = toNumber(quoteRaw?.dp);

    const targetMean = toNumber(priceTargetRaw?.targetMean);
    const upsidePercent =
      currentPrice && targetMean ? ((targetMean - currentPrice) / currentPrice) * 100 : null;

    const recs = Array.isArray(recommendationRaw) ? recommendationRaw : [];
    const latestRec = recs.find((r: any) => typeof r?.period === "string") ?? recs[0] ?? null;
    const strongBuy = typeof latestRec?.strongBuy === "number" ? latestRec.strongBuy : null;
    const buy = typeof latestRec?.buy === "number" ? latestRec.buy : null;
    const hold = typeof latestRec?.hold === "number" ? latestRec.hold : null;
    const sell = typeof latestRec?.sell === "number" ? latestRec.sell : null;
    const strongSell = typeof latestRec?.strongSell === "number" ? latestRec.strongSell : null;
    const recPeriod = typeof latestRec?.period === "string" ? latestRec.period : null;

    return NextResponse.json({
      asOf,
      symbol,
      quote: { price: currentPrice, changePercent: priceChangePercent, source: "Finnhub" },
      priceTarget: {
        high: toNumber(priceTargetRaw?.targetHigh),
        low: toNumber(priceTargetRaw?.targetLow),
        mean: targetMean,
        median: toNumber(priceTargetRaw?.targetMedian),
        lastUpdated: typeof priceTargetRaw?.lastUpdated === "string" ? priceTargetRaw.lastUpdated : null,
        upsidePercent,
        source: "Finnhub",
      },
      recommendations: {
        period: recPeriod,
        strongBuy,
        buy,
        hold,
        sell,
        strongSell,
        source: "Finnhub",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { asOf, symbol, error: error instanceof Error ? error.message : "Failed to load signals." },
      { status: 502 }
    );
  }
}

