export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import _yahooFinance from "yahoo-finance2";
const yahooFinance = new (_yahooFinance as any)() as any;

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

interface FinnhubNewsItem {
  category: string;
  datetime: number;
  headline: string;
  id: number;
  image: string;
  related: string;
  source: string;
  summary: string;
  url: string;
}

interface StockNewsItem {
  title: string;
  url: string;
  publishedDate: string;
  site: string;
  text: string;
  image: string;
  symbol: string;
}

function formatDate(date: Date): string {
  return date.toISOString().split("T")[0];
}

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getYahooNews(symbol: string): Promise<StockNewsItem[]> {
  const search = await yahooFinance.search(symbol).catch(() => null);
  if (!search || !search.news) return [];
  
  return search.news.slice(0, 20).map((item: any) => ({
    title: item.title,
    url: item.link,
    publishedDate: item.providerPublishTime ? new Date(item.providerPublishTime * 1000).toISOString() : new Date().toISOString(),
    site: item.publisher || "Yahoo Finance",
    text: "", 
    image: item.thumbnail?.resolutions?.[0]?.url || "",
    symbol,
  }));
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    try {
      return NextResponse.json(await getYahooNews(symbol));
    } catch {
      // Fall through
    }
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const now = new Date();
    const thirtyDaysAgo = new Date(now);
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const from = formatDate(thirtyDaysAgo);
    const to = formatDate(now);

    const url = `https://finnhub.io/api/v1/company-news?symbol=${encodeURIComponent(symbol)}&from=${from}&to=${to}&token=${encodeURIComponent(FINNHUB_KEY)}`;
    const res = await fetch(url, { cache: "no-store" });

    if (!res.ok) {
      if (res.status === 404 || res.status === 403 || res.status === 429) {
        return NextResponse.json([]);
      }
      throw new Error(`Finnhub request failed with status ${res.status}`);
    }

    const data: FinnhubNewsItem[] = await res.json();
    if (!Array.isArray(data)) return NextResponse.json([]);

    const mapped: StockNewsItem[] = data.slice(0, 20).map((item) => ({
      title: item.headline,
      url: item.url,
      publishedDate: new Date(item.datetime * 1000).toISOString(),
      site: item.source,
      text: item.summary,
      image: item.image,
      symbol: item.related,
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    try {
      return NextResponse.json(await getYahooNews(symbol));
    } catch {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch stock news." }, { status: 502 });
    }
  }
}
