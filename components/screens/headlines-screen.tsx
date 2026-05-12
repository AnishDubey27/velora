"use client";

import { useEffect, useState } from "react";
import { Filter } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

const tabs = ["United States", "India", "Crypto"] as const;

export function HeadlinesScreen() {
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

  const filteredNews = news.filter(item => {
    if (filter === "All") return true;
    if (filter === "Important") return item.impact === "Positive" || item.impact === "Negative";
    if (filter === "Critical") return item.impact === "Negative";
    return true;
  });

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
        <p className="text-xl font-semibold text-white">Today</p>
        <button
          onClick={() => setShowFilter(true)}
          className="grid h-9 w-9 place-items-center rounded-xl text-white/70 hover:bg-white/10"
        >
          <Filter size={20} />
        </button>
      </div>

      {/* News List */}
      <div className="space-y-4">
        {loading ? (
          <div className="py-10 text-center text-white/50">Loading headlines...</div>
        ) : filteredNews.length === 0 ? (
          <div className="py-10 text-center text-white/50">No news found for this category</div>
        ) : (
          filteredNews.slice(0, 10).map((item, index) => {
            const href = item.url || item.link || item.source_url || null;
            const Card: any = href ? motion.a : motion.div;

            return (
              <Card
                key={index}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.04 }}
              href={href || undefined}
              target={href ? "_blank" : undefined}
              rel={href ? "noreferrer" : undefined}
              className={cn(
                "glassy block rounded-2xl p-4",
                href && "cursor-pointer hover:bg-white/[0.04]"
              )}
            >
              <div className="flex justify-between text-xs mb-1">
                <span className="text-white/50">{item.time || "12:25 pm"}</span>
                {item.impact && (
                  <span className={cn(
                    "font-semibold",
                    item.impact === "Positive" && "text-green-400",
                    item.impact === "Negative" && "text-red-400"
                  )}>
                    {item.impact}
                  </span>
                )}
              </div>

              <h3 className="text-[16px] font-semibold leading-tight text-white">
                {item.title}
              </h3>

              <p className="mt-2 text-[13px] leading-relaxed text-white/70 line-clamp-2">
                {item.summary || item.description}
              </p>

              <div className="mt-4 flex items-center gap-3">
                {item.symbol ? (
                  <>
                    <div className="h-7 w-7 rounded-lg bg-white/10 flex items-center justify-center text-xs font-bold">
                      {item.symbol.slice(0, 1)}
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-white">{item.symbol}</p>
                      <p className="text-xs text-white/50">Company</p>
                    </div>
                  </>
                ) : (
                  <div className="flex-1">
                    <p className="text-xs text-white/50">
                      {item.source || item.domain || item.publisher || "Source"}
                    </p>
                  </div>
                )}
                {item.price && (
                  <div className="text-right">
                    <p className="font-semibold text-white">${item.price}</p>
                    <p className={cn("text-xs", (item.change || 0) > 0 ? "text-green-400" : "text-red-400")}>
                      {(item.change || 0) > 0 ? "+" : ""}{item.change}%
                    </p>
                  </div>
                )}
              </div>
              </Card>
            );
          })
        )}
      </div>

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
