export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { tavilySearch, isTavilyConfigured } from "@/lib/tavily";

const MARKETAUX_KEY = getEnv('MARKETAUX_API_KEY');
const FINNHUB_KEY = getEnv('FINNHUB_API_KEY');
const BRAVE_KEY = getEnv('BRAVE_SEARCH_API_KEY');

function isProbablyEnglish(text: string) {
  if (!text) return true;

  // Fast reject for common non-Latin scripts (CJK, Hangul, Hiragana/Katakana, Cyrillic, Arabic, etc.)
  const nonLatinScript = /[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}\p{Script=Cyrillic}\p{Script=Arabic}]/u;
  if (nonLatinScript.test(text)) return false;

  // Ratio check: if most letters are Latin, treat it as English-ish.
  const letters = text.match(/\p{Letter}/gu) ?? [];
  if (letters.length === 0) return true;
  const latinLetters = text.match(/\p{Script=Latin}/gu) ?? [];
  return latinLetters.length / letters.length >= 0.8;
}

function formatTime(publishedAt: unknown) {
  if (typeof publishedAt === "number") {
    publishedAt = new Date(publishedAt).toISOString();
  }
  if (typeof publishedAt !== "string") return null;
  const date = new Date(publishedAt);
  if (Number.isNaN(date.getTime())) return null;
  try {
    return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" }).toLowerCase();
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const country = searchParams.get("country") || "US";

  try {
    if (country === "Crypto") {
      if (!FINNHUB_KEY) {
        return NextResponse.json(
          [{ title: "Finnhub API key not configured.", summary: "Set FINNHUB_API_KEY in .env.local." }],
          { status: 500 }
        );
      }

      const url = `https://finnhub.io/api/v1/news?category=crypto&token=${FINNHUB_KEY}`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      const articles = Array.isArray(data) ? data : [];

      const englishOnly = articles.filter((item: any) => {
        const text = [item?.headline, item?.summary].filter(Boolean).join(" ");
        return isProbablyEnglish(text);
      });

      if (englishOnly.length > 0) {
        const normalized = englishOnly
          .filter((item: any) => !!item?.headline)
          .map((item: any) => ({
            title: item.headline,
            summary: item.summary || "",
            description: item.summary || "",
            time: formatTime(item.datetime * 1000) || null,
            url: item.url || null,
            source: item.source || null,
            domain: item.source || null,
            symbol: item.related || null,
            image_url: item.image || null,
          }));
        return NextResponse.json(normalized);
      }

      return NextResponse.json([
        {
          title: "No English articles available right now.",
          summary: "Try again in a few minutes.",
        },
      ]);
    }

    // Prioritize Tavily for news search
    if (isTavilyConfigured()) {
      try {
        const query = country === "India" 
          ? "India stock market business news today" 
          : country === "Crypto"
            ? "cryptocurrency crypto market news today"
            : "US stock market business financial news today";
        
        const tavilyData = await tavilySearch({
          query,
          topic: "news",
          maxResults: 10,
          timeRange: "day",
        });

        if (tavilyData.results.length > 0) {
          const normalized = tavilyData.results.map((item) => ({
            title: item.title,
            summary: item.content || "",
            description: item.content || "",
            time: item.published_date ? formatTime(item.published_date) : null,
            url: item.url || null,
            source: null,
            domain: item.url ? new URL(item.url).hostname.replace("www.", "") : null,
            image_url: null,
          }));
          return NextResponse.json(normalized);
        }
      } catch (tavilyErr) {
        console.error("Tavily news search failed, falling back...", tavilyErr);
      }
    }

    // Prioritize Brave News Search for US and India to deliver 5+ articles
    if (BRAVE_KEY) {
      try {
        const query = country === "India" ? "India stock market business news" : "US stock market business news";
        const url = `https://api.search.brave.com/res/v1/news/search?q=${encodeURIComponent(query)}&count=10&freshness=pw`;
        
        const res = await fetch(url, {
          headers: {
            "X-Subscription-Token": BRAVE_KEY,
            "Accept": "application/json",
          },
          cache: "no-store",
        });
        
        if (res.ok) {
          const data = await res.json();
          const results = Array.isArray(data?.results) ? data.results : [];
          
          if (results.length > 0) {
            const normalized = results.map((item: any) => ({
              title: item.title,
              summary: item.description || "",
              description: item.description || "",
              time: formatTime(item.page_age) || item.age || null,
              url: item.url || null,
              source: item.profile?.name || null,
              domain: item.profile?.name || null,
              image_url: item.thumbnail?.src || null,
            }));
            return NextResponse.json(normalized);
          }
        }
      } catch (braveErr) {
        console.error("Brave News Search failed, falling back...", braveErr);
      }
    }

    // Default to Marketaux for other categories
    let symbols = "NVDA,MSFT,AAPL,TSLA";
    let topics = "";
    let countries = "us";

    if (country === "India") {
      symbols = "RELIANCE.NS,HDFCBANK.NS,INFY,TCS";
      topics = "india";
      countries = "in";
    }

    if (!MARKETAUX_KEY) {
      return NextResponse.json(
        [{ title: `Market API Keys Missing. Env: ${Object.keys(process.env).filter(k => k.includes('MARKET') || k.includes('FINN') || k.includes('SUPA') || k.includes('NEXT')).join(', ') || 'NONE'}`, summary: "Set MARKETAUX_API_KEY in .env.local." }],
        { status: 500 }
      );
    }

    const params = new URLSearchParams({
      symbols,
      topics,
      filter_entities: "true",
      api_token: MARKETAUX_KEY,
      limit: "15",
      language: "en",
      ...(countries ? { countries } : {}),
    });

    const url = `https://api.marketaux.com/v1/news/all?${params.toString()}`;

    const res = await fetch(url, { cache: "no-store" });
    const data = await res.json();

    const articles = Array.isArray(data?.data) ? data.data : [];

    const englishOnly = articles.filter((item: any) => {
      const language = typeof item?.language === "string" ? item.language.toLowerCase() : null;
      if (language && language !== "en") return false;

      const text = [
        item?.title,
        item?.description,
        item?.snippet,
        item?.summary,
      ]
        .filter(Boolean)
        .join(" ");

      return isProbablyEnglish(text);
    });

    // If filtering is too aggressive, fall back to a smaller but safe list.
    if (englishOnly.length > 0) {
      const normalized = englishOnly
        .filter((item: any) => !!item?.title)
        .map((item: any) => {
          const symbolFromEntities =
            Array.isArray(item?.entities) &&
            item.entities.find((e: any) => typeof e?.symbol === "string" && e.symbol.length > 0)?.symbol;

          return {
            title: item.title,
            summary: item.description || item.snippet || item.summary || "",
            description: item.description || item.snippet || "",
            keywords: typeof item.keywords === "string" ? item.keywords : "",
            time: formatTime(item.published_at) || item.time || null,
            url: item.url || item.link || null,
            source: item.source?.name || item.source || item.publisher || null,
            domain: item.domain || null,
            symbol: item.symbol || symbolFromEntities || null,
            impact: item.impact || null,
            image_url: item.image_url || null,
          };
        });

      return NextResponse.json(normalized);
    }

    return NextResponse.json([
      {
        title: "No English articles available right now.",
        summary: "Try again in a few minutes.",
      },
    ]);
  } catch (error) {
    console.error("News API error:", error);
    // Fallback mock data
    return NextResponse.json([
      {
        title: "Wise on Track for Nasdaq Listing Next Month as Income Jumps 24%",
        summary: "The company's income rose 24% as it prepares for Nasdaq listing.",
        time: "12:25 pm",
        symbol: "WIZEY",
        price: "13.21",
        change: 0.61,
        url: "https://example.com",
        source: "Example",
      }
    ]);
  }
}
