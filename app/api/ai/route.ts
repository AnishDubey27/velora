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

Always include highlighted trade parameters and risk score formatted as blockquotes:
> **TRADE SETUP:** Entry $X | Target $Y (+Z%) | Stop $W (-V%) | Conviction High
> **RISK SCORE:** 7/10 (High Momentum / Growth)

IMPORTANT COMPLIANCE NOTICE: Velora provides market intelligence and quantitative analysis for informational and research purposes only, not financial or investment advice. Always append a brief disclaimer at the end of full analyses: "*Velora AI provides financial intelligence for informational and research purposes only, not investment advice.*"`;

    messages.unshift({ role: "system", content: baseSystemPrompt });

    // Inject skill-specific system prompt if provided
    if (typeof payload?.systemPrompt === "string" && payload.systemPrompt.trim()) {
      messages.splice(1, 0, { role: "system", content: payload.systemPrompt.trim() });
    }

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

    // Real-Time Grounding via Tavily / Brave Search
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user")?.content || "";
    const needsSearch = /stock|price|market|news|earnings|crypto|nvda|aapl|tsla|msft|report|today|ratio|fed|rate|inflation|war|cpi|gdp/i.test(lastUserMsg);

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
              .map((r: any) => `[${r.title}] (${r.url}): ${r.content}`)
              .join("\n\n");

            const searchContextMsg: ChatMessage = {
              role: "system",
              content: `Real-time web search results from Tavily (as of today):\n\n${contextText}\n\nUse this real-time info to answer accurately with live price targets and metrics.`,
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
                  .map((r: any) => `[${r.title}] (${r.url}): ${r.description}`)
                  .join("\n\n");

                const searchContextMsg: ChatMessage = {
                  role: "system",
                  content: `Real-time web search results from Brave Search:\n\n${contextText}\n\nUse this real-time info to ground your analysis.`,
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

    // Define explicit Fast and Deep hierarchy fallback chains
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

    const timeoutMs = isDeepMode ? 30000 : 15000;
    let lastError: any = null;

    for (const attemptModel of modelsToTry) {
      try {
        const res = await fetch(NVIDIA_API_URL, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: attemptModel,
            messages,
            temperature: typeof payload?.temperature === "number" ? payload.temperature : 0.2,
            max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 4096,
            stream: true,
            chat_template_kwargs: { enable_thinking: false },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        if (!res.ok || !res.body) {
          const errText = await res.text().catch(() => "");
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

            try {
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                buffer += decoder.decode(value, { stream: true });
                const lines = buffer.split("\n");
                buffer = lines.pop() || "";

                for (const line of lines) {
                  const trimmed = line.trim();
                  if (!trimmed || trimmed.startsWith(":")) continue;
                  if (trimmed === "data: [DONE]") {
                    controller.enqueue(encoder.encode("data: [DONE]\n\n"));
                    continue;
                  }

                  if (trimmed.startsWith("data: ")) {
                    try {
                      const json = JSON.parse(trimmed.slice(6));
                      const delta = json.choices?.[0]?.delta;
                      // STRICTLY stream final content only. NEVER stream reasoning/thinking tokens to user!
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
                          tokensEmitted++;
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

              controller.enqueue(encoder.encode("data: [DONE]\n\n"));
              controller.close();
            } catch (streamErr) {
              controller.error(streamErr);
            } finally {
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
        console.error(`Attempt with model ${attemptModel} failed:`, err);
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
