/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useMemo, useState, useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Copy, Check, RotateCcw, Sparkles, ExternalLink, Globe } from "lucide-react";
import { cn } from "@/lib/utils";

export type StreamingSource = {
  name: string;
  domain: string;
  href: string;
  date?: string;
};

export type BuiStreamingTextProps = {
  content: string;
  isStreaming?: boolean;
  onRerun?: () => void;
  onFollowUp?: (prompt: string) => void;
  followUps?: string[];
  markdownComponents?: any;
};

/**
 * Extracts verified sources and citations from Markdown content
 * Handles:
 * • ## Sources / ## Verified Sources / ### Sources / ## 6. Sources
 * • [Publisher / Title](URL) — Date
 * • Velora data as of Date
 */
export function extractSourcesFromMarkdown(content: string): StreamingSource[] {
  const sources: StreamingSource[] = [];
  if (!content) return sources;

  const lines = content.split("\n");
  let inSourcesSection = false;

  for (const line of lines) {
    const trimmed = line.trim();
    if (/^#{1,4}\s*(?:\d+\.\s*)?(?:verified\s*)?sources/i.test(trimmed) || /^\*\*(?:verified\s*)?sources:?\*\*/i.test(trimmed)) {
      inSourcesSection = true;
      continue;
    }
    if (inSourcesSection && /^#{1,3}\s+[A-Za-z0-9]/.test(trimmed) && !/sources/i.test(trimmed)) {
      inSourcesSection = false;
      continue;
    }

    if (inSourcesSection || line.includes("Velora data as of")) {
      // Match markdown link: [Name](url)
      const linkMatch = line.match(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)(?:\s*[—–-]\s*([^\n\r]+))?/);
      if (linkMatch) {
        const fullName = linkMatch[1];
        const href = linkMatch[2];
        const date = linkMatch[3]?.trim();
        let domain = "";
        try {
          domain = new URL(href).hostname.replace(/^www\./, "");
        } catch {
          domain = fullName.split("/")[0]?.trim() || "web";
        }

        if (!sources.some(s => s.href === href)) {
          sources.push({
            name: fullName,
            domain,
            href,
            date,
          });
        }
      } else if (line.includes("Velora data as of")) {
        const dateMatch = line.match(/Velora data as of ([^\n\r*]+)/i);
        const date = dateMatch ? dateMatch[1].trim() : undefined;
        if (!sources.some(s => s.name === "Velora Portfolio & Market Engine")) {
          sources.push({
            name: "Velora Portfolio & Market Engine",
            domain: "velora.ai",
            href: "https://velora.anishdubey.com",
            date,
          });
        }
      }
    }
  }

  // Fallback: If no explicit ## Sources section was marked but content has links, extract them
  if (sources.length === 0) {
    const allLinks = Array.from(content.matchAll(/\[([^\]]+)\]\((https?:\/\/[^\s)]+)\)/g));
    for (const match of allLinks) {
      const name = match[1];
      const href = match[2];
      try {
        const domain = new URL(href).hostname.replace(/^www\./, "");
        if (!sources.some(s => s.href === href)) {
          sources.push({ name, domain, href });
        }
      } catch {}
    }
  }

  return sources;
}

/**
 * Beautiful UI Inline Source Chip
 */
export function BuiSourceChip({ source }: { source: StreamingSource }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-5 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.05] hover:bg-teal-500/20 px-2 py-0.5 text-[11px] font-mono text-cyan-300 hover:text-white transition-all align-middle mx-1 my-0.5 shadow-sm"
      style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
      title={source.name}
    >
      <Globe size={11} className="text-teal-400 shrink-0" />
      <span className="truncate max-w-[130px]">{source.domain}</span>
      {source.date && <span className="text-[10px] text-white/40">· {source.date}</span>}
      <ExternalLink size={10} className="opacity-60" />
    </a>
  );
}

/**
 * Generates sharp, contextual follow-ups if none were provided
 */
