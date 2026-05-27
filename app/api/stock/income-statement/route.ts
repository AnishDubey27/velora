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
    const [profileRes, metricRes] = await Promise.all([
      fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(symbol)}&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } }),
      fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(symbol)}&metric=all&token=${FINNHUB_KEY}`, { next: { revalidate: 300 } })
    ]);

    const profile = await profileRes.json();
    const metricData = await metricRes.json();
    
    const sharesOutstanding = profile?.shareOutstanding ? profile.shareOutstanding * 1000000 : 0;
    
    const salesData = metricData?.series?.annual?.salesPerShare || [];
    const epsData = metricData?.series?.annual?.eps || [];
    const marginData = metricData?.series?.annual?.netMargin || [];
    
    // Sort descending by period to get newest first
    salesData.sort((a: any, b: any) => new Date(b.period).getTime() - new Date(a.period).getTime());
    
    // Take up to 5 years
    const recent = salesData.slice(0, 5);
    
    const incomeStatement = recent.map((item: any) => {
      const year = item.period.split('-')[0];
      const epsItem = epsData.find((e: any) => e.period === item.period);
      const marginItem = marginData.find((m: any) => m.period === item.period);
      
      const rev = item.v * sharesOutstanding;
      const netInc = (epsItem?.v || 0) * sharesOutstanding;
      const margin = marginItem?.v ? marginItem.v / 100 : (rev ? netInc / rev : 0);
      
      return {
        date: item.period,
        period: "FY",
        calendarYear: year,
        revenue: rev,
        netIncome: netInc,
        netIncomeRatio: margin
      };
    });

    return NextResponse.json(incomeStatement);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to fetch income statement." }, { status: 502 });
  }
}
