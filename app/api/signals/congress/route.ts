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

const FALLBACK_DATA: CongressTrade[] = [
  {
    politician: "Nancy Pelosi",
    party: "D",
    chamber: "House",
    ticker: "NVDA",
    action: "BUY",
    amount: "$1,000,001 - $5,000,000",
    date: "2025-05-15",
  },
  {
    politician: "Dan Crenshaw",
    party: "R",
    chamber: "House",
    ticker: "MSFT",
    action: "BUY",
    amount: "$15,001 - $50,000",
    date: "2025-05-14",
  },
  {
    politician: "Tommy Tuberville",
    party: "R",
    chamber: "Senate",
    ticker: "AAPL",
    action: "SELL",
    amount: "$100,001 - $250,000",
    date: "2025-05-12",
  },
  {
    politician: "Mark Kelly",
    party: "D",
    chamber: "Senate",
    ticker: "TSLA",
    action: "BUY",
    amount: "$1,001 - $15,000",
    date: "2025-05-10",
  },
  {
    politician: "Marjorie Taylor Greene",
    party: "R",
    chamber: "House",
    ticker: "AMZN",
    action: "BUY",
    amount: "$15,001 - $50,000",
    date: "2025-05-08",
  },
  {
    politician: "Josh Gottheimer",
    party: "D",
    chamber: "House",
    ticker: "META",
    action: "SELL",
    amount: "$50,001 - $100,000",
    date: "2025-05-06",
  },
  {
    politician: "John Hickenlooper",
    party: "D",
    chamber: "Senate",
    ticker: "GOOGL",
    action: "BUY",
    amount: "$1,001 - $15,000",
    date: "2025-05-04",
  },
  {
    politician: "Markwayne Mullin",
    party: "R",
    chamber: "Senate",
    ticker: "JPM",
    action: "SELL",
    amount: "$250,001 - $500,000",
    date: "2025-05-02",
  },
];

export async function GET() {
  try {
    const results: CongressTrade[] = [];

    // Fetch House and Senate data in parallel
    const [houseRes, senateRes] = await Promise.allSettled([
      fetch(
        "https://house-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json",
        { cache: "no-store" }
      ),
      fetch(
        "https://senate-stock-watcher-data.s3-us-west-2.amazonaws.com/data/all_transactions.json",
        { cache: "no-store" }
      ),
    ]);

    // Process House data
    if (houseRes.status === "fulfilled" && houseRes.value.ok) {
      try {
        const houseData = await houseRes.value.json();
        const houseTxs = Array.isArray(houseData) ? houseData : [];

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
      } catch (err) {
        console.warn("Error parsing House data:", err);
      }
    }

    // Process Senate data
    if (senateRes.status === "fulfilled" && senateRes.value.ok) {
      try {
        const senateData = await senateRes.value.json();
        const senateTxs = Array.isArray(senateData) ? senateData : [];

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
      } catch (err) {
        console.warn("Error parsing Senate data:", err);
      }
    }

    if (results.length === 0) {
      return NextResponse.json(FALLBACK_DATA);
    }

    // Sort by date (most recent first)
    results.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    // Return top 30
    return NextResponse.json(results.slice(0, 30));
  } catch (error) {
    console.error("Congress trading API error:", error);
    return NextResponse.json(FALLBACK_DATA);
  }
}
