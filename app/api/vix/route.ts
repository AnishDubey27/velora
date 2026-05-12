import { NextResponse } from "next/server";

export async function GET() {
  try {
    // Free VIX from FRED (Federal Reserve)
    const res = await fetch(
      "https://api.stlouisfed.org/fred/series/observations?series_id=VIXCLS&api_key=your_fred_key&file_type=json&limit=1&sort_order=desc",
      { cache: "no-store" }
    );
    const data = await res.json();

    if (data?.observations?.[0]) {
      return NextResponse.json({
        value: parseFloat(data.observations[0].value),
        source: "FRED",
      });
    }
  } catch (e) {}

  // Public fallback (Finnhub or mock)
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=VIX&token=${process.env.FINNHUB_API_KEY}`
    );
    const data = await res.json();
    return NextResponse.json({ value: data.c || 19.5, source: "Finnhub" });
  } catch (e) {}

  return NextResponse.json({ value: 19.5, source: "Mock" });
}