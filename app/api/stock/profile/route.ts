export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

const FINNHUB_KEY = getEnv("FINNHUB_API_KEY");

export async function GET(request: Request) {
  if (!FINNHUB_KEY) return NextResponse.json({ error: "FINNHUB_API_KEY not configured." }, { status: 500 });
  
  const { searchParams } = new URL(request.url);
  const symbol = searchParams.get("symbol");
  if (!symbol) return NextResponse.json({ error: "Query parameter 'symbol' is required." }, { status: 400 });

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
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch profile." }, { status: 502 });
  }
}
