export const dynamic = 'force-dynamic';
import { NextResponse } from "next/server";
import type { Skill } from "@/lib/types";
import { getEnv } from "@/lib/env";

const MARKETAUX_KEY = getEnv('MARKETAUX_API_KEY');

const BASE_SKILLS: Skill[] = [
  {
    id: "great-company",
    title: "Is This a Great Company?",
    description: "Judge if a company is worth owning long-term",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: false,
    icon: "quality",
    inputType: "single_stock",
    inputPrompt: "Which company should I analyze?",
    systemPrompt:
      "You are a professional equity research analyst at Velora. You evaluate companies based on competitive moats, management quality, financial health, and long-term growth potential. Be data-driven and cite specific metrics. Structure your analysis clearly with sections.",
    displayMessage: "Is {symbol} a great company?",
    hiddenPrompt:
      "Analyze {symbol} as a long-term investment. Evaluate its competitive moat, management quality, financial health (balance sheet, cash flows, margins), and growth potential. Give me a clear verdict: is this a great company to own? Be specific with numbers and reasoning.",
    suggestions: [
      "Check the moat",
      "Revenue growth trend",
      "Compare to peers",
      "Any red flags?",
    ],
  },
  {
    id: "buy-sell",
    title: "When to Buy & Sell",
    description: "Find smart entry and exit levels",
    category: "Technical & Price Levels",
    mode: "Analyze",
    popular: false,
    icon: "timing",
    inputType: "single_stock",
    inputPrompt: "Which stock are you looking at?",
    systemPrompt:
      "You are a precise technical analyst at Velora. You use support/resistance levels, moving averages, RSI, MACD, and volume analysis to identify optimal entry and exit points. Speak in clear trading language with specific price levels.",
    displayMessage: "Find buy & sell levels for {symbol}",
    hiddenPrompt:
      "Analyze {symbol} from a technical perspective. Identify key support and resistance levels, current trend direction, RSI reading, moving average positions, and volume patterns. Give me specific price levels for entry (buy) and exit (sell) with reasoning.",
    suggestions: [
      "Key support levels",
      "Resistance zones",
      "RSI analysis",
      "Best entry point?",
    ],
  },
  {
    id: "headline-trade",
    title: "News → Trade Ideas",
    description: "Turn headlines into actionable trades",
    category: "News & Events",
    mode: "Explore",
    popular: false,
    icon: "news",
    inputType: "single_stock",
    inputPrompt: "Which stock or sector is in the news?",
    systemPrompt:
      "You are a news-to-trade strategist at Velora. You excel at connecting breaking news and headlines to specific, actionable trading opportunities. You think about second-order effects and identify both obvious and non-obvious plays.",
    displayMessage: "Trade ideas from {symbol} news",
    hiddenPrompt:
      "Look at the latest news and developments around {symbol}. Identify actionable trading ideas based on recent headlines. Consider direct impact, second-order effects, sector peers that might move, and both bullish and bearish scenarios. Give specific trade setups.",
    suggestions: [
      "Which sectors benefit?",
      "Short-term plays",
      "Hedging ideas",
      "Historical parallel?",
    ],
  },
  {
    id: "investor-saying",
    title: "What Investors Are Saying",
    description: "Track sentiment and social buzz",
    category: "Sentiment Analysis",
    mode: "Explore",
    popular: false,
    icon: "sentiment",
    inputType: "single_stock",
    inputPrompt: "Which stock do you want sentiment for?",
    systemPrompt:
      "You are a sentiment and social analyst at Velora. You track retail investor sentiment from Reddit, social media, institutional positioning, and short interest data. You're plugged into the pulse of the market. Casual but insightful tone.",
    displayMessage: "What are investors saying about {symbol}?",
    hiddenPrompt:
      "Analyze the current investor sentiment around {symbol}. Cover retail sentiment (Reddit/social media buzz), institutional positioning, short interest levels, and any notable insider activity. Is the crowd bullish, bearish, or divided? What's the smart money doing?",
    suggestions: [
      "Reddit sentiment",
      "Institutional moves",
      "Short interest",
      "Insider activity",
    ],
  },
  {
    id: "stock-better",
    title: "Which Stock Is Better?",
    description: "Compare two stocks head-to-head",
    category: "Comparisons",
    mode: "Analyze",
    popular: false,
    icon: "compare",
    inputType: "two_stocks",
    inputPrompt: "Pick two stocks to compare",
    systemPrompt:
      "You are a comparative equity analyst at Velora. You provide fair, structured side-by-side analysis of two companies. Use tables where helpful. Be balanced and let the data speak, but give a clear verdict at the end.",
    displayMessage: "{symbol1} vs {symbol2} — which is better?",
    hiddenPrompt:
      "Compare {symbol1} and {symbol2} head-to-head. Evaluate both on: valuation (P/E, P/S, PEG), growth (revenue, earnings), profitability (margins), financial health (debt, cash flow), and momentum. Present a structured comparison and give a clear verdict on which is the better investment right now and why.",
    suggestions: [
      "Compare valuations",
      "Growth rates",
      "Risk profiles",
      "Dividend comparison",
    ],
  },
  {
    id: "earnings-read",
    title: "Read Earnings Like a Pro",
    description: "Break down earnings into simple insights",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: false,
    icon: "quality",
    inputType: "single_stock",
    inputPrompt: "Which company's earnings should I break down?",
    systemPrompt:
      "You are an earnings analysis specialist at Velora. You translate complex earnings reports into plain-language insights that any investor can act on. Focus on what actually matters: beats/misses, guidance changes, and management tone.",
    displayMessage: "Break down {symbol}'s earnings",
    hiddenPrompt:
      "Break down {symbol}'s most recent earnings report. Cover: did they beat or miss on revenue and EPS? What was the guidance? Any notable changes in margins, segments, or outlook? What is the market reaction telling us? Translate everything into simple, actionable language.",
    suggestions: [
      "Revenue surprise?",
      "Guidance outlook",
      "Margin trends",
      "Management tone",
    ],
  },
  {
    id: "macro-watch",
    title: "Macro Watch",
    description: "Connect rates, oil, dollar and equities",
    category: "Macro & Economy",
    mode: "Explore",
    popular: false,
    icon: "macro",
    inputType: "none",
    systemPrompt:
      "You are a macro economist and market strategist at Velora. You connect the dots between interest rates, inflation, oil prices, the dollar, and their impact on equity markets. Speak with authority but make complex concepts accessible.",
    displayMessage: "What's happening in the macro environment?",
    hiddenPrompt:
      "Give me a comprehensive macro overview right now. Cover: current interest rate environment and Fed policy direction, inflation trends, oil and commodity prices, US dollar strength, bond market signals, and how all of this connects to equity markets. What should investors be watching most closely?",
    suggestions: [
      "Impact on tech?",
      "Bond market signal",
      "Currency effect",
      "Recession risk?",
    ],
  },
  {
    id: "portfolio-checkup",
    title: "Portfolio Health Check",
    description: "Get a full checkup on your holdings",
    category: "Portfolio",
    mode: "Analyze",
    popular: false,
    icon: "portfolio",
    inputType: "none",
    systemPrompt:
      "You are a personal financial advisor at Velora. You analyze the user's actual portfolio holdings with care and precision. Use a warm, professional tone. Say 'your portfolio' and 'your holdings'. Be honest about risks but constructive about improvements.",
    displayMessage: "Run a health check on my portfolio",
    hiddenPrompt:
      "Analyze my entire portfolio. Look at my current holdings, assess diversification (sector, geography, market cap), identify concentration risks, evaluate the overall risk/reward profile, and suggest specific improvements. Be specific about what's working well and what needs attention.",
    suggestions: [
      "Diversification score",
      "Risk exposure",
      "Rebalance suggestions",
      "Sector allocation",
    ],
  },
  {
    id: "dividend-hunter",
    title: "Dividend Hunter",
    description: "Find and analyze dividend opportunities",
    category: "Income Investing",
    mode: "Analyze",
    popular: false,
    icon: "dividend",
    inputType: "single_stock",
    inputPrompt: "Which stock do you want dividend analysis for?",
    systemPrompt:
      "You are an income investing expert at Velora. You specialize in dividend analysis — yield sustainability, payout ratios, dividend growth rates, and dividend safety. You help investors build reliable income streams.",
    displayMessage: "Analyze {symbol}'s dividend profile",
    hiddenPrompt:
      "Analyze {symbol} as a dividend investment. Cover: current yield, payout ratio, dividend growth history and rate, free cash flow coverage, and dividend safety score. How does it compare to sector peers? Is this a reliable income stock? Any risks to the dividend?",
    suggestions: [
      "Yield vs growth",
      "Payout safety",
      "Dividend history",
      "Better alternatives?",
    ],
  },
  {
    id: "risk-radar",
    title: "Risk Radar",
    description: "Spot risks before they hit your portfolio",
    category: "Risk Management",
    mode: "Analyze",
    popular: false,
    icon: "risk",
    inputType: "single_stock",
    inputPrompt: "Which stock do you want a risk check on?",
    systemPrompt:
      "You are a risk management specialist at Velora. You identify and quantify investment risks — volatility, drawdown potential, correlation risk, and tail risks. You're the voice of caution that keeps portfolios safe.",
    displayMessage: "Risk check on {symbol}",
    hiddenPrompt:
      "Run a comprehensive risk analysis on {symbol}. Cover: historical volatility, maximum drawdown, beta, correlation to major indices, sector-specific risks, and any upcoming catalysts that could cause sharp moves. How should I size this position? What are the worst-case scenarios?",
    suggestions: [
      "Volatility check",
      "Drawdown history",
      "Position sizing",
      "Tail risks?",
    ],
  },
  {
    id: "ipo-scanner",
    title: "IPO & New Listings",
    description: "Track upcoming and recent IPOs",
    category: "Events & IPOs",
    mode: "Explore",
    popular: false,
    icon: "ipo",
    inputType: "none",
    systemPrompt:
      "You are an IPO specialist at Velora. You track upcoming listings, analyze recent IPO performance, and help investors decide whether to participate. You understand lock-up periods, pricing dynamics, and first-day trading patterns.",
    displayMessage: "What's happening in the IPO market?",
    hiddenPrompt:
      "Give me a current overview of the IPO market. Cover: notable upcoming IPOs, recent IPO performance (winners and losers), the overall IPO market environment (is it hot or cold?), and general guidance on IPO investing right now. Include any major lock-up expirations coming up.",
    suggestions: [
      "Upcoming IPOs",
      "Recent performance",
      "Lock-up expiry dates",
      "Should I buy?",
    ],
  },
  {
    id: "sector-rotation",
    title: "Sector Rotation",
    description: "Find which sectors are heating up or cooling down",
    category: "Sector Analysis",
    mode: "Explore",
    popular: false,
    icon: "sector",
    inputType: "none",
    systemPrompt:
      "You are a sector rotation strategist at Velora. You identify which sectors are gaining momentum and which are losing steam based on relative strength, fund flows, economic cycle positioning, and technical signals.",
    displayMessage: "Where is the sector rotation heading?",
    hiddenPrompt:
      "Analyze current sector rotation dynamics. Which sectors are showing the strongest momentum right now? Which are lagging? Where are institutional fund flows going? How does the current economic cycle phase affect sector selection? Give me specific sector ETFs to watch and any rotation trades to consider.",
    suggestions: [
      "Hot sectors now",
      "Lagging sectors",
      "Rotation signals",
      "Best sector ETFs",
    ],
  },
  {
    id: "options-101",
    title: "Options Simplified",
    description: "Learn and plan options strategies",
    category: "Options & Derivatives",
    mode: "Analyze",
    popular: false,
    icon: "options",
    inputType: "single_stock",
    inputPrompt: "Which stock for options analysis?",
    systemPrompt:
      "You are an options educator and strategist at Velora. You explain options concepts in simple terms with real-world analogies. When suggesting strategies, you always consider the user's risk tolerance and explain max profit, max loss, and breakeven clearly.",
    displayMessage: "Options analysis for {symbol}",
    hiddenPrompt:
      "Help me understand options strategies for {symbol}. What's the current implied volatility telling us? Suggest 2-3 options strategies appropriate for the current market conditions (e.g., covered calls, puts, spreads). For each strategy, explain: what it does, max profit, max loss, breakeven, and when to use it. Keep explanations simple.",
    suggestions: [
      "Call vs Put basics",
      "Covered call ideas",
      "Implied volatility",
      "Best strategy for me",
    ],
  },
  {
    id: "crypto-pulse",
    title: "Crypto Pulse",
    description: "Bitcoin, altcoins, and DeFi trends",
    category: "Crypto & Digital Assets",
    mode: "Explore",
    popular: false,
    icon: "crypto",
    inputType: "none",
    systemPrompt:
      "You are a crypto market analyst at Velora. You cover Bitcoin, major altcoins, DeFi protocols, and regulatory developments. You're knowledgeable but not blindly bullish — you give balanced, data-driven crypto analysis.",
    displayMessage: "What's the pulse of crypto right now?",
    hiddenPrompt:
      "Give me a comprehensive crypto market overview. Cover: Bitcoin's current trend and key levels, major altcoin performance, DeFi sector developments, any regulatory news, and overall market sentiment. What should crypto investors be paying attention to right now? Include specific levels and data points.",
    suggestions: [
      "Bitcoin outlook",
      "Altcoin momentum",
      "DeFi trends",
      "Regulatory news",
    ],
  },
  {
    id: "tax-harvest",
    title: "Tax-Loss Harvesting",
    description: "Find tax-saving opportunities in your portfolio",
    category: "Tax & Compliance",
    mode: "Analyze",
    popular: false,
    icon: "tax",
    inputType: "none",
    systemPrompt:
      "You are a tax-aware investment advisor at Velora. You help investors minimize tax liability through strategic loss harvesting while maintaining portfolio exposure. You explain wash sale rules clearly and identify actionable harvest candidates.",
    displayMessage: "Find tax-loss harvesting opportunities",
    hiddenPrompt:
      "Analyze my portfolio for tax-loss harvesting opportunities. Identify any positions currently at a loss that could be harvested. For each candidate, explain: the current loss amount, wash sale rule implications, and suggest alternative securities to maintain market exposure while harvesting the loss. Also explain the 30-day wash sale rule simply.",
    suggestions: [
      "Losing positions",
      "Wash sale rules",
      "Harvest candidates",
      "Tax lot strategy",
    ],
  },
];

