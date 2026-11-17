export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getEnv } from "@/lib/env";
import { DEFAULT_MODEL, NVIDIA_API_URL } from "@/lib/nvidia";
import { tavilySearch, isTavilyConfigured } from "@/lib/tavily";
import {
  SUPPORTED_INDICES,
  getMarketSessionStatus,
  getPreviousTradingDay,
  fetchVerifiedIndex,
  detectIndicesInQuery,
  extractRequestedDateFromQuery,
  VerifiedIndexQuote,
} from "@/lib/index-grounding";

type ChatMessage = {
  role: "system" | "user" | "assistant";
  content: string;
};

interface AnalyzedHolding {
  symbol: string;
  shares: number;
  purchasePrice: number;
  currentPrice: number;
  positionValue: number;
  positionCost: number;
  returnDollar: number;
  returnPercent: number;
  isProfit: boolean;
  weightPercent: number;
}

// ── Common Ticker Recognition Dictionary ───────────────────────────
const COMMON_TICKERS: Record<string, string> = {
  nvidia: "NVDA",
  nvda: "NVDA",
  tesla: "TSLA",
  tsla: "TSLA",
  apple: "AAPL",
  aapl: "AAPL",
  microsoft: "MSFT",
  msft: "MSFT",
  google: "GOOGL",
  alphabet: "GOOGL",
  googl: "GOOGL",
  goog: "GOOG",
  amazon: "AMZN",
  amzn: "AMZN",
  meta: "META",
  facebook: "META",
  netflix: "NFLX",
  nflx: "NFLX",
  amd: "AMD",
  intel: "INTC",
  intc: "INTC",
  broadcom: "AVGO",
  avgo: "AVGO",
  palantir: "PLTR",
  pltr: "PLTR",
  coinbase: "COIN",
  coin: "COIN",
  microstrategy: "MSTR",
  mstr: "MSTR",
  spy: "SPY",
  qqq: "QQQ",
};

const QUERY_STOPWORDS = new Set([
  "I", "A", "AND", "OR", "FOR", "THE", "WHY", "WHAT", "HOW", "IS", "ARE", "IN", 
  "ON", "OF", "AT", "TO", "BY", "DID", "DO", "DOES", "TODAY", "NOW", "ALL", 
  "NEW", "SEE", "GET", "AI", "US", "USA", "SEC", "CEO", "CFO", "PE", "EPS",
  "NOT", "BUT", "CAN", "YOU", "GIVE", "ME", "FULL", "WITH", "FROM"
]);

function extractTickersFromQuery(text: string, knownHoldings: string[] = []): string[] {
  const normalized = text.toLowerCase();
  const matched = new Set<string>();

  // 1. Common name mapping
  for (const [name, sym] of Object.entries(COMMON_TICKERS)) {
    const regex = new RegExp(`\\b${name}\\b`, "i");
    if (regex.test(normalized)) {
      matched.add(sym);
    }
  }

  // 2. User holdings matching
  for (const sym of knownHoldings) {
    if (!sym || QUERY_STOPWORDS.has(sym.toUpperCase())) continue;
    const regex = new RegExp(`\\b${sym}\\b`, "i");
    if (regex.test(text)) {
      matched.add(sym.toUpperCase());
    }
  }

  // 3. Uppercase ticker words
  const uppercaseMatches = text.match(/\b[A-Z]{1,5}\b/g) || [];
  for (const sym of uppercaseMatches) {
    if (QUERY_STOPWORDS.has(sym)) continue;
    if (sym in COMMON_TICKERS || knownHoldings.includes(sym)) {
      matched.add(sym);
    }
  }

  return Array.from(matched).slice(0, 4);
}

// ── Server-Side Repetition Guard ────────────────────────────────────
class RepetitionGuard {
  private recentLines: string[] = [];
  private maxRepeats: number;
  private maxWindow: number;

  constructor(maxRepeats = 3, maxWindow = 15) {
    this.maxRepeats = maxRepeats;
    this.maxWindow = maxWindow;
  }

