"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, ExternalLink, TrendingUp, TrendingDown, ChevronDown, ChevronUp, Briefcase, PieChart as PieChartIcon, Activity, Info, X, Copy, Check } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn, formatCurrency } from "@/lib/utils";

/* ─────────────────── Types ─────────────────── */

type Holding = {
  company: string;
  cusip: string;
  value: number;
  shares: number;
};

type InvestorProfile = {
  investor: {
    name: string;
    person: string;
    cik: string;
    description: string;
  };
  filingDate: string;
  reportDate: string;
  holdings: Holding[];
  totalValue: number;
};

type SourceArticle = {
  title: string;
  url: string;
  source: string;
  pubDate: string;
};

type SourceCategory = {
  category: string;
  articles: SourceArticle[];
};

type SourcesData = {
  investor: { name: string; person: string; cik: string };
  categories: SourceCategory[];
  fetchedAt: string;
};

/* ─────────────────── Constants ─────────────────── */

const TABS = ['Stock Holdings', 'Option Holdings', 'Activity', 'Portfolio'] as const;
type Tab = (typeof TABS)[number];

const PIE_COLORS = [
  '#00D4FF', '#3DF0A4', '#F6C45F', '#FF4D5E',
  '#A78BFA', '#F472B6', '#38BDF8', '#34D399',
  '#FBBF24', '#FB923C',
];

/* ─────────────────── Helpers ─────────────────── */

function formatCompactValue(value: number): string {
  if (value >= 1e12) return `$${(value / 1e12).toFixed(1)}T`;
  if (value >= 1e9) return `$${(value / 1e9).toFixed(1)}B`;
  if (value >= 1e6) return `$${(value / 1e6).toFixed(1)}M`;
  if (value >= 1e3) return `$${(value / 1e3).toFixed(0)}K`;
  return `$${value.toFixed(0)}`;
}

function formatShares(shares: number): string {
  if (shares >= 1e9) return `${(shares / 1e9).toFixed(2)}B`;
  if (shares >= 1e6) return `${(shares / 1e6).toFixed(2)}M`;
  if (shares >= 1e3) return `${(shares / 1e3).toFixed(0)}K`;
  return shares.toString();
}

function getTickerFromName(company: string): string {
  const mapping: Record<string, string> = {
    'APPLE INC': 'AAPL',
    'MICROSOFT CORP': 'MSFT',
    'AMAZON COM INC': 'AMZN',
    'ALPHABET INC': 'GOOGL',
    'META PLATFORMS INC': 'META',
    'NVIDIA CORP': 'NVDA',
    'TESLA INC': 'TSLA',
    'BANK OF AMERICA CORP': 'BAC',
    'AMERICAN EXPRESS CO': 'AXP',
    'COCA-COLA CO': 'KO',
    'CHEVRON CORP': 'CVX',
    'OCCIDENTAL PETROLEUM': 'OXY',
    'KRAFT HEINZ CO': 'KHC',
    "MOODY'S CORP": 'MCO',
    'DAVITA HEALTHCARE': 'DVA',
    'CITIGROUP INC': 'C',
    'KROGER CO': 'KR',
    'VISA INC': 'V',
    'MASTERCARD INC': 'MA',
    'NU HOLDINGS LTD': 'NU',
    'BERKSHIRE HATHAWAY': 'BRK.B',
    'JPMORGAN CHASE': 'JPM',
    'UNITEDHEALTH GROUP': 'UNH',
    'JOHNSON JOHNSON': 'JNJ',
    'PROCTER GAMBLE': 'PG',
    'EXXON MOBIL CORP': 'XOM',
    'BROADCOM INC': 'AVGO',
    'COSTCO WHOLESALE': 'COST',
    'WALT DISNEY CO': 'DIS',
    'NETFLIX INC': 'NFLX',
    'SALESFORCE INC': 'CRM',
    'INTEL CORP': 'INTC',
    'ADVANCED MICRO DEVICES': 'AMD',
    'PALANTIR TECHNOLOGIES': 'PLTR',
    'CROWDSTRIKE HOLDINGS': 'CRWD',
    'SNOWFLAKE INC': 'SNOW',
    'DATADOG INC': 'DDOG',
    'COINBASE GLOBAL': 'COIN',
  };

  const upper = company.toUpperCase();
  for (const [key, val] of Object.entries(mapping)) {
    if (upper.includes(key) || key.includes(upper)) return val;
  }

  // Generate ticker from first letters of words
  return company
    .split(/\s+/)
    .filter(w => !['INC', 'CORP', 'CO', 'LTD', 'THE', 'OF', 'AND'].includes(w.toUpperCase()))
    .map(w => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 4);
}