function scoreFromHeadlines(headlines: string[]) {
  const scores: Record<string, number> = Object.fromEntries(
    BASE_SKILLS.map((skill) => [skill.id, 0])
  );

  for (const text of headlines) {
    const normalized = text.toLowerCase();

    if (
      /(inflation|fed|rates|cpi|ppi|yield|bond|macro|economy|gdp)/.test(
        normalized
      )
    ) {
      scores["macro-watch"] += 3;
    }
    if (
      /(earnings|guidance|revenue|eps|quarter|results)/.test(normalized)
    ) {
      scores["earnings-read"] += 3;
    }
    if (
      /(rally|selloff|breakout|support|resistance|momentum|trend|surge|plunge)/.test(
        normalized
      )
    ) {
      scores["buy-sell"] += 2;
    }
    if (
      /(versus|vs\.|compare|outperform|underperform|leader|laggard)/.test(
        normalized
      )
    ) {
      scores["stock-better"] += 2;
    }
    if (
      /(headline|report|announces|deal|acquisition|merger|guidance)/.test(
        normalized
      )
    ) {
      scores["headline-trade"] += 2;
    }
    if (
      /(sentiment|reddit|social|retail|forum|mentions)/.test(normalized)
    ) {
      scores["investor-saying"] += 2;
    }
    if (
      /(moat|valuation|cash flow|balance sheet|margin|profitability|quality)/.test(
        normalized
      )
    ) {
      scores["great-company"] += 2;
    }
    if (
      /(portfolio|holdings|diversif|allocation|rebalance|overweight|underweight)/.test(
        normalized
      )
    ) {
      scores["portfolio-checkup"] += 2;
    }
    if (
      /(dividend|yield|payout|income|distribution)/.test(normalized)
    ) {
      scores["dividend-hunter"] += 2;
    }
    if (
      /(risk|volatility|drawdown|hedge|downside|crash|correction|bear)/.test(
        normalized
      )
    ) {
      scores["risk-radar"] += 2;
    }
    if (
      /(ipo|listing|debut|public offering|spac|direct listing)/.test(
        normalized
      )
    ) {
      scores["ipo-scanner"] += 3;
    }
    if (
      /(sector|rotation|cyclical|defensive|energy|tech sector|healthcare sector)/.test(
        normalized
      )
    ) {
      scores["sector-rotation"] += 2;
    }
    if (
      /(options|calls|puts|strike|implied volatility|premium|expiration|straddle|spread)/.test(
        normalized
      )
    ) {
      scores["options-101"] += 2;
    }
    if (
      /(crypto|bitcoin|btc|ethereum|eth|altcoin|defi|blockchain|token)/.test(
        normalized
      )
    ) {
      scores["crypto-pulse"] += 3;
    }
    if (
      /(tax|harvest|capital gains|capital loss|wash sale|tax-loss)/.test(
        normalized
      )
    ) {
      scores["tax-harvest"] += 2;
    }
  }

  return scores;
}