  public feedLine(line: string): boolean {
    const clean = line.trim().toLowerCase().replace(/^[#\s\d.*-]+/, "").trim();
    if (clean.length < 6) return false;

    // 1. Direct repeat count in window
    let occurrences = 0;
    for (const prev of this.recentLines) {
      if (prev === clean) {
        occurrences++;
      }
    }

    if (occurrences >= this.maxRepeats - 1) {
      return true; // 3rd repetition detected
    }

    // 2. Cycle repeat detection (e.g. A, B, A, B, A)
    const len = this.recentLines.length;
    if (len >= 4) {
      const a1 = this.recentLines[len - 4];
      const b1 = this.recentLines[len - 3];
      const a2 = this.recentLines[len - 2];
      const b2 = this.recentLines[len - 1];
      if (a1 === a2 && b1 === b2 && clean === a1) {
        return true; // 3rd cycle detected
      }
    }

    this.recentLines.push(clean);
    if (this.recentLines.length > this.maxWindow) {
      this.recentLines.shift();
    }

    return false;
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const model = payload?.model || DEFAULT_MODEL;

    if (!Array.isArray(payload?.messages) || payload.messages.length === 0) {
      return NextResponse.json({ error: "Missing or invalid 'messages' array" }, { status: 400 });
    }

    const apiKey = getEnv('NVIDIA_API_KEY');
    if (!apiKey) {
      return NextResponse.json(
        { error: "NVIDIA API key not configured on server.", status: 500 },
        { status: 500 }
      );
    }

    const rawMessages: ChatMessage[] = payload.messages.map((m: any) => ({
      role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system",
      content: String(m.content || "")
    }));

    const userMessages = rawMessages.filter((m) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";

    const verifiedDataDates: string[] = [];

    let knownHoldingsSymbols: string[] = [];
    let userAnalyzedHoldings: AnalyzedHolding[] = [];
    let canonicalHoldingsTable = "";
    let userTotalPortfolioValue = 0;
    let userTotalCostBasis = 0;
    let portfolioContextMsg: ChatMessage | null = null;

    // 1. Fetch Portfolio Context
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      
      let userHoldings: any[] | null = null;
      if (user) {
        const { data: holdings } = await supabase
          .from('holdings')
          .select('symbol, name, shares, purchase_price')
          .eq('user_id', user.id);
        userHoldings = holdings;
      }

      if (!userHoldings && Array.isArray(payload?.holdings) && payload.holdings.length > 0) {
        userHoldings = payload.holdings;
      }

      if (userHoldings && userHoldings.length > 0) {
        knownHoldingsSymbols = userHoldings.map((h: any) => h.symbol);
        const finnhubKey = getEnv('FINNHUB_API_KEY');
        
        let totalPortfolioValue = 0;
        let totalCostBasis = 0;
        
        const rawAnalyzed = await Promise.all(
          userHoldings.map(async (h) => {
              const shares = Number(h.shares) || 0;
              const purchasePrice = Number(h.purchase_price) || 0;
              let currentPrice = purchasePrice;
              
              if (finnhubKey) {
                try {
                  const quoteRes = await fetch(
                    `https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(h.symbol)}&token=${encodeURIComponent(finnhubKey)}`,
                    { cache: "no-store", signal: AbortSignal.timeout(3000) }
                  );
                  if (quoteRes.ok) {
                    const quoteData = await quoteRes.json();
                    if (typeof quoteData?.c === "number" && quoteData.c > 0) {
                      currentPrice = quoteData.c;
                    }
                  }
                } catch {
                  // Fall back to purchase price
                }
              }
              
              const positionValue = shares * currentPrice;
              const positionCost = shares * purchasePrice;
              const returnDollar = positionValue - positionCost;
              const returnPercent = positionCost > 0 ? (returnDollar / positionCost) * 100 : 0;
              const isProfit = returnDollar >= 0;

              return {
                symbol: h.symbol,
                name: h.name || h.symbol,
                shares,
                purchasePrice,
                currentPrice,
                positionValue,
                positionCost,
                returnDollar,
                returnPercent,
                isProfit,
                weightPercent: 0,
              };
            })
          );

          for (const item of rawAnalyzed) {
            totalPortfolioValue += item.positionValue;
            totalCostBasis += item.positionCost;
          }

          for (const item of rawAnalyzed) {
            item.weightPercent = totalPortfolioValue > 0 ? (item.positionValue / totalPortfolioValue) * 100 : 0;
          }

          userAnalyzedHoldings = rawAnalyzed;
          userTotalPortfolioValue = totalPortfolioValue;
          userTotalCostBasis = totalCostBasis;

          const totalReturnDollar = totalPortfolioValue - totalCostBasis;
          const totalReturnPercent = totalCostBasis > 0 ? (totalReturnDollar / totalCostBasis) * 100 : 0;
          const isTotalProfit = totalReturnDollar >= 0;

          const sortedByValue = [...userAnalyzedHoldings].sort((a, b) => b.positionValue - a.positionValue);
          const winners = userAnalyzedHoldings.filter((h) => h.isProfit);
          const losers = userAnalyzedHoldings.filter((h) => !h.isProfit);
          const sortedWinners = [...winners].sort((a, b) => b.positionValue - a.positionValue);
          const sortedLosers = [...losers].sort((a, b) => b.positionValue - a.positionValue);

          // Canonical Markdown Table of Holdings (matching Portfolio Screen row-for-row)
          canonicalHoldingsTable = [
            "| Asset | Market Value | Cost Basis | Unrealized P&L | Return (%) | Weight (%) | Status |",
            "| :--- | :--- | :--- | :--- | :--- | :--- | :--- |",
            ...sortedByValue.map((h) => {
              const sign = h.returnDollar >= 0 ? "+" : "-";
              const pnlStr = `${sign}$${Math.abs(h.returnDollar).toFixed(2)}`;
              const retPctStr = `${h.returnDollar >= 0 ? "+" : ""}${h.returnPercent.toFixed(2)}%`;
              const status = h.isProfit ? "WINNER" : "UNDERPERFORMER";
              return `| ${h.symbol} | $${h.positionValue.toFixed(2)} | $${h.positionCost.toFixed(2)} | ${pnlStr} | ${retPctStr} | ${h.weightPercent.toFixed(1)}% | ${status} |`;
            }),
          ].join("\n");

          // Top-3 and Top-5 Holdings Concentrations
          const top3Holdings = sortedByValue.slice(0, 3);
          const top3Value = top3Holdings.reduce((sum, h) => sum + h.positionValue, 0);
          const top3Weight = totalPortfolioValue > 0 ? (top3Value / totalPortfolioValue) * 100 : 0;
          const top3TickersStr = top3Holdings.map(h => `${h.symbol} ($${h.positionValue.toFixed(2)}, ${h.weightPercent.toFixed(1)}%)`).join(", ");

          const top5Holdings = sortedByValue.slice(0, 5);
          const top5Value = top5Holdings.reduce((sum, h) => sum + h.positionValue, 0);
          const top5Weight = totalPortfolioValue > 0 ? (top5Value / totalPortfolioValue) * 100 : 0;
          const top5TickersStr = top5Holdings.map(h => `${h.symbol} ($${h.positionValue.toFixed(2)}, ${h.weightPercent.toFixed(1)}%)`).join(", ");

          // Top-3 and Top-5 Winners Concentrations
          const top3Winners = sortedWinners.slice(0, 3);
          const top3WinnersValue = top3Winners.reduce((sum, h) => sum + h.positionValue, 0);
          const top3WinnersWeight = totalPortfolioValue > 0 ? (top3WinnersValue / totalPortfolioValue) * 100 : 0;
          const top3WinnersTickersStr = top3Winners.map(h => `${h.symbol} ($${h.positionValue.toFixed(2)}, ${h.weightPercent.toFixed(1)}%)`).join(", ");

          const top5Winners = sortedWinners.slice(0, 5);
          const top5WinnersValue = top5Winners.reduce((sum, h) => sum + h.positionValue, 0);
          const top5WinnersWeight = totalPortfolioValue > 0 ? (top5WinnersValue / totalPortfolioValue) * 100 : 0;
          const top5WinnersTickersStr = top5Winners.map(h => `${h.symbol} ($${h.positionValue.toFixed(2)}, ${h.weightPercent.toFixed(1)}%)`).join(", ");

          // Gross gains & losses
          const grossGains = winners.reduce((sum, h) => sum + h.returnDollar, 0);
          const grossLosses = losers.reduce((sum, h) => sum + h.returnDollar, 0);
          const winnersTotalVal = winners.reduce((sum, h) => sum + h.positionValue, 0);
          const losersTotalVal = losers.reduce((sum, h) => sum + h.positionValue, 0);
          const winnersValPct = totalPortfolioValue > 0 ? (winnersTotalVal / totalPortfolioValue) * 100 : 0;
          const losersValPct = totalPortfolioValue > 0 ? (losersTotalVal / totalPortfolioValue) * 100 : 0;

          // Underperformers individual weights breakdown
          const underperformersWeightsList = sortedLosers.map(l =>
            `  • ${l.symbol}: Value $${l.positionValue.toFixed(2)} (${l.weightPercent.toFixed(1)}% of total portfolio value) | Total Cost: $${l.positionCost.toFixed(2)} ($${l.purchasePrice.toFixed(2)} per share purchase price) | Return: -$${Math.abs(l.returnDollar).toFixed(2)} (${l.returnPercent.toFixed(2)}%)`
          ).join("\n");
          const largestLoserByWeight = sortedLosers[0]
            ? `${sortedLosers[0].symbol} at $${sortedLosers[0].positionValue.toFixed(2)} (${sortedLosers[0].weightPercent.toFixed(1)}% of portfolio value)`
            : "None";

          const winnersText = winners.length > 0
            ? winners.map(w => `  • ${w.symbol} (${w.shares} shs): Mkt Val $${w.positionValue.toFixed(2)} (${w.weightPercent.toFixed(1)}% of port) | Total Cost: $${w.positionCost.toFixed(2)} ($${w.purchasePrice.toFixed(2)} per share purchase price) | Return: +$${w.returnDollar.toFixed(2)} (+${w.returnPercent.toFixed(2)}%) [WINNER/GAIN]`).join("\n")
            : "  • None";

          const losersText = losers.length > 0
            ? losers.map(l => `  • ${l.symbol} (${l.shares} shs): Mkt Val $${l.positionValue.toFixed(2)} (${l.weightPercent.toFixed(1)}% of port) | Total Cost: $${l.positionCost.toFixed(2)} ($${l.purchasePrice.toFixed(2)} per share purchase price) | Return: -$${Math.abs(l.returnDollar).toFixed(2)} (${l.returnPercent.toFixed(2)}%) [UNDERPERFORMER/LOSS]`).join("\n")
            : "  • None";

          verifiedDataDates.push(new Date().toISOString().slice(0, 10));

          portfolioContextMsg = {
            role: "system",
            content: `======================================================================
OFFICIAL VERIFIED PORTFOLIO METRICS (Source of Truth - Velora Portfolio Engine)
======================================================================
• Total Portfolio Market Value: $${totalPortfolioValue.toFixed(2)}
• Total Portfolio Cost Basis: $${totalCostBasis.toFixed(2)}
• All-Time Unrealized Return: ${isTotalProfit ? '+' : '-'}$${Math.abs(totalReturnDollar).toFixed(2)} (${isTotalProfit ? '+' : ''}${totalReturnPercent.toFixed(2)}%) [${isTotalProfit ? 'OVERALL PROFIT' : 'OVERALL LOSS'}]

OFFICIAL CANONICAL PORTFOLIO HOLDINGS TABLE (Matches Velora Portfolio Screen row-for-row):
${canonicalHoldingsTable}

OFFICIAL VERIFIED DERIVED AGGREGATES & CONCENTRATION METRICS:
• Top-3 Holdings by Portfolio Value (${top3TickersStr}): Combined Value $${top3Value.toFixed(2)} (${top3Weight.toFixed(1)}% of total portfolio value)
• Top-5 Holdings by Portfolio Value (${top5TickersStr}): Combined Value $${top5Value.toFixed(2)} (${top5Weight.toFixed(1)}% of total portfolio value)
• Top-3 Winners by Value (${top3WinnersTickersStr}): Combined Value $${top3WinnersValue.toFixed(2)} (${top3WinnersWeight.toFixed(1)}% of total portfolio value)
• Top-5 Winners by Value (${top5WinnersTickersStr}): Combined Value $${top5WinnersValue.toFixed(2)} (${top5WinnersWeight.toFixed(1)}% of total portfolio value)
• Winners Summary (${winners.length} positions): Combined Value $${winnersTotalVal.toFixed(2)} (${winnersValPct.toFixed(1)}% of portfolio value) | Gross Unrealized Gains: +$${grossGains.toFixed(2)}
• Underperformers Summary (${losers.length} positions): Combined Value $${losersTotalVal.toFixed(2)} (${losersValPct.toFixed(1)}% of portfolio value) | Gross Unrealized Losses: -$${Math.abs(grossLosses).toFixed(2)}
• Underperformers Ranked by Portfolio Weight (Descending):
${underperformersWeightsList}
• Largest Underperformer by Weight: ${largestLoserByWeight}

WINNERS / PROFITABLE POSITIONS (Return >= 0%):
${winnersText}

UNDERPERFORMERS / UNPROFITABLE POSITIONS (Return < 0%):
${losersText}

CRITICAL RULES FOR PROSE NARRATIVE & DERIVED STATISTICS:
1. The Total Portfolio Market Value is EXACTLY $${totalPortfolioValue.toFixed(2)}. NEVER cite any other total (do NOT hallucinate $13,370 or any other unverified number).
2. The Total Portfolio Cost Basis is EXACTLY $${totalCostBasis.toFixed(2)}.
3. CANONICAL PORTFOLIO HOLDINGS TABLE MANDATE (FOR PORTFOLIO HEALTH CHECKS & REVIEWS):
   - When answering portfolio health checks, asset allocations, or general portfolio reviews, Section 3 ("## 3. Quantitative Ratios & Valuation (use Markdown tables)") MUST output the OFFICIAL CANONICAL PORTFOLIO HOLDINGS TABLE above VERBATIM, row-for-row.
   - Column 2 is ALWAYS Market Value (sums to the headline total $${totalPortfolioValue.toFixed(2)}).
   - Column 3 is ALWAYS Cost Basis (sums to total cost basis $${totalCostBasis.toFixed(2)}). NEVER print cost basis as market value.
   - NEVER recompute, alter, swap, or shift numbers between rows. Each holding (e.g. META, AMD, BABA, CRSP, IONQ, NRGV, TSLA) MUST strictly use its own exact values from this table.
   - In prose narrative (Section 1, Section 2, Section 4, or Section 5), every holding's market value, cost basis, unrealized P&L ($ and %), and status (WINNER vs UNDERPERFORMER) MUST match this table exactly:
     * POSITIONS WITH POSITIVE RETURNS (+) ARE WINNERS: (e.g. META +$4.89 / +81.50% WINNER, AMD +$0.75 WINNER). NEVER classify a winner as a loser, loss, or negative return.
     * POSITIONS WITH NEGATIVE RETURNS (-) ARE UNDERPERFORMERS: (e.g. BABA -$2.15 / UNDERPERFORMER). NEVER classify an underperformer as a winner.
     * NEVER assign one stock's numbers to another (e.g. NEVER give CRSP's numbers to IONQ, or IONQ's numbers to NRGV).
4. ALWAYS quote the exact pre-computed percentages and dollars from the verified data above. DO NOT calculate concentration percentages, sums, or weights in your head.
5. CENT-LEVEL P&L ACCURACY: When citing dollar profit or loss for individual holdings (e.g. CRSP, BWXT, TSLA, FSLR), you MUST COPY the exact dollar figures directly from the verified table above. NEVER recalculate individual dollar P&L in your head.
6. Denominator Discipline: Distinguish strictly between "% of portfolio value" (denominator is Total Portfolio Market Value $${totalPortfolioValue.toFixed(2)}) and "% of unrealized gains" or "% return on cost". NEVER describe a dollar amount representing a share of portfolio value as a share of unrealized gains.
7. Concentration Labels: Do NOT mislabel Top-5 concentration as Top-3 concentration. Top-3 overall holdings concentration is EXACTLY ${top3Weight.toFixed(1)}% (or Top-3 winners ${top3WinnersWeight.toFixed(1)}%); Top-5 concentration is EXACTLY ${top5Weight.toFixed(1)}%.
8. Underperformer Claims: NEVER say "no single losing position exceeds X%" unless that claim is strictly true against the verified Underperformers list above.
9. COST BASIS CLARITY: When citing cost basis in prose narrative, ALWAYS use the format: "Total Cost of $X.XX ($Y.YY per share)". Never confuse total cost with purchase price per share.
10. GENERAL PORTFOLIO HEALTH QUERIES (NO LEAKED TEMPLATES):
- When answering portfolio health checks, asset allocations, or general portfolio reviews, "Previous Session Close" and single-ticker trading day metrics DO NOT APPLY to the overall portfolio.
- Completely OMIT any previous session close sentence. NEVER write "from the previous session close of N/A on N/A" or emit any "N/A" placeholders.
======================================================================`
          };
        }
    } catch (e) {
      console.error("Failed to fetch user portfolio context:", e);
    }

    // 2. Ticker Grounding
    const detectedTickers = extractTickersFromQuery(lastUserMsg, knownHoldingsSymbols);
    let verifiedTickerContextMsg: ChatMessage | null = null;

    if (detectedTickers.length > 0) {
      const finnhubKey = getEnv('FINNHUB_API_KEY');
      if (finnhubKey) {
        const verifiedTickerContexts: string[] = [];

        await Promise.all(
          detectedTickers.map(async (sym) => {
            try {
              const [quoteRes, profileRes, metricRes, targetRes] = await Promise.all([
                fetch(`https://finnhub.io/api/v1/quote?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`, { cache: "no-store", signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`, { cache: "no-store", signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`https://finnhub.io/api/v1/stock/metric?symbol=${encodeURIComponent(sym)}&metric=all&token=${encodeURIComponent(finnhubKey)}`, { cache: "no-store", signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null).catch(() => null),
                fetch(`https://finnhub.io/api/v1/stock/price-target?symbol=${encodeURIComponent(sym)}&token=${encodeURIComponent(finnhubKey)}`, { cache: "no-store", signal: AbortSignal.timeout(3500) }).then(r => r.ok ? r.json() : null).catch(() => null),
              ]);

              if (!quoteRes || typeof quoteRes.c !== "number" || quoteRes.c <= 0) {
                return;
              }

              verifiedDataDates.push(new Date().toISOString().slice(0, 10));

              const currentPrice = quoteRes.c;
              const change = quoteRes.d ?? 0;
              const changePercent = quoteRes.dp ?? 0;
              const previousClose = typeof quoteRes.pc === "number" && quoteRes.pc > 0
                ? quoteRes.pc
                : currentPrice - change;

              // Derive previous session date and weekday for the ticker
              const usSession = getMarketSessionStatus("US");
              let tickerPrevCloseDateStr: string;
              if (usSession.phase === "REGULAR_HOURS") {
                tickerPrevCloseDateStr = usSession.latestCompletedSessionDate;
              } else if (usSession.phase === "POST_CLOSE") {
                const d = getPreviousTradingDay(new Date(usSession.localDateStr + "T12:00:00Z"));
                tickerPrevCloseDateStr = d.toISOString().slice(0, 10);
              } else {
                // PRE_MARKET or WEEKEND_CLOSED
                const d = getPreviousTradingDay(new Date(usSession.latestCompletedSessionDate + "T12:00:00Z"));
                tickerPrevCloseDateStr = d.toISOString().slice(0, 10);
              }

              const prevCloseObj = new Date(tickerPrevCloseDateStr + "T12:00:00Z");
              const prevCloseWeekday = new Intl.DateTimeFormat("en-US", { weekday: "long", timeZone: "UTC" }).format(prevCloseObj);
              const prevCloseMonthDayYear = new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric", year: "numeric", timeZone: "UTC" }).format(prevCloseObj);
              const metric = metricRes?.metric || {};
              const peRatio = metric.peTTM ? `${metric.peTTM.toFixed(1)}x` : (metric.peExclExtraTTM ? `${metric.peExclExtraTTM.toFixed(1)}x` : "Unavailable");
              const marketCapRaw = profileRes?.marketCapitalization ? profileRes.marketCapitalization * 1e6 : 0;
              let marketCapStr = "Unavailable";
              if (marketCapRaw >= 1e12) {
                marketCapStr = `$${(marketCapRaw / 1e12).toFixed(2)}T`;
              } else if (marketCapRaw >= 1e9) {
                marketCapStr = `$${(marketCapRaw / 1e9).toFixed(2)}B`;
              } else if (marketCapRaw > 0) {
                marketCapStr = `$${(marketCapRaw / 1e6).toFixed(2)}M`;
              }

              const eps = metric.epsTTM != null ? `$${Number(metric.epsTTM).toFixed(2)}` : "Unavailable";
              const beta = metric.beta != null ? Number(metric.beta).toFixed(2) : "Unavailable";
              const week52 = (metric["52WeekLow"] && metric["52WeekHigh"]) 
                ? `$${Number(metric["52WeekLow"]).toFixed(2)} - $${Number(metric["52WeekHigh"]).toFixed(2)}` 
                : "Unavailable";

              const targetPrice = (targetRes?.targetMean && Number(targetRes.targetMean) > 0)
                ? Number(targetRes.targetMean)
                : (targetRes?.targetMedian && Number(targetRes.targetMedian) > 0 ? Number(targetRes.targetMedian) : null);

              const stopLoss = (targetRes?.targetLow && Number(targetRes.targetLow) > 0 && Number(targetRes.targetLow) < currentPrice)
                ? Number(targetRes.targetLow)
                : currentPrice * 0.92;

              const downsidePercent = (((stopLoss - currentPrice) / currentPrice) * 100).toFixed(1);

              let tradeSetupContext = "";
              if (targetPrice && targetPrice > currentPrice) {
                const upsidePct = (((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1);
                tradeSetupContext = `• Velora Verified Trade Setup:
  > **TRADE SETUP:** Entry $${currentPrice.toFixed(2)} | Target $${targetPrice.toFixed(2)} (+${upsidePct}%) | Stop $${stopLoss.toFixed(2)} (${downsidePercent}%) | Conviction High
  (Strict Instruction: Output this verified trade setup block verbatim)`;
              } else {
                tradeSetupContext = `• Trade Setup Status: NO VERIFIED ANALYST PRICE TARGET AVAILABLE.
  CRITICAL RULE: You MUST completely OMIT the "> **TRADE SETUP:**" block. Do NOT invent a price target, do NOT compute a target, and NEVER write "N/A".`;
              }

              // Check user portfolio holding status for this specific ticker
              const holdingMatch = userAnalyzedHoldings.find(h => h.symbol.toUpperCase() === sym.toUpperCase());
              let tickerHoldingStatus = "";
              if (holdingMatch) {
                tickerHoldingStatus = `• Velora Portfolio Standing for ${sym}:
  - User Holding Status: CURRENTLY HELD IN PORTFOLIO (${holdingMatch.shares} shares)
  - Classification: ${holdingMatch.isProfit ? "WINNER / PROFITABLE POSITION" : "UNDERPERFORMER / LOSS"}
  - Position Market Value: $${holdingMatch.positionValue.toFixed(2)} (${holdingMatch.weightPercent.toFixed(1)}% of total portfolio value)
  - Total Position Cost Basis: $${holdingMatch.positionCost.toFixed(2)} ($${holdingMatch.purchasePrice.toFixed(2)} per share purchase price)
  - Unrealized Return: ${holdingMatch.returnDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMatch.returnDollar).toFixed(2)} (${holdingMatch.returnDollar >= 0 ? '+' : ''}${holdingMatch.returnPercent.toFixed(2)}%)
  - MANDATORY RULE FOR SECTION 5 (PORTFOLIO IMPACT): ${sym} IS A CURRENT HOLDING. State clearly that the user holds ${holdingMatch.shares} shares of ${sym} with a Total Cost of $${holdingMatch.positionCost.toFixed(2)} ($${holdingMatch.purchasePrice.toFixed(2)} per share) and an unrealized return of ${holdingMatch.returnDollar >= 0 ? '+' : ''}${holdingMatch.returnPercent.toFixed(2)}% (${holdingMatch.returnDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMatch.returnDollar).toFixed(2)}) [${holdingMatch.isProfit ? 'WINNER/GAIN' : 'UNDERPERFORMER/LOSS'}]. NEVER claim ${sym} is an underperformer if it is a winner, and NEVER assign another stock's return to ${sym}.`;
              } else {
                tickerHoldingStatus = `• Velora Portfolio Standing for ${sym}:
  - User Holding Status: NOT HELD IN PORTFOLIO
  - Explanation: The user does NOT own any shares of ${sym} in their Velora portfolio (0 shares held, $0.00 value).
  - MANDATORY RULE FOR SECTION 5 (PORTFOLIO IMPACT): ${sym} IS NOT HELD. You MUST explicitly state that ${sym} is not currently held in the user's portfolio. DO NOT assign any holding value, return percentage, or underperformer/winner classification to ${sym}.`;
              }

              verifiedTickerContexts.push(`======================================================================
OFFICIAL VERIFIED VELORA MARKET DATA (Source of Truth - Velora Data Engine)
Ticker: ${sym} (${profileRes?.name || sym})
Data Timestamp: ${new Date().toISOString()}
• Current Price: $${currentPrice.toFixed(2)}
• Daily Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)
• Previous Session Close: $${previousClose.toFixed(2)} (Session Date: ${prevCloseWeekday}, ${prevCloseMonthDayYear})
• P/E Ratio (TTM): ${peRatio}
• Market Capitalization: ${marketCapStr}
• EPS (TTM): ${eps}
• Beta: ${beta}
• 52-Week Range: ${week52}
• Wall Street Consensus Target: ${targetPrice ? `$${targetPrice.toFixed(2)}` : "Unavailable"}
${tradeSetupContext}
${tickerHoldingStatus}

CRITICAL GROUNDING RULES FOR ${sym}:
1. Use the official verified Current Price ($${currentPrice.toFixed(2)}), Daily Change (${change >= 0 ? "+" : ""}${change.toFixed(2)} / ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%), P/E Ratio (${peRatio}), and Market Capitalization (${marketCapStr}) VERBATIM.
2. In prose, percentage changes MUST match the verified changePercent (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%). NEVER substitute the dollar change as a percentage (e.g. if a stock dropped $3.34 or -2.01%, NEVER state "it declined 3.34%").
3. UNIFORMLY OMIT unverified secondary support/resistance/dip levels. Cite ONLY Current Price ($${currentPrice.toFixed(2)}) and 52-Week Range (${week52}). Discuss technical momentum qualitatively without inventing specific price targets or support levels.
4. Strictly follow the Velora Portfolio Standing above in Section 5 (Portfolio Impact).
5. PREVIOUS CLOSE AUDITABILITY FOR ${sym}: When citing Previous Session Close for ${sym} in Section 1 or Section 3's table, you MUST use the verified figure: "$${previousClose.toFixed(2)} (${prevCloseMonthDayYear})" (or "$${previousClose.toFixed(2)} on ${prevCloseWeekday}, ${prevCloseMonthDayYear}"). In Section 3's table, format as exactly ONE row: | Previous Session Close | $${previousClose.toFixed(2)} (${prevCloseMonthDayYear}) |. NEVER output duplicate or repeated "Previous Session Close" rows, and NEVER invent or hallucinate unverified dates (such as Saturday dates).
======================================================================`);
            } catch (err) {
              console.error(`Failed to fetch verified market data for ${sym}:`, err);
            }
          })
        );

        if (detectedTickers.length > 1) {
          const multiTickerGrounding = `======================================================================
MULTI-TICKER PORTFOLIO HOLDING GROUNDING (Source of Truth - Velora Portfolio Engine)
CRITICAL GROUNDING FOR SECTION 5 ("Downside Risks & Portfolio Impact"):
${detectedTickers.map(sym => {
  const h = userAnalyzedHoldings.find(item => item.symbol.toUpperCase() === sym.toUpperCase());
  if (h) {
    return `• ${sym}: CURRENT HOLDING | Classification: ${h.isProfit ? "WINNER / PROFITABLE" : "UNDERPERFORMER / LOSS"} | Return: ${h.returnDollar >= 0 ? '+' : ''}${h.returnPercent.toFixed(2)}% (${h.returnDollar >= 0 ? '+' : '-'}$${Math.abs(h.returnDollar).toFixed(2)}) | Value: $${h.positionValue.toFixed(2)} (${h.weightPercent.toFixed(1)}% of portfolio) | Total Cost: $${h.positionCost.toFixed(2)} ($${h.purchasePrice.toFixed(2)} per share purchase price)`;
  } else {
    return `• ${sym}: NOT HELD IN PORTFOLIO | The user holds 0 shares of ${sym} in their Velora portfolio.`;
  }
}).join("\n")}

STRICT INSTRUCTIONS FOR COMBINED / MULTI-TICKER ANALYSIS:
1. In Section 5 ("Downside Risks & Portfolio Impact"), address each stock's portfolio standing SEPARATELY using the verified facts above.
2. If a stock is NOT HELD (e.g. ${detectedTickers.filter(s => !userAnalyzedHoldings.some(h => h.symbol.toUpperCase() === s.toUpperCase())).join(", ") || "none"}), you MUST state explicitly that it is not in the portfolio.
3. If a stock IS HELD (e.g. ${detectedTickers.filter(s => userAnalyzedHoldings.some(h => h.symbol.toUpperCase() === s.toUpperCase())).join(", ") || "none"}), copy its exact return and classification as an INDIVISIBLE unit.
4. ABSOLUTE PROHIBITION: NEVER combine, cross-assign, or swap returns between tickers (e.g. NEVER assign another stock's return to TSLA or NVDA).
======================================================================`;
          verifiedTickerContexts.push(multiTickerGrounding);
        }

        if (verifiedTickerContexts.length > 0) {
          verifiedTickerContextMsg = {
            role: "system",
            content: verifiedTickerContexts.join("\n\n")
          };
        }
      }
    }

    // 3. Verified Index Grounding & Temporal Engine
    const sessionIN = getMarketSessionStatus("IN");
    const sessionUS = getMarketSessionStatus("US");
    const isTemporalQuery = /\b(today'?s date|current date|what date is it|latest session|session data|which session|latest date|as of today)\b/i.test(lastUserMsg);
    const detectedIndices = detectIndicesInQuery(lastUserMsg);
    const requestedHistoricalDate = extractRequestedDateFromQuery(lastUserMsg);
    let verifiedIndexContextMsg: ChatMessage | null = null;

    if (detectedIndices.length > 0 || isTemporalQuery) {
      const indicesToFetch = isTemporalQuery
        ? [SUPPORTED_INDICES.find(i => i.id === "sp500")!, SUPPORTED_INDICES.find(i => i.id === "nifty")!].filter(Boolean)
        : detectedIndices;

      const verifiedIndexBlocks: string[] = [];
      const fetchedQuotes: VerifiedIndexQuote[] = [];

      await Promise.all(
        indicesToFetch.map(async (def) => {
          const quote = await fetchVerifiedIndex(def);
          if (quote) {
            fetchedQuotes.push(quote);
            verifiedDataDates.push(quote.dataDateStr);
            console.log(`[AI Temporal Grounding] Symbol: ${quote.symbol} (${quote.name}) | Status: ${quote.freshness} | Data Date: ${quote.dataDateStr} | Previous Session: ${quote.previousCloseDateStr} (${quote.previousClose}) | Expected Session: ${quote.expectedSessionDate} | Quote Type: ${quote.quoteType}`);

            const session = quote.market === "IN" ? sessionIN : sessionUS;

            if (requestedHistoricalDate) {
              const candle = quote.candles.find(c => c.date === requestedHistoricalDate.dateStr);
              if (candle) {
                verifiedIndexBlocks.push(`======================================================================
OFFICIAL VERIFIED HISTORICAL SESSION DATA (Source of Truth - Velora Market Engine)
Index: ${quote.name} (${quote.symbol})
Requested Date: ${requestedHistoricalDate.displayLabel} (${requestedHistoricalDate.dateStr})
• Verified Close: ${candle.close.toLocaleString("en-US", { minimumFractionDigits: 2 })}
• Previous Session Close: ${candle.previousClose != null ? candle.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 }) : "N/A"}
• Daily Change: ${candle.change != null && candle.change >= 0 ? "+" : ""}${candle.change ?? 0} (${candle.changePercent != null && candle.changePercent >= 0 ? "+" : ""}${candle.changePercent ?? 0}%)
Status: VERIFIED HISTORICAL CLOSE
CRITICAL RULE: You MUST cite the exact verified close of ${candle.close.toLocaleString("en-US", { minimumFractionDigits: 2 })} for ${requestedHistoricalDate.displayLabel}. DO NOT refuse to answer when verified historical session data is provided above.
======================================================================`);
              } else {
                const reqDateObj = new Date(`${requestedHistoricalDate.dateStr}T12:00:00Z`);
                const dayOfWeekNum = reqDateObj.getUTCDay();
                const isWeekend = dayOfWeekNum === 0 || dayOfWeekNum === 6;
                if (isWeekend) {
                  verifiedIndexBlocks.push(`======================================================================
OFFICIAL HISTORICAL CALENDAR NOTICE (Velora Market Engine)
Index: ${quote.name} (${quote.symbol})
Requested Date: ${requestedHistoricalDate.displayLabel} (${requestedHistoricalDate.dateStr})
Status: NON-TRADING DAY (WEEKEND - MARKETS CLOSED)
• ${requestedHistoricalDate.displayLabel} was a ${dayOfWeekNum === 6 ? "Saturday" : "Sunday"}, when equity markets are closed.
• The nearest preceding trading session was Friday (${quote.candles[quote.candles.length - 1]?.date}), when ${quote.name} closed at ${quote.candles[quote.candles.length - 1]?.close.toLocaleString("en-US", { minimumFractionDigits: 2 })}.
CRITICAL RULE: State clearly that ${requestedHistoricalDate.displayLabel} was a weekend and markets were closed, and cite the nearest trading session.
======================================================================`);
                } else {
                  verifiedIndexBlocks.push(`======================================================================
OFFICIAL HISTORICAL DATA STATUS (Velora Market Engine)
Index: ${quote.name} (${quote.symbol})
Requested Date: ${requestedHistoricalDate.displayLabel} (${requestedHistoricalDate.dateStr})
Status: OUT OF AVAILABLE HISTORICAL RANGE
CRITICAL RULE: State honestly and consistently: "Velora's verified historical data covers the past 30 days (${quote.candles[0]?.date || "recent"} to ${quote.candles[quote.candles.length - 1]?.date || "latest"}). Verified historical session data for ${requestedHistoricalDate.displayLabel} is not available in our 30-day feed."
======================================================================`);
                }
              }
            } else {
              // Latest session quote block
              let sessionGuidance = "";
              if (quote.market === "US" && session.phase === "PRE_MARKET") {
                sessionGuidance = `• PRE-MARKET US SESSION NOTICE:
  Today is ${session.dayOfWeek}, ${session.localDateStr}. Regular US trading has NOT opened yet (regular market hours: 09:30 - 16:00 EST / 20:00 - 02:30 IST).
  Therefore, when asked how the market performed "today", the latest completed session was ${session.latestCompletedSessionWeekday}'s close (${session.latestCompletedSessionLabel}).
  You MUST explicitly state: "The US market has not yet opened for ${session.dayOfWeek}, ${session.localDateStr} (trading begins at 09:30 EST / 20:00 IST). In the latest completed session on ${session.latestCompletedSessionWeekday} (${session.latestCompletedSessionDate}), the ${quote.name} closed at ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%, a move of ${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} from the previous session close of ${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} on ${quote.previousCloseDateStr})."`;
              } else if (quote.market === "IN" && session.phase === "POST_CLOSE") {
                sessionGuidance = `• COMPLETED SESSION NOTICE:
  Today is ${session.dayOfWeek}, ${session.localDateStr}. The Indian market has CLOSED for the day (trading concluded at 15:30 IST).
  Therefore, today's session (${quote.dataDateStr}) IS the official completed session.
  You MUST cite the final closing level of ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%, a move of ${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} from previous session close of ${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} on ${quote.previousCloseDateStr}) as today's close.`;
              }

              verifiedIndexBlocks.push(`======================================================================
OFFICIAL VERIFIED INDEX DATA (Source of Truth - Velora Market Data Engine)
Index: ${quote.name} (${quote.symbol})
Market: ${quote.market === "IN" ? "India (NSE / BSE)" : "United States (NYSE / NASDAQ)"}
Current Market Time: ${session.localTimeStr}
Session Phase: ${session.phase} (Market is ${session.isOpen ? "OPEN" : "CLOSED"})
Latest Completed Session: ${session.latestCompletedSessionLabel}
Data Vintage Date: ${quote.dataDateStr}
Data Timestamp: ${quote.dataTimestamp.toISOString()}
Freshness Status: ${quote.freshness}
Quote Type: ${quote.quoteType}
• Current / Latest Level: ${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}
• Daily Change: ${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)} (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%)
• Previous Session Close: ${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} (Session Date: ${quote.previousCloseDateStr})
${sessionGuidance}

MANDATORY PREVIOUS CLOSE FORMAT RULE:
Whenever citing Previous Session Close in prose narrative or in Section 3's table, you MUST ALWAYS include both the previous close price and its date:
"${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${quote.previousCloseDateStr})" (e.g. "${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} on ${quote.previousCloseDateStr}").
In the table, format as: | Previous Session Close | ${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} (${quote.previousCloseDateStr}) |
NEVER emit the previous close number without its session date in any mode.

${quote.freshness === "STALE" ? `CRITICAL STALENESS DISCLOSURE MANDATE:
The data for ${quote.name} is STALE. You MUST OPEN your response with this exact disclosure before giving any figures:
"${quote.stalenessNote}"` : ""}

${quote.freshness === "UNVERIFIED" ? `CRITICAL UNVERIFIED DATA DISCLOSURE MANDATE:
The daily change calculation for ${quote.name} is flagged as UNVERIFIED: ${quote.stalenessNote}
You MUST state explicitly that this figure is unverified before citing any numbers. Never stamp this quote as fresh or verified.` : ""}

${quote.quoteType === "INTRADAY_SNAPSHOT" ? `CRITICAL INTRADAY DISCLOSURE MANDATE:
The market has closed for the day, but the figure in our feed is an intraday snapshot recorded at ${quote.dataTimestamp.toLocaleTimeString()} rather than the official final close. You MUST state explicitly that this is an intraday level and not the final close.` : ""}

STRICT HEADLINE NUMBER RULE:
News articles may provide commentary or sector colour, but you may NEVER cite index figures or percentages from news search results. You MUST use the official verified index level (${quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}), change (${quote.change >= 0 ? "+" : ""}${quote.change.toFixed(2)}), change percentage (${quote.changePercent >= 0 ? "+" : ""}${quote.changePercent.toFixed(2)}%), and previous close (${quote.previousClose.toLocaleString("en-US", { minimumFractionDigits: 2 })} from ${quote.previousCloseDateStr}) above as your headline figures.
======================================================================`);
            }
          }
        })
      );

      if (isTemporalQuery) {
        const niftyQuote = fetchedQuotes.find(q => q.symbol === "^NSEI");
        const sp500Quote = fetchedQuotes.find(q => q.symbol === "^GSPC");

        verifiedIndexBlocks.unshift(`======================================================================
OFFICIAL TEMPORAL CALENDAR & SESSION GROUNDING (Source of Truth - Velora Engine)
• Current Wall-Clock Date: ${sessionIN.dayOfWeek}, ${sessionIN.localDateStr}
• Indian Market (NSE / BSE):
  - Current Local Time: ${sessionIN.localTimeStr}
  - Market Status: ${sessionIN.phase === "POST_CLOSE" ? "Closed for the day (trading ended at 15:30 IST)" : sessionIN.phase === "REGULAR_HOURS" ? "Open (Trading session in progress)" : "Pre-Market (Opens 09:15 IST)"}
  - Latest Completed Session: ${sessionIN.latestCompletedSessionLabel} (${niftyQuote ? `Nifty 50 close: ${niftyQuote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "session complete"})
• US Market (NYSE / NASDAQ):
  - Current Local Time: ${sessionUS.localTimeStr}
  - Market Status: ${sessionUS.phase === "POST_CLOSE" ? "Closed for the day (trading ended at 16:00 EST)" : sessionUS.phase === "REGULAR_HOURS" ? "Open (Trading session in progress)" : `Pre-Market (Opens ${sessionUS.nextSessionOpensLabel})`}
  - Latest Completed Session: ${sessionUS.latestCompletedSessionLabel} (${sp500Quote ? `S&P 500 close: ${sp500Quote.price.toLocaleString("en-US", { minimumFractionDigits: 2 })}` : "Friday close"})

CRITICAL TEMPORAL MANDATE:
When asked "What is today's date / latest session you have data for?", you MUST state:
1. Today's date (${sessionIN.dayOfWeek}, ${sessionIN.localDateStr}).
2. The latest completed session for each covered market (Indian market: ${sessionIN.latestCompletedSessionLabel}; US market: ${sessionUS.latestCompletedSessionLabel}), completely consistent with the verified figures above.
======================================================================`);
      }

      if (verifiedIndexBlocks.length > 0) {
        verifiedIndexContextMsg = {
          role: "system",
          content: verifiedIndexBlocks.join("\n\n")
        };
      }
    }

    // 4. Real-Time Web Grounding via Tavily (topic: "news") / Brave Search
    const needsSearch = /stock|price|market|news|earnings|crypto|nvda|aapl|tsla|msft|report|today|ratio|fed|rate|inflation|war|cpi|gdp|why|fall|drop/i.test(lastUserMsg);
    let searchContextMsg: ChatMessage | null = null;

    if (needsSearch) {
      if (isTavilyConfigured()) {
        try {
          const searchResult = await tavilySearch({
            query: lastUserMsg,
            maxResults: 5,
            topic: "news",
          });

          if (searchResult.results.length > 0) {
            const contextText = searchResult.results
              .map((r: any) => {
                let dateStr = "";
                let isHistorical = false;
                if (r.published_date) {
                  try {
                    const d = new Date(r.published_date);
                    if (!isNaN(d.getTime())) {
                      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                      const ageDays = (Date.now() - d.getTime()) / (1000 * 60 * 60 * 24);
                      if (ageDays > 5) {
                        isHistorical = true;
                      }
                    }
                  } catch {}
                }

                let publisher = "Web";
                try {
                  const host = new URL(r.url).hostname.replace(/^www\./, "");
                  publisher = host.split('.')[0].toUpperCase();
                } catch {}

                const dateTag = dateStr ? ` — ${dateStr}${isHistorical ? " [HISTORICAL ARTICLE — DO NOT CITE AS TODAY'S SESSION]" : ""}` : "";
                return `• [${publisher} / ${r.title}](${r.url})${dateTag}\n  Summary: ${r.content}`;
              })
              .join("\n\n");

            searchContextMsg = {
              role: "system",
              content: `Real-time web search results from Tavily News:\n\n${contextText}\n\nCRITICAL TEMPORAL RULES FOR WEB SOURCES:\n- Any article tagged [HISTORICAL ARTICLE] or published in prior weeks/months MUST NOT be cited as today's performance.\n- Web news results may supply colour, market drivers, and sector moves, but may NEVER supply the headline index or stock figures. Use the official verified data above.\n- In your final "## Sources" section, cite these sources using the exact \`• [Publisher / Title](URL) — Date\` format above.`,
            };
          }
        } catch (searchError) {
          console.error("Tavily search failed or timed out:", searchError);
        }
      } else {
        const braveKey = getEnv('BRAVE_SEARCH_API_KEY');
        if (braveKey) {
          try {
            const searchUrl = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(lastUserMsg)}&count=4`;
            const searchRes = await fetch(searchUrl, {
              headers: {
                "X-Subscription-Token": braveKey,
                "Accept": "application/json",
              },
              cache: "no-store",
            });

            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const results = searchData?.web?.results || [];
              if (results.length > 0) {
                const contextText = results
                  .map((r: any) => {
                    let publisher = "Web";
                    try {
                      const host = new URL(r.url).hostname.replace(/^www\./, "");
                      publisher = host.split('.')[0].toUpperCase();
                    } catch {}
                    return `• [${publisher} / ${r.title}](${r.url})\n  Summary: ${r.description}`;
                  })
                  .join("\n\n");

                searchContextMsg = {
                  role: "system",
                  content: `Real-time web search results from Brave Search:\n\n${contextText}\n\nGround your narrative, catalysts, and news in these sources. In your final "## Sources" section, cite these sources using the exact \`• [Publisher / Title](URL)\` format above.`,
                };
              }
            }
          } catch (searchError) {
            console.error("Brave search failed or timed out:", searchError);
          }
        }
      }
    }

    // 5. Compute As-Of Stamp
    let asOfDataDateStr: string | null = null;
    if (verifiedDataDates.length > 0) {
      const oldestIso = [...verifiedDataDates].sort()[0];
      const oldestDateObj = new Date(oldestIso + "T12:00:00Z");
      asOfDataDateStr = oldestDateObj.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
    }

    const veloraDataAsOfRule = asOfDataDateStr
      ? `- For Velora market & portfolio data:\n  \`• Velora data as of ${asOfDataDateStr}\``
      : `- If no verified Velora market or portfolio data was injected into this prompt, DO NOT output a 'Velora data as of' line. Only cite real web search sources with their markdown links and dates.`;

    // 6. Base System Prompt
    const baseSystemPrompt = `You are Velora AI — an elite Wall Street financial research assistant and market strategist.
Your purpose is to deliver highly actionable, quantitative, and risk-calibrated financial insights.
Be direct, professional, concise, and structured. Always use standard Markdown headings (##), bold text, bullet points, and markdown tables where applicable.

When asked for trade ideas, stock breakdowns, or market analysis, format your output into clear sections using Markdown H2 (##):
## 1. Executive Takeaway
## 2. Catalyst & Fundamental Drivers
## 3. Quantitative Ratios & Valuation (use Markdown tables)
## 4. Technical Setup & Trade Plan
## 5. Downside Risks & Portfolio Impact

MANDATORY MARKET INDEX & TEMPORAL RULES:
- When answering questions about market indices (e.g. S&P 500, Nasdaq, Dow, Nifty 50, Sensex), you MUST use the headline figures, price levels, and percentage changes from the OFFICIAL VERIFIED VELORA MARKET DATA provided above.
- NEVER quote headline index figures from web search news articles. News results may supply colour (drivers, sector moves) but may NEVER supply the headline index figure.
- PREVIOUS CLOSE AUDITABILITY (INDEX & TICKER ANSWERS ONLY):
  Whenever citing the previous session close for an index or stock, you MUST ALWAYS provide both the previous close level AND its session date:
  * In Section 1 (Executive Takeaway): State both the previous close price and date (e.g. "...from the previous session close of 7,561.67 on Friday, November 13, 2026").
  * In Section 3 (Quantitative Ratios & Valuation table): You MUST include the date in a single previous close row:
    | Previous Session Close | 7,561.67 (November 13, 2026) |
    Include exactly ONE "Previous Session Close" row in any table. NEVER output duplicate or redundant previous close rows.
  * NEVER omit the previous session date in either Fast or Deep mode.
  * CRITICAL EXCLUSION FOR PORTFOLIO HEALTH CHECKS: When analyzing the user's overall portfolio health or holdings, "Previous Session Close" does NOT apply to the portfolio. Completely OMIT the previous close sentence. NEVER write "from the previous session close of N/A on N/A" or emit any "N/A" template fields.
- INLINE SOURCE CITATIONS:
  In Section 1 and Section 2, when citing catalysts, market drivers, or external news, you MUST embed at least one inline markdown citation link directly in the body sentence (e.g. "...supported by FII buying [TradingView](https://www.tradingview.com/news) and lower crude prices [Rediff Business](https://www.rediff.com/business)..."). These links render as interactive inline citation chips in the Velora UI.
- If the injected market data states that the data is STALE, you MUST OPEN your response with the required staleness disclosure before citing any figures.
- If the injected market data states that a figure is an INTRADAY SNAPSHOT, you MUST state explicitly that it is an intraday level and not the final close.
- For US markets queried during Asian/European hours before the 09:30 EST open, "today" refers to the latest completed session's close. You MUST explicitly label it using its actual session weekday and date (e.g. "Monday's close, November 16, 2026" or "Friday's close, November 13, 2026") and state that the US market opens tonight at 20:00 IST (09:30 EST). NEVER mislabel a Monday session as Friday.
- NEVER present an old close (such as from May, June, or a prior week) as today's market performance.
- For explicit past-date questions (e.g. "What did the Nifty 50 close at on November 12, 2026?"), quote the verified historical close from the official data provided. Never refuse when verified historical data is present, and never guess from news articles.

MANDATORY TRADE PLAN & TECHNICAL RULES (SECTION 4):
- UNIFORMLY OMIT all unverified third-party technical levels (such as guessing secondary support, resistance, pivot, or dip-buying levels).
- You may ONLY cite verified price metrics provided in the official data: Current Price ($X.XX) and 52-Week Range ($Low - $High).
- In Section 4 ("## 4. Technical Setup & Trade Plan"), evaluate price action strictly relative to its Current Price and 52-Week Range (e.g. trading near the upper or lower boundary of its 52-week range). Discuss technical momentum, trends, and volume qualitatively WITHOUT fabricating arbitrary dollar support or resistance numbers.
- If and ONLY IF a "Verified Trade Setup" is provided in the official market data below, output:
> **TRADE SETUP:** Entry $X | Target $Y (+Z%) | Stop $W (-V%) | Conviction High
> **RISK SCORE:** 7/10 (High Momentum / Growth)
- NEVER invent a Target Price or percentage. NEVER output an inverted percentage (e.g. Target below Entry labelled with positive percentage).
- If NO verified trade setup is provided above (or marked as NO VERIFIED ANALYST PRICE TARGET AVAILABLE), you MUST completely OMIT the "> **TRADE SETUP:**" block from your answer.
- NEVER write "N/A" for Target or Stop (e.g. NEVER output "PRICE TARGET: N/A" or "STOP LOSS: N/A").
- STRICT NUMERICAL DIRECTION & ORDERING: NEVER make inverted directional claims. For example, NEVER claim that a higher price ($220) is "below" a lower price ($162.85), or that a lower price is "above" a higher price. Verify all numerical comparisons.
- ABSOLUTE PERCENTAGE & UNIT DISCIPLINE: In prose narrative, percentage changes MUST match the verified changePercent (e.g. "-2.01%"). NEVER substitute the dollar change as a percentage (e.g. if a stock dropped $3.34 or -2.01%, NEVER state "it declined 3.34%" — write "it fell $3.34 (-2.01%)").

CRITICAL TABLE FORMATTING RULE:
- In Markdown tables, each cell must contain exactly one clean, final value.
- NEVER output duplicate rows for the same metric in any table. Specifically, in single-ticker snapshot tables, include exactly ONE row for "Previous Session Close" (e.g. "| Previous Session Close | $390.22 (Friday, November 13, 2026) |"). NEVER emit duplicate "Previous Session Close" rows.
- NEVER output self-correction arrows, transitions, or revision patterns (such as "$3.92T → $1.50T" or "A -> B") inside table cells. Output ONLY the single final verified number (e.g. "$1.50T").
- NEVER emit filler rows, repeated header rows, or self-referential rows where both cells contain the same or similar text (e.g. NEVER output "| AMD Snapshot | AMD Snapshot |" or "| Snapshot | Snapshot |").
- Each table row MUST have a unique Metric name in Column 1 and a single verified Value in Column 2.
- NEVER split a metric across multiple rows (e.g. NEVER emit "P/E Ratio | 115. analysis" followed by "P/E Ratio | 115.0x"). Combine into one clean row: "| P/E Ratio | 115.0x |".
- ABSOLUTE PROHIBITION ON 'N/A' TABLE CELLS: NEVER output any table cell containing 'N/A', 'n/a', 'None', or empty placeholders in any table. If a metric value is not available, completely omit that row.
- NO-DATA PORTFOLIO EXCLUSION: When no portfolio holdings or market metrics are available, DO NOT generate any metrics table or snapshot table at all. Never emit a table containing 'N/A'.

MANDATORY PORTFOLIO IMPACT RULES (FOR SECTION 5):
- For ANY subject stock, check its verified portfolio standing:
  * If the stock IS held in the user's portfolio: state its exact holding size, return, and Winner/Underperformer status from the verified portfolio data as a single indivisible unit.
  * If the stock is NOT held in the user's portfolio: state explicitly that it is NOT currently held in the user's portfolio.
  * NEVER cross-assign or swap returns between different stocks (e.g. NEVER assign a loss from another stock like FSLR to TSLA).
- STRICT COST BASIS & PER-SHARE DISTINCTION:
  * Clearly distinguish between Total Cost Basis ($X.XX) and Per-Share Purchase Price ($Y.YY/share).
  * When mentioning cost in prose narrative, ALWAYS use the format: "Total Cost of $X.XX ($Y.YY per share)" (e.g. "Total Cost of $14.15 ($283.00 per share)").
  * NEVER state that the cost basis is $283.00 without specifying "per share", and NEVER claim the entire position cost $283.00 when the total cost was $14.15.
- Derived Portfolio Aggregates: When discussing portfolio concentration or holdings weights in narrative, quote the exact pre-computed percentages from the official data. Never confuse "% of portfolio value" with "% of unrealized gains".
- Citing Individual Holding P&L: ALWAYS copy the exact dollar P&L directly from the verified table (e.g. CRSP: -$1.02, BWXT: -$1.72, TSLA: +$5.36). NEVER recalculate in your head.

MANDATORY SOURCES FORMATTING:
At the very end of your response, you MUST provide a "## Sources" section listing every source:
- For web search sources: cite each web source using its exact markdown link and date from the search results below:
  \`• [Publisher / Title](URL) — Date\`
${veloraDataAsOfRule}
NEVER output bare source names like "Snapshot from Robinhood data" or "Yahoo Finance" without links.
NEVER label sources as "— Recent" without an actual date.

IMPORTANT COMPLIANCE NOTICE: Velora provides market intelligence and quantitative analysis for informational and research purposes only, not financial or investment advice. Always append this exact disclaimer at the very end: "*Velora AI provides financial intelligence for informational and research purposes only, not investment advice.*"`;

    // 7. Assemble Complete Messages Array
    const isPortfolioQuery = /(?:portfolio|health|holdings|asset allocation|my stocks|my positions|breakdown)/i.test(lastUserMsg);

    const messages: ChatMessage[] = [
      { role: "system", content: baseSystemPrompt }
    ];

    if (typeof payload?.systemPrompt === "string" && payload.systemPrompt.trim()) {
      messages.push({ role: "system", content: payload.systemPrompt.trim() });
    }
    if (portfolioContextMsg) {
      messages.push(portfolioContextMsg);
    }
    if (isPortfolioQuery && userAnalyzedHoldings.length > 0 && canonicalHoldingsTable) {
      messages.push({
        role: "system",
        content: `CRITICAL MANDATE FOR THIS PORTFOLIO HEALTH CHECK ANSWER:
1. In Section 3 ("## 3. Quantitative Ratios & Valuation (use Markdown tables)"), you MUST render the following exact Markdown table verbatim, row-for-row:
${canonicalHoldingsTable}

2. Headline Market Value is $${userTotalPortfolioValue.toFixed(2)} (the sum of Column 2). Total Cost Basis is $${userTotalCostBasis.toFixed(2)} (the sum of Column 3).
3. Do NOT invent, recalculate, or shift any numbers in prose. Every holding's dollar value, P&L, return %, and Winner/Underperformer label in your prose narrative MUST match this table exactly.
4. Omit all single-ticker previous close sentences or trade setup blocks from this portfolio-level answer.`
      });
    } else if (isPortfolioQuery && userAnalyzedHoldings.length === 0) {
      messages.push({
        role: "system",
        content: `MANDATORY DIRECTIVE FOR UNLOCKED VAULT / NO PORTFOLIO DATA:
The user is requesting a portfolio health check or portfolio review, but NO portfolio data or active holdings are available in this session (the user's portfolio vault is locked or no holdings have been connected).
1. State clearly, professionally, and helpfully that no active portfolio holdings or positions are currently accessible in this session, and invite the user to unlock their portfolio vault or add holdings in the Portfolio tab.
2. DO NOT output any quantitative metrics table, valuation table, or snapshot table. Completely OMIT any Markdown table from your entire response.
3. NEVER emit any "Previous Session Close" rows, single-ticker trading day metrics, or "N/A" cells.
4. Omit trade setup blocks and technical price levels.`
      });
    }
    if (verifiedTickerContextMsg) {
      messages.push(verifiedTickerContextMsg);
    }
    if (verifiedIndexContextMsg) {
      messages.push(verifiedIndexContextMsg);
    }
    if (searchContextMsg) {
      messages.push(searchContextMsg);
    }
    messages.push(...rawMessages);

    // ── Model Selection & Fallback Hierarchy ─────────────────────────
    const isDeepMode = model.includes("minimax") || model === "deep";
    const modelsToTry = isDeepMode
      ? [
          "minimaxai/minimax-m3.1-flash",          // Primary Deep analyst
          "nvidia/nemotron-3.5-lightning-30b-a3b", // Fallback 1: Fast reasoning
        ]
      : [
          "nvidia/nemotron-3.5-bolt-e4b",          // Primary Fast: instant answers
          "minimaxai/minimax-m3.1-flash",          // Fallback 1: Deep analyst
        ];

    let selectedModel = "";
    let selectedReader: ReadableStreamDefaultReader<Uint8Array> | null = null;
    let prebufferTokens: string[] = [];
    let initialBuffer = "";
    let lastError: any = null;
    const requestStartTime = Date.now();

    // ── First-Visible-Token Guard Loop ─────────────────────────────
    // For each model in the fallback chain:
    // 1. Fetch with enable_thinking: false
    // 2. Wait up to 15s for the first VISIBLE content token
    // 3. If model stalls (e.g. burns reasoning or freezes), abort and switch to fallback
    for (const attemptModel of modelsToTry) {
      console.log(`[AI Routing] Initiating attempt with ${attemptModel} (Mode: ${isDeepMode ? 'Deep' : 'Fast'})`);
      const modelAttemptStart = Date.now();
      const firstTokenCtrl = new AbortController();

      const firstTokenTimer = setTimeout(() => {
        console.warn(`[First-Token Guard] 15s elapsed without visible content token from ${attemptModel}. Aborting to fallback.`);
        firstTokenCtrl.abort(new Error("First visible content token timeout (15s)"));
      }, 15000);

      try {
        const isMiniMax = attemptModel.includes("minimax");

        const requestBody: any = {
          model: attemptModel,
          messages,
          temperature: typeof payload?.temperature === "number"
            ? payload.temperature
            : (isMiniMax ? 0.4 : 0.2),
          max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 4096,
          stream: true,
          // CRITICAL: Unconditionally disable thinking across models so reasoning doesn't burn budget
          chat_template_kwargs: { enable_thinking: false },
        };

        const res = await fetch(NVIDIA_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: firstTokenCtrl.signal,
        });

        if (!res.ok || !res.body) {
          clearTimeout(firstTokenTimer);
          const errText = await res.text().catch(() => "");
          console.warn(`Attempt with ${attemptModel} returned HTTP ${res.status}: ${errText.slice(0, 150)}`);
          lastError = errText || `Status ${res.status}`;
          continue;
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let foundFirstVisibleToken = false;
        let inThinkingBlock = false;
        const capturedPretokens: string[] = [];

        // Read until first visible content token
        while (!foundFirstVisibleToken) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() || "";

          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed || trimmed.startsWith(":")) continue;
            if (trimmed === "data: [DONE]") continue;

            if (trimmed.startsWith("data: ")) {
              try {
                const json = JSON.parse(trimmed.slice(6));
                let token = json.choices?.[0]?.delta?.content || "";

                if (token) {
                  // Filter out <think> tags if present
                  if (token.includes("<think>") && token.includes("</think>")) {
                    token = token.replace(/<think>[\s\S]*?<\/think>/gi, "");
                  } else if (token.includes("<think>")) {
                    inThinkingBlock = true;
                    token = token.replace(/<think>[\s\S]*/gi, "");
                  } else if (token.includes("</think>")) {
                    inThinkingBlock = false;
                    token = token.replace(/[\s\S]*<\/think>/gi, "");
                  }

                  if (!inThinkingBlock && token) {
                    foundFirstVisibleToken = true;
                    capturedPretokens.push(token);
                    break;
                  }
                }
              } catch {}
            }
          }
        }