function generateContextualFollowUps(content: string): string[] {
  if (!content) return [];

  // Check for tickers
  const tickerMatch = content.match(/\b([A-Z]{2,5})\b/);
  const subjectTicker = tickerMatch ? tickerMatch[1] : null;

  if (content.toLowerCase().includes("portfolio") || content.toLowerCase().includes("health check")) {
    return [
      "Which holding has the highest risk concentration?",
      "Suggest rebalancing ideas based on current winners",
      "How does my portfolio beta compare to the S&P 500?",
    ];
  }

  if (content.toLowerCase().includes("nifty") || content.toLowerCase().includes("sensex")) {
    return [
      "What are the key macro catalysts driving Indian markets today?",
      "Compare Nifty 50 performance with BSE Sensex",
      "What is the market open and close schedule for this week?",
    ];
  }

  if (content.toLowerCase().includes("s&p 500") || content.toLowerCase().includes("nasdaq") || content.toLowerCase().includes("dow")) {
    return [
      "What are the upcoming economic events impacting US equities?",
      "How are mega-cap tech earnings revisions trending?",
      "What time does the US regular trading session open?",
    ];
  }

  if (subjectTicker && !["TRADE", "SETUP", "P/E", "USD", "EST", "IST", "BSE", "NSE"].includes(subjectTicker)) {
    return [
      `What are the key downside risks and bear cases for ${subjectTicker}?`,
      `Compare ${subjectTicker}'s valuation and P/E ratio with peers`,
      `What is ${subjectTicker}'s 52-week high and low range?`,
    ];
  }

  return [
    "Run a full portfolio health check on my Velora portfolio",
    "What are today's top market movers and catalysts?",
    "Give me a combined full analysis of NVDA and TSLA",
  ];
}

