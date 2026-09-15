import { NextResponse } from "next/server";

export const revalidate = 21600;
export const dynamic = "force-dynamic";

interface CongressTrade {
  politician: string;
  party: string;
  chamber: "House" | "Senate";
  ticker: string;
  action: "BUY" | "SELL" | "EXCHANGE";
  amount: string;
  date: string;
}

function normalizeAction(transactionType: string): "BUY" | "SELL" | "EXCHANGE" {
  const lower = (transactionType || "").toLowerCase();
  if (lower.includes("purchase") || lower.includes("buy")) return "BUY";
  if (lower.includes("sale") || lower.includes("sell")) return "SELL";
  return "EXCHANGE";
}

function normalizeParty(party: string): string {
  if (!party) return "Unknown";
  const upper = party.trim().toUpperCase();
  if (upper === "DEMOCRAT" || upper === "DEMOCRATIC" || upper === "D") return "D";
  if (upper === "REPUBLICAN" || upper === "R") return "R";
  if (upper === "INDEPENDENT" || upper === "I") return "I";
  return party.trim().charAt(0).toUpperCase();
}

// In-memory cache for congress trades (TTL: 12 hours)
let congressCache: { data: CongressTrade[]; timestamp: number } | null = null;
const CACHE_TTL = 12 * 60 * 60 * 1000;

export async function GET() {
  if (congressCache && Date.now() - congressCache.timestamp < CACHE_TTL) {
    return NextResponse.json(congressCache.data);
  }

  try {
    const results: CongressTrade[] = [];

    // Fetch House and Senate data in parallel
    const [houseRes, senateRes] = await Promise.allSettled([
      fetch(
        "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json",
        { cache: "no-store", headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
      fetch(
        "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json",
        { cache: "no-store", headers: { 'User-Agent': 'Mozilla/5.0' } }
      ),
    ]);

    // Process House data
    if (houseRes.status === "fulfilled" && houseRes.value.ok) {
      try {
        const text = await houseRes.value.text();
        if (text.startsWith("[")) {
          const houseTxs = JSON.parse(text);
          for (const tx of houseTxs) {
            if (!tx.representative || !tx.ticker || tx.ticker === "--" || tx.ticker === "N/A")
              continue;

            results.push({
              politician: tx.representative || "Unknown",
              party: normalizeParty(tx.party || ""),
              chamber: "House",
              ticker: tx.ticker.replace(/\s+/g, ""),
              action: normalizeAction(tx.transaction_type || tx.type || ""),
              amount: tx.amount || "N/A",
              date: tx.transaction_date || "",
            });
          }
        }
      } catch (err) {
        console.warn("Error parsing House data:", err);
      }
    }

    // Process Senate data
    if (senateRes.status === "fulfilled" && senateRes.value.ok) {
      try {
        const text = await senateRes.value.text();
        if (text.startsWith("[")) {
          const senateTxs = JSON.parse(text);
          for (const tx of senateTxs) {
            if (!tx.senator || !tx.ticker || tx.ticker === "--" || tx.ticker === "N/A") continue;

            results.push({
              politician: tx.senator || "Unknown",
              party: normalizeParty(tx.party || ""),
              chamber: "Senate",
              ticker: tx.ticker.replace(/\s+/g, ""),
              action: normalizeAction(tx.transaction_type || tx.type || ""),
              amount: tx.amount || "N/A",
              date: tx.transaction_date || "",
            });
          }
        }
      } catch (err) {
        console.warn("Error parsing Senate data:", err);
      }
    }

    if (results.length === 0) {
      if (congressCache) {
        return NextResponse.json(congressCache.data);
      }
      return NextResponse.json([], { status: 200 });
    }

    // Sort by date (most recent first)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    const top30 = results.slice(0, 30);
    congressCache = { data: top30, timestamp: Date.now() };

    return NextResponse.json(top30);
  } catch (error) {
    console.error("Congress trading API error:", error);
    if (congressCache) {
      return NextResponse.json(congressCache.data);
    }
    return NextResponse.json(
      { error: "Congressional trading data temporarily unavailable", trades: [] },
      { status: 503 }
    );
  }
}
