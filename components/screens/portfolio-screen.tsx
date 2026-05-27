// components/screens/portfolio-screen.tsx
"use client";

import { useEffect, useMemo, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Cell, Pie, PieChart, ResponsiveContainer } from "recharts";
import { Bot, Edit2, Check, Plus, Trash2, TrendingUp, TrendingDown, LogIn } from "lucide-react";
import { OrbLoader } from "@/components/ui/orb-loader";
import { cn, formatCurrency } from "@/lib/utils";
import { createClient } from "@/utils/supabase/client";
import { useRouter } from "next/navigation";

// Expanded local index to prevent rate-limiting on keystrokes
const TICKER_INDEX = [
  { symbol: "NVDA", name: "Nvidia Corp" }, { symbol: "AAPL", name: "Apple Inc" },
  { symbol: "MSFT", name: "Microsoft" }, { symbol: "TSLA", name: "Tesla Inc" },
  { symbol: "AMZN", name: "Amazon" }, { symbol: "META", name: "Meta Platforms" },
  { symbol: "GOOGL", name: "Alphabet Inc" }, { symbol: "AMD", name: "Advanced Micro Devices" },
  { symbol: "COIN", name: "Coinbase" }, { symbol: "PLTR", name: "Palantir" },
  { symbol: "CRWD", name: "CrowdStrike" }, { symbol: "SMCI", name: "Super Micro Computer" }
];

type HoldingRecord = {
  id?: string;
  symbol: string;
  name: string;
  shares: number;
  purchasePrice: number;
};

