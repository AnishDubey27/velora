"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = ["United States", "India", "Crypto"] as const;

function cleanHtmlText(text?: string | null): string {
  if (!text) return "";
  return text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/<[^>]*>/g, "")
    .trim();
}

import { BuiNewsBento, type BentoNewsItem } from "@/components/ui/bui-news-bento";

export function HeadlinesScreen({ onStartChat }: { onStartChat?: (prompt: string) => void }) {
  const [activeTab, setActiveTab] = useState<(typeof tabs)[number]>("United States");
  const [filter, setFilter] = useState<"All" | "Important" | "Critical">("All");
  const [showFilter, setShowFilter] = useState(false);
  const [news, setNews] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const countryParam = 
      activeTab === "India" ? "India" : 
      activeTab === "Crypto" ? "Crypto" : "US";

    fetch(`/api/news?country=${countryParam}`)
      .then(res => res.json())
      .then(data => {
        setNews(data);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [activeTab]);

  const filteredNews: BentoNewsItem[] = news
    .filter(item => {
      if (filter === "All") return true;
      if (filter === "Important") return item.impact === "Positive" || item.impact === "Negative";
      if (filter === "Critical") return item.impact === "Negative";
      return true;
    })
    .map(item => ({
      title: cleanHtmlText(item.title),
      summary: cleanHtmlText(item.summary || item.description),
      source: item.source || item.domain || item.publisher || "Financial Press",
      time: item.time || "Recent",
      sentiment: (item.impact === "Positive" ? "Bullish" : item.impact === "Negative" ? "Bearish" : "Neutral") as any,
      sentimentScore: item.impact === "Positive" ? 84 : item.impact === "Negative" ? 68 : 50,
      symbol: item.symbol,
      price: item.price,
      changePercent: item.change,
      url: item.url || item.link || item.source_url || null,
      impact: item.impact,
    }));

  return (
    <section className="pb-5 pt-2">
      {/* Country Tabs */}
      <div className="no-scrollbar -mx-3 mb-5 flex gap-2 overflow-x-auto px-3">
        {tabs.map((tab) => (
          <button
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={cn(
              "whitespace-nowrap rounded-2xl px-6 py-2.5 text-sm font-semibold transition",
              activeTab === tab
                ? "bg-vel-teal/20 text-white"
                : "bg-white/5 text-white/70 hover:bg-white/10"
            )}
          >
            {tab}
          </button>
        ))}
      </div>

      {/* Header + Filter Button */}
      <div className="flex items-center justify-between px-1 mb-4">
        <p className="text-xl font-semibold text-white">Market Catalysts & Headlines</p>
        <button
          onClick={() => setShowFilter(true)}
          className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* Bento Grid News */}
      {loading ? (
        <div className="py-10 text-center text-white/50">Loading market intelligence...</div>
      ) : filteredNews.length === 0 ? (
        <div className="py-10 text-center text-white/50">No news found for this category</div>
      ) : (
        <BuiNewsBento items={filteredNews} onAskAI={onStartChat} />
      )}

      {/* Filter Modal */}
      <AnimatePresence>
        {showFilter && (
          <div 
            className="fixed inset-0 z-50 flex items-end justify-center bg-black/70" 
            onClick={() => setShowFilter(false)}
          >
            <motion.div
              initial={{ y: 100 }}
              animate={{ y: 0 }}
              exit={{ y: 100 }}
              className="w-full max-w-md rounded-t-3xl bg-[#0A0F1C] p-6"
              onClick={e => e.stopPropagation()}
            >
              <h3 className="text-xl font-semibold mb-5">Filter by Importance</h3>
              
              <div className="space-y-4">
                {["All", "Important", "Critical"].map((f: any) => (
                  <button
                    key={f}
                    onClick={() => {
                      setFilter(f as any);
                      setShowFilter(false);
                    }}
                    className={cn(
                      "flex w-full items-center justify-between rounded-2xl px-5 py-4 text-left",
                      filter === f ? "bg-vel-teal/20" : "bg-white/5 hover:bg-white/10"
                    )}
                  >
                    <div>
                      <p className="font-medium">{f} News</p>
                      <p className="text-sm text-white/60">
                        {f === "All" && "Show all news articles"}
                        {f === "Important" && "Market-moving stories"}
                        {f === "Critical" && "Systemic or geopolitical impact"}
                      </p>
                    </div>
                    {filter === f && <span className="text-vel-teal">✓</span>}
                  </button>
                ))}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </section>
  );
}