function pickPopularIds(scores: Record<string, number>) {
  return BASE_SKILLS.map((skill, index) => ({
    id: skill.id,
    score: scores[skill.id] ?? 0,
    index,
  }))
    .sort((a, b) =>
      b.score !== a.score ? b.score - a.score : a.index - b.index
    )
    .slice(0, 3)
    .map((item) => item.id);
}

function dayBasedPopularIds() {
  const offset = new Date().getUTCDay() % BASE_SKILLS.length;
  return [0, 1, 2].map(
    (step) => BASE_SKILLS[(offset + step) % BASE_SKILLS.length].id
  );
}

function withPopularFlags(popularIds: string[]) {
  const set = new Set(popularIds);
  return BASE_SKILLS.map((skill) => ({
    ...skill,
    popular: set.has(skill.id),
  }));
}

async function fetchHeadlines() {
  if (!MARKETAUX_KEY) return [];

  const params = new URLSearchParams({
    symbols: "SPY,NVDA,MSFT,AAPL,TSLA,BTC,ETH",
    filter_entities: "true",
    language: "en",
    limit: "20",
    api_token: MARKETAUX_KEY,
  });

  const url = `https://api.marketaux.com/v1/news/all?${params.toString()}`;
  const response = await fetch(url, { cache: "no-store" });
  if (!response.ok) return [];

  const data = await response.json();
  const rows = Array.isArray(data?.data) ? data.data : [];
  return rows
    .map((row: any) =>
      [row?.title, row?.description, row?.snippet]
        .filter(Boolean)
        .join(" ")
    )
    .filter((value: string) => value.length > 0);
}

export async function GET() {
  try {
    const headlines = await fetchHeadlines();
    if (headlines.length === 0) {
      return NextResponse.json(withPopularFlags(dayBasedPopularIds()));
    }

    const scores = scoreFromHeadlines(headlines);
    const popularIds = pickPopularIds(scores);
    return NextResponse.json(withPopularFlags(popularIds));
  } catch {
    return NextResponse.json(withPopularFlags(dayBasedPopularIds()));
  }
}
