export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";

export type HeatmapItem = {
  symbol: string;
  name: string;
  price: number;
  changePercent: number;
  marketCap: string;
  sector: "Mega Tech" | "Semiconductors" | "Crypto" | "Financials" | "Healthcare";
  sparkline: number[];
};

const HEATMAP_ASSETS: Array<{
  symbol: string;
  querySymbol: string;
  name: string;
  sector: HeatmapItem["sector"];
}> = [
  { symbol: "NVDA", querySymbol: "NVDA", name: "NVIDIA Corp", sector: "Semiconductors" },
  { symbol: "AAPL", querySymbol: "AAPL", name: "Apple Inc", sector: "Mega Tech" },
  { symbol: "MSFT", querySymbol: "MSFT", name: "Microsoft Corp", sector: "Mega Tech" },
  { symbol: "BTC", querySymbol: "BTC-USD", name: "Bitcoin", sector: "Crypto" },
  { symbol: "ETH", querySymbol: "ETH-USD", name: "Ethereum", sector: "Crypto" },
  { symbol: "TSLA", querySymbol: "TSLA", name: "Tesla Inc", sector: "Mega Tech" },
  { symbol: "AMD", querySymbol: "AMD", name: "Advanced Micro Devices", sector: "Semiconductors" },
  { symbol: "JPM", querySymbol: "JPM", name: "JPMorgan Chase", sector: "Financials" },
  { symbol: "LLY", querySymbol: "LLY", name: "Eli Lilly & Co", sector: "Healthcare" },
  { symbol: "SOL", querySymbol: "SOL-USD", name: "Solana", sector: "Crypto" },
];

function formatMarketCap(mc?: number): string {
  if (!mc || mc <= 0) return "—";
  if (mc >= 1e12) return `$${(mc / 1e12).toFixed(2)}T`;
  if (mc >= 1e9) return `$${(mc / 1e9).toFixed(1)}B`;
  if (mc >= 1e6) return `$${(mc / 1e6).toFixed(1)}M`;
  return `$${mc.toLocaleString()}`;
}

// In-memory cache for 60 seconds
let cachedHeatmap: HeatmapItem[] | null = null;
let lastFetchTime = 0;

export async function GET() {
  const now = Date.now();
  if (cachedHeatmap && now - lastFetchTime < 60000) {
    return NextResponse.json(cachedHeatmap);
  }

  try {
    const results = await Promise.allSettled(
      HEATMAP_ASSETS.map(async (asset) => {
        const url = `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(
          asset.querySymbol
        )}?interval=60m&range=5d`;

        const res = await fetch(url, {
          cache: "no-store",
          headers: { "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)" },
        });

        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const json = await res.json();
        const result = json?.chart?.result?.[0];
        const meta = result?.meta;
        const closes: (number | null)[] = result?.indicators?.quote?.[0]?.close || [];
        const validCloses = closes.filter((c): c is number => typeof c === "number" && !isNaN(c));

        const price = meta?.regularMarketPrice ?? validCloses[validCloses.length - 1] ?? 0;
        const prevClose = meta?.chartPreviousClose ?? meta?.previousClose ?? validCloses[0] ?? price;
        const changePercent = prevClose ? ((price - prevClose) / prevClose) * 100 : 0;

        // Downsample sparkline to ~6 points
        const sparkline: number[] = [];
        if (validCloses.length > 0) {
          const step = Math.max(1, Math.floor(validCloses.length / 6));
          for (let i = 0; i < validCloses.length; i += step) {
            sparkline.push(Number(validCloses[i].toFixed(2)));
          }
          if (sparkline[sparkline.length - 1] !== price) {
            sparkline.push(Number(price.toFixed(2)));
          }
        }

        const marketCap = formatMarketCap(meta?.marketCap);

        return {
          symbol: asset.symbol,
          name: asset.name,
          price: Number(price.toFixed(2)),
          changePercent: Number(changePercent.toFixed(2)),
          marketCap,
          sector: asset.sector,
          sparkline: sparkline.length >= 2 ? sparkline : [price, price],
        } satisfies HeatmapItem;
      })
    );

    const liveData = results
      .map((r) => (r.status === "fulfilled" ? r.value : null))
      .filter((d): d is HeatmapItem => d !== null);

    if (liveData.length > 0) {
      cachedHeatmap = liveData;
      lastFetchTime = now;
      return NextResponse.json(liveData);
    }

    if (cachedHeatmap) {
      return NextResponse.json(cachedHeatmap);
    }

    return NextResponse.json([], { status: 503 });
  } catch (error) {
    console.error("Heatmap API error:", error);
    if (cachedHeatmap) {
      return NextResponse.json(cachedHeatmap);
    }
    return NextResponse.json({ error: "Failed to fetch live market heatmap." }, { status: 502 });
  }
}
