"use client";

import { useEffect, useState, useRef } from "react";
import { Search, X, Loader2, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

type SearchResult = {
  description: string;
  displaySymbol: string;
  symbol: string;
  type: string;
};

type GlobalSearchProps = {
  isOpen: boolean;
  onClose: () => void;
  onSelect: (symbol: string, name: string) => void;
};

export function GlobalSearchModal({ isOpen, onClose, onSelect }: GlobalSearchProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<SearchResult[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 100);
      setQuery("");
      setResults([]);
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setIsLoading(false);
      return;
    }

    const timer = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        if (res.ok) {
          const data = await res.json();
          // Filter for common stock types if desired, or just take first 8
          setResults((data.results || []).slice(0, 8));
        }
      } catch (err) {
        console.error("Search failed", err);
      } finally {
        setIsLoading(false);
      }
    }, 400); // 400ms debounce

    return () => clearTimeout(timer);
  }, [query]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 z-[100] bg-black/80 backdrop-blur-sm"
          />
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed left-4 right-4 top-16 z-[101] mx-auto max-w-2xl overflow-hidden rounded-2xl border border-white/10 bg-[#0A0F1C] shadow-2xl shadow-black/80"
          >
            <div className="flex items-center gap-3 border-b border-white/10 p-4">
              <Search className="text-white/40" size={20} />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search symbols or companies..."
                className="flex-1 bg-transparent text-[16px] text-white placeholder:text-white/30 focus:outline-none"
              />
              {isLoading && <Loader2 className="animate-spin text-vel-teal" size={18} />}
              <button
                onClick={onClose}
                className="grid h-8 w-8 place-items-center rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
              >
                <X size={18} />
              </button>
            </div>

            <div className="max-h-[60vh] overflow-y-auto p-2 app-scroll">
              {results.length > 0 ? (
                <div className="flex flex-col gap-1">
                  {results.map((result) => (
                    <button
                      key={result.symbol}
                      onClick={() => onSelect(result.symbol, result.description)}
                      className="flex items-center justify-between rounded-xl px-4 py-3 text-left transition hover:bg-white/5 active:scale-[0.99]"
                    >
                      <div>
                        <div className="font-semibold text-white">{result.symbol}</div>
                        <div className="text-sm text-white/50">{result.description}</div>
                      </div>
                      <TrendingUp size={16} className="text-white/20" />
                    </button>
                  ))}
                </div>
              ) : query.trim() && !isLoading ? (
                <div className="p-8 text-center text-sm text-white/40">
                  No results found for "{query}"
                </div>
              ) : !query.trim() ? (
                <div className="p-8 text-center text-sm text-white/40">
                  Start typing to search...
                </div>
              ) : null}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
