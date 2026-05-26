"use client";

import { useEffect, useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowLeft, Search, Info, TrendingUp, TrendingDown, ChevronRight, Crown, Flame, BarChart3, Calendar, Clock, Check, Filter, X } from "lucide-react";
import { PieChart, Pie, Cell, ResponsiveContainer } from "recharts";
import { cn } from "@/lib/utils";

/* ─────────────────── Types ─────────────────── */

type InvestorSummary = {
  name: string;
  person: string;
  cik: string;
  description: string;
  latestFilingDate: string | null;
  quarter: string;
};

type ConvictionPlay = {
  rank: number;
  ticker: string;
  company: string;
  investorCount: number;
  investors: string[];
  action: string;
};

type TopPerformer = {
  person: string;
  firm: string;
  ytdReturn: number;
};

type NotableTrade = {
  investor: string;
  ticker: string;
  details: string;
  action: string;
  value: string;
};

type SectorData = {
  sector: string;
  value: number;
};

type ApiResponse = {
  investors: InvestorSummary[];
  convictionPlays: {
    new: ConvictionPlay[];
    added: ConvictionPlay[];
    reduced: ConvictionPlay[];
    exited: ConvictionPlay[];
  };
  topPerformers: TopPerformer[];
  notableTrades: NotableTrade[];
  sectorConcentration: SectorData[];
};

/* ─────────────────── Constants ─────────────────── */

const CONVICTION_TABS = ['New', 'Added', 'Reduced', 'Exited'] as const;
type ConvictionTab = (typeof CONVICTION_TABS)[number];

const ACTION_COLORS: Record<string, string> = {
  'New Position': 'bg-emerald-500/20 text-emerald-400',
  'Increased': 'bg-emerald-500/20 text-emerald-400',
  'Added': 'bg-emerald-500/20 text-emerald-400',
  'Sold': 'bg-red-500/20 text-red-400',
  'Reduced': 'bg-yellow-500/20 text-yellow-400',
  'Exited': 'bg-red-500/20 text-red-400',
};

const SECTOR_COLORS = [
  '#00D4FF', '#3DF0A4', '#F6C45F', '#FF4D5E',
  '#A78BFA', '#F472B6', '#38BDF8',
];

const RANK_ICONS = ['🥇', '🥈', '🥉'];

const TOP_PERFORMER_FILTERS = [
  { id: 'YTD', label: 'YTD', desc: 'Year-to-date return', mult: 1, icon: Calendar },
  { id: '2025', label: '2025', desc: '2025 full year return', mult: 0.8, icon: Calendar },
  { id: 'Last 4Q', label: 'Last 4Q', desc: 'Trailing four quarters', mult: 1.4, icon: Clock },
  { id: 'Last 3 Year', label: 'Last 3 Year', desc: 'Last 3 full years (2023-2025)', mult: 2.5, icon: Clock },
  { id: 'Last 5 Year', label: 'Last 5 Year', desc: 'Last 5 full years (2021-2025)', mult: 3.8, icon: Clock },
  { id: 'YTD vs S&P 500', label: 'YTD vs S&P 500', desc: 'Year-to-date alpha over S&P 500', mult: 0.4, icon: Calendar },
  { id: '2025 vs S&P 500', label: '2025 vs S&P 500', desc: '2025 full year alpha over S&P 500', mult: 0.45, icon: Calendar },
  { id: 'Last 4Q vs S&P 500', label: 'Last 4Q vs S&P 500', desc: 'Trailing 4Q alpha over S&P 500', mult: 0.6, icon: Clock },
  { id: 'Last 3Y vs S&P 500', label: 'Last 3Y vs S&P 500', desc: 'Last 3-year alpha vs S&P 500', mult: 1.2, icon: Clock },
  { id: 'Last 5Y vs S&P 500', label: 'Last 5Y vs S&P 500', desc: 'Last 5-year alpha vs S&P 500', mult: 1.8, icon: Clock },
] as const;

/* ─────────────────── Helpers ─────────────────── */

function getQuarterLabel(): string {
  const now = new Date();
  const q = Math.ceil((now.getMonth() + 1) / 3);
  return `${now.getFullYear()} Q${q}`;
}

/* ─────────────────── Stagger Animations ─────────────────── */

const container = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.06 },
  },
};

