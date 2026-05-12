import type { Dashboard, NewsItem, Portfolio, Skill } from "@/lib/types";

const marketImage =
  "data:image/svg+xml;utf8," +
  encodeURIComponent(`
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="260" viewBox="0 0 640 260">
  <defs>
    <linearGradient id="g" x1="0" x2="1" y1="0" y2="1">
      <stop stop-color="#0A0F1C"/>
      <stop offset=".48" stop-color="#143E4D"/>
      <stop offset="1" stop-color="#101524"/>
    </linearGradient>
    <radialGradient id="r" cx=".7" cy=".22" r=".75">
      <stop stop-color="#00D4FF" stop-opacity=".46"/>
      <stop offset="1" stop-color="#00D4FF" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <rect width="640" height="260" fill="url(#g)"/>
  <rect width="640" height="260" fill="url(#r)"/>
  <path d="M28 196C98 112 138 153 202 112C274 66 332 162 410 91C462 44 520 55 614 21" stroke="#00D4FF" stroke-width="6" fill="none" stroke-linecap="round"/>
  <path d="M28 219C110 184 170 211 254 169C342 125 398 185 482 142C528 119 566 117 614 103" stroke="#3DF0A4" stroke-width="3" fill="none" stroke-linecap="round" opacity=".74"/>
</svg>`);

export const skills: Skill[] = [
  {
    id: "great-company",
    title: "Is This a Great Company",
    description: "Judge if a company is worth owning long-term",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: true,
    icon: "quality"
  },
  {
    id: "buy-sell",
    title: "When to Buy and Sell",
    description: "Find smartest entry and exit levels",
    category: "Technical & Price Levels",
    mode: "Analyze",
    popular: true,
    icon: "timing"
  },
  {
    id: "headline-trade",
    title: "Turn News into Trading Ideas",
    description: "Paste headline and see which stocks move",
    category: "News & Events",
    mode: "Explore",
    popular: true,
    icon: "news"
  },
  {
    id: "investor-saying",
    title: "What Investors Are Saying",
    description: "See what investors think of a stock",
    category: "Sentiment Analysis",
    mode: "Explore",
    popular: false,
    icon: "news"
  },
  {
    id: "stock-better",
    title: "Which Stock is Better",
    description: "Compare stocks to see who wins on quality",
    category: "Comparisons",
    mode: "Analyze",
    popular: true,
    icon: "compare"
  },
  {
    id: "earnings-read",
    title: "Read Earnings Like a Pro",
    description: "Turn earnings calls into simple conviction",
    category: "Fundamental Analysis",
    mode: "Analyze",
    popular: false,
    icon: "quality"
  },
  {
    id: "macro-watch",
    title: "Macro Watch",
    description: "Connect rates, oil, dollar and equities",
    category: "News & Events",
    mode: "Explore",
    popular: false,
    icon: "news"
  }
];

export const portfolio: Portfolio = {
  value: 80.49,
  dayChange: 2.42,
  dayChangePercent: 3.1,
  riskScore: 68,
  holdings: [
    { symbol: "NVDA", name: "Nvidia", value: 26.31, shares: 0.17 },
    { symbol: "MSFT", name: "Microsoft", value: 18.72, shares: 0.04 },
    { symbol: "AAPL", name: "Apple", value: 14.38, shares: 0.06 },
    { symbol: "TSLA", name: "Tesla", value: 11.16, shares: 0.05 },
    { symbol: "CASH", name: "Cash", value: 9.92, shares: 9.92 }
  ],
  metrics: [
    { label: "Momentum", value: 74 },
    { label: "Quality", value: 82 },
    { label: "Volatility Control", value: 61 },
    { label: "Macro Resilience", value: 57 },
    { label: "AI Confidence", value: 79 }
  ],
  signals: [
    { label: "Best holding", value: "NVDA", detail: "+4.8% pulse", direction: "up" },
    { label: "Weak spot", value: "TSLA", detail: "-1.2% drift", direction: "down" },
    { label: "Diversification", value: "Good", detail: "5 assets", direction: "up" },
    { label: "Cash buffer", value: "12.3%", detail: "healthy", direction: "up" }
  ]
};

