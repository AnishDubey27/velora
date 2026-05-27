"use client";

import { useState, useMemo } from "react";
import useSWR from "swr";
import { motion, AnimatePresence } from "framer-motion";
import { Clock, Calendar, CheckCircle2, MinusCircle, XCircle, ChevronRight } from "lucide-react";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, ReferenceLine, Cell,
} from "recharts";
import { cn } from "@/lib/utils";
import type { EarningsEntry } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function formatLargeNumber(num: number): string {
  const abs = Math.abs(num);
  if (abs >= 1e12) return `$${(num / 1e12).toFixed(1)}T`;
  if (abs >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (abs >= 1e6) return `$${(num / 1e6).toFixed(1)}M`;
  if (abs >= 1e3) return `$${(num / 1e3).toFixed(1)}K`;
  return `$${num.toFixed(2)}`;
}

function getQuarterLabel(period: string, date: string): string {
  if (period) return period;
  const d = new Date(date);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `Q${q} FY${d.getFullYear().toString().slice(-2)}`;
}

function formatDate(dateStr: string): string {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return dateStr;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

type BeatStatus = "Beat" | "Miss" | "In Line" | "N/A";

function getBeatStatus(actual: number | null, estimated: number | null): BeatStatus {
  if (actual === null || estimated === null) return "N/A";
  if (actual > estimated * 1.005) return "Beat";
  if (actual < estimated * 0.995) return "Miss";
  return "In Line";
}

function statusIcon(status: BeatStatus) {
  if (status === "Beat") return <CheckCircle2 size={16} className="text-vel-green" />;
  if (status === "Miss") return <XCircle size={16} className="text-vel-red" />;
  if (status === "In Line") return <MinusCircle size={16} className="text-vel-amber" />;
  return <MinusCircle size={16} className="text-white/20" />;
}

function statusColor(status: BeatStatus) {
  if (status === "Beat") return "text-vel-green";
  if (status === "Miss") return "text-vel-red";
  if (status === "In Line") return "text-vel-amber";
  return "text-white/40";
}

/* ─── Custom Recharts Tooltip ─── */
function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-vel-panel2 border border-white/10 rounded-xl px-4 py-3 shadow-card text-xs">
      <p className="font-bold text-white mb-1.5">{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} className="text-white/70">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ background: p.color }} />
          {p.name}: {typeof p.value === "number" ? (Math.abs(p.value) >= 1e6 ? formatLargeNumber(p.value) : `$${p.value.toFixed(2)}`) : p.value}
        </p>
      ))}
    </div>
  );
}

