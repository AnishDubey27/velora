/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useMemo, useState } from "react";
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
 * Parses real Velora sources from the Markdown content
 * Expected format:
 * • [Publisher / Title](URL) — Date
 * • Velora data as of Date
 */
export function extractSourcesFromMarkdown(content: string): StreamingSource[] {
  const sources: StreamingSource[] = [];
  const lines = content.split("\n");
  let inSourcesSection = false;

  for (const line of lines) {
    if (line.trim().startsWith("## Sources") || line.trim().startsWith("### Sources")) {
      inSourcesSection = true;
      continue;
    }
    if (inSourcesSection && line.startsWith("## ")) {
      inSourcesSection = false;
      continue;
    }

    if (inSourcesSection) {
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
        const dateMatch = line.match(/Velora data as of ([^\n\r]+)/);
        sources.push({
          name: "Velora Portfolio & Market Engine",
          domain: "velora.ai",
          href: "https://velora.anishdubey.com",
          date: dateMatch ? dateMatch[1].trim() : undefined,
        });
      }
    }
  }

  return sources;
}

export function BuiSourceChip({ source }: { source: StreamingSource }) {
  return (
    <a
      href={source.href}
      target="_blank"
      rel="noreferrer"
      className="inline-flex h-5 items-center gap-1.5 rounded-md border border-white/10 bg-white/[0.04] px-2 py-0.5 text-[11px] font-mono text-cyan-300 transition-colors duration-150 hover:bg-white/10 hover:text-white align-middle my-0.5"
      style={{ animation: "pop-in 200ms cubic-bezier(0.23,1,0.32,1) both" }}
    >
      <Globe size={11} className="text-teal-400 shrink-0" />
      <span className="truncate max-w-[140px]">{source.domain}</span>
      {source.date && <span className="text-[10px] text-white/40">· {source.date}</span>}
    </a>
  );
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

  const sources = useMemo(() => extractSourcesFromMarkdown(content), [content]);

  // Strip the redundant trailing "## Sources" block if we render it as an interactive panel
  const displayContent = useMemo(() => {
    if (sources.length > 0 && !isStreaming) {
      const idx = content.search(/##\s*Sources/i);
      if (idx !== -1) {
        return content.slice(0, idx).trim();
      }
    }
    return content;
  }, [content, sources, isStreaming]);

  const handleCopy = () => {
    navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="w-full space-y-3">
      {/* Markdown rendered stream */}
      <div className="relative">
        <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
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
        <div className="pt-2 border-t border-white/5 space-y-3">
          {/* Action Row */}
          <div className="flex items-center gap-2">
            {onRerun && (
              <button
                type="button"
                onClick={onRerun}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
                title="Rerun analysis"
              >
                <RotateCcw size={12} />
                <span>Rerun</span>
              </button>
            )}

            <button
              type="button"
              onClick={handleCopy}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-white/[0.04] border border-white/10 text-xs text-white/60 hover:text-white hover:bg-white/10 transition"
              title="Copy to clipboard"
            >
              {copied ? <Check size={12} className="text-teal-400" /> : <Copy size={12} />}
              <span>{copied ? "Copied" : "Copy"}</span>
            </button>

            {sources.length > 0 && (
              <button
                type="button"
                onClick={() => setSourcesExpanded(prev => !prev)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-teal-500/10 border border-teal-500/20 text-xs text-teal-300 hover:bg-teal-500/20 transition"
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
              <div className="text-[11px] font-bold uppercase tracking-wider text-teal-300">
                Verified Information Sources & Telemetry
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

          {/* Follow-up Prompts */}
          {followUps && followUps.length > 0 && onFollowUp && (
            <div className="pt-1">
              <p className="text-[11px] font-semibold uppercase tracking-wider text-white/40 mb-2 flex items-center gap-1.5">
                <Sparkles size={12} className="text-teal-400" /> Suggested Follow-ups
              </p>
              <div className="flex flex-wrap gap-2">
                {followUps.map((prompt, idx) => (
                  <button
                    key={idx}
                    onClick={() => onFollowUp(prompt)}
                    className="text-xs px-3 py-1.5 rounded-xl border border-white/10 bg-white/[0.03] text-white/80 hover:text-white hover:border-teal-500/40 hover:bg-white/[0.07] transition text-left"
                    style={{ animation: `fade-up 300ms cubic-bezier(0.23,1,0.32,1) ${idx * 60}ms both` }}
                  >
                    {prompt}
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