function clampNumber(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export function PortfolioScreen({ onViewStock }: { onViewStock?: (symbol: string) => void }) {
  const [holdings, setHoldings] = useState<HoldingRecord[]>([]);
  const [quotes, setQuotes] = useState<Record<string, any>>({});
  const [sp500ChangePercent, setSp500ChangePercent] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<any>(null);
  const [loadedValue, setLoadedValue] = useState(0);
  const [page, setPage] = useState(0);
  
  // Edit Mode & Autocomplete State
  const [isEditing, setIsEditing] = useState(false);
  const [newSymbol, setNewSymbol] = useState("");
  const [newShares, setNewShares] = useState("");
  const [newPrice, setNewPrice] = useState("");
  const [searchResults, setSearchResults] = useState<typeof TICKER_INDEX>([]);
  const [showDropdown, setShowDropdown] = useState(false);
  
  const searchRef = useRef<HTMLDivElement>(null);
  const supabase = createClient();
  const router = useRouter();

  // 1. Fetch Session & Holdings from Supabase
  useEffect(() => {
    const fetchPortfolio = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session) {
        setLoading(false);
        return;
      }
      
      setUser(session.user);

      const { data, error } = await supabase
        .from('holdings')
        .select('*')
        .order('created_at', { ascending: true });

      if (data) {
        const mapped = data.map(row => ({
          id: row.id,
          symbol: row.symbol,
          name: row.name,
          shares: Number(row.shares),
          purchasePrice: Number(row.purchase_price)
        }));
        setHoldings(mapped);
      }
      setLoading(false);
    };

    fetchPortfolio();
  }, [supabase]);

  // 2. Fetch Live Quotes whenever holdings change
  useEffect(() => {
    if (holdings.length === 0) return;
    const symbols = holdings.map(h => h.symbol).join(",");
    fetch(`/api/portfolio?symbols=${symbols}`)
      .then(res => res.json())
      .then(data => {
        if (data.quotes) setQuotes(data.quotes);
      })
      .catch(console.error);
  }, [holdings]);

  useEffect(() => {
    fetch("/api/dashboard/indicators")
      .then((res) => res.json())
      .then((data) => {
        const change = data?.sp500?.changePercent;
        if (typeof change === "number" && Number.isFinite(change)) {
          setSp500ChangePercent(change);
        }
      })
      .catch(() => undefined);
  }, []);

  // Click outside to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Ticker Auto-complete logic
  const handleSymbolChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.toUpperCase();
    setNewSymbol(val);
    if (val.length > 0) {
      const matches = TICKER_INDEX.filter(t => t.symbol.includes(val) || t.name.toUpperCase().includes(val));
      setSearchResults(matches);
      setShowDropdown(true);
    } else {
      setShowDropdown(false);
    }
  };

  const selectTicker = (ticker: typeof TICKER_INDEX[0]) => {
    setNewSymbol(ticker.symbol);
    setShowDropdown(false);
  };

  const portfolioStats = useMemo(() => {
    let totalValue = 0;
    let dayChangeValue = 0;
    let totalCost = 0;

    const enrichedHoldings = holdings.map(h => {
      const quote = quotes[h.symbol] || { price: h.purchasePrice || 0, change: 0, changePercent: 0 };
      const value = h.shares * quote.price;
      const dayChange = h.shares * quote.change;
      const costBasis = h.shares * (h.purchasePrice || quote.price);
      const totalReturn = value - costBasis;
      const totalReturnPercent = costBasis > 0 ? (totalReturn / costBasis) * 100 : 0;
      
      totalValue += value;
      dayChangeValue += dayChange;
      totalCost += costBasis;

      return { ...h, ...quote, value, totalReturn, totalReturnPercent };
    }).sort((a, b) => b.value - a.value);

    const dayChangePercent = totalValue > 0 ? (dayChangeValue / (totalValue - dayChangeValue)) * 100 : 0;
    const allTimeReturn = totalValue - totalCost;
    const allTimePercent = totalCost > 0 ? (allTimeReturn / totalCost) * 100 : 0;

    return { totalValue, dayChangePercent, allTimeReturn, allTimePercent, enrichedHoldings };
  }, [holdings, quotes]);

  const pulseMetrics = useMemo(() => {
    const enriched = portfolioStats.enrichedHoldings;
    const totalValue = portfolioStats.totalValue;

    const maxWeight = totalValue > 0
      ? Math.max(...enriched.map((holding) => (holding.value / totalValue) * 100), 0)
      : 0;

    const dailyMove = totalValue > 0
      ? enriched.reduce((acc, holding) => {
          const weight = holding.value / totalValue;
          return acc + Math.abs(holding.changePercent || 0) * weight;
        }, 0)
      : 0;

    const annualizedVolatility = dailyMove * Math.sqrt(252);
    const annualizedReturn = portfolioStats.dayChangePercent * 252;
    const sharpeRatio = annualizedVolatility > 0 ? annualizedReturn / annualizedVolatility : 0;

    const betaEstimate =
      typeof sp500ChangePercent === "number" &&
      Number.isFinite(sp500ChangePercent) &&
      Math.abs(sp500ChangePercent) > 0.01
        ? portfolioStats.dayChangePercent / sp500ChangePercent
        : null;

    const concentrationRisk = maxWeight * 0.55;
    const volatilityRisk = clampNumber(annualizedVolatility, 0, 80) * 0.45;
    const betaRisk = betaEstimate === null ? 0 : Math.max(0, Math.abs(betaEstimate) - 1) * 10;
    const drawdownPenalty = portfolioStats.allTimePercent < 0 ? Math.min(Math.abs(portfolioStats.allTimePercent), 20) : 0;

    const riskScore = Math.round(clampNumber(concentrationRisk + volatilityRisk + betaRisk + drawdownPenalty, 5, 95));

    return {
      riskScore,
      rows: [
        {
          label: "Volatility",
          value: `${annualizedVolatility.toFixed(2)}%`,
          percent: clampNumber((annualizedVolatility / 60) * 100, 0, 100),
        },
        {
          label: "Sharpe Ratio",
          value: Number.isFinite(sharpeRatio) ? sharpeRatio.toFixed(2) : "0.00",
          percent: clampNumber(((sharpeRatio + 1) / 4) * 100, 0, 100),
        },
        {
          label: "Beta",
          value: betaEstimate === null ? "N/A" : betaEstimate.toFixed(2),
          percent: betaEstimate === null ? 0 : clampNumber((Math.abs(betaEstimate) / 2) * 100, 0, 100),
        },
      ],
    };
  }, [portfolioStats, sp500ChangePercent]);

  // Animated value reveal
  useEffect(() => {
    if (portfolioStats.totalValue === 0) return;
    const duration = 1800;
    const started = performance.now();
    const tick = () => {
      const elapsed = performance.now() - started;
      const progress = Math.min(elapsed / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setLoadedValue(portfolioStats.totalValue * eased);
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [portfolioStats.totalValue]);

  // 3. Database Mutations
  const addHolding = async () => {
    if (!newSymbol || !newShares || !newPrice || !user) return;
    
    const symbol = newSymbol.toUpperCase();
    const existingIndex = holdings.findIndex(h => h.symbol === symbol);
    
    if (existingIndex >= 0) {
      // Average down/up logic
      const existing = holdings[existingIndex];
      const newSharesTotal = existing.shares + parseFloat(newShares);
      const newAvgPrice = ((existing.shares * existing.purchasePrice) + (parseFloat(newShares) * parseFloat(newPrice))) / newSharesTotal;
      
      const { data, error } = await supabase
        .from('holdings')
        .update({ shares: newSharesTotal, purchase_price: newAvgPrice })
        .eq('id', existing.id)
        .select()
        .single();

      if (data) {
        const updated = [...holdings];
        updated[existingIndex] = { ...existing, shares: Number(data.shares), purchasePrice: Number(data.purchase_price) };
        setHoldings(updated);
      }
    } else {
      // Insert new
      const name = TICKER_INDEX.find(t => t.symbol === symbol)?.name || symbol;
      const payload = {
        user_id: user.id,
        symbol,
        name,
        shares: parseFloat(newShares),
        purchase_price: parseFloat(newPrice)
      };

      const { data, error } = await supabase
        .from('holdings')
        .insert([payload])
        .select()
        .single();

      if (data) {
        setHoldings([...holdings, {
          id: data.id,
          symbol: data.symbol,
          name: data.name,
          shares: Number(data.shares),
          purchasePrice: Number(data.purchase_price)
        }]);
      }
    }
    
    setNewSymbol(""); setNewShares(""); setNewPrice("");
  };

  const removeHolding = async (symbol: string, id?: string) => {
    if (!id) return;
    await supabase.from('holdings').delete().eq('id', id);
    setHoldings(holdings.filter(h => h.id !== id));
  };

  const colors = ["#00D4FF", "#3DF0A4", "#F6C45F", "#FF4D5E", "#A78BFA", "#F4F7FB"];

  if (loading) return <section className="grid min-h-[calc(100dvh-164px)] place-items-center"><OrbLoader /></section>;

  // Unauthenticated State
  if (!user) {
    return (
      <section className="flex min-h-[calc(100dvh-164px)] flex-col items-center justify-center p-6 text-center">
        <Bot size={48} className="mb-4 text-vel-teal/50" />
        <h2 className="mb-2 text-xl font-semibold text-white">Encrypted Vault</h2>
        <p className="mb-6 text-sm text-white/60">Initialize your session to track live holdings and AI metrics.</p>
        <button onClick={() => router.push('/login')} className="flex items-center gap-2 rounded-full bg-vel-teal px-6 py-2.5 text-sm font-semibold text-vel-bg transition-opacity hover:opacity-90">
          <LogIn size={16} /> Authenticate
        </button>
      </section>
    );
  }

  return (
    <section className="pb-5 pt-2">
      <div className="mb-5 flex items-start justify-between px-2">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-white/60">PORTFOLIO</p>
          <h1 className="text-4xl font-semibold tracking-tighter text-white">
            {formatCurrency(loadedValue)}
          </h1>
          <div className="flex gap-3 mt-1">
            <p className={cn("text-sm", portfolioStats.dayChangePercent >= 0 ? "text-green-400" : "text-red-400")}>
              {portfolioStats.dayChangePercent >= 0 ? "+" : ""}{portfolioStats.dayChangePercent.toFixed(2)}% Today
            </p>
            <p className={cn("text-sm", portfolioStats.allTimePercent >= 0 ? "text-vel-teal" : "text-red-400")}>
              {portfolioStats.allTimePercent >= 0 ? "+" : ""}{portfolioStats.allTimePercent.toFixed(2)}% All-Time
            </p>
          </div>
        </div>
        <button 
          onClick={() => setIsEditing(!isEditing)}
          className="rounded-full bg-white/10 p-2 text-white hover:bg-white/20 transition-colors"
        >
          {isEditing ? <Check size={18} className="text-green-400" /> : <Edit2 size={18} />}
        </button>
      </div>

      <div className="relative overflow-hidden">
        <motion.div
          className="flex"
          drag={!isEditing ? "x" : false}
          dragConstraints={{ left: -100, right: 100 }}
          animate={{ x: `-${page * 100}%` }}
          onDragEnd={(_, info) => {
            if (info.offset.x < -80) setPage(1);
            if (info.offset.x > 80) setPage(0);
          }}
        >
          <div className="w-full flex-none px-1">
            <div className="glassy rounded-3xl p-5">
              {!isEditing && (
                <div className="relative h-64 mb-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={portfolioStats.enrichedHoldings} dataKey="value"
                        innerRadius={78} outerRadius={110} paddingAngle={3} cornerRadius={8} stroke="none"
                      >
                        {portfolioStats.enrichedHoldings.map((_, i) => <Cell key={i} fill={colors[i % colors.length]} />)}
                      </Pie>
                    </PieChart>
                  </ResponsiveContainer>
                  <div className="absolute inset-0 flex flex-col items-center justify-center">
                    <p className="text-xs uppercase tracking-widest text-white/50">AI Risk Score</p>
                    <p className="text-4xl font-semibold text-white">{pulseMetrics.riskScore}</p>
                  </div>
                </div>
              )}

              <div className={cn("grid gap-3", isEditing ? "grid-cols-1" : "grid-cols-2 mt-4")}>
                <AnimatePresence>
                  {portfolioStats.enrichedHoldings.map((holding, i) => (
                    <motion.div 
                      key={holding.symbol} layout initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }}
                      className={cn("rounded-2xl bg-white/5 p-4 flex justify-between items-center transition", !isEditing && "cursor-pointer hover:bg-white/10 active:scale-[0.98]")}
                      onClick={() => !isEditing && onViewStock?.(holding.symbol)}
                    >
                      <div className="flex-1 pointer-events-none">
                        <div className="flex items-center gap-2">
                          {!isEditing && <div className="h-2.5 w-2.5 rounded-full" style={{ background: colors[i % colors.length] }} />}
                          <span className="font-semibold text-white">{holding.symbol}</span>
                          {!isEditing && (
                            <span className={cn("text-[10px] px-1.5 py-0.5 rounded-sm flex items-center gap-0.5", holding.totalReturnPercent >= 0 ? "bg-green-400/20 text-green-400" : "bg-red-400/20 text-red-400")}>
                              {holding.totalReturnPercent >= 0 ? <TrendingUp size={10} /> : <TrendingDown size={10} />}
                              {Math.abs(holding.totalReturnPercent).toFixed(1)}%
                            </span>
                          )}
                        </div>
                        
                        {isEditing ? (
                          <div className="mt-2 text-sm text-white/60">
                            {holding.shares} shrs @ ${holding.purchasePrice?.toFixed(2)}
                          </div>
                        ) : (
                          <>
                            <p className="text-xs text-white/60 mt-1">{holding.shares} shrs • Avg ${holding.purchasePrice?.toFixed(2)}</p>
                            <p className="mt-2 text-lg font-semibold text-white">{formatCurrency(holding.value)}</p>
                          </>
                        )}
                      </div>
                      {isEditing && <button onClick={() => removeHolding(holding.symbol, holding.id)} className="p-2 text-red-400/70 hover:text-red-400"><Trash2 size={18} /></button>}
                    </motion.div>
                  ))}
                </AnimatePresence>

                {isEditing && (
                  <div className="rounded-2xl border border-dashed border-white/20 p-4 relative" ref={searchRef}>
                    <div className="flex items-center gap-2">
                      <div className="relative w-24">
                        <input 
                          placeholder="TICKER" value={newSymbol} onChange={handleSymbolChange}
                          className="w-full bg-transparent border-b border-white/20 px-1 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-vel-teal uppercase"
                        />
                        <AnimatePresence>
                          {showDropdown && searchResults.length > 0 && (
                            <motion.ul 
                              initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 5 }}
                              className="absolute left-0 top-full mt-2 w-48 rounded-xl bg-vel-panel2 border border-white/10 shadow-card overflow-hidden z-50"
                            >
                              {searchResults.slice(0, 5).map(res => (
                                <li 
                                  key={res.symbol} onClick={() => selectTicker(res)}
                                  className="px-3 py-2 text-sm hover:bg-white/10 cursor-pointer flex justify-between group transition-colors"
                                >
                                  <span className="text-white font-semibold">{res.symbol}</span>
                                  <span className="text-white/50 text-xs truncate ml-2 group-hover:text-white/70">{res.name}</span>
                                </li>
                              ))}
                            </motion.ul>
                          )}
                        </AnimatePresence>
                      </div>
                      <input 
                        type="number" placeholder="Shares" value={newShares} onChange={(e) => setNewShares(e.target.value)}
                        className="w-20 bg-transparent border-b border-white/20 px-1 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-vel-teal"
                      />
                      <input 
                        type="number" placeholder="Avg $" value={newPrice} onChange={(e) => setNewPrice(e.target.value)}
                        className="w-20 bg-transparent border-b border-white/20 px-1 py-1 text-sm text-white placeholder:text-white/30 focus:outline-none focus:border-vel-teal"
                      />
                      <button onClick={addHolding} className="ml-auto p-1.5 bg-vel-teal/20 text-vel-teal rounded-lg hover:bg-vel-teal/30 transition-colors">
                        <Plus size={18} />
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="w-full flex-none px-1">
             <div className="glassy rounded-3xl p-5">
              <h2 className="text-xl font-semibold mb-6">Portfolio Pulse</h2>
              <div className="space-y-6">
                {pulseMetrics.rows.map((metric, i) => (
                  <div key={i}>
                    <div className="flex justify-between mb-1.5">
                      <p className="text-white/80">{metric.label}</p>
                      <p className="text-white">{metric.value}</p>
                    </div>
                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                      <motion.div initial={{ width: 0 }} animate={{ width: `${metric.percent}%` }} transition={{ duration: 1, delay: 0.2 }} className="h-full bg-gradient-to-r from-vel-teal to-red-500" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      </div>

      {!isEditing && (
        <div className="mt-4 flex justify-center gap-2">
          {[0, 1].map((i) => (
            <button key={i} onClick={() => setPage(i)} className={cn("h-1.5 rounded-full transition-all", page === i ? "w-8 bg-vel-teal" : "w-1.5 bg-white/30")} />
          ))}
        </div>
      )}
    </section>
  );
}
