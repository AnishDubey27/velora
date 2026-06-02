export type NavKey = "research" | "skills" | "headlines" | "portfolio" | "dashboard" | "chat" | "reddit-trending" | "super-investors" | "congress-trading" | "insider-trading" | "super-investor-profile" | "stock-detail" | "skill-intake";

export type SkillIcon = "compare" | "timing" | "quality" | "news" | "sentiment" | "macro" | "portfolio" | "dividend" | "risk" | "ipo" | "sector" | "options" | "crypto" | "tax";

export type Skill = {
  id: string;
  title: string;
  description: string;
  category: string;
  mode: "Explore" | "Analyze";
  popular: boolean;
  icon: SkillIcon;
  inputType: "none" | "single_stock" | "two_stocks";
  inputPrompt?: string;
  systemPrompt: string;
  displayMessage: string;
  hiddenPrompt: string;
  suggestions: string[];
};

export type Holding = {
  symbol: string;
  name: string;
  value: number;
  shares: number;
};

export type PortfolioMetric = {
  label: string;
  value: number;
};

export type PortfolioSignal = {
  label: string;
  value: string;
  detail: string;
  direction: "up" | "down";
};

export type Portfolio = {
  value: number;
  dayChange: number;
  dayChangePercent: number;
  riskScore: number;
  holdings: Holding[];
  metrics: PortfolioMetric[];
  signals: PortfolioSignal[];
};

export type NewsItem = {
  id: string;
  country: "US" | "India" | "Global" | "Crypto";
  topic: string;
  title: string;
  summary: string;
  impact: "Positive" | "Neutral" | "Negative";
  time: string;
  image: string;
};

export type Dashboard = {
  fearGreed: number;
  marketSummary: string[];
  trends: {
    title: string;
    items: string[];
  }[];
  signals: {
    source: string;
    symbol: string;
    note: string;
    tone: "up" | "down";
  }[];
  events: {
    type: string;
    title: string;
    date: string;
  }[];
};

/* ─── Stock Detail Types ─── */

export type StockQuote = {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changesPercentage: number;
  dayLow: number;
  dayHigh: number;
  yearLow: number;
  yearHigh: number;
  volume: number;
  avgVolume: number;
  marketCap: number;
  pe: number;
  eps: number;
  open: number;
  previousClose: number;
  timestamp: number;
  currency?: string;
};

export type StockProfile = {
  symbol: string;
  companyName: string;
  description: string;
  sector: string;
  industry: string;
  ceo: string;
  website: string;
  image: string;
  exchange: string;
  currency: string;
  country: string;
  ipoDate: string;
  fullTimeEmployees: string;
};

export type ChartDataPoint = {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
};

export type ChartRange = "1m" | "5m" | "15m" | "1h" | "1D" | "1W" | "1M" | "YTD" | "1Y";

export type KeyStats = {
  avgVolume: number;
  marketCap: number;
  peRatio: number;
  weekRange52: string;
  eps: number;
  revenue: number;
  netIncome: number;
  beta: number;
  dividendYield: number;
  profitMargin: number;
};

export type IncomeStatementEntry = {
  date: string;
  period: string;
  revenue: number;
  netIncome: number;
  netIncomeRatio: number;
  calendarYear: string;
};

export type AnalystRating = {
  strongBuy: number;
  buy: number;
  hold: number;
  sell: number;
  strongSell: number;
  consensus: string;
};

export type EarningsEntry = {
  date: string;
  symbol: string;
  fiscalDateEnding: string;
  epsEstimated: number | null;
  epsActual: number | null;
  revenueEstimated: number | null;
  revenueActual: number | null;
  epsSurprise: number | null;
  revenueSurprise: number | null;
  updatedFromDate: string;
  fiscalPeriod: string;
};

export type InsiderTrade = {
  symbol: string;
  reportingName: string;
  transactionType: string;
  securitiesTransacted: number;
  price: number;
  transactionDate: string;
  filingDate: string;
  typeOfOwner: string;
  link: string;
};

export type StockNewsItem = {
  title: string;
  url: string;
  publishedDate: string;
  site: string;
  text: string;
  image: string;
  symbol: string;
};

export type WatchlistItem = {
  id: string;
  user_id: string;
  symbol: string;
  name: string;
  added_at: string;
};
