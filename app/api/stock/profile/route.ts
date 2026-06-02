export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");
const FMP_KEY = getEnv("FMP_API_KEY");

function isIndianExchangeSymbol(symbol: string) {
  return /\.(NS|BO)$/i.test(symbol);
}

async function getFmpProfile(symbol: string) {
  const url = `https://financialmodelingprep.com/api/v3/profile/${encodeURIComponent(symbol)}?apikey=${FMP_KEY}`;
  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) throw new Error(`FMP profile request failed: ${res.status}`);
  const data = await res.json();
  const p = Array.isArray(data) ? data[0] : data;
  if (!p || !p.symbol) throw new Error("FMP profile not found");

  return {
    symbol: p.symbol,
    companyName: p.companyName || symbol.toUpperCase(),
    description: p.description || "",
    sector: p.sector || "",
    industry: p.industry || "",
    ceo: p.ceo || "",
    website: p.website || "",
    image: p.image || "",
    exchange: p.exchangeShortName || p.exchange || "",
    currency: p.currency || "INR",
    country: p.country || "IN",
    ipoDate: p.ipoDate || "",
    fullTimeEmployees: p.fullTimeEmployees?.toString() || "",
    marketCapitalization: p.mktCap || 0,
    shareOutstanding: 0,
  };
}

async function getYahooProfile(symbol: string) {
  const chartUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(symbol)}?interval=1d&range=5d`;
  const searchUrl = `https://query1.finance.yahoo.com/v1/finance/search?q=${encodeURIComponent(symbol)}&quotesCount=1&newsCount=0`;

  const [chartRes, searchRes] = await Promise.all([
    fetch(chartUrl, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
    fetch(searchUrl, { cache: "no-store", headers: { "User-Agent": "Mozilla/5.0" } }),
  ]);

  if (!chartRes.ok) throw new Error(`Yahoo chart request failed: ${chartRes.status}`);

  const chartData = await chartRes.json();
  const searchData = searchRes.ok ? await searchRes.json() : null;
  const meta = chartData?.chart?.result?.[0]?.meta || {};
  const searchQuote = Array.isArray(searchData?.quotes) ? searchData.quotes[0] : null;
  const companyName = meta.longName || meta.shortName || searchQuote?.longname || searchQuote?.shortname || symbol.toUpperCase();
  const exchange = meta.fullExchangeName || searchQuote?.exchDisp || meta.exchangeName || "";

  return {
    symbol: symbol.toUpperCase(),
    companyName,
    description: searchQuote?.sector || searchQuote?.industry || exchange || "",
    sector: searchQuote?.sector || "",
    industry: searchQuote?.industry || "",
    ceo: "",
    website: "",
    image: "",
    exchange,
    currency: meta.currency || "USD",
    country: isIndianExchangeSymbol(symbol) ? "IN" : "",
    ipoDate: "",
    fullTimeEmployees: "",
  };
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

  if (isIndianExchangeSymbol(symbol)) {
    // Try FMP first (richer data), then Yahoo as fallback
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpProfile(symbol)); } catch { /* fall through */ }
    }
    try { return NextResponse.json(await getYahooProfile(symbol)); } catch { /* fall through */ }
  }

  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });

  try {
    const url = `https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`;
    const res = await fetch(url, { next: { revalidate: 300 } });

    if (!res.ok) throw new Error("Finnhub profile request failed");
    
    const data = await res.json();
    if (!data || Object.keys(data).length === 0) {
      return NextResponse.json(null);
    }
    
    let description = data.finnhubIndustry || "";
    
    // Attempt to fetch a better description from Wikipedia
    if (data.name) {
      try {
        const searchUrl = `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(data.name)}&utf8=&format=json`;
        const searchRes = await fetch(searchUrl, { next: { revalidate: 86400 } });
        const searchData = await searchRes.json();
        
        if (searchData?.query?.search?.[0]?.title) {
          const title = searchData.query.search[0].title;
          const summaryUrl = `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`;
          const summaryRes = await fetch(summaryUrl, { next: { revalidate: 86400 } });
          const summaryData = await summaryRes.json();
          
          if (summaryData?.extract) {
            description = summaryData.extract;
          }
        }
      } catch (e) {
        console.error("Failed to fetch Wikipedia description", e);
      }
    }
    
    const profile = {
      symbol: data.ticker,
      companyName: data.name,
      description: description,
      sector: data.finnhubIndustry || "",
      industry: data.finnhubIndustry || "",
      ceo: "",
      website: data.weburl || "",
      image: data.logo || "",
      exchange: data.exchange || "",
      currency: data.currency || "",
      country: data.country || "",
      ipoDate: data.ipo || "",
      fullTimeEmployees: ""
    };

    return NextResponse.json(profile);
  } catch (error) {
    if (FMP_KEY) {
      try { return NextResponse.json(await getFmpProfile(symbol)); } catch { /* continue */ }
    }
    try { return NextResponse.json(await getYahooProfile(symbol)); } catch { /* continue */ }
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch profile." }, { status: 502 });
  }
}
