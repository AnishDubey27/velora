export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import { resolveNvidiaModel } from "@/lib/nvidia";
import { getEnv } from "@/lib/env";
import { tavilySearch, isTavilyConfigured } from "@/lib/tavily";

export const revalidate = 300; // Cache for 5 minutes

export async function GET(request: Request) {
  // Opt into dynamic rendering to prevent build-time static generation with missing keys
  const _url = request.url;
  const marketauxKey = getEnv('MARKETAUX_API_KEY');
  const nvidiaKey = getEnv('NVIDIA_API_KEY');

  if (!marketauxKey || !nvidiaKey) {
    return NextResponse.json(
      { title: "Market API Keys Missing", summary: "Please configure MarketAux and NVIDIA keys." },
      { status: 500 }
    );
  }

  try {
    let context = "";
    let tavilyAnswer = "";

    // 1. Try Tavily first for richer context
    if (isTavilyConfigured()) {
      try {
        const tavilyData = await tavilySearch({
          query: "stock market today S&P 500 NASDAQ summary major moves",
          topic: "finance",
          maxResults: 5,
          includeAnswer: true,
          timeRange: "day",
        });

        if (tavilyData.results.length > 0) {
          context = tavilyData.results.map((r) => `- ${r.title}: ${r.content}`).join("\n");
          tavilyAnswer = tavilyData.answer || "";
        }
      } catch (tavilyErr) {
        console.error("Tavily snapshot search failed, falling back to MarketAux:", tavilyErr);
      }
    }

    // 2. Fallback to MarketAux if Tavily didn't produce results
    if (!context) {
      const newsParams = new URLSearchParams({
        symbols: "NVDA,MSFT,AAPL,TSLA,SPY",
        filter_entities: "true",
        api_token: marketauxKey,
        limit: "5",
        language: "en",
        countries: "us"
      });
      
      const newsRes = await fetch(`https://api.marketaux.com/v1/news/all?${newsParams.toString()}`);
      const newsData = await newsRes.json();
      const articles = Array.isArray(newsData?.data) ? newsData.data : [];
      
      if (articles.length === 0) {
        return NextResponse.json({
          title: "Markets Quiet",
          summary: "No significant news at this moment. Waiting for new data..."
        });
      }

      context = articles.map((a: any) => `- ${a.title}: ${a.description}`).join("\n");
    }

    // 3. Synthesize with NVIDIA NIM
    const prompt = `You are a professional financial analyst. Based on the following recent news headlines, synthesize a market snapshot. Return ONLY a valid JSON object with exactly two keys: "title" (a punchy, 5-7 word headline summarizing the overall sentiment) and "summary" (a 2-sentence paragraph summarizing the key takeaways). Do not use markdown formatting like \`\`\`json.\n\n${tavilyAnswer ? `AI Summary: ${tavilyAnswer}\n\n` : ""}News:\n${context}`;

    const model = "meta/llama-3.1-8b-instruct";
    
    const aiRes = await fetch(getEnv('NVIDIA_API_URL') ?? "https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${nvidiaKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: prompt }],
        temperature: 0.2,
        max_tokens: 150,
      })
    });

    if (!aiRes.ok) {
      throw new Error(`NVIDIA API failed: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const responseText = aiData?.choices?.[0]?.message?.content || "";
    
    // Clean up potential markdown formatting
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    
    let parsed: any;
    try {
      parsed = JSON.parse(cleanedText);
    } catch {
      // Fallback if parsing fails
      parsed = {
        title: "Markets Reacting to Recent News",
        summary: cleanedText.slice(0, 150) + "..."
      };
    }

    return NextResponse.json({
      title: parsed.title || "Markets Active",
      summary: parsed.summary || "Various sectors are seeing movement today.",
      updatedAt: new Date().toISOString()
    });

  } catch (error) {
    console.error("Failed to generate market snapshot:", error);
    return NextResponse.json({
      title: "Markets Processing Data",
      summary: "Currently analyzing the latest market movements. Check back shortly."
    });
  }
}
