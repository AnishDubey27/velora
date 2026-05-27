"use client";

import useSWR from "swr";
import { motion } from "framer-motion";
import { ExternalLink, Newspaper } from "lucide-react";
import type { StockNewsItem } from "@/lib/types";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

function timeAgo(dateStr: string): string {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  if (Number.isNaN(then)) return dateStr;

  const diff = now - then;
  const mins = Math.floor(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min${mins > 1 ? "s" : ""} ago`;

  const hours = Math.floor(mins / 60);
  if (hours < 24) return `about ${hours} hour${hours > 1 ? "s" : ""} ago`;

  const days = Math.floor(hours / 24);
  if (days < 7) return `${days} day${days > 1 ? "s" : ""} ago`;

  const weeks = Math.floor(days / 7);
  if (weeks < 5) return `${weeks} week${weeks > 1 ? "s" : ""} ago`;

  const months = Math.floor(days / 30);
  return `${months} month${months > 1 ? "s" : ""} ago`;
}

function extractDomain(url: string): string {
  try {
    return new URL(url).hostname.replace("www.", "");
  } catch {
    return "";
  }
}

export function StockNewsTab({ symbol }: { symbol: string }) {
  const { data, error, isLoading } = useSWR<StockNewsItem[]>(
    `/api/stock/news?symbol=${symbol}`,
    fetcher,
    { revalidateOnFocus: false }
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-2 animate-pulse">
            <div className="h-4 bg-white/[0.06] rounded w-full" />
            <div className="h-3 bg-white/[0.04] rounded w-1/3" />
            {i < 4 && <div className="h-px bg-white/[0.04] mt-4" />}
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="glassy rounded-2xl p-8 text-center">
        <p className="text-sm text-vel-red">Failed to load news.</p>
      </div>
    );
  }

  if (!Array.isArray(data) || data.length === 0) {
    return (
      <div className="glassy rounded-2xl p-8 text-center">
        <Newspaper size={32} className="text-white/15 mx-auto mb-3" />
        <p className="text-sm text-white/40">No news available for {symbol}.</p>
      </div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="glassy rounded-2xl divide-y divide-white/[0.06]"
    >
      {data.map((article, i) => (
        <a
          key={i}
          href={article.url}
          target="_blank"
          rel="noreferrer"
          className="flex items-start justify-between gap-3 px-5 py-4 hover:bg-white/[0.03] transition-colors group"
        >
          <div className="min-w-0 flex-1">
            <p className="text-[13px] font-semibold text-white leading-snug line-clamp-2 group-hover:text-vel-teal transition-colors">
              {article.title}
            </p>
            <p className="text-[11px] text-white/35 mt-1.5">
              {article.site || extractDomain(article.url)}
              <span className="mx-1.5 text-white/20">·</span>
              {timeAgo(article.publishedDate)}
            </p>
          </div>
          <ExternalLink
            size={14}
            className="text-white/20 group-hover:text-white/50 transition-colors mt-1 flex-shrink-0"
          />
        </a>
      ))}
    </motion.div>
  );
}