        clearTimeout(firstTokenTimer);

        if (!foundFirstVisibleToken) {
          console.warn(`[First-Token Guard] Model ${attemptModel} completed without emitting visible content tokens! Falling back.`);
          try { await reader.cancel(); } catch {}
          continue;
        }

        console.log(`[First-Token Guard] Received first visible content token from ${attemptModel} in ${Date.now() - modelAttemptStart}ms.`);
        selectedModel = attemptModel;
        selectedReader = reader;
        prebufferTokens = capturedPretokens;
        initialBuffer = buffer;
        break;
      } catch (err: any) {
        clearTimeout(firstTokenTimer);
        console.warn(`Attempt with ${attemptModel} failed: ${err.message || err}`);
        lastError = err.message || "Model timeout";
      }
    }

    if (!selectedReader) {
      console.error(`All models in hierarchy failed to yield content tokens. Last error: ${lastError}`);
      return NextResponse.json(
        { error: `AI service temporarily unavailable (${lastError}). Please try again or switch to Fast mode.` },
        { status: 502 }
      );
    }

    const encoder = new TextEncoder();
    const decoder = new TextDecoder();
    const activeModel = selectedModel;
    const activeReader = selectedReader;

    const stream = new ReadableStream({
      async start(controller) {
        let buffer = initialBuffer;
        let inThinkingBlock = false;
        let tokensEmitted = 0;
        let currentLine = "";
        let finishReason = "unknown";
        let streamClosed = false;
        const streamStartTime = Date.now();
        let firstTokenTime = Date.now() - requestStartTime;
        let lastTokenTime = firstTokenTime;
        const repetitionGuard = new RepetitionGuard(3);

        let watchdogTimer: NodeJS.Timeout | null = null;
        const cancelWatchdog = () => {
          if (watchdogTimer) {
            clearTimeout(watchdogTimer);
            watchdogTimer = null;
          }
        };

        const finalizeCleanly = (reason: string) => {
          if (streamClosed) return;
          streamClosed = true;
          cancelWatchdog();
          console.log(`[Stream Finalized] Reason: ${reason} | Model: ${activeModel} | Tokens: ${tokensEmitted} | Duration: ${Date.now() - streamStartTime}ms`);
          try {
            if (tokensEmitted > 0) {
              const finalNote = "\n\n*[Analysis finalized. Velora AI provides financial intelligence for informational and research purposes only, not investment advice.]*\n\n";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalNote })}\n\n`));
            } else {
              // Never emit an empty answer
              const fallbackMsg = "Velora AI was unable to generate a complete response for this query. Please try again or switch to Fast mode for an instant response.";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackMsg })}\n\n`));
            }
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          } catch {}
          try {
            activeReader.cancel().catch(() => {});
          } catch {}
        };

        const armWatchdog = () => {
          cancelWatchdog();
          watchdogTimer = setTimeout(() => {
            console.warn(`[Stream Watchdog] 10s idle token timeout on ${activeModel}`);
            finalizeCleanly("watchdog_idle_timeout");
          }, 10000);
        };

        // Enqueue prebuffered tokens
        for (const token of prebufferTokens) {
          tokensEmitted++;
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`));
        }

        // Arm watchdog
        armWatchdog();

        try {
          while (!streamClosed) {
            const { done, value } = await activeReader.read();
            if (done) break;

            armWatchdog();

            buffer += decoder.decode(value, { stream: true });
            const lines = buffer.split("\n");
            buffer = lines.pop() || "";

            for (const line of lines) {
              if (streamClosed) break;
              const trimmed = line.trim();
              if (!trimmed || trimmed.startsWith(":")) continue;
              if (trimmed === "data: [DONE]") continue;

              if (trimmed.startsWith("data: ")) {
                try {
                  const json = JSON.parse(trimmed.slice(6));
                  const choice = json.choices?.[0];
                  if (choice?.finish_reason) {
                    finishReason = choice.finish_reason;
                  }

                  const delta = choice?.delta;
                  let token = delta?.content || "";

                  if (token) {
                    // Filter out <think> tags if present
                    if (token.includes("<think>") && token.includes("</think>")) {
                      token = token.replace(/<think>[\s\S]*?<\/think>/gi, "");
                    } else if (token.includes("<think>")) {
                      inThinkingBlock = true;
                      token = token.replace(/<think>[\s\S]*/gi, "");
                    } else if (token.includes("</think>")) {
                      inThinkingBlock = false;
                      token = token.replace(/[\s\S]*<\/think>/gi, "");
                    }

                    if (!inThinkingBlock && token) {
                      // Repetition guard check on completed lines
                      let shouldHalt = false;
                      currentLine += token;
                      if (currentLine.includes("\n")) {
                        const splitLines = currentLine.split("\n");
                        currentLine = splitLines.pop() || "";
                        for (const completedLine of splitLines) {
                          if (repetitionGuard.feedLine(completedLine)) {
                            console.warn(`[Repetition Guard Triggered] Loop detected on: "${completedLine}". Stopping stream.`);
                            shouldHalt = true;
                            break;
                          }
                        }
                      }

                      if (shouldHalt) {
                        finalizeCleanly("repetition_guard_triggered");
                        break;
                      }

                      tokensEmitted++;
                      lastTokenTime = Date.now() - requestStartTime;

                      controller.enqueue(
                        encoder.encode(`data: ${JSON.stringify({ text: token })}\n\n`)
                      );
                    }
                  }
                } catch {
                  // ignore parse errors on partial lines
                }
              }
            }
          }

          cancelWatchdog();
          if (!streamClosed) {
            streamClosed = true;
            console.log(`[AI Instrumentation] Model: ${activeModel} | Emitted: ${tokensEmitted} tokens | TTFT: ${firstTokenTime}ms | Duration: ${Date.now() - requestStartTime}ms | FinishReason: ${finishReason}`);
            
            if (tokensEmitted === 0) {
              const fallbackMsg = "Velora AI was unable to generate a complete response for this query. Please try again or switch to Fast mode for an instant response.";
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: fallbackMsg })}\n\n`));
            }
            
            controller.enqueue(encoder.encode("data: [DONE]\n\n"));
            controller.close();
          }
        } catch (streamErr) {
          cancelWatchdog();
          if (!streamClosed) {
            controller.error(streamErr);
          }
        } finally {
          cancelWatchdog();
          activeReader.releaseLock();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache, no-transform",
        Connection: "keep-alive",
        "X-Accel-Buffering": "no",
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