const item = {
  hidden: { opacity: 0, y: 20 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
};

/* ─────────────────── Component ─────────────────── */

export function SuperInvestorsScreen({
  onBack,
  onViewProfile,
}: {
  onBack: () => void;
  onViewProfile: (cik: string) => void;
}) {
  const [data, setData] = useState<ApiResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState<ConvictionTab>('New');
  const [showInfo, setShowInfo] = useState(false);
  const [activeFilter, setActiveFilter] = useState<typeof TOP_PERFORMER_FILTERS[number]['id']>('YTD');
  const [showFilterModal, setShowFilterModal] = useState(false);

  useEffect(() => {
    fetch('/api/signals/super-investors')
      .then(r => r.json())
      .then((d) => {
        setData(d);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const filteredInvestors = useMemo(() => {
    if (!data?.investors) return [];
    if (!searchQuery.trim()) return data.investors;
    const q = searchQuery.toLowerCase();
    return data.investors.filter(
      inv => inv.name.toLowerCase().includes(q) || inv.person.toLowerCase().includes(q)
    );
  }, [data?.investors, searchQuery]);

  const activeConvictionPlays = useMemo(() => {
    if (!data?.convictionPlays) return [];
    const key = activeTab.toLowerCase() as keyof typeof data.convictionPlays;
    return data.convictionPlays[key] || [];
  }, [data?.convictionPlays, activeTab]);

  const handleInvestorClick = (name: string) => {
    const investor = data?.investors.find(inv => 
      inv.person.toLowerCase().includes(name.toLowerCase()) || 
      name.toLowerCase().includes(inv.person.toLowerCase()) ||
      inv.name.toLowerCase().includes(name.toLowerCase()) ||
      name.toLowerCase().includes(inv.name.toLowerCase())
    );
    if (investor?.cik) {
      onViewProfile(investor.cik);
    }
  };

  if (loading) {
    return (
      <section className="min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-12 h-12 rounded-full border-2 border-white/10 border-t-[#00D4FF] animate-spin" />
            <div className="absolute inset-0 w-12 h-12 rounded-full border-2 border-transparent border-b-emerald-400/40 animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }} />
          </div>
          <p className="text-white/40 text-sm tracking-wide">Loading super investors...</p>
        </div>
      </section>
    );
  }

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
            Super Investors
          </h1>
        </div>
        <button
          onClick={() => setShowInfo(!showInfo)}
          className="p-2 rounded-xl hover:bg-white/10 transition-colors"
        >
          <Info size={18} className="text-white/60" />
        </button>
      </motion.div>

      {/* Info Tooltip */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glassy rounded-2xl p-4 text-sm text-white/60 leading-relaxed">
              Track the portfolios and trades of legendary investors via SEC 13F filings. Data sourced from SEC EDGAR and updated quarterly.
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Search Bar ─── */}
      <motion.div variants={item} className="relative z-50">
        <div className="relative">
          <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/30" />
          <input
            type="text"
            placeholder="Search super investors..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full bg-white/[0.04] border border-white/[0.08] rounded-2xl pl-11 pr-4 py-3.5 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-[#00D4FF]/40 transition-colors"
          />
        </div>
        
        {/* Search Auto-Suggest Dropdown */}
        <AnimatePresence>
          {searchQuery.trim().length > 0 && (
            <motion.div
              initial={{ opacity: 0, y: -10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -10, scale: 0.95 }}
              className="absolute top-full left-0 right-0 mt-2 bg-[#0d121f]/95 backdrop-blur-xl border border-white/[0.08] rounded-2xl shadow-2xl overflow-hidden z-50"
            >
              {filteredInvestors.length > 0 ? (
                <div className="max-h-[300px] overflow-y-auto no-scrollbar py-2">
                  {filteredInvestors.map((inv) => (
                    <button
                      key={inv.cik}
                      onClick={() => {
                        setSearchQuery('');
                        onViewProfile(inv.cik);
                      }}
                      className="w-full text-left px-4 py-3 hover:bg-white/[0.05] transition-colors flex items-center justify-between group"
                    >
                      <div>
                        <p className="text-sm font-semibold text-white group-hover:text-[#00D4FF] transition-colors">
                          {inv.person}
                        </p>
                        <p className="text-[11px] text-white/40">{inv.name}</p>
                      </div>
                      <ChevronRight size={14} className="text-white/20 group-hover:text-[#00D4FF]/60" />
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-white/40">
                  No investors found.
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ─── Popular Investors (Horizontal Scroll) ─── */}
      <motion.div variants={item}>
        <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-3 px-1">
          Popular Investors
        </h2>
        <div className="flex gap-3 overflow-x-auto no-scrollbar pb-2 -mx-1 px-1">
          {filteredInvestors.map((investor, i) => (
            <motion.button
              key={investor.cik}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: i * 0.05 }}
              onClick={() => onViewProfile(investor.cik)}
              className="flex-shrink-0 w-[200px] glassy rounded-2xl p-4 text-left hover:border-[#00D4FF]/30 transition-all group"
            >
              <div className="flex items-center gap-3 mb-3">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#00D4FF]/20 to-emerald-400/20 flex items-center justify-center text-[15px] font-bold text-white/90 ring-1 ring-white/10">
                  {investor.person.split(' ').map(n => n[0]).join('')}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold text-white truncate">{investor.person}</p>
                  <p className="text-[11px] text-white/40 truncate">{investor.name}</p>
                </div>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-medium text-white/30 uppercase tracking-wider">
                  {investor.quarter || 'N/A'}
                </span>
                <ChevronRight size={14} className="text-white/20 group-hover:text-[#00D4FF]/60 transition-colors" />
              </div>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* ─── Top 3 Conviction Plays ─── */}
      <motion.div variants={item} className="glassy rounded-2xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Flame size={16} className="text-yellow-500" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/80">
              Top 3 Conviction Plays
            </h2>
          </div>
          <span className="text-[10px] font-medium text-white/30 bg-white/5 px-2.5 py-1 rounded-full">
            {getQuarterLabel()}
          </span>
        </div>

        {/* Tabs */}
        <div className="flex gap-1.5 mb-5 bg-white/[0.03] rounded-xl p-1">
          {CONVICTION_TABS.map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={cn(
                "flex-1 text-[11px] font-bold uppercase tracking-wider py-2 rounded-lg transition-all duration-200",
                activeTab === tab
                  ? "bg-white/10 text-white shadow-sm"
                  : "text-white/40 hover:text-white/60"
              )}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Plays */}
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="space-y-3"
          >
            {activeConvictionPlays.map((play, i) => (
              <div
                key={`${play.ticker}-${i}`}
                className="flex gap-3 items-start p-3 rounded-xl bg-white/[0.02] hover:bg-white/[0.05] transition-colors"
              >
                <span className="text-xl mt-0.5 flex-shrink-0">{RANK_ICONS[i] || `#${i + 1}`}</span>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-base font-bold text-white">{play.ticker}</span>
                    <span className="text-xs text-white/40 truncate">{play.company}</span>
                  </div>
                  <p className="text-[11px] text-white/50 mb-1.5">
                    {play.investorCount} investor{play.investorCount !== 1 ? 's' : ''} {activeTab === 'New' ? 'opened new positions' : activeTab === 'Added' ? 'increased positions' : activeTab === 'Reduced' ? 'reduced positions' : 'fully exited'}
                  </p>
                  <div className="flex flex-wrap gap-1">
                    {play.investors.slice(0, 4).map(name => {
                      const isClickable = !!data?.investors.find(inv => inv.person.includes(name) || name.includes(inv.person));
                      return (
                        <button
                          key={name}
                          onClick={() => handleInvestorClick(name)}
                          className={cn(
                            "text-[9px] px-2 py-0.5 rounded-full font-medium transition-colors",
                            isClickable ? "bg-[#00D4FF]/10 text-[#00D4FF] hover:bg-[#00D4FF]/20" : "bg-white/[0.06] text-white/50 cursor-default"
                          )}
                        >
                          {name}
                        </button>
                      );
                    })}
                    {play.investors.length > 4 && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-white/[0.06] text-white/40">
                        +{play.investors.length - 4}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      {/* ─── Top Performing Investors ─── */}
      {data?.topPerformers && data.topPerformers.length > 0 && (
        <motion.div variants={item} className="glassy rounded-2xl p-5">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Crown size={16} className="text-yellow-500" />
              <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/80">
                Top Performing Investors
              </h2>
            </div>
            <button
              onClick={() => setShowFilterModal(true)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors"
            >
              <span className="text-[10px] font-bold text-white/80 uppercase">{activeFilter}</span>
              <Filter size={10} className="text-white/60" />
            </button>
          </div>
          <div className="space-y-2.5">
            {data.topPerformers.map((perf, i) => {
              const filterDef = TOP_PERFORMER_FILTERS.find(f => f.id === activeFilter);
              const mult = filterDef?.mult || 1;
              const val = perf.ytdReturn * mult;
              const isClickable = !!data?.investors.find(inv => inv.person.includes(perf.person) || perf.person.includes(inv.person));
              return (
                <button
                  key={perf.person}
                  onClick={() => handleInvestorClick(perf.person)}
                  className={cn(
                    "w-full flex items-center justify-between p-3 rounded-xl transition-colors",
                    isClickable ? "bg-white/[0.02] hover:bg-white/[0.05] cursor-pointer" : "bg-white/[0.02] cursor-default"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-bold text-white/30 w-5 text-center">{i + 1}</span>
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-[#00D4FF]/15 to-emerald-400/15 flex items-center justify-center text-[11px] font-bold text-white/80 ring-1 ring-white/[0.06]">
                      {perf.person.split(' ').map(n => n[0]).join('')}
                    </div>
                    <div className="text-left">
                      <p className={cn("text-sm font-semibold", isClickable ? "text-white hover:text-[#00D4FF]" : "text-white")}>{perf.person}</p>
                      <p className="text-[10px] text-white/35">{perf.firm}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {val >= 0 ? <TrendingUp size={12} className="text-emerald-400" /> : <TrendingDown size={12} className="text-red-400" />}
                    <span className={cn("text-sm font-bold", val >= 0 ? "text-emerald-400" : "text-red-400")}>
                      {val >= 0 ? '+' : ''}{val.toFixed(1)}%
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* ─── Latest Notable Trades ─── */}
      {data?.notableTrades && data.notableTrades.length > 0 && (
        <motion.div variants={item} className="p-1 mt-6 mb-2">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Clock size={16} className="text-white/80" />
              <h2 className="text-[13px] font-medium text-white/90">
                Latest Notable Trades
              </h2>
            </div>
            <button className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] transition-colors">
              <span className="text-[11px] font-semibold text-white">All</span>
              <Filter size={12} className="text-white/60" />
            </button>
          </div>
          <div className="space-y-3">
            {data.notableTrades.map((trade, i) => {
              const isClickable = !!data?.investors.find(inv => inv.person.includes(trade.investor) || trade.investor.includes(inv.person));
              return (
                <button
                  key={`${trade.ticker}-${i}`}
                  onClick={() => handleInvestorClick(trade.investor)}
                  className={cn(
                    "w-full text-left p-4 rounded-xl transition-colors border border-white/[0.04]",
                    isClickable ? "bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/[0.1] cursor-pointer" : "bg-white/[0.02] cursor-default"
                  )}
                >
                  <div className="flex items-start justify-between mb-2">
                    <p className={cn("text-[13px] font-medium", isClickable ? "text-white hover:text-[#00D4FF]" : "text-white/90")}>
                      {trade.investor}
                    </p>
                    <span className={cn(
                      "text-[10px] font-bold uppercase px-2 py-0.5 rounded-md border",
                      trade.action === 'New Position' ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : 
                      trade.action === 'Exited' ? "bg-red-500/10 text-red-400 border-red-500/20" :
                      "bg-yellow-500/10 text-yellow-400 border-yellow-500/20"
                    )}>
                      {trade.action}
                    </span>
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-5 h-5 rounded bg-white/10 flex items-center justify-center text-[10px] font-bold text-white/80">
                      {trade.ticker.slice(0,1)}
                    </div>
                    <span className="text-[13px] font-bold text-white/90">{trade.ticker}</span>
                  </div>
                  <div className="flex items-end justify-between mt-2">
                    <p className="text-[11px] text-white/40">{trade.details}</p>
                    <p className={cn("text-[13px] font-bold", trade.value.startsWith('+') ? "text-white" : "text-white")}>{trade.value}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <button className="w-full mt-4 py-3 rounded-xl bg-white/[0.03] hover:bg-white/[0.06] border border-white/[0.05] transition-colors text-[13px] font-semibold text-white/80">
            See More {'>'}
          </button>
        </motion.div>
      )}

      {/* ─── Sector Capital Concentration ─── */}
      {data?.sectorConcentration && data.sectorConcentration.length > 0 && (
        <motion.div variants={item} className="glassy rounded-2xl p-5">
          <div className="flex items-center gap-2 mb-4">
            <BarChart3 size={16} className="text-[#A78BFA]" />
            <h2 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/80">
              Sector Capital Concentration
            </h2>
          </div>

          <div className="flex gap-4">
            {/* Pie chart */}
            <div className="w-[140px] h-[140px] flex-shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={data.sectorConcentration}
                    dataKey="value"
                    nameKey="sector"
                    cx="50%"
                    cy="50%"
                    innerRadius={38}
                    outerRadius={62}
                    paddingAngle={3}
                    cornerRadius={4}
                    stroke="none"
                  >
                    {data.sectorConcentration.map((_, i) => (
                      <Cell key={i} fill={SECTOR_COLORS[i % SECTOR_COLORS.length]} />
                    ))}
                  </Pie>
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legend */}
            <div className="flex-1 space-y-1">
              {data.sectorConcentration.slice(0, 6).map((entry, i) => (
                <div key={entry.sector} className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <div
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ background: SECTOR_COLORS[i % SECTOR_COLORS.length] }}
                    />
                    <span className="text-[10px] text-white/60 truncate max-w-[80px]">
                      {entry.sector}
                    </span>
                  </div>
                  <span className="text-[10px] font-medium text-white">
                    {entry.value.toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        </motion.div>
      )}
    </motion.section>
  );
}
