import { NextResponse } from "next/server";
import type { Skill } from "@/lib/types";

const MARKETAUX_KEY = process.env['MARKETAUX_API_KEY'];

const BASE_SKILLS: Skill[] = [
  {
    id: "great-company",
    title: "Is This a Great Company",
    description: "Judge if a company is worth owning long-term",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: false,
    icon: "quality",
  },
  {
    id: "buy-sell",
    title: "When to Buy and Sell",
    description: "Find smartest entry and exit levels",
    category: "Technical & Price Levels",
    mode: "Analyze",
    popular: false,
    icon: "timing",
  },
  {
    id: "headline-trade",
    title: "Turn News into Trading Ideas",
    description: "Paste headline and see which stocks move",
    category: "News & Events",
    mode: "Explore",
    popular: false,
    icon: "news",
  },
  {
    id: "investor-saying",
    title: "What Investors Are Saying",
    description: "See what investors think of a stock",
    category: "Sentiment Analysis",
    mode: "Explore",
    popular: false,
    icon: "news",
  },
  {
    id: "stock-better",
    title: "Which Stock is Better",
    description: "Compare stocks to see who wins on quality",
    category: "Comparisons",
    mode: "Analyze",
    popular: false,
    icon: "compare",
  },
  {
    id: "earnings-read",
    title: "Read Earnings Like a Pro",
    description: "Turn earnings calls into simple conviction",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: false,
    icon: "quality",
  },
  {
    id: "macro-watch",
    title: "Macro Watch",
    description: "Connect rates, oil, dollar and equities",
    category: "News & Events",
    mode: "Explore",
    popular: false,
    icon: "news",
  },
];

function scoreFromHeadlines(headlines: string[]) {
  const scores: Record<string, number> = Object.fromEntries(BASE_SKILLS.map((skill) => [skill.id, 0]));

  for (const text of headlines) {
    const normalized = text.toLowerCase();

    if (/(inflation|fed|rates|cpi|ppi|yield|bond|macro|economy|gdp)/.test(normalized)) {
      scores["macro-watch"] += 3;
    }
    if (/(earnings|guidance|revenue|eps|quarter|results)/.test(normalized)) {
      scores["earnings-read"] += 3;
    }
    if (/(rally|selloff|breakout|support|resistance|momentum|trend|surge|plunge)/.test(normalized)) {
      scores["buy-sell"] += 2;
    }
    if (/(versus|vs\\.|compare|outperform|underperform|leader|laggard)/.test(normalized)) {
      scores["stock-better"] += 2;
    }
    if (/(headline|report|announces|deal|acquisition|merger|guidance)/.test(normalized)) {
      scores["headline-trade"] += 2;
    }
    if (/(sentiment|reddit|social|retail|forum|mentions)/.test(normalized)) {
      scores["investor-saying"] += 2;
    }
    if (/(moat|valuation|cash flow|balance sheet|margin|profitability|quality)/.test(normalized)) {
      scores["great-company"] += 2;
    }
  }

  return scores;
}

function pickPopularIds(scores: Record<string, number>) {
  return BASE_SKILLS
    .map((skill, index) => ({
      id: skill.id,
      score: scores[skill.id] ?? 0,
      index,
    }))
    .sort((a, b) => (b.score !== a.score ? b.score - a.score : a.index - b.index))
    .slice(0, 3)
    .map((item) => item.id);
}

function dayBasedPopularIds() {
  const offset = new Date().getUTCDay() % BASE_SKILLS.length;
  return [0, 1, 2].map((step) => BASE_SKILLS[(offset + step) % BASE_SKILLS.length].id);
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
    .map((row: any) => [row?.title, row?.description, row?.snippet].filter(Boolean).join(" "))
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