export const news: NewsItem[] = [
  {
    id: "us-fed",
    country: "US",
    topic: "Macro",
    title: "Fed speakers keep rate-cut timing open as yields settle",
    summary: "Large-cap tech held gains while small caps waited for cleaner inflation data.",
    impact: "Neutral",
    time: "18m",
    image: marketImage
  },
  {
    id: "us-ai",
    country: "US",
    topic: "AI",
    title: "Chip demand stays firm as cloud capex plans move higher",
    summary: "Semiconductor leaders saw stronger bid depth after fresh hyperscaler spending notes.",
    impact: "Positive",
    time: "42m",
    image: marketImage
  },
  {
    id: "india-it",
    country: "India",
    topic: "IT",
    title: "Nifty IT rebounds as rupee weakness improves margin outlook",
    summary: "Export-heavy software names gained with investors rotating into quality defensives.",
    impact: "Positive",
    time: "27m",
    image: marketImage
  },
  {
    id: "india-bank",
    country: "India",
    topic: "Banks",
    title: "Private banks trade mixed before credit growth updates",
    summary: "Deposit costs and margin commentary remain the key variables for the sector.",
    impact: "Neutral",
    time: "1h",
    image: marketImage
  },
  {
    id: "global-oil",
    country: "Global",
    topic: "Energy",
    title: "Oil holds near weekly high as shipping risk premium returns",
    summary: "Energy producers caught a bid while airlines and logistics names lagged.",
    impact: "Negative",
    time: "34m",
    image: marketImage
  },
  {
    id: "global-europe",
    country: "Global",
    topic: "Europe",
    title: "European cyclicals rise on improving manufacturing surprise",
    summary: "Autos, industrials and materials led the move after stronger forward orders.",
    impact: "Positive",
    time: "58m",
    image: marketImage
  },
  {
    id: "crypto-btc",
    country: "Crypto",
    topic: "Bitcoin",
    title: "Bitcoin steadies as ETF flows return after volatile week",
    summary: "Spot flow improved, but leverage remains elevated across perpetual markets.",
    impact: "Neutral",
    time: "12m",
    image: marketImage
  },
  {
    id: "crypto-sol",
    country: "Crypto",
    topic: "Solana",
    title: "Solana activity jumps with memecoin volumes back in focus",
    summary: "Network fees rose alongside risk appetite, lifting beta tokens across the chain.",
    impact: "Positive",
    time: "46m",
    image: marketImage
  }
];

export const dashboard: Dashboard = {
  fearGreed: 38,
  marketSummary: [
    "U.S. inflation surges to 3.8%; energy spike drives the move.",
    "GDP growth hums at 3.5%, keeping recession odds contained.",
    "Iran defense spending rises 50%; proxy chain risk elevated.",
    "Tech rally narrows while consumer sentiment crashes to recent low."
  ],
  trends: [
    {
      title: "Mid-Term",
      items: ["Oil risk premium", "Election market swing", "Fed hold intact"]
    },
    {
      title: "Long-Term",
      items: ["AI infrastructure boom", "Supply chain reshoring", "Energy demand squeeze"]
    }
  ],
  signals: [
    { source: "Congress", symbol: "ENTG", note: "BUY 15K", tone: "up" },
    { source: "Reddit", symbol: "DJT", note: "+42% mentions", tone: "up" },
    { source: "Insider", symbol: "ASX", note: "SELL $558K", tone: "down" },
    { source: "Super Investors", symbol: "MDLA", note: "increases weight", tone: "up" }
  ],
  events: [
    { type: "Notable", title: "U.S. midterm election cycle dynamics", date: "Mon, Apr 13" },
    { type: "Earnings", title: "CPI data and bank earnings preview", date: "Tue, Apr 14" },
    { type: "AI", title: "Infrastructure bottlenecks and chip orders", date: "Wed, Apr 15" },
    { type: "Fed", title: "FOMC minutes and rate path clues", date: "Thu, Apr 16" }
  ]
};

export const mockData = {
  skills,
  portfolio,
  news,
  dashboard
};
