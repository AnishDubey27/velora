'use client';

import { useEffect, useState } from 'react';
import { ArrowLeft, Filter, TrendingUp, TrendingDown, Flame } from 'lucide-react';
import { motion, Variants } from 'framer-motion';
interface RedditStock {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rankChange: number;
  mentions24hAgo: number;
}

export function RedditTrendingScreen({ onBack }: { onBack: () => void }) {
  const [stocks, setStocks] = useState<RedditStock[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      try {
        const res = await fetch('/api/signals/reddit');
        const data = await res.json();
        setStocks(data.results || []);
      } catch (err) {
        console.error('Failed to fetch reddit trending:', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const getRankBadge = (rank: number) => {
    if (rank === 1) return 'bg-gradient-to-br from-yellow-400 to-amber-600 text-black shadow-lg shadow-yellow-500/30';
    if (rank === 2) return 'bg-gradient-to-br from-gray-300 to-gray-500 text-black shadow-lg shadow-gray-400/20';
    if (rank === 3) return 'bg-gradient-to-br from-amber-600 to-amber-800 text-white shadow-lg shadow-amber-700/20';
    return 'bg-white/[0.06] text-white/50';
  };

  const containerVariants: Variants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.04, delayChildren: 0.1 },
    },
  };

  const itemVariants: Variants = {
    hidden: { opacity: 0, y: 16, scale: 0.97 },
    visible: {
      opacity: 1,
      y: 0,
      scale: 1,
      transition: { type: 'spring', stiffness: 300, damping: 24 },
    },
  };

  return (
    <div className="min-h-screen bg-[#070A11] text-white pb-24">
      {/* Header */}
      <div className="sticky top-0 z-30 bg-[#070A11]/80 backdrop-blur-xl border-b border-white/[0.06]">
        <div className="flex items-center justify-between px-5 py-4">
          <button
            onClick={onBack}
            className="p-2 rounded-xl hover:bg-white/10 transition-colors"
          >
            <ArrowLeft className="w-5 h-5 text-white" />
          </button>
          <h1 className="text-lg font-bold tracking-wide">Reddit Trending</h1>
          <button className="p-2 rounded-xl hover:bg-white/10 transition-colors">
            <Filter className="w-5 h-5 text-white/60" />
          </button>
        </div>
      </div>

      <div className="px-5 pt-6">
        {/* Section Title */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="flex items-center gap-3 mb-6"
        >
          <div className="p-2.5 rounded-xl bg-gradient-to-br from-orange-500/20 to-red-500/20 border border-orange-500/20">
            <Flame className="w-5 h-5 text-orange-400" />
          </div>
          <div>
            <h2 className="text-xl font-black uppercase tracking-[0.1em]">
              Reddit Trending Stocks
            </h2>
            <p className="text-xs text-white/40 mt-0.5">
              Most mentioned tickers across Reddit in the last 24h
            </p>
          </div>
        </motion.div>

        {/* Loading State */}
        {loading ? (
          <div className="glassy rounded-2xl p-5">
            <div className="space-y-3">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="flex items-center gap-4 animate-pulse">
                  <div className="w-9 h-9 rounded-full bg-white/[0.06]" />
                  <div className="flex-1">
                    <div className="h-4 w-16 bg-white/[0.06] rounded-md" />
                  </div>
                  <div className="h-4 w-12 bg-white/[0.06] rounded-md" />
                </div>
              ))}
            </div>
          </div>
        ) : (
          <motion.div
            className="glassy rounded-2xl p-5"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          >
            {/* Table Header */}
            <div className="grid grid-cols-[48px_1fr_90px] items-center px-2 pb-3 mb-1 border-b border-white/[0.06]">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Rank
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30">
                Ticker
              </span>
              <span className="text-[10px] font-semibold uppercase tracking-widest text-white/30 text-right">
                Rank Chg
              </span>
            </div>

            {/* Stock Rows */}
            <motion.div
              variants={containerVariants}
              initial="hidden"
              animate="visible"
              className="space-y-0.5"
            >
              {stocks.map((stock) => (
                <motion.div
                  key={stock.ticker}
                  variants={itemVariants}
                  className="grid grid-cols-[48px_1fr_90px] items-center px-2 py-3 rounded-xl hover:bg-white/[0.03] transition-colors group"
                >
                  {/* Rank Badge */}
                  <div className="flex items-center justify-center">
                    <div
                      className={`w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold ${getRankBadge(stock.rank)}`}
                    >
                      {stock.rank}
                    </div>
                  </div>

                  {/* Ticker + Name */}
                  <div className="min-w-0 pl-2">
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-[15px] text-white tracking-wide">
                        {stock.ticker}
                      </span>
                      <span className="text-[10px] text-white/25 font-medium px-1.5 py-0.5 bg-white/[0.04] rounded-md">
                        {stock.mentions} mentions
                      </span>
                    </div>
                    <p className="text-xs text-white/35 truncate mt-0.5 max-w-[180px]">
                      {stock.name}
                    </p>
                  </div>

                  {/* Rank Change */}
                  <div className="flex items-center justify-end gap-1">
                    {stock.rankChange > 0 ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10">
                        <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-sm font-semibold text-emerald-400">
                          {stock.rankChange}
                        </span>
                      </div>
                    ) : stock.rankChange < 0 ? (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-red-500/10">
                        <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                        <span className="text-sm font-semibold text-red-400">
                          {Math.abs(stock.rankChange)}
                        </span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-white/[0.04]">
                        <span className="text-sm font-semibold text-white/30">—</span>
                      </div>
                    )}
                  </div>
                </motion.div>
              ))}
            </motion.div>
          </motion.div>
        )}

        {/* Footer info */}
        {!loading && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="text-center text-[10px] text-white/20 mt-4"
          >
            Data sourced from ApeWisdom · Refreshed hourly
          </motion.p>
        )}
      </div>
    </div>
  );
}
