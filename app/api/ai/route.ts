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
- If and ONLY IF a "Verified Trade Setup" is provided in the official market data below, output:
> **TRADE SETUP:** Entry $X | Target $Y (+Z%) | Stop $W (-V%) | Conviction High
> **RISK SCORE:** 7/10 (High Momentum / Growth)
- NEVER invent a Target Price or percentage. NEVER output an inverted percentage (e.g. Target below Entry labelled with positive percentage).
- If NO verified trade setup is provided above (or marked as NO VERIFIED ANALYST PRICE TARGET AVAILABLE), you MUST completely OMIT the "> **TRADE SETUP:**" block from your answer.
- NEVER write "N/A" for Target or Stop (e.g. NEVER output "PRICE TARGET: N/A" or "STOP LOSS: N/A").

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
