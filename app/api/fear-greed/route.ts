export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

export async function GET() {
  // Primary: CNN Fear & Greed (US Stock Market)
  try {
    const res = await fetch("https://production.dataviz.cnn.io/index/fearandgreed/graphdata", {
      cache: "no-store",
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
        "Accept": "application/json",
      },
    });

    if (res.ok) {
      const data = await res.json();

      if (data?.fear_and_greed?.score) {
        const rating = data.fear_and_greed.rating || "Fear";
        const formattedRating = rating
          .split(" ")
          .map((word: string) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
          .join(" ");

        return NextResponse.json({
          value: Math.round(data.fear_and_greed.score),
          classification: formattedRating,
          source: "CNN Business (US Stocks)",
          timestamp: data.fear_and_greed.timestamp,
        });
      }
    }
  } catch (error) {
    console.error("CNN Fear & Greed failed:", error);
  }

  // Secondary: Crypto fallback
  try {
    const res = await fetch("https://api.alternative.me/fng/?limit=1", { cache: "no-store" });
    const data = await res.json();

    return NextResponse.json({
      value: parseInt(data.data[0].value),
      classification: data.data[0].value_classification,
      source: "Crypto Market (Fallback)",
    });
  } catch (e) {}

  // Final safety net
  return NextResponse.json({
    value: 38,
    classification: "Fear",
    source: "Static Fallback",
  });
}