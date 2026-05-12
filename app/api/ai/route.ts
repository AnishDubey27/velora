import { NextResponse } from "next/server";
import { resolveNvidiaModel } from "@/lib/nvidia";
import { createClient } from "@/utils/supabase/server";
import { cookies } from "next/headers";

const NVIDIA_API_URL =
  process.env.NVIDIA_API_URL ?? "https://integrate.api.nvidia.com/v1/chat/completions";

function getApiKey() {
  return process.env.NVIDIA_API_KEY ?? "";
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
        const holdingsText = holdings.map(h => `${h.shares} shares of ${h.symbol} at $${h.purchase_price}`).join(", ");
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
    const braveApiKey = process.env.BRAVE_SEARCH_API_KEY;
    const braveApiUrl = process.env.BRAVE_SEARCH_API_URL || "https://api.search.brave.com/res/v1/web/search";
    
    if (braveApiKey && messages.length > 0) {
      const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
      if (lastUserMsg) {
        try {
          const searchParams = new URLSearchParams({
            q: lastUserMsg.content,
            count: "5",
            freshness: "pw", // past week for fresh financial news
          });
          const searchRes = await fetch(`${braveApiUrl}?${searchParams.toString()}`, {
            headers: {
              "X-Subscription-Token": braveApiKey,
              "Accept": "application/json"
            }
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
          console.error("Brave search failed:", searchError);
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
        max_tokens: typeof payload?.max_tokens === "number" ? payload.max_tokens : 800,
        stream: false,
      }),
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

    return NextResponse.json(data ?? { raw: text });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Request failed." },
      { status: 502 }
    );
  }
}