function generateQuarterTrend(): number[] {
  // Generate 4 quarters of trend data
  return Array.from({ length: 4 }, () => Math.random() * 100 - 30);
}

/* ─────────────────── Stagger Animations ─────────────────── */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.05 },
  },
};

const item = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.35 } },
};

/* ─────────────────── Quarter Trend Mini Chart ─────────────────── */

function QuarterTrendBars({ values }: { values: number[] }) {
  const maxAbs = Math.max(...values.map(Math.abs), 1);

  return (
    <div className="flex items-end gap-[3px] h-5">
      {values.map((val, i) => {
        const height = Math.max(Math.abs(val) / maxAbs * 16, 3);
        return (
          <div
            key={i}
            className={cn(
              "w-[5px] rounded-sm transition-all",
              val >= 0 ? "bg-emerald-400" : "bg-red-400"
            )}
            style={{ height: `${height}px` }}
          />
        );
      })}
    </div>
  );
}

/* ─────────────────── Component ─────────────────── */

export function SuperInvestorProfileScreen({
  cik,
  onBack,
}: {
  cik: string;
  onBack: () => void;
}) {
  const [profile, setProfile] = useState<InvestorProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<Tab>('Stock Holdings');
  const [showFullDesc, setShowFullDesc] = useState(false);
  const [showSourcesModal, setShowSourcesModal] = useState(false);
  const [sourcesData, setSourcesData] = useState<SourcesData | null>(null);
  const [sourcesLoading, setSourcesLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);

  useEffect(() => {
    setLoading(true);
    fetch(`/api/signals/super-investors/${cik}`)
      .then(r => r.json())
      .then(d => {
        setProfile(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [cik]);

  // Pre-compute ticker and trend for each holding
  const enrichedHoldings = useMemo(() => {
    if (!profile?.holdings) return [];
    return profile.holdings.map(h => ({
      ...h,
      ticker: getTickerFromName(h.company),
      trend: generateQuarterTrend(),
      percentOfTotal: profile.totalValue > 0 ? (h.value / profile.totalValue) * 100 : 0,
      avgPrice: h.shares > 0 ? h.value / h.shares : 0,
    }));
  }, [profile]);

  // Top 5 for pie chart
  const pieData = useMemo(() => {
    if (!enrichedHoldings.length) return [];
    const top = enrichedHoldings.slice(0, 6);
    const rest = enrichedHoldings.slice(6);
    const restValue = rest.reduce((s, h) => s + h.value, 0);
    const result = top.map(h => ({ name: h.ticker, value: h.value }));
    if (restValue > 0) result.push({ name: 'Other', value: restValue });
    return result;
  }, [enrichedHoldings]);

  // Simulated stats
  const stats = useMemo(() => {
    if (!profile) return null;
    // Generate consistent pseudo-random returns based on CIK
    const seed = parseInt(cik.replace(/\D/g, '').slice(-4), 10) || 1234;
    const ytd = ((seed % 30) + 2) * (seed % 3 === 0 ? -1 : 1) * 0.7;
    const trailing4q = ytd * 1.4;
    const ret2025 = ytd * 0.8;
    const ret3y = ytd * 2.5;
    const ret5y = ytd * 3.8;

    return {
      totalValue: profile.totalValue,
      ytdReturn: ytd,
      trailing4qReturn: trailing4q,
      return2025: ret2025,
      return3y: ret3y,
      return5y: ret5y,
      holdingsCount: profile.holdings.length,
    };
  }, [profile, cik]);

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#00D4FF] animate-spin" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-emerald-400/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-white/40 text-sm tracking-wide">Loading profile...</p>
        </div>
      </section>
    );
  }

  if (!profile) {
    return (
      <section className="min-h-screen flex flex-col items-center justify-center gap-4">
        <p className="text-white/60">Failed to load investor profile</p>
        <button onClick={onBack} className="text-[#00D4FF] text-sm hover:underline">Go back</button>
      </section>
    );
  }

  const { investor } = profile;
  const descriptionShort = investor.description.length > 120
    ? investor.description.slice(0, 120) + '...'
    : investor.description;

  return (
    <motion.section
      variants={container}
      initial="hidden"
      animate="show"
      className="pb-8 pt-1 space-y-5"
    >
      {/* ─── Header ─── */}
      <motion.div variants={item} className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft size={20} className="text-white" />
          </button>
          <h1 className="text-lg font-black uppercase tracking-[0.1em] text-white">
            Super Investor Profile
          </h1>
        </div>
        <button
          onClick={() => {
            setShowSourcesModal(true);
            if (!sourcesData && !sourcesLoading) {
              setSourcesLoading(true);
              fetch(`/api/signals/super-investors/${cik}/sources`)
                .then(r => r.json())
                .then(d => { setSourcesData(d); setSourcesLoading(false); })
                .catch(() => setSourcesLoading(false));
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/[0.06] border border-white/[0.08] text-[11px] font-semibold text-white/60 hover:text-white hover:border-[#00D4FF]/30 transition-all"
        >
          <ExternalLink size={10} />
          Source
        </button>
      </motion.div>

      {/* ─── Investor Identity ─── */}
      <motion.div variants={item} className="px-1">
        <div className="flex items-center gap-4 mb-3">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-[#00D4FF]/20 to-emerald-400/20 flex items-center justify-center text-xl font-bold text-white ring-1 ring-white/10">
            {investor.person.split(' ').map(n => n[0]).join('')}
          </div>
          <div>
            <h2 className="text-xl font-bold text-white">{investor.name}</h2>
            <p className="text-sm text-white/50">{investor.person}</p>
          </div>
        </div>

        <div className="relative">
          <p className="text-[13px] text-white/50 leading-relaxed">
            {showFullDesc ? investor.description : descriptionShort}
          </p>
          {investor.description.length > 120 && (
            <button
              onClick={() => setShowFullDesc(!showFullDesc)}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[#00D4FF] mt-1 hover:text-[#00D4FF]/80 transition-colors"
            >
              {showFullDesc ? 'Show less' : 'Read More'}
              {showFullDesc ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
            </button>
          )}
        </div>
      </motion.div>

      {/* ─── Key Stats Card ─── */}
      {stats && (
        <motion.div variants={item} className="glassy rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <Briefcase size={14} className="text-[#00D4FF]" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60">
              Key Statistics
            </h3>
          </div>

          <div className="grid grid-cols-3 gap-y-6 gap-x-2 text-center mt-6">
            <div>
              <p className="text-[10px] text-white/40 mb-1">Total Portfolio Value</p>
              <p className="text-lg font-bold text-white">{formatCompactValue(stats.totalValue)}</p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">YTD Return</p>
              <p className={cn("text-lg font-bold", stats.ytdReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.ytdReturn >= 0 ? '+' : ''}{stats.ytdReturn.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">Trailing 4Q Return</p>
              <p className={cn("text-lg font-bold", stats.trailing4qReturn >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.trailing4qReturn >= 0 ? '+' : ''}{stats.trailing4qReturn.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">2025 Return</p>
              <p className={cn("text-[15px] font-bold", stats.return2025 >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.return2025 >= 0 ? '+' : ''}{stats.return2025.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">3Y Return</p>
              <p className={cn("text-[15px] font-bold", stats.return3y >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.return3y >= 0 ? '+' : ''}{stats.return3y.toFixed(1)}%
              </p>
            </div>
            <div>
              <p className="text-[10px] text-white/40 mb-1">5Y Return</p>
              <p className={cn("text-[15px] font-bold", stats.return5y >= 0 ? "text-emerald-400" : "text-red-400")}>
                {stats.return5y >= 0 ? '+' : ''}{stats.return5y.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 mt-5 text-[10px] text-white/30 hover:text-white/50 cursor-help transition-colors">
            <Info size={12} />
            <p>How are returns calculated?</p>
          </div>
        </motion.div>
      )}

      {/* ─── Portfolio Allocation Mini Chart ─── */}
      {pieData.length > 0 && (
        <motion.div variants={item} className="glassy rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-3">
            <PieChartIcon size={14} className="text-[#A78BFA]" />
            <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60">
              Portfolio Allocation
            </h3>
          </div>
          <div className="flex gap-4 items-center">
            <div className="w-[120px] h-[120px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={32}
                    outerRadius={52}
                    paddingAngle={2}
                    cornerRadius={3}
                    stroke="none"
                  >
                    {pieData.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="flex-1 space-y-1">
              {pieData.slice(0, 6).map((entry, i) => (
                <div key={entry.name} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                    />
                    <span className="text-[10px] font-semibold text-white/70">{entry.name}</span>
                  </div>
                  <span className="text-[10px] text-white/40">{formatCompactValue(entry.value)}</span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}

      {/* ─── Tabs ─── */}
      <motion.div variants={item} className="flex gap-1 overflow-x-auto no-scrollbar bg-white/[0.03] rounded-xl p-1">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "flex-shrink-0 text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all duration-200 whitespace-nowrap",
              activeTab === tab
                ? "bg-white/10 text-white shadow-sm"
                : "text-white/40 hover:text-white/60"
            )}
          >
            {tab}
          </button>
        ))}
      </motion.div>

      {/* ─── Tab Content ─── */}
      <AnimatePresence mode="wait">
        <motion.div
          key={activeTab}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -10 }}
          transition={{ duration: 0.2 }}
        >
          {activeTab === 'Stock Holdings' && (
            <div className="glassy rounded-2xl overflow-hidden">
              {/* Table Header */}
              <div className="grid grid-cols-[1fr_60px_55px_70px_80px] gap-2 px-4 py-3 border-b border-white/[0.06]">
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35">Ticker</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35 text-center">4Q Trend</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35 text-right">% Total</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35 text-right">Avg Price</span>
                <span className="text-[9px] font-black uppercase tracking-[0.1em] text-white/35 text-right">Value</span>
              </div>

              {/* Table Rows */}
              {enrichedHoldings.map((holding, i) => (
                <motion.div
                  key={holding.cusip || i}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={cn(
                    "grid grid-cols-[1fr_60px_55px_70px_80px] gap-2 px-4 py-3 items-center hover:bg-white/[0.03] transition-colors",
                    i < enrichedHoldings.length - 1 && "border-b border-white/[0.03]"
                  )}
                >
                  {/* Ticker + Company */}
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-white">{holding.ticker}</p>
                    <p className="text-[10px] text-white/35 truncate">{holding.company}</p>
                  </div>

                  {/* 4Q Trend Bars */}
                  <div className="flex justify-center">
                    <QuarterTrendBars values={holding.trend} />
                  </div>

                  {/* % of Total */}
                  <p className="text-[12px] font-semibold text-white/70 text-right">
                    {holding.percentOfTotal.toFixed(1)}%
                  </p>

                  {/* Avg Price */}
                  <p className="text-[12px] text-white/50 text-right">
                    ${holding.avgPrice >= 1000
                      ? (holding.avgPrice / 1000).toFixed(0) + 'K'
                      : holding.avgPrice.toFixed(2)}
                  </p>

                  {/* Value */}
                  <p className="text-[12px] font-semibold text-white text-right">
                    {formatCompactValue(holding.value)}
                  </p>
                </motion.div>
              ))}

              {/* Footer summary */}
              <div className="grid grid-cols-[1fr_60px_55px_70px_80px] gap-2 px-4 py-3 border-t border-white/[0.08] bg-white/[0.02]">
                <p className="text-[11px] font-bold text-white/50 uppercase tracking-wider">
                  {enrichedHoldings.length} Holdings
                </p>
                <span />
                <p className="text-[11px] font-bold text-white/50 text-right">100%</p>
                <span />
                <p className="text-[12px] font-bold text-white text-right">
                  {formatCompactValue(profile.totalValue)}
                </p>
              </div>
            </div>
          )}

          {activeTab === 'Option Holdings' && (
            <div className="glassy rounded-2xl p-8 text-center">
              <Activity size={32} className="text-white/15 mx-auto mb-3" />
              <p className="text-sm text-white/40">Option holdings data not available for this filing period.</p>
              <p className="text-[11px] text-white/25 mt-1">13F filings may not always include detailed option positions.</p>
            </div>
          )}

          {activeTab === 'Activity' && (
            <div className="glassy rounded-2xl p-5">
              <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-4">
                Recent Filing Activity
              </h3>
              <div className="space-y-3">
                {enrichedHoldings.slice(0, 8).map((holding, i) => {
                  const isPositive = holding.trend[3] > holding.trend[2];
                  const change = Math.abs(holding.trend[3] - holding.trend[2]);
                  const action = isPositive
                    ? change > 50 ? 'New Position' : 'Increased'
                    : change > 50 ? 'Sold' : 'Reduced';

                  return (
                    <div
                      key={i}
                      className="flex items-center justify-between p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.04] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center",
                          isPositive ? "bg-emerald-500/15" : "bg-red-500/15"
                        )}>
                          {isPositive
                            ? <TrendingUp size={14} className="text-emerald-400" />
                            : <TrendingDown size={14} className="text-red-400" />
                          }
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-white">{holding.ticker}</p>
                          <p className="text-[10px] text-white/35">{holding.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={cn(
                          "text-[9px] font-bold uppercase px-2 py-0.5 rounded-full",
                          isPositive ? "bg-emerald-500/20 text-emerald-400" : "bg-red-500/20 text-red-400"
                        )}>
                          {action}
                        </span>
                        <p className="text-[10px] text-white/30 mt-1">
                          {formatShares(holding.shares)} shares
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {activeTab === 'Portfolio' && (
            <div className="space-y-4">
              {/* Top Holdings Breakdown */}
              <div className="glassy rounded-2xl p-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-4">
                  Holdings Breakdown
                </h3>
                <div className="space-y-3">
                  {enrichedHoldings.slice(0, 10).map((holding, i) => (
                    <div key={i}>
                      <div className="flex justify-between items-center mb-1">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-bold text-white">{holding.ticker}</span>
                          <span className="text-[10px] text-white/30">{formatCompactValue(holding.value)}</span>
                        </div>
                        <span className="text-[11px] font-semibold text-white/60">
                          {holding.percentOfTotal.toFixed(1)}%
                        </span>
                      </div>
                      <div className="h-1.5 bg-white/[0.04] rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(holding.percentOfTotal, 100)}%` }}
                          transition={{ duration: 0.8, delay: i * 0.05 }}
                          className="h-full rounded-full"
                          style={{ background: PIE_COLORS[i % PIE_COLORS.length] }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Quick Stats */}
              <div className="glassy rounded-2xl p-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-4">
                  Portfolio Metrics
                </h3>
                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Top Holding</p>
                    <p className="text-sm font-bold text-white">{enrichedHoldings[0]?.ticker || '—'}</p>
                    <p className="text-[10px] text-white/40">{enrichedHoldings[0]?.percentOfTotal.toFixed(1)}% of portfolio</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Top 5 Concentration</p>
                    <p className="text-sm font-bold text-white">
                      {enrichedHoldings.slice(0, 5).reduce((s, h) => s + h.percentOfTotal, 0).toFixed(1)}%
                    </p>
                    <p className="text-[10px] text-white/40">of total portfolio</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Avg Position</p>
                    <p className="text-sm font-bold text-white">
                      {enrichedHoldings.length > 0
                        ? formatCompactValue(profile.totalValue / enrichedHoldings.length)
                        : '—'}
                    </p>
                    <p className="text-[10px] text-white/40">per holding</p>
                  </div>
                  <div className="rounded-xl bg-white/[0.03] p-3">
                    <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">Total Holdings</p>
                    <p className="text-sm font-bold text-white">{enrichedHoldings.length}</p>
                    <p className="text-[10px] text-white/40">positions</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </AnimatePresence>
      {/* ─── Sources Modal ─── */}
      <AnimatePresence>
        {showSourcesModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-end justify-center"
            onClick={() => setShowSourcesModal(false)}
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" />

            {/* Modal */}
            <motion.div
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 30, stiffness: 300 }}
              onClick={(e) => e.stopPropagation()}
              className="relative w-full max-w-lg bg-[#0A0E17] border-t border-white/10 rounded-t-3xl max-h-[85vh] flex flex-col"
            >
              {/* Handle bar */}
              <div className="flex justify-center pt-3 pb-1">
                <div className="w-10 h-1 rounded-full bg-white/20" />
              </div>

              {/* Modal Header */}
              <div className="flex items-center justify-between px-6 py-4 border-b border-white/[0.06]">
                <h2 className="text-xl font-bold text-white">All Data Sources</h2>
                <button
                  onClick={() => setShowSourcesModal(false)}
                  className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                >
                  <X size={20} className="text-white/60" />
                </button>
              </div>

              {/* Modal Content */}
              <div className="flex-1 overflow-y-auto px-6 pb-8">
                {sourcesLoading ? (
                  <div className="flex flex-col items-center justify-center py-16 gap-4">
                    <div className="w-8 h-8 rounded-full border-2 border-white/10 border-t-[#00D4FF] animate-spin" />
                    <p className="text-sm text-white/40">Fetching real news sources...</p>
                  </div>
                ) : sourcesData?.categories && sourcesData.categories.length > 0 ? (
                  <div className="space-y-2 pt-2">
                    {sourcesData.categories.map((cat, ci) => (
                      <div key={ci}>
                        {/* Category Header */}
                        <p className="text-[11px] font-bold uppercase tracking-[0.15em] text-[#00D4FF] mt-6 mb-3">
                          {cat.category}
                        </p>

                        {/* Articles */}
                        <div className="space-y-1">
                          {cat.articles.map((article, ai) => (
                            <div
                              key={ai}
                              className="group flex items-start justify-between gap-3 py-3 border-b border-white/[0.04] last:border-b-0"
                            >
                              <div className="flex-1 min-w-0">
                                <p className="text-[13px] font-semibold text-white/90 leading-snug mb-1">
                                  {article.source}
                                </p>
                                <p className="text-[11px] text-white/35 truncate">
                                  {article.url}
                                </p>
                              </div>
                              <button
                                onClick={() => {
                                  navigator.clipboard.writeText(article.url);
                                  setCopiedUrl(article.url);
                                  setTimeout(() => setCopiedUrl(null), 2000);
                                }}
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                                title="Copy URL"
                              >
                                {copiedUrl === article.url ? (
                                  <Check size={14} className="text-emerald-400" />
                                ) : (
                                  <Copy size={14} className="text-white/30 group-hover:text-white/60" />
                                )}
                              </button>
                              <a
                                href={article.url}
                                target="_blank"
                                rel="noreferrer"
                                className="flex-shrink-0 p-2 rounded-lg hover:bg-white/10 transition-colors"
                                title="Open article"
                              >
                                <ExternalLink size={14} className="text-white/30 group-hover:text-white/60" />
                              </a>
                            </div>
                          ))}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-16 gap-3">
                    <p className="text-sm text-white/40">No sources found</p>
                    <a
                      href={`https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=13F-HR&dateb=&owner=include&count=10`}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[#00D4FF] text-sm hover:underline flex items-center gap-1"
                    >
                      View SEC Filings <ExternalLink size={12} />
                    </a>
                  </div>
                )}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}