export function StockEarningsTab({ symbol }: { symbol: string }) {
  const [view, setView] = useState<"past" | "upcoming">("past");

  const { data, error, isLoading } = useSWR<EarningsEntry[]>(
    `/api/stock/earnings?symbol=${symbol}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  const { pastEntries, upcomingEntries } = useMemo(() => {
    if (!Array.isArray(data)) return { pastEntries: [], upcomingEntries: [] };
    const now = Date.now();
    const past: EarningsEntry[] = [];
    const upcoming: EarningsEntry[] = [];
    for (const e of data) {
      if (new Date(e.date).getTime() <= now && e.epsActual !== null) {
        past.push(e);
      } else {
        upcoming.push(e);
      }
    }
    // Sort past: most recent first
    past.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    // Sort upcoming: nearest first
    upcoming.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    return { pastEntries: past, upcomingEntries: upcoming };
  }, [data]);

  // EPS chart data (past, up to 8 quarters, ordered chronologically)
  const epsChartData = useMemo(() => {
    return pastEntries
      .slice(0, 8)
      .reverse()
      .map((e) => ({
        quarter: getQuarterLabel(e.fiscalPeriod, e.fiscalDateEnding),
        actual: e.epsActual,
        estimated: e.epsEstimated,
        surprise: e.epsSurprise !== null ? (e.epsSurprise * 100) : null,
      }));
  }, [pastEntries]);

  // Revenue chart data
  const revChartData = useMemo(() => {
    return pastEntries
      .slice(0, 8)
      .reverse()
      .map((e) => ({
        quarter: getQuarterLabel(e.fiscalPeriod, e.fiscalDateEnding),
        actual: e.revenueActual,
        estimated: e.revenueEstimated,
        surprise: e.revenueSurprise !== null ? (e.revenueSurprise * 100) : null,
      }));
  }, [pastEntries]);

  if (isLoading) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="glassy rounded-2xl p-5">
          <div className="h-6 bg-white/[0.06] rounded w-1/3 mb-4" />
          <div className="grid grid-cols-3 gap-3">
            {[1, 2, 3].map((n) => (
              <div key={n} className="h-24 bg-white/[0.04] rounded-xl" />
            ))}
          </div>
        </div>
        <div className="glassy rounded-2xl p-5">
          <div className="h-[200px] bg-white/[0.04] rounded-xl" />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="glassy rounded-2xl p-8 text-center">
        <p className="text-sm text-vel-red">Failed to load earnings data.</p>
      </div>
    );
  }

  const latest = pastEntries[0] ?? null;

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-4">
      {/* ─── Past / Upcoming Toggle ─── */}
      <div className="flex gap-1 bg-white/[0.03] rounded-xl p-1">
        <button
          onClick={() => setView("past")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all duration-200",
            view === "past"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/40 hover:text-white/60"
          )}
        >
          <Clock size={13} /> Past
        </button>
        <button
          onClick={() => setView("upcoming")}
          className={cn(
            "flex-1 flex items-center justify-center gap-2 text-[11px] font-bold uppercase tracking-wider px-4 py-2.5 rounded-lg transition-all duration-200",
            view === "upcoming"
              ? "bg-white/10 text-white shadow-sm"
              : "text-white/40 hover:text-white/60"
          )}
        >
          <Calendar size={13} /> Upcoming
        </button>
      </div>

      <AnimatePresence mode="wait">
        {view === "past" ? (
          <motion.div
            key="past"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {/* ─── Latest quarter summary ─── */}
            {pastEntries.length === 0 ? (
              <div className="glassy rounded-2xl p-8 text-center">
                <Calendar size={32} className="text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/40">No past earnings data available.</p>
              </div>
            ) : latest ? (
              <div className="glassy rounded-2xl p-5">
                <p className="text-[13px] font-bold text-white mb-1">
                  {getQuarterLabel(latest.fiscalPeriod, latest.fiscalDateEnding)}
                  <span className="text-white/30 font-normal mx-2">·</span>
                  <span className="text-white/40 font-normal text-[12px]">
                    {formatDate(latest.date)}
                  </span>
                </p>

                <div className="grid grid-cols-3 gap-3 mt-3">
                  {/* Revenue card */}
                  {(() => {
                    const status = getBeatStatus(latest.revenueActual, latest.revenueEstimated);
                    return (
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <div className="flex justify-center mb-1">{statusIcon(status)}</div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Revenue</p>
                        <p className={cn("text-[11px] font-bold", statusColor(status))}>{status}</p>
                        {latest.revenueEstimated !== null && (
                          <p className="text-[9px] text-white/25 mt-1">
                            Est {formatLargeNumber(latest.revenueEstimated)}
                          </p>
                        )}
                        {latest.revenueActual !== null && (
                          <p className="text-[10px] text-white/50">
                            Act {formatLargeNumber(latest.revenueActual)}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {/* EPS card */}
                  {(() => {
                    const status = getBeatStatus(latest.epsActual, latest.epsEstimated);
                    return (
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <div className="flex justify-center mb-1">{statusIcon(status)}</div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">EPS</p>
                        <p className={cn("text-[11px] font-bold", statusColor(status))}>{status}</p>
                        {latest.epsEstimated !== null && (
                          <p className="text-[9px] text-white/25 mt-1">
                            Est ${latest.epsEstimated?.toFixed(2)}
                          </p>
                        )}
                        {latest.epsActual !== null && (
                          <p className="text-[10px] text-white/50">
                            Act ${latest.epsActual?.toFixed(2)}
                          </p>
                        )}
                      </div>
                    );
                  })()}
                  {/* Surprise card */}
                  {(() => {
                    const surprise = latest.epsSurprise;
                    const label = surprise !== null
                      ? surprise > 0 ? "Above" : surprise < 0 ? "Below" : "In Line"
                      : "N/A";
                    const color = surprise !== null
                      ? surprise > 0 ? "text-vel-green" : surprise < 0 ? "text-vel-red" : "text-vel-amber"
                      : "text-white/40";
                    return (
                      <div className="rounded-xl bg-white/[0.03] p-3 text-center">
                        <div className="flex justify-center mb-1">
                          {surprise !== null && surprise > 0
                            ? <CheckCircle2 size={16} className="text-vel-green" />
                            : surprise !== null && surprise < 0
                              ? <XCircle size={16} className="text-vel-red" />
                              : <MinusCircle size={16} className="text-vel-amber" />}
                        </div>
                        <p className="text-[10px] text-white/40 uppercase tracking-wider mb-1">Guidance</p>
                        <p className={cn("text-[11px] font-bold", color)}>{label}</p>
                        {surprise !== null && (
                          <p className="text-[10px] text-white/50 mt-1">
                            {surprise > 0 ? "+" : ""}{(surprise * 100).toFixed(1)}%
                          </p>
                        )}
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : null}

            {/* ─── EPS Chart ─── */}
            {epsChartData.length > 0 && (
              <div className="glassy rounded-2xl p-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-4">
                  EPS History
                </h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={epsChartData} barGap={4} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="quarter"
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => `$${v}`}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}
                        iconType="circle"
                        iconSize={6}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                      <Bar dataKey="actual" name="Actual EPS" radius={[4, 4, 0, 0]} maxBarSize={24}>
                        {epsChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.actual !== null && entry.estimated !== null && entry.actual >= entry.estimated
                                ? "#3DF0A4"
                                : "#FF4D5E"
                            }
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="estimated" name="Est. EPS" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                {/* Surprise labels */}
                <div className="flex justify-around mt-1">
                  {epsChartData.map((e, i) => (
                    <p
                      key={i}
                      className={cn(
                        "text-[9px] font-semibold",
                        e.surprise !== null && e.surprise > 0 ? "text-vel-green" : e.surprise !== null && e.surprise < 0 ? "text-vel-red" : "text-white/20"
                      )}
                    >
                      {e.surprise !== null ? `${e.surprise > 0 ? "+" : ""}${e.surprise.toFixed(1)}%` : "—"}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {/* ─── Revenue Chart ─── */}
            {revChartData.length > 0 && (
              <div className="glassy rounded-2xl p-5">
                <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-4">
                  Revenue History
                </h3>
                <div className="h-[220px]">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={revChartData} barGap={4} barCategoryGap="25%">
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                      <XAxis
                        dataKey="quarter"
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                      />
                      <YAxis
                        tick={{ fill: "rgba(255,255,255,0.35)", fontSize: 10 }}
                        axisLine={false}
                        tickLine={false}
                        tickFormatter={(v) => formatLargeNumber(v).replace("$", "")}
                      />
                      <Tooltip content={<ChartTooltip />} />
                      <Legend
                        wrapperStyle={{ fontSize: 10, color: "rgba(255,255,255,0.4)" }}
                        iconType="circle"
                        iconSize={6}
                      />
                      <ReferenceLine y={0} stroke="rgba(255,255,255,0.1)" />
                      <Bar dataKey="actual" name="Actual Revenue" radius={[4, 4, 0, 0]} maxBarSize={24}>
                        {revChartData.map((entry, i) => (
                          <Cell
                            key={i}
                            fill={
                              entry.actual !== null && entry.estimated !== null && entry.actual >= entry.estimated
                                ? "#F6C45F"
                                : "#FF4D5E"
                            }
                          />
                        ))}
                      </Bar>
                      <Bar dataKey="estimated" name="Est. Revenue" fill="rgba(255,255,255,0.15)" radius={[4, 4, 0, 0]} maxBarSize={24} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            )}
          </motion.div>
        ) : (
          <motion.div
            key="upcoming"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-4"
          >
            {upcomingEntries.length === 0 ? (
              <div className="glassy rounded-2xl p-8 text-center">
                <Calendar size={32} className="text-white/15 mx-auto mb-3" />
                <p className="text-sm text-white/40">No upcoming earnings dates announced.</p>
              </div>
            ) : (
              <>
                {/* Next Earnings card */}
                {(() => {
                  const next = upcomingEntries[0];
                  return (
                    <div className="glassy rounded-2xl p-5">
                      <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-3">
                        Next Earnings
                      </h3>
                      <p className="text-lg font-bold text-white">
                        {getQuarterLabel(next.fiscalPeriod, next.fiscalDateEnding)}
                      </p>
                      <p className="text-sm text-white/50 mt-1">
                        Estimated Date: {formatDate(next.date)}
                      </p>

                      <div className="grid grid-cols-2 gap-3 mt-4">
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                            EPS Estimate
                          </p>
                          <p className="text-lg font-bold text-white">
                            {next.epsEstimated !== null ? `$${next.epsEstimated.toFixed(2)}` : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl bg-white/[0.03] p-3">
                          <p className="text-[10px] text-white/30 uppercase tracking-wider mb-1">
                            Revenue Estimate
                          </p>
                          <p className="text-lg font-bold text-white">
                            {next.revenueEstimated !== null ? formatLargeNumber(next.revenueEstimated) : "—"}
                          </p>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* What to Look Out For */}
                <div className="glassy rounded-2xl p-5">
                  <h3 className="text-[11px] font-black uppercase tracking-[0.1em] text-white/60 mb-3">
                    What to Look Out For
                  </h3>
                  <ul className="space-y-2 text-[13px] text-white/60">
                    <li className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-vel-teal mt-0.5 flex-shrink-0" />
                      Revenue growth trajectory vs. analyst expectations
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-vel-teal mt-0.5 flex-shrink-0" />
                      Margin expansion or compression commentary
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-vel-teal mt-0.5 flex-shrink-0" />
                      Forward guidance and outlook updates
                    </li>
                    <li className="flex items-start gap-2">
                      <ChevronRight size={14} className="text-vel-teal mt-0.5 flex-shrink-0" />
                      Capital allocation strategy (buybacks, dividends)
                    </li>
                  </ul>
                </div>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
