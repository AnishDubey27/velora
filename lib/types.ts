export type NavKey = "research" | "skills" | "headlines" | "portfolio" | "dashboard" | "chat";

export type Skill = {
  id: string;
  title: string;
  description: string;
  category: string;
  mode: "Explore" | "Analyze";
  popular: boolean;
  icon: "compare" | "timing" | "quality" | "news";
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