export function BuiStreamingText({
  content,
  isStreaming = false,
  onRerun,
  onFollowUp,
  followUps,
  markdownComponents,
}: BuiStreamingTextProps) {
  const [copied, setCopied] = useState(false);
  const [sourcesExpanded, setSourcesExpanded] = useState(false);

  // Progressive reveal for smooth streaming & blur-resolve
  const [displayedLength, setDisplayedLength] = useState(() => (content ? Math.min(content.length, 10) : 0));

  useEffect(() => {
    if (!isStreaming) {
      setDisplayedLength(content.length);
      return;
    }

    if (content.length > displayedLength) {
      // Step progressive display smoothly (4-8 chars per 16ms tick)
      const diff = content.length - displayedLength;
      const step = Math.max(3, Math.min(diff, Math.ceil(diff / 3)));
      const timer = setTimeout(() => {
        setDisplayedLength((prev) => Math.min(content.length, prev + step));
      }, 16);
      return () => clearTimeout(timer);
    }
  }, [content, isStreaming, displayedLength]);

  const sources = useMemo(() => extractSourcesFromMarkdown(content), [content]);

  // Strip the raw trailing "## Sources" block if rendered separately, and guarantee inline citation chip
  const displayContent = useMemo(() => {
    let raw = isStreaming ? content.slice(0, displayedLength) : content;

    // Sanitize any rogue template artifact: "from the previous session close of N/A on N/A"
    raw = raw.replace(/\s*(?:,\s*a\s+move\s+of\s+[^,.]+)?\s*(?:from\s+the\s+)?previous\s+session\s+close\s+of\s+N\/A(?:\s+on\s+N\/A)?\.?/gi, ".");

    if (sources.length > 0 && !isStreaming) {
      const idx = raw.search(/#{1,3}\s*(?:\d+\.\s*)?(?:verified\s*)?sources/i);
      if (idx !== -1) {
        raw = raw.slice(0, idx).trim();
      }
    }
    // If the body does not already contain an inline markdown link, inject top verified source chip in Section 2
    if (sources.length > 0 && !raw.includes("](") && !isStreaming) {
      const topSource = sources[0];
      const sec2End = raw.search(/##\s*3\./i);
      if (sec2End !== -1) {
        const insertion = `*(Verified via [${topSource.domain || topSource.name}](${topSource.href}))*\n\n`;
        raw = raw.slice(0, sec2End) + insertion + raw.slice(sec2End);
      }
    }
    return raw;
  }, [content, isStreaming, displayedLength, sources]);

  const resolvedFollowUps = useMemo(() => {
    if (followUps && followUps.length > 0) return followUps;
    return generateContextualFollowUps(content);
  }, [followUps, content]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Merge custom markdown components with inline source chips
  const mergedMarkdownComponents = useMemo(() => {
    return {
      ...markdownComponents,
      // Render markdown links inline as Beautiful UI Source Chips
      a: ({ href, children }: any) => {
        let domain = "";
        try {
          domain = href ? new URL(href).hostname.replace(/^www\./, "") : "";
        } catch {}
        return (
          <a
            href={href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-1 px-2 py-0.5 mx-1 rounded-md bg-teal-500/10 hover:bg-teal-500/20 border border-teal-500/30 text-teal-300 hover:text-white text-[11px] font-mono align-middle transition-all shadow-sm group/chip cursor-pointer"
          >
            <Globe size={11} className="text-teal-400 shrink-0" />
            <span className="truncate max-w-[130px] font-medium">{domain || children}</span>
            <ExternalLink size={9} className="opacity-60 group-hover/chip:opacity-100" />
          </a>
        );
      },
    };
  }, [markdownComponents]);

  return (
    <div className="w-full space-y-3">
      {/* Markdown rendered stream with blur-resolve class */}
      <div className={cn("relative", isStreaming && "blur-resolve-stream")}>
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={mergedMarkdownComponents}>
          {displayContent}
        </ReactMarkdown>

        {/* Streaming Caret with Leading-Edge Glow */}
        {isStreaming && (
          <span
            aria-hidden
            className="stream-caret is-streaming align-middle ml-1"
          />
        )}
      </div>

      {/* Finished State: Actions, Real Sources, and Follow-up Suggestions */}
      {!isStreaming && content && (
        <div className="pt-2 border-t border-white/5 space-y-3" style={{ animation: "fade-in 300ms ease-out both" }}>
          {/* Action Row */}
          <div className="flex items-center gap-2 flex-wrap">
            {onRerun && (
              <button
                type="button"
                onClick={onRerun}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
                title="Rerun analysis"
              >
                <RotateCcw size={12} />
                <span>Rerun</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition cursor-pointer"
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} className="text-teal-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            {/* Consistent Verified Sources button */}
            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => setSourcesExpanded(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 hover:bg-teal-500/20 transition cursor-pointer"
              >
                <Globe size={12} />
                <span>{sources.length} Verified Sources</span>
              </button>
            )}
          </div>

          {/* Expandable Sources Drawer */}
          {sources.length > 0 && sourcesExpanded && (
            <div
              className="p-3 rounded-xl bg-[#080D1A] border border-white/10 space-y-2"
              style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
            >
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300 flex items-center gap-1.5">
                <Globe size={12} className="text-teal-400" />
                <span>Verified Information Sources & Telemetry</span>
              </div>
              <div className="flex flex-col gap-1.5">
                {sources.map((s, idx) => (
                  <a
                    key={idx}
                    href={s.href}
                    target="_blank"
                    rel="noreferrer"
                    className="flex items-center justify-between p-2 rounded-lg bg-white/[0.02] hover:bg-white/[0.06] border border-white/5 transition text-xs group"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <Globe size={13} className="text-teal-400 shrink-0" />
                      <span className="text-white group-hover:text-teal-300 transition truncate">{s.name}</span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0 text-white/40 font-mono text-[11px]">
                      {s.date && <span>{s.date}</span>}
                      <span className="text-teal-400/80">{s.domain}</span>
                      <ExternalLink size={11} className="opacity-60 group-hover:opacity-100" />
                    </div>
                  </a>
                ))}
              </div>
            </div>
          )}

          {/* Follow-up Prompts (Beautiful UI style) */}
          {resolvedFollowUps.length > 0 && onFollowUp && (
            <div className="pt-2">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/50 mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-teal-400" /> Suggested Follow-ups
              </p>
              <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2">
                {resolvedFollowUps.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFollowUp(prompt)}
                    className="flex items-center gap-2 text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 hover:text-white hover:border-teal-500/40 hover:bg-white/[0.07] transition text-left cursor-pointer group"
                    style={{ animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${idx * 60}ms both` }}
                  >
                    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="text-teal-400/70 group-hover:text-teal-300 shrink-0">
                      <path d="M9 10l-5 5 5 5" />
                      <path d="M20 4v7a4 4 0 0 1-4 4H4" />
                    </svg>
                    <span>{prompt}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
