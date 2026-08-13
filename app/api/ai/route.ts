export const dynamic = 'force-dynamic';
export const maxDuration = 120;
import { NextResponse } from "next/server";
import { resolveNvidiaModel } from "@/lib/nvidia";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";
import { getEnv } from "@/lib/env";

const NVIDIA_API_URL =
  getEnv('NVIDIA_API_URL') ?? "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey() {
  return getEnv('NVIDIA_API_KEY') ?? "";
}

type ChatMessage = { role: "system" | "user" | "assistant"; content: string };

export async function POST(request: Request) {
  const apiKey = getApiKey();
  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing NVIDIA_API_KEY." },
      { status: 500 }
    );
  }

  let payload: any;
  try {
    payload = await request.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON body." }, { status: 400 });
  }

  const model = (() => {
    try {
      return resolveNvidiaModel(payload?.model);
    } catch (error) {
      return NextResponse.json(
        { error: error instanceof Error ? error.message : "Invalid model." },
        { status: 400 }
      );
    }
  })();
  if (model instanceof NextResponse) return model;

  const messages = Array.isArray(payload?.messages) ? (payload.messages as ChatMessage[]) : null;
  if (!messages || messages.length === 0) {
    return NextResponse.json({ error: "messages[] is required." }, { status: 400 });
  }

  // ── Base Velora identity prompt (always first) ──
  const baseSystemPrompt = `You are Velora AI — a premium, intelligent financial assistant built into the Velora investment platform.

PERSONALITY & TONE:
- Professional, analytical, and actionable. Think: an elite Wall Street strategist delivering high-conviction insights.
- Concise and data-driven. Lead with the core conclusion or key takeaway, then break down the details.
- Never say "As an AI language model" or similar meta-commentary. You are Velora AI.

FORMATTING & VISUAL HIERARCHY RULES:
- Start complex answers with a 1-2 sentence **Key Takeaway** block using a blockquote (\`> **Key Takeaway:** ...\`).
- Use clean, styled section headers (\`### 📊 Market Analysis\`, \`### 🎯 Trade Setup\`, \`### ⚠️ Risk Factors\`) to break up responses visually.
- When comparing tickers, showing financial ratios, or presenting price targets/levels, ALWAYS use Markdown tables (\`| Metric | Value | Detail |\`).
- Use **bolding** for tickers, key prices, and quantitative metrics (e.g. **NVDA**, **$125.50**, **P/E 32.4**).
- Use concise bullet points for actionable takeaways.
- Keep paragraphs short (2-3 sentences max) for clear readability.

FINANCIAL EXPERTISE:
- Deep knowledge across equities, technical analysis, fundamentals, macroeconomics, options, and portfolio risk.
- Always include risk context — balance potential rewards with drawdown risks.
- Proactively reference user portfolio context if provided to deliver personalized guidance.

IMPORTANT:
- Never fabricate specific price targets or financial data you don't have.
- If you don't know something, state it honestly rather than guessing.
- Do not repeat the user's question back to them. Direct answers only.`;

  messages.unshift({ role: "system", content: baseSystemPrompt });

  // Inject skill-specific system prompt if provided (layered on top of base identity)
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
        // Fetch real-time prices for these holdings
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
        messages.unshift(portfolioContext);
      }
    }
  } catch (error) {
    console.error("Failed to load portfolio context for AI", error);
  }

  try {
    let searchContextInjected = false;

    // ── Primary: Tavily Search (finance-optimized) ──
    const tavilyKey = getEnv('TAVILY_API_KEY');
    if (tavilyKey && messages.length > 0) {
      const userMessages = messages.filter(m => m.role === "user");
      const lastUserMsg = userMessages[userMessages.length - 1];
      
      if (lastUserMsg) {
        // Construct a context-aware query using up to the last 3 user messages
        const recentUserContext = userMessages.slice(-3).map(m => m.content).join(" | ");
        const searchQuery = recentUserContext || lastUserMsg.content;

        try {
          const tavilyRes = await fetch("https://api.tavily.com/search", {
            method: "POST",
            headers: {
              Authorization: `Bearer ${tavilyKey}`,
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              query: searchQuery,
              search_depth: "basic",
              topic: "finance",
              max_results: 5,
              include_answer: true,
              time_range: "week",
            }),
            signal: AbortSignal.timeout(4000),
          });

          if (tavilyRes.ok) {
            const tavilyData = await tavilyRes.json();
            const results = tavilyData?.results || [];
            if (results.length > 0) {
              const snippets = results
                .map((r: any) => `- ${r.title}: ${r.content}`)
                .join("\n");
              const answerBlock = tavilyData.answer
                ? `\n\nAI-Generated Summary:\n${tavilyData.answer}`
                : "";
              const contextMessage: ChatMessage = {
                role: "system",
                content: `Here is some real-time financial context from the web to help answer the user's question. Do not hallucinate. If the context doesn't have the answer, just say so.\n\nContext:\n${snippets}${answerBlock}`,
              };
              messages.unshift(contextMessage);
              searchContextInjected = true;
            }
          }
        } catch (tavilyError) {
          console.error("Tavily search failed or timed out, falling back to Brave:", tavilyError);
        }
      }
    }

    // ── Fallback: Brave Search ──
    if (!searchContextInjected) {
      const braveApiKey = getEnv('BRAVE_SEARCH_API_KEY');
      const braveApiUrl = getEnv('BRAVE_SEARCH_API_URL') || "https://api.search.brave.com/res/v1/web/search";
      
      if (braveApiKey && messages.length > 0) {
        const userMessages = messages.filter(m => m.role === "user");
        const lastUserMsg = userMessages[userMessages.length - 1];
        
        if (lastUserMsg) {
          try {
            const recentUserContext = userMessages.slice(-3).map(m => m.content).join(" | ");
            const searchQuery = recentUserContext || lastUserMsg.content;

            const searchParams = new URLSearchParams({
              q: searchQuery,
              count: "5",
              freshness: "pw", // past week for fresh financial news
            });
            const searchRes = await fetch(`${braveApiUrl}?${searchParams.toString()}`, {
              headers: {
                "X-Subscription-Token": braveApiKey,
                "Accept": "application/json"
              },
              signal: AbortSignal.timeout(4000),
            });
            if (searchRes.ok) {
              const searchData = await searchRes.json();
              const results = searchData?.web?.results || [];
              if (results.length > 0) {
                const snippets = results.map((r: any) => `- ${r.title}: ${r.description}`).join("\n");
                const contextMessage: ChatMessage = {
                  role: "system",
                  content: `Here is some real-time context from the web to help answer the user's question. Do not hallucinate. If the context doesn't have the answer, just say so. \n\nContext:\n${snippets}`
                };
                messages.unshift(contextMessage);
              }
            }
          } catch (searchError) {
            console.error("Brave search failed or timed out:", searchError);
          }
        }
      }
    }

    const res = await fetch(NVIDIA_API_URL, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: typeof payload?.temperature === "number" ? payload.temperature : 0.2,
        max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 2048,
        stream: false,
      }),
      signal: AbortSignal.timeout(45000),
    });

    const text = await res.text();
    let data: any = null;
    try {
      data = JSON.parse(text);
    } catch {
      // pass through raw text
    }

    if (!res.ok) {
      return NextResponse.json(
        { error: "NVIDIA request failed.", status: res.status, details: data ?? text },
        { status: 502 }
      );
    }

    if (data?.choices?.[0]?.message?.content) {
      let content: string = data.choices[0].message.content;
      // Strip reasoning tags if present e.g. <think>...</think>
      content = content.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
      data.choices[0].message.content = content;
    }

    return NextResponse.json(data ?? { raw: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
