"use client";

import { useEffect } from "react";
import useSWR from "swr";
import { X, TrendingUp, Star, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import type { WatchlistItem } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((res) => res.json());

type WatchlistDrawerProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string) => void;
};

export function WatchlistDrawer({ isOpen, onClose, onSelect }: WatchlistDrawerProps) {
  const { data, error, isLoading } = useSWR<{ items: WatchlistItem[] }>('/api/watchlist', fetcher);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm"
          />
          <motion.div
            initial={{ x: "100%" }}
            animate={{ x: 0 }}
            exit={{ x: "100%" }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-0 right-0 top-0 z-[101] w-full max-w-sm bg-[#070A11] border-l border-white/10 shadow-2xl flex flex-col"
          >
            <div className="flex items-center justify-between border-b border-white/10 p-4 pt-[env(safe-area-inset-top)]">
              <div className="flex items-center gap-2 text-white">
                <Star size={18} className="text-[#F6C45F]" fill="currentColor" />
                <h2 className="font-semibold tracking-wide">Watchlist</h2>
              </div>
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 app-scroll">
              {isLoading ? (
                <div className="flex h-full items-center justify-center text-white/40">
                  <Loader2 className="animate-spin" size={24} />
                </div>
              ) : error ? (
                <div className="flex h-full items-center justify-center text-vel-red text-sm">
                  Failed to load watchlist
                </div>
              ) : data?.items?.length === 0 ? (
                <div className="flex flex-col h-full items-center justify-center text-center text-white/40 gap-3">
                  <Star size={32} className="text-white/10" />
                  <p className="text-sm">Your watchlist is empty.</p>
                  <p className="text-xs">Search for a stock and click the star icon to add it.</p>
                </div>
              ) : (
                <div className="flex flex-col gap-2">
                  {data?.items.map((item) => (
                    <button
                      key={item.symbol}
                      onClick={() => {
                        onSelect(item.symbol);
                        onClose();
                      }}
                      className="flex items-center justify-between rounded-xl p-3 text-left transition hover:bg-white/5 group border border-transparent hover:border-white/5"
                    >
                      <div className="flex flex-col">
                        <span className="font-semibold text-white group-hover:text-vel-teal transition-colors">{item.symbol}</span>
                        <span className="text-xs text-white/50">{item.name || item.symbol}</span>
                      </div>
                      <TrendingUp size={16} className="text-white/20 group-hover:text-vel-teal transition-colors" />
                    </button>
                  ))}
                </div>
              )}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
