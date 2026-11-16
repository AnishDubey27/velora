export const dynamic = 'force-dynamic';
export const maxDuration = 120;

import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { createClient } from "@/utils/supabase/server";
import { getEnv } from "@/lib/env";
import { DEFAULT_MODEL, NVIDIA_API_URL } from "@/lib/nvidia";
import { tavilySearch, isTavilyConfigured } from "@/lib/tavily";

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

    const messages: ChatMessage[] = payload.messages.map((m: any) => ({
      role: m.role === "user" ? "user" : m.role === "assistant" ? "assistant" : "system",
      content: String(m.content || "")
    }));

    const dateTodayStr = new Date().toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });

    // Base System Prompt
    const baseSystemPrompt = `You are Velora AI — an elite Wall Street financial research assistant and market strategist.
Your purpose is to deliver highly actionable, quantitative, and risk-calibrated financial insights.
Be direct, professional, concise, and structured. Always use standard Markdown headings (##), bold text, bullet points, and markdown tables where applicable.

When asked for trade ideas, stock breakdowns, or market analysis, format your output into clear sections using Markdown H2 (##):
## 1. Executive Takeaway
## 2. Catalyst & Fundamental Drivers
## 3. Quantitative Ratios & Valuation (use Markdown tables)
## 4. Technical Setup & Trade Plan
## 5. Downside Risks & Portfolio Impact

MANDATORY TRADE PLAN & TECHNICAL RULES:
- If and ONLY IF a "Verified Trade Setup" is provided in the official market data below, output:
> **TRADE SETUP:** Entry $X | Target $Y (+Z%) | Stop $W (-V%) | Conviction High
> **RISK SCORE:** 7/10 (High Momentum / Growth)
- NEVER invent a Target Price or percentage. NEVER output an inverted percentage (e.g. Target below Entry labelled with positive percentage).
- If NO verified trade setup is provided above (or marked as NO VERIFIED ANALYST PRICE TARGET AVAILABLE), you MUST completely OMIT the "> **TRADE SETUP:**" block from your answer.
- NEVER write "N/A" for Target or Stop (e.g. NEVER output "PRICE TARGET: N/A" or "STOP LOSS: N/A").
- ABSOLUTELY NO INVENTED TECHNICAL LEVELS: Do NOT invent, hallucinate, or guess technical price levels (such as guessing "Resistance $168.50", "Support $160.00", or "buy on dips toward $200-$220" when the stock is at $162.85). You may ONLY cite verified price levels present in the data (e.g. 52-Week Low, 52-Week High, or Current Price). If secondary support or resistance levels are not provided in the data, discuss technical trends, momentum, or chart patterns qualitatively without fabricating specific dollar numbers.
- ABSOLUTE PERCENTAGE & UNIT DISCIPLINE: In prose narrative, percentage changes MUST match the verified changePercent (e.g. "-2.01%"). NEVER substitute the dollar change as a percentage (e.g. if a stock dropped $3.34 or -2.01%, NEVER state "it declined 3.34%" — write "it fell $3.34 (-2.01%)").

MANDATORY PORTFOLIO IMPACT RULES (FOR SECTION 5):
- For ANY subject stock, check its verified portfolio standing:
  * If the stock IS held in the user's portfolio: state its exact holding size, return, and Winner/Underperformer status from the verified portfolio data as a single indivisible unit.
  * If the stock is NOT held in the user's portfolio: state explicitly that it is NOT currently held in the user's portfolio.
  * NEVER cross-assign or swap returns between different stocks (e.g. NEVER assign a loss from another stock like FSLR to TSLA).
- Derived Portfolio Aggregates: When discussing portfolio concentration or holdings weights in narrative, quote the exact pre-computed percentages from the official data. Never confuse "% of portfolio value" with "% of unrealized gains".

MANDATORY SOURCES FORMATTING:
At the very end of your response, you MUST provide a "## Sources" section listing every source:
- For web search sources: cite each web source using its exact markdown link and date from the search results below:
  \`• [Publisher / Title](URL) — Date\`
- For Velora market & portfolio data:
  \`• Velora data as of ${dateTodayStr}\`
NEVER output bare source names like "Snapshot from Robinhood data" or "Yahoo Finance" without links.
NEVER label sources as "— Recent" without an actual date.

IMPORTANT COMPLIANCE NOTICE: Velora provides market intelligence and quantitative analysis for informational and research purposes only, not financial or investment advice. Always append this exact disclaimer at the very end: "*Velora AI provides financial intelligence for informational and research purposes only, not investment advice.*"`;

    messages.unshift({ role: "system", content: baseSystemPrompt });

    // Inject skill-specific system prompt if provided
    if (typeof payload?.systemPrompt === "string" && payload.systemPrompt.trim()) {
      messages.splice(1, 0, { role: "system", content: payload.systemPrompt.trim() });
    }

    let knownHoldingsSymbols: string[] = [];
    let userAnalyzedHoldings: AnalyzedHolding[] = [];
    let userTotalPortfolioValue = 0;
    let userTotalCostBasis = 0;

    // Fetch Portfolio Context
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      
      let userHoldings: any[] | null = null;
      if (user) {
        const { data: holdings } = await supabase
          .from('holdings')
          .select('symbol, shares, purchase_price')
          .eq('user_id', user.id);
        userHoldings = holdings;
      }
      if ((!userHoldings || userHoldings.length === 0) && Array.isArray(payload?.holdings) && payload.holdings.length > 0) {
        userHoldings = payload.holdings.map((h: any) => ({
          symbol: String(h.symbol || "").toUpperCase(),
          shares: Number(h.shares) || 0,
          purchase_price: Number(h.purchase_price ?? h.purchasePrice) || 0,
        }));
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
            `  • ${l.symbol}: Value $${l.positionValue.toFixed(2)} (${l.weightPercent.toFixed(1)}% of total portfolio value) | Return: -$${Math.abs(l.returnDollar).toFixed(2)} (${l.returnPercent.toFixed(2)}%)`
          ).join("\n");
          const largestLoserByWeight = sortedLosers[0]
            ? `${sortedLosers[0].symbol} at $${sortedLosers[0].positionValue.toFixed(2)} (${sortedLosers[0].weightPercent.toFixed(1)}% of portfolio value)`
            : "None";

          const winnersText = winners.length > 0
            ? winners.map(w => `  • ${w.symbol} (${w.shares} shs): Mkt Val $${w.positionValue.toFixed(2)} (${w.weightPercent.toFixed(1)}% of port) | Return: +$${w.returnDollar.toFixed(2)} (+${w.returnPercent.toFixed(2)}%) [WINNER/GAIN]`).join("\n")
            : "  • None";

          const losersText = losers.length > 0
            ? losers.map(l => `  • ${l.symbol} (${l.shares} shs): Mkt Val $${l.positionValue.toFixed(2)} (${l.weightPercent.toFixed(1)}% of port) | Return: -$${Math.abs(l.returnDollar).toFixed(2)} (${l.returnPercent.toFixed(2)}%) [UNDERPERFORMER/LOSS]`).join("\n")
            : "  • None";

          const portfolioContext: ChatMessage = {
            role: "system",
            content: `======================================================================
OFFICIAL VERIFIED PORTFOLIO METRICS (Source of Truth - Velora Portfolio Engine)
======================================================================
• Total Portfolio Market Value: $${totalPortfolioValue.toFixed(2)}
• Total Portfolio Cost Basis: $${totalCostBasis.toFixed(2)}
• All-Time Unrealized Return: ${isTotalProfit ? '+' : '-'}$${Math.abs(totalReturnDollar).toFixed(2)} (${isTotalProfit ? '+' : ''}${totalReturnPercent.toFixed(2)}%) [${isTotalProfit ? 'OVERALL PROFIT' : 'OVERALL LOSS'}]

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
2. ALWAYS quote the exact pre-computed percentages and dollars from the verified data above. DO NOT calculate concentration percentages, sums, or weights in your head.
3. Denominator Discipline: Distinguish strictly between "% of portfolio value" (denominator is Total Portfolio Market Value $${totalPortfolioValue.toFixed(2)}) and "% of unrealized gains" or "% return on cost". NEVER describe a dollar amount representing a share of portfolio value as a share of unrealized gains.
4. Concentration Labels: Do NOT mislabel Top-5 concentration as Top-3 concentration. Top-3 overall holdings concentration is EXACTLY ${top3Weight.toFixed(1)}% (or Top-3 winners ${top3WinnersWeight.toFixed(1)}%); Top-5 concentration is EXACTLY ${top5Weight.toFixed(1)}%.
5. Underperformer Claims: NEVER say "no single losing position exceeds X%" unless that claim is strictly true against the verified Underperformers list above (e.g. if CRSP is 5.0% and FSLR is 4.3%, do NOT claim no losing position exceeds 3.5%).
6. POSITIONS LISTED UNDER "WINNERS" HAVE POSITIVE RETURNS (+). Never classify a winner as a loss, drag, or underperformer.
7. POSITIONS LISTED UNDER "UNDERPERFORMERS" HAVE NEGATIVE RETURNS (-).
======================================================================`
          };
          messages.splice(1, 0, portfolioContext);
        }
    } catch (e) {
      console.error("Failed to fetch user portfolio context:", e);
    }

    // ── Ticker Grounding (Task B) ──────────────────────────────────
    const userMessages = messages.filter((m) => m.role === "user");
    const lastUserMsg = userMessages[userMessages.length - 1]?.content || "";
    const detectedTickers = extractTickersFromQuery(lastUserMsg, knownHoldingsSymbols);

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

              const currentPrice = quoteRes.c;
              const change = quoteRes.d ?? 0;
              const changePercent = quoteRes.dp ?? 0;
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
  - Cost Basis: $${holdingMatch.positionCost.toFixed(2)} ($${holdingMatch.purchasePrice.toFixed(2)}/share)
  - Unrealized Return: ${holdingMatch.returnDollar >= 0 ? '+' : '-'}$${Math.abs(holdingMatch.returnDollar).toFixed(2)} (${holdingMatch.returnDollar >= 0 ? '+' : ''}${holdingMatch.returnPercent.toFixed(2)}%)
  - MANDATORY RULE FOR SECTION 5 (PORTFOLIO IMPACT): ${sym} IS A CURRENT HOLDING. State clearly that the user holds ${holdingMatch.shares} shares of ${sym} with an unrealized return of ${holdingMatch.returnDollar >= 0 ? '+' : ''}${holdingMatch.returnPercent.toFixed(2)}% [${holdingMatch.isProfit ? 'WINNER/GAIN' : 'UNDERPERFORMER/LOSS'}]. NEVER claim ${sym} is an underperformer if it is a winner, and NEVER assign another stock's return to ${sym}.`;
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
3. DO NOT invent or guess technical support, resistance, or dip-buying levels outside the verified 52-week range (${week52}) and Current Price ($${currentPrice.toFixed(2)}).
4. Strictly follow the Velora Portfolio Standing above in Section 5 (Portfolio Impact).
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
    return `• ${sym}: CURRENT HOLDING | Classification: ${h.isProfit ? "WINNER / PROFITABLE" : "UNDERPERFORMER / LOSS"} | Return: ${h.returnDollar >= 0 ? '+' : ''}${h.returnPercent.toFixed(2)}% (+$${h.returnDollar.toFixed(2)}) | Value: $${h.positionValue.toFixed(2)} (${h.weightPercent.toFixed(1)}% of portfolio)`;
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
          messages.splice(1, 0, {
            role: "system",
            content: verifiedTickerContexts.join("\n\n")
          });
        }
      }
    }

    // ── Real-Time Web Grounding via Tavily (topic: "news") / Brave Search ──
    const needsSearch = /stock|price|market|news|earnings|crypto|nvda|aapl|tsla|msft|report|today|ratio|fed|rate|inflation|war|cpi|gdp|why|fall|drop/i.test(lastUserMsg);

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
                if (r.published_date) {
                  try {
                    const d = new Date(r.published_date);
                    if (!isNaN(d.getTime())) {
                      dateStr = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
                    }
                  } catch {}
                }
                if (!dateStr) dateStr = dateTodayStr;

                let publisher = "Web";
                try {
                  const host = new URL(r.url).hostname.replace(/^www\./, "");
                  publisher = host.split('.')[0].toUpperCase();
                } catch {}
                return `• [${publisher} / ${r.title}](${r.url}) — ${dateStr}\n  Summary: ${r.content}`;
              })
              .join("\n\n");

            const searchContextMsg: ChatMessage = {
              role: "system",
              content: `Real-time web search results from Tavily News (as of today):\n\n${contextText}\n\nGround your narrative, catalysts, and news in these sources. In your final "## Sources" section, cite these sources using the exact \`• [Publisher / Title](URL) — Date\` format above.`,
            };
            messages.splice(1, 0, searchContextMsg);
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
                    return `• [${publisher} / ${r.title}](${r.url}) — ${dateTodayStr}\n  Summary: ${r.description}`;
                  })
                  .join("\n\n");

                const searchContextMsg: ChatMessage = {
                  role: "system",
                  content: `Real-time web search results from Brave Search:\n\n${contextText}\n\nGround your narrative, catalysts, and news in these sources. In your final "## Sources" section, cite these sources using the exact \`• [Publisher / Title](URL) — Date\` format above.`,
                };
                messages.splice(1, 0, searchContextMsg);
              }
            }
          } catch (searchError) {
            console.error("Brave search failed or timed out:", searchError);
          }
        }
      }
    }

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
      },
    });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
