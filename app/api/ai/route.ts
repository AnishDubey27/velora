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

  return Array.from(matched).slice(0, 2);
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

MANDATORY TRADE PLAN RULES:
- If and ONLY IF valid numeric Entry, Target, and Stop Loss prices are available from verified data or computed, format the trade plan as:
> **TRADE SETUP:** Entry $X | Target $Y (+Z%) | Stop $W (-V%) | Conviction High
> **RISK SCORE:** 7/10 (High Momentum / Growth)
- NEVER write "N/A" for Target or Stop (e.g. NEVER output "PRICE TARGET: N/A" or "STOP LOSS: N/A").
- If Target or Stop is not available, completely OMIT the "> **TRADE SETUP:**" block from your answer.

MANDATORY SOURCES FORMATTING:
At the very end of your response, you MUST provide a "## Sources" section listing every source:
- For web search sources: use the exact markdown link and date from search results:
  \`• [Publisher / Title](URL) — Date\`
- For Velora market & portfolio data:
  \`• Velora data as of ${dateTodayStr}\`
NEVER output bare source names like "Snapshot from Robinhood data" or "Yahoo Finance" without links.
NEVER fabricate links.

IMPORTANT COMPLIANCE NOTICE: Velora provides market intelligence and quantitative analysis for informational and research purposes only, not financial or investment advice. Always append this exact disclaimer at the very end: "*Velora AI provides financial intelligence for informational and research purposes only, not investment advice.*"`;

    messages.unshift({ role: "system", content: baseSystemPrompt });

    // Inject skill-specific system prompt if provided
    if (typeof payload?.systemPrompt === "string" && payload.systemPrompt.trim()) {
      messages.splice(1, 0, { role: "system", content: payload.systemPrompt.trim() });
    }

    let knownHoldingsSymbols: string[] = [];

    // Fetch Portfolio Context
    try {
      const cookieStore = await cookies();
      const supabase = createClient(cookieStore);
      const { data: { user } } = await supabase.auth.getUser();
      
      if (user) {
        const { data: holdings } = await supabase
          .from('holdings')
          .select('symbol, shares, purchase_price')
          .eq('user_id', user.id);
          
        if (holdings && holdings.length > 0) {
          knownHoldingsSymbols = holdings.map((h: any) => h.symbol);
          const finnhubKey = getEnv('FINNHUB_API_KEY');
          
          let totalPortfolioValue = 0;
          let totalCostBasis = 0;
          
          const analyzedHoldings = await Promise.all(
            holdings.map(async (h) => {
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
              };
            })
          );

          for (const item of analyzedHoldings) {
            totalPortfolioValue += item.positionValue;
            totalCostBasis += item.positionCost;
          }

          const totalReturnDollar = totalPortfolioValue - totalCostBasis;
          const totalReturnPercent = totalCostBasis > 0 ? (totalReturnDollar / totalCostBasis) * 100 : 0;
          const isTotalProfit = totalReturnDollar >= 0;

          const winners = analyzedHoldings.filter((h) => h.isProfit);
          const losers = analyzedHoldings.filter((h) => !h.isProfit);

          const winnersText = winners.length > 0
            ? winners.map(w => `  • ${w.symbol} (${w.shares} shs): Mkt Val $${w.positionValue.toFixed(2)} (Cur $${w.currentPrice.toFixed(2)}, Cost $${w.purchasePrice.toFixed(2)}) | Return: +$${w.returnDollar.toFixed(2)} (+${w.returnPercent.toFixed(2)}%) [WINNER/GAIN]`).join("\n")
            : "  • None";

          const losersText = losers.length > 0
            ? losers.map(l => `  • ${l.symbol} (${l.shares} shs): Mkt Val $${l.positionValue.toFixed(2)} (Cur $${l.currentPrice.toFixed(2)}, Cost $${l.purchasePrice.toFixed(2)}) | Return: -$${Math.abs(l.returnDollar).toFixed(2)} (${l.returnPercent.toFixed(2)}%) [UNDERPERFORMER/LOSS]`).join("\n")
            : "  • None";

          const portfolioContext: ChatMessage = {
            role: "system",
            content: `======================================================================
OFFICIAL VERIFIED PORTFOLIO METRICS (Source of Truth - Velora Portfolio Engine)
======================================================================
• Total Portfolio Market Value: $${totalPortfolioValue.toFixed(2)}
• Total Portfolio Cost Basis: $${totalCostBasis.toFixed(2)}
• All-Time Unrealized Return: ${isTotalProfit ? '+' : '-'}$${Math.abs(totalReturnDollar).toFixed(2)} (${isTotalProfit ? '+' : ''}${totalReturnPercent.toFixed(2)}%) [${isTotalProfit ? 'OVERALL PROFIT' : 'OVERALL LOSS'}]

WINNERS / PROFITABLE POSITIONS (Return >= 0%):
${winnersText}

UNDERPERFORMERS / UNPROFITABLE POSITIONS (Return < 0%):
${losersText}

CRITICAL ACCURACY & GROUNDING RULES:
1. The Total Portfolio Market Value is EXACTLY $${totalPortfolioValue.toFixed(2)}. NEVER cite any other total (do NOT hallucinate $13,370 or any other unverified number).
2. POSITIONS LISTED UNDER "WINNERS" HAVE POSITIVE RETURNS (+). Never classify a winner as a loss, drag, or underperformer.
3. POSITIONS LISTED UNDER "UNDERPERFORMERS" HAVE NEGATIVE RETURNS (-).
4. When performing a Portfolio Health Check or answering questions about holdings, cite these EXACT numbers and metrics.
======================================================================`
          };
          messages.splice(1, 0, portfolioContext);
        }
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

              const targetPrice = targetRes?.targetMean ? Number(targetRes.targetMean) : (targetRes?.targetMedian ? Number(targetRes.targetMedian) : null);
              const stopLoss = (targetRes?.targetLow && Number(targetRes.targetLow) > 0 && Number(targetRes.targetLow) < currentPrice)
                ? Number(targetRes.targetLow)
                : currentPrice * 0.92;

              const upsideStr = targetPrice ? ` (+${(((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1)}%)` : "";
              const downsidePercent = (((stopLoss - currentPrice) / currentPrice) * 100).toFixed(1);

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
• Wall Street Consensus Target: ${targetPrice ? `$${targetPrice.toFixed(2)}${upsideStr}` : "Unavailable"}
• Velora Risk-Calibrated Trade Setup:
  - Entry Zone: $${currentPrice.toFixed(2)}
  - Target Price: ${targetPrice ? `$${targetPrice.toFixed(2)}${upsideStr}` : "Unavailable"}
  - Stop Loss: $${stopLoss.toFixed(2)} (${downsidePercent}%)

CRITICAL GROUNDING RULES FOR ${sym}:
1. Use the official verified Current Price ($${currentPrice.toFixed(2)}), Daily Change, P/E Ratio (${peRatio}), and Market Capitalization (${marketCapStr}) VERBATIM.
2. DO NOT substitute figures from Tavily or general knowledge for these core metrics. Web search is for qualitative drivers, news, and catalysts ONLY.
3. If web search reports a different P/E or Market Cap, the OFFICIAL VERIFIED VELORA MARKET DATA above WINS SILENTLY without discussion.
======================================================================`);
            } catch (err) {
              console.error(`Failed to fetch verified market data for ${sym}:`, err);
            }
          })
        );

        if (verifiedTickerContexts.length > 0) {
          messages.splice(1, 0, {
            role: "system",
            content: verifiedTickerContexts.join("\n\n")
          });
        }
      }
    }

    // ── Real-Time Web Grounding via Tavily / Brave Search (Task C) ──
    const needsSearch = /stock|price|market|news|earnings|crypto|nvda|aapl|tsla|msft|report|today|ratio|fed|rate|inflation|war|cpi|gdp|why|fall|drop/i.test(lastUserMsg);

    if (needsSearch) {
      if (isTavilyConfigured()) {
        try {
          const searchResult = await tavilySearch({
            query: lastUserMsg,
            maxResults: 5,
            topic: "general",
          });

          if (searchResult.results.length > 0) {
            const contextText = searchResult.results
              .map((r: any) => {
                let dateStr = r.published_date 
                  ? new Date(r.published_date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) 
                  : "Recent";
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
              content: `Real-time web search results from Tavily (as of today):\n\n${contextText}\n\nGround your narrative, catalysts, and news in these sources. In your final "## Sources" section, cite these sources using the exact \`• [Publisher / Title](URL) — Date\` format above.`,
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
                    return `• [${publisher} / ${r.title}](${r.url}) — Recent\n  Summary: ${r.description}`;
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

    // Initial connection timeout (before headers arrive): 20s for Deep, 15s for Fast
    // Once headers arrive, connection timeout is cleared and stream watchdog takes over.
    const connectTimeoutMs = isDeepMode ? 20000 : 15000;
    let lastError: any = null;

    for (const attemptModel of modelsToTry) {
      let connectTimeout: NodeJS.Timeout | null = null;
      try {
        const isNemotron = attemptModel.includes("nemotron");
        const isMiniMax = attemptModel.includes("minimax");

        const requestBody: any = {
          model: attemptModel,
          messages,
          temperature: typeof payload?.temperature === "number"
            ? payload.temperature
            : (isMiniMax ? 0.4 : 0.2),
          max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 4096,
          stream: true,
        };

        // Strictly apply chat_template_kwargs ONLY to Nemotron models
        if (isNemotron) {
          requestBody.chat_template_kwargs = { enable_thinking: false };
        }

        const connectController = new AbortController();
        connectTimeout = setTimeout(() => {
          connectController.abort(new Error(`Connection timed out after ${connectTimeoutMs / 1000}s`));
        }, connectTimeoutMs);

        const res = await fetch(NVIDIA_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify(requestBody),
          signal: connectController.signal,
        });

        // Response headers received: cancel connect timeout so streaming is never truncated
        clearTimeout(connectTimeout);
        connectTimeout = null;

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
          console.warn(`Attempt with ${attemptModel} returned ${res.status}: ${errText.slice(0, 150)}`);
          lastError = errText || `Status ${res.status}`;
          continue;
        }

        const encoder = new TextEncoder();
        const decoder = new TextDecoder();

        const stream = new ReadableStream({
          async start(controller) {
            const reader = res.body!.getReader();
            let buffer = "";
            let inThinkingBlock = false;
            let tokensEmitted = 0;
            let currentLine = "";
            let finishReason = "unknown";
            let streamClosed = false;
            const t0 = Date.now();
            let firstTokenTime = 0;
            let lastTokenTime = 0;
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
              console.log(`[Stream Finalized] Reason: ${reason} | Model: ${attemptModel} | Tokens: ${tokensEmitted} | Duration: ${Date.now() - t0}ms`);
              try {
                if (tokensEmitted > 0) {
                  const finalNote = "\n\n*[Analysis finalized. Velora AI provides financial intelligence for informational and research purposes only, not investment advice.]*\n\n";
                  controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: finalNote })}\n\n`));
                }
                controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                controller.close();
              } catch {}
              try {
                reader.cancel().catch(() => {});
              } catch {}
            };

            const armWatchdog = () => {
              cancelWatchdog();
              watchdogTimer = setTimeout(() => {
                console.warn(`[Stream Watchdog] 10s idle token timeout on ${attemptModel}`);
                finalizeCleanly("watchdog_idle_timeout");
              }, 10000);
            };

            // Arm initial watchdog
            armWatchdog();

            try {
              while (!streamClosed) {
                const { done, value } = await reader.read();
                if (done) break;

                // Reset watchdog on receiving fresh chunks
                armWatchdog();

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  if (streamClosed) break;
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(":")) continue;
                  if (trimmed === "data: [DONE]") {
                    continue;
                  }

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
                          if (!firstTokenTime) firstTokenTime = Date.now() - t0;
                          lastTokenTime = Date.now() - t0;

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
                console.log(`[AI Instrumentation] Model: ${attemptModel} | Emitted: ${tokensEmitted} tokens | TTFT: ${firstTokenTime}ms | Duration: ${Date.now() - t0}ms | FinishReason: ${finishReason}`);
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
              reader.releaseLock();
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
      } catch (err: any) {
        if (connectTimeout) {
          clearTimeout(connectTimeout);
          connectTimeout = null;
        }
        console.error(`Attempt with model ${attemptModel} failed:`, err.message || err);
        lastError = err.message || "Model timeout";
      }
    }

    return NextResponse.json(
      { error: `AI request failed across available models (${lastError}). Please try again.` },
      { status: 502 }
    );
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
