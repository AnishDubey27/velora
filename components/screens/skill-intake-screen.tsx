"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowLeft, ArrowRight, Search, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import type { Skill } from "@/lib/types";

/* ─── Types ─── */

type SearchResult = {
  symbol: string;
  description: string;
};

type SkillIntakeScreenProps = {
  skill: Skill;
  onSubmit: (symbols: string[]) => void;
  onBack: () => void;
};

/* ─── Stock Search Bar ─── */

function StockSearchBar({
  label,
  value,
  onChange,
}: {
  label?: string;
  value: string;
  onChange: (symbol: string) => void;
}) {
  const [query, setQuery] = useState(value);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  /* debounced search */
  useEffect(() => {
    if (query.length < 1) {
      setResults([]);
      setOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        setLoading(true);
        const res = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
        const data: SearchResult[] = await res.json();
        setResults(data);
        setOpen(data.length > 0);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  /* close dropdown on outside click */
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const selectItem = useCallback(
    (item: SearchResult) => {
      setQuery(item.symbol);
      onChange(item.symbol);
      setOpen(false);
    },
    [onChange],
  );

  return (
    <div ref={containerRef} className="relative">
      {label && (
        <span className="mb-1.5 block text-[13px] font-medium text-vel-muted">
          {label}
        </span>
      )}

      <label
        className={cn(
          "flex items-center gap-2.5 rounded-xl border px-4 py-3 transition-colors",
          "border-white/[0.08] bg-white/[0.03] focus-within:border-vel-teal/50 focus-within:bg-white/[0.05]",
        )}
      >
        <Search size={16} className="flex-none text-vel-muted" />
        <input
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            if (e.target.value !== value) onChange("");
          }}
          onFocus={() => results.length > 0 && setOpen(true)}
          placeholder="Search ticker or company…"
          className="w-full bg-transparent text-[14px] text-white/90 outline-none placeholder:text-vel-faint"
        />
        {loading && (
          <span className="h-4 w-4 flex-none animate-spin rounded-full border-2 border-vel-teal/30 border-t-vel-teal" />
        )}
      </label>

      {/* ─── Dropdown ─── */}
      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -4 }}
            transition={{ duration: 0.15 }}
            className="absolute left-0 right-0 z-30 mt-1.5 max-h-56 overflow-y-auto rounded-xl border border-white/[0.08] bg-[#0c1220] shadow-2xl backdrop-blur-md"
          >
            {results.map((item) => (
              <li key={item.symbol}>
                <button
                  type="button"
                  onClick={() => selectItem(item)}
                  className="flex w-full items-center gap-3 px-4 py-2.5 text-left transition hover:bg-white/[0.06]"
                >
                  <span className="text-[14px] font-semibold text-white/90">
                    {item.symbol}
                  </span>
                  <span className="truncate text-[13px] text-vel-faint">
                    {item.description}
                  </span>
                </button>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ─── Skill Intake Screen ─── */

export function SkillIntakeScreen({ skill, onSubmit, onBack }: SkillIntakeScreenProps) {
  const isTwoStocks = skill.inputType === "two_stocks";

  const [symbolA, setSymbolA] = useState("");
  const [symbolB, setSymbolB] = useState("");

  const canSubmit = isTwoStocks
    ? symbolA.length > 0 && symbolB.length > 0
    : symbolA.length > 0;

  const handleSubmit = () => {
    if (!canSubmit) return;
    onSubmit(isTwoStocks ? [symbolA, symbolB] : [symbolA]);
  };

  return (
    <section className="relative flex min-h-full flex-col bg-[#05080F] px-1 pb-8 pt-2">
      {/* ─── Back button ─── */}
      <motion.button
        onClick={onBack}
        initial={{ opacity: 0, x: -10 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.25 }}
        className="mb-6 flex items-center gap-1.5 text-[13px] text-vel-muted transition hover:text-white/80"
      >
        <ArrowLeft size={16} />
        Back
      </motion.button>

      {/* ─── Skill header ─── */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.35, delay: 0.05 }}
        className="mb-8"
      >
        <div className="mb-3 inline-flex items-center gap-2 rounded-full bg-vel-teal/10 px-3 py-1.5 text-vel-teal">
          <Sparkles size={14} />
          <span className="text-[12px] font-semibold uppercase tracking-wider">
            {skill.category}
          </span>
        </div>

        <h1 className="mb-2 text-[26px] font-bold leading-tight tracking-[-0.02em] text-white">
          {skill.title}
        </h1>
        <p className="max-w-md text-[14px] leading-relaxed text-vel-muted">
          {skill.description}
        </p>
      </motion.div>

      {/* ─── Input card ─── */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, delay: 0.15 }}
        className="glassy rounded-2xl p-5"
      >
        {/* prompt */}
        <p className="mb-5 text-[15px] font-medium text-white/85">
          {skill.inputPrompt}
        </p>

        <div className={cn("space-y-4", isTwoStocks && "space-y-5")}>
          <StockSearchBar
            label={isTwoStocks ? "Stock A" : undefined}
            value={symbolA}
            onChange={setSymbolA}
          />

          {isTwoStocks && (
            <StockSearchBar
              label="Stock B"
              value={symbolB}
              onChange={setSymbolB}
            />
          )}
        </div>

        {/* ─── Submit button ─── */}
        <motion.button
          onClick={handleSubmit}
          disabled={!canSubmit}
          whileTap={canSubmit ? { scale: 0.97 } : undefined}
          className={cn(
            "mt-6 flex w-full items-center justify-center gap-2 rounded-xl py-3.5 text-[14px] font-semibold transition-all",
            canSubmit
              ? "bg-gradient-to-r from-vel-teal to-vel-teal/80 text-[#05080F] shadow-[0_0_24px_rgba(0,206,209,0.2)] hover:shadow-[0_0_32px_rgba(0,206,209,0.3)]"
              : "cursor-not-allowed bg-white/[0.06] text-white/30",
          )}
        >
          Start Analysis
          <ArrowRight size={16} />
        </motion.button>
      </motion.div>
    </section>
  );
}
