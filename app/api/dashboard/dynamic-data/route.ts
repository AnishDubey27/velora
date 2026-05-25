import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour

export async function GET() {
  const nvidiaKey = process.env['NVIDIA_API_KEY'];

  if (!nvidiaKey) {
    return NextResponse.json(
      { error: "NVIDIA key missing" },
      { status: 500 }
    );
  }

  const prompt = `
Generate highly realistic, synthetic alternative market data for a financial dashboard.
Return ONLY a valid JSON object matching exactly this structure (no markdown, no backticks):
{
  "trends": {
    "midTerm": ["string", "string", "string"],
    "longTerm": ["string", "string", "string"]
  },
  "signals": {
    "congress": { "symbol": "string", "action": "BUY or SELL", "amount": "$XXK", "person": "Name • Xd" },
    "reddit": { "symbol": "string", "rankChange": "+XXX to #XX", "mentions": "XX mentions" },
    "insider": { "symbol": "string", "action": "BUY or SELL", "price": "$X.XX", "person": "Name • Xd" },
    "superInvestors": { "symbol": "string", "action": "X investors added", "firm": "Firm Name..." }
  }
}
Example trend strings: "Sector Rotation", "ETF Liquidity Surge", "AI Infrastructure Boom".
Example symbols: NVDA, TSLA, AAPL, MSFT, PLUG, TCNNF, RDGL.
Make the data look like real, current financial market activity.
`;

  try {
    const aiRes = await fetch(process.env['NVIDIA_API_URL'] ?? "https://integrate.api.nvidia.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${nvidiaKey}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "meta/llama-3.1-8b-instruct",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        max_tokens: 500,
      })
    });

    if (!aiRes.ok) {
      throw new Error(`NVIDIA API failed: ${aiRes.status}`);
    }

    const aiData = await aiRes.json();
    const responseText = aiData?.choices?.[0]?.message?.content || "";
    
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    const parsed = JSON.parse(cleanedText);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Failed to generate dynamic dashboard data:", error);
    // Fallback data
    return NextResponse.json({
      trends: {
        midTerm: ["Sector Rotation", "ETF Liquidity Surge", "Mid-Cap Strength"],
        longTerm: ["AI Infrastructure Boom", "Friend-Shoring Rise", "Fiscal Dominance"]
      },
      signals: {
        congress: { symbol: "TCNNF", action: "SELL", amount: "$50K", person: "Greg S. • 6d" },
        reddit: { symbol: "PLUG", rankChange: "+331 to #15", mentions: "72 mentions" },
        insider: { symbol: "RDGL", action: "BUY", price: "$0.06", person: "Korenko K. • 1d" },
        superInvestors: { symbol: "MSFT", action: "3 investors added", firm: "Lountzis Asset Mana..." }
      }
    });
  }
}
