"use client";

import { useState, useEffect } from "react";
import useSWR from "swr";
import { ArrowLeft, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { StockQuote, StockProfile, WatchlistItem } from "@/lib/types";
import { StockChart } from "@/components/stock/stock-chart";
import { StockProfileTab } from "@/components/stock/stock-profile-tab";
import { StockEarningsTab } from "@/components/stock/stock-earnings-tab";
import { StockInsiderTab } from "@/components/stock/stock-insider-tab";
import { StockNewsTab } from "@/components/stock/stock-news-tab";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch");
  return res.json();
});

type TabKey = "Profile" | "Earnings" | "Insider" | "News";
const TABS: TabKey[] = ["Profile", "Earnings", "Insider", "News"];

export function StockDetailScreen({ symbol, onBack, onStartChat }: { symbol: string; onBack: () => void; onStartChat?: (prompt: string) => void }) {
  const [activeTab, setActiveTab] = useState<TabKey>("Profile");
  const [isWatchlisted, setIsWatchlisted] = useState(false);
  const [isTogglingWatchlist, setIsTogglingWatchlist] = useState(false);
  
  const { data: quote, isLoading: isLoadingQuote } = useSWR<StockQuote>(`/api/stock/quote?symbol=${symbol}`, fetcher, { refreshInterval: 60000 });
  const { data: profile } = useSWR<StockProfile>(`/api/stock/profile?symbol=${symbol}`, fetcher);
  const { data: watchlistData, mutate: mutateWatchlist } = useSWR<{ items: WatchlistItem[] }>('/api/watchlist', fetcher);

  useEffect(() => {
    if (watchlistData?.items) {
      setIsWatchlisted(watchlistData.items.some(item => item.symbol === symbol));
    }
  }, [watchlistData, symbol]);

  const toggleWatchlist = async () => {
    if (isTogglingWatchlist) return;
    setIsTogglingWatchlist(true);
    
    try {
      if (isWatchlisted) {
        await fetch('/api/watchlist', {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol })
        });
      } else {
        await fetch('/api/watchlist', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ symbol, name: profile?.companyName || symbol })
        });
      }
      mutateWatchlist();
    } catch (error) {
      console.error("Failed to toggle watchlist", error);
    } finally {
      setIsTogglingWatchlist(false);
    }
  };

  const isUp = quote && quote.change >= 0;
  const currency = quote?.currency || profile?.currency || "USD";

  return (
    <div className="flex flex-col gap-6 w-full max-w-3xl mx-auto min-h-screen">
      {/* Header */}
      <div className="flex items-center justify-between sticky top-0 bg-[#070A11]/80 backdrop-blur-md z-20 py-2 border-b border-transparent">
        <div className="flex items-center gap-3">
          <button 
            onClick={onBack}
            className="p-2 hover:bg-white/5 rounded-full transition-colors text-vel-text"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-white/10 flex items-center justify-center overflow-hidden border border-white/5">
              {profile?.image ? (
                <img src={profile.image} alt={symbol} className="w-full h-full object-cover" />
              ) : (
                <span className="font-bold text-lg">{symbol.charAt(0)}</span>
              )}
            </div>
            <div className="flex flex-col">
              <h1 className="font-bold text-lg leading-tight text-vel-text">{symbol}</h1>
              <span className="text-xs text-vel-muted line-clamp-1">{profile?.companyName || "Loading..."}</span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onStartChat && (
            <button
              onClick={() => onStartChat(`Check if I have ${symbol} in my portfolio. If yes, give me a quick update on my position including current price, my return, and a brief outlook. If no, give me a brief overview of the stock and whether it looks like a good entry right now. Keep the response concise and actionable. Do not list any suggest buying points or suggest selling points options at the end.`)}
              className="flex items-center gap-2 bg-vel-teal/10 text-vel-teal hover:bg-vel-teal/20 px-3 py-1.5 rounded-full text-xs font-medium transition-colors border border-vel-teal/20"
            >
              <Star className="w-3.5 h-3.5" />
              Ask Velora AI
            </button>
          )}
          <button 
            onClick={toggleWatchlist}
            disabled={isTogglingWatchlist}
            className={cn(
              "p-2 rounded-full transition-colors",
              isWatchlisted ? "text-[#F6C45F] hover:bg-[#F6C45F]/10" : "text-vel-muted hover:bg-white/5"
            )}
          >
            <Star className="w-5 h-5" fill={isWatchlisted ? "currentColor" : "none"} />
          </button>
        </div>
      </div>

      {/* Price Section */}
      <div className="flex flex-col px-1">
        {isLoadingQuote ? (
          <div className="animate-pulse flex flex-col gap-2">
            <div className="h-10 w-40 bg-white/5 rounded-lg"></div>
            <div className="h-5 w-24 bg-white/5 rounded"></div>
          </div>
        ) : (
          <>
            <div className="flex items-end gap-2">
              <span className="text-4xl font-bold tracking-tight text-vel-text">
                {quote?.price?.toFixed(2) || "0.00"}
              </span>
              <span className="text-sm font-medium text-vel-muted mb-1 pb-1">{currency}</span>
            </div>
            
            <div className={cn("flex items-center gap-2 text-sm font-medium mt-1", isUp ? "text-vel-green" : "text-vel-red")}>
              <span>{isUp ? "+" : ""}{quote?.change !== undefined && quote?.change !== null ? quote.change.toFixed(2) : "0.00"}</span>
              <span>({isUp ? "+" : ""}{quote?.changesPercentage !== undefined && quote?.changesPercentage !== null ? quote.changesPercentage.toFixed(2) : "0.00"}%)</span>
              <span className="text-vel-faint ml-1">Today</span>
            </div>
          </>
        )}
      </div>

      {/* Chart */}
      <div className="px-1 mb-2 mt-2">
        <StockChart symbol={symbol} />
      </div>

      {/* Tabs */}
      <div className="flex w-full border-b border-white/5 mb-4 sticky top-14 bg-[#070A11] z-10 px-1 pt-2">
        {TABS.map(tab => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "relative px-4 py-3 text-sm font-medium transition-colors outline-none",
              activeTab === tab ? "text-vel-teal" : "text-vel-muted hover:text-vel-text"
            )}
          >
            {tab}
            {activeTab === tab && (
              <motion.div
                layoutId="stock-tab-indicator"
                className="absolute bottom-0 left-0 right-0 h-0.5 bg-vel-teal rounded-t-full"
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      <div className="px-1 min-h-[400px]">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.2 }}
          >
            {activeTab === "Profile" && <StockProfileTab symbol={symbol} />}
            {activeTab === "Earnings" && <StockEarningsTab symbol={symbol} />}
            {activeTab === "Insider" && <StockInsiderTab symbol={symbol} />}
            {activeTab === "News" && <StockNewsTab symbol={symbol} />}
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  );
}
