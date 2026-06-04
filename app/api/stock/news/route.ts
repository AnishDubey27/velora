export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { tavilySearch, isTavilyConfigured } from "@/lib/tavily";

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
  // Use Yahoo Finance search API which works without authentication
  const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=0&newsCount=20`;
  const res = await fetch(searchUrl, {
    cache: "no-store",
    headers: { "User-Agent": "Mozilla/5.0" },
  });

  if (!res.ok) throw new Error(`Yahoo search request failed: ${res.status}`);

  const data = await res.json();
  const news = data?.news || [];

  return news.slice(0, 20).map((item: any) => ({
    title: item.title || "",
    url: item.link || "",
    publishedDate: item.providerPublishTime
      ? new Date(item.providerPublishTime * 1000).toISOString()
      : new Date().toISOString(),
    site: item.publisher || "Yahoo Finance",
    text: "",
    image: item.thumbnail?.resolutions?.[0]?.url || "",
    symbol,
  }));
}

async function getTavilyNews(symbol: string): Promise<StockNewsItem[]> {
  const tavilyData = await tavilySearch({
    query: `${symbol} stock news analysis`,
    topic: "finance",
    maxResults: 10,
    timeRange: "month",
    includeDomains: [
      "reuters.com", "bloomberg.com", "wsj.com",
      "cnbc.com", "seekingalpha.com", "marketwatch.com",
      "finance.yahoo.com", "fool.com", "barrons.com"
    ],
  });

  return tavilyData.results.map((item) => ({
    title: item.title,
    url: item.url,
    publishedDate: item.published_date || new Date().toISOString(),
    site: item.url ? new URL(item.url).hostname.replace("www.", "") : "Tavily",
    text: item.content || "",
    image: "",
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
    // Fallback: Tavily → Yahoo Finance
    if (isTavilyConfigured()) {
      try {
        return NextResponse.json(await getTavilyNews(symbol));
      } catch (tavilyErr) {
        console.error("Tavily stock news fallback failed:", tavilyErr);
      }
    }
    try {
      return NextResponse.json(await getYahooNews(symbol));
    } catch {
      return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch stock news." }, { status: 502 });
    }
  }
}
