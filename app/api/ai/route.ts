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
> **RISK SCORE:** 7/10 (High Momentum / Growth)`;

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
          const holdingsTextPromises = holdings.map(async (h) => {
            let currentPriceStr = "";
            if (finnhubKey) {
              try {
                const quoteRes = await fetch(`https://finnhub.io/api/v1/quote?symbol=${h.symbol}&token=${finnhubKey}`, { cache: "no-store" });
                if (quoteRes.ok) {
                  const quoteData = await quoteRes.json();
                  if (quoteData && quoteData.c) {
                    const currentPrice = quoteData.c;
                    const percentChange = (((currentPrice - h.purchase_price) / h.purchase_price) * 100).toFixed(2);
                    const isUp = currentPrice >= h.purchase_price;
                    currentPriceStr = ` (Current Price: $${currentPrice}, Return: ${isUp ? '+' : ''}${percentChange}%)`;
                  }
                }
              } catch (e) {
                console.error(`Failed to fetch quote for ${h.symbol}`);
              }
            }
            return `${h.shares} shares of ${h.symbol} purchased at $${h.purchase_price}${currentPriceStr}`;
          });
          
          const holdingsTexts = await Promise.all(holdingsTextPromises);
          const holdingsText = holdingsTexts.join(", ");
          
          const portfolioContext: ChatMessage = {
            role: "system",
            content: `You are Velora AI. The user currently has the following portfolio holdings: ${holdingsText}. Keep this in mind and provide personalized advice if they ask about their portfolio.`
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
    const isDeepMode = model.includes("70b") || model === "deep";
    const modelsToTry = isDeepMode
      ? [
          "meta/llama-3.3-70b-instruct",       // Primary Deep 70B Wall Street Analyst
          "stepfun-ai/step-3.7-flash",         // Fallback 1: Fast reasoning
          "meta/llama-3.1-8b-instruct",       // Fallback 2: Ultra-fast 450ms
        ]
      : [
          "stepfun-ai/step-3.7-flash",         // Primary Fast Reasoning
          "meta/llama-3.1-8b-instruct",       // Fallback 1: Ultra-fast 450ms
          "mistralai/mistral-nemotron",        // Fallback 2: Financial benchmark
        ];

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
          }),
          signal: AbortSignal.timeout(15000),
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
                      let token = delta?.content || delta?.reasoning_content || "";

                      if (token) {
                        // Filter out <think> tags if present
                        if (token.includes("<think>")) {
                          inThinkingBlock = true;
                          token = token.replace(/<think>[\s\S]*/gi, "");
                        }
                        if (token.includes("</think>")) {
                          inThinkingBlock = false;
                          token = token.replace(/[\s\S]*<\/think>/gi, "");
                        }

                        if (!inThinkingBlock && token) {
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
