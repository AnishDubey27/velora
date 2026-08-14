"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, User, ArrowLeft, Loader2, Sparkles, Copy, Check, TrendingUp, TrendingDown, Target, ShieldAlert, Zap, Pin, Activity } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { DEFAULT_MODEL } from "@/lib/nvidia";
import { BuiLoadingState } from "@/components/ui/bui-loading-state";
import { BuiThinkingState } from "@/components/ui/bui-thinking-state";
import { BuiToolChips } from "@/components/ui/bui-tool-chips";
import { BuiModelSelector } from "@/components/ui/bui-model-selector";
import { BuiContextCards } from "@/components/ui/bui-context-cards";
import { BuiSelectionActions } from "@/components/ui/bui-selection-actions";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

export type SkillContext = {
  systemPrompt: string;
  displayMessage: string;
  hiddenPrompt: string;
  suggestions: string[];
};

// Helper: Extract text from React children safely
function extractText(children: any): string {
  if (typeof children === "string") return children;
  if (typeof children === "number") return String(children);
  if (Array.isArray(children)) return children.map(extractText).join("");
  if (children?.props?.children) return extractText(children.props.children);
  return "";
}

// ── Smart Infographic Components ──

function InfographicBlockquote({ children }: any) {
  const rawText = extractText(children);

  // 1. Trade Setup Infographic Card
  if (rawText.toUpperCase().includes("TRADE SETUP")) {
    const entryMatch = rawText.match(/Entry:\s*([^|]+)/i);
    const targetMatch = rawText.match(/Target:\s*([^|]+)/i);
    const stopMatch = rawText.match(/Stop\s*Loss:\s*([^|]+)/i);
    const biasMatch = rawText.match(/Bias:\s*([^|]+)/i);

    const entry = entryMatch ? entryMatch[1].trim() : null;
    const target = targetMatch ? targetMatch[1].trim() : null;
    const stop = stopMatch ? stopMatch[1].trim() : null;
    const bias = biasMatch ? biasMatch[1].trim() : "Bullish";

    const isBullish = bias.toLowerCase().includes("bull");
    const isBearish = bias.toLowerCase().includes("bear");

    return (
      <div className="my-4 rounded-2xl border border-vel-teal/30 bg-gradient-to-br from-[#0B1528] via-[#091120] to-[#050914] p-4 shadow-2xl backdrop-blur-xl">
        {/* Card Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3 mb-3">
          <div className="flex items-center gap-2">
            <div className="h-7 w-7 rounded-lg bg-vel-teal/20 flex items-center justify-center border border-vel-teal/30">
              <Target size={15} className="text-vel-teal animate-pulse" />
            </div>
            <span className="text-xs font-bold uppercase tracking-wider text-teal-300">
              Infographic Trade Setup
            </span>
          </div>
          <span className={cn(
            "px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
            isBullish && "bg-emerald-500/20 text-emerald-400 border-emerald-500/40 shadow-sm shadow-emerald-500/20",
            isBearish && "bg-rose-500/20 text-rose-400 border-rose-500/40 shadow-sm shadow-rose-500/20",
            !isBullish && !isBearish && "bg-amber-500/20 text-amber-400 border-amber-500/40"
          )}>
            {isBullish ? "🚀 Bullish Bias" : isBearish ? "📉 Bearish Bias" : "⚖️ Neutral"}
          </span>
        </div>

        {/* 3 Visual Pillar Stat Boxes */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2.5">
          {/* Entry Box */}
          <div className="rounded-xl bg-white/[0.03] border border-white/10 p-3 flex flex-col">
            <span className="text-[11px] font-medium uppercase text-white/50 mb-1 flex items-center gap-1">
              <span className="h-2 w-2 rounded-full bg-emerald-400" /> Entry Zone
            </span>
            <span className="text-sm md:text-base font-bold text-white font-mono">
              {entry || "Current Market"}
            </span>
          </div>

          {/* Target Box */}
          <div className="rounded-xl bg-emerald-500/10 border border-emerald-500/20 p-3 flex flex-col">
            <span className="text-[11px] font-medium uppercase text-emerald-400 mb-1 flex items-center gap-1">
              <TrendingUp size={12} /> Price Target
            </span>
            <span className="text-sm md:text-base font-bold text-emerald-300 font-mono">
              {target || "N/A"}
            </span>
          </div>

          {/* Stop Loss Box */}
          <div className="rounded-xl bg-rose-500/10 border border-rose-500/20 p-3 flex flex-col">
            <span className="text-[11px] font-medium uppercase text-rose-400 mb-1 flex items-center gap-1">
              <TrendingDown size={12} /> Stop Loss
            </span>
            <span className="text-sm md:text-base font-bold text-rose-300 font-mono">
              {stop || "N/A"}
            </span>
          </div>
        </div>
      </div>
    );
  }

  // 2. Risk Score Infographic Card
  if (rawText.toUpperCase().includes("RISK SCORE")) {
    const scoreMatch = rawText.match(/RISK SCORE.*?:?\s*(\d+)\/10/i);
    const score = scoreMatch ? parseInt(scoreMatch[1], 10) : 5;

    const scoreLabel = score <= 3 ? "Low Risk" : score <= 6 ? "Moderate Risk" : "High Risk";

    return (
      <div className="my-4 rounded-2xl border border-white/15 bg-gradient-to-br from-[#120B1D] via-[#0E0A1A] to-[#070512] p-4 shadow-xl">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Zap size={16} className="text-amber-400" />
            <span className="text-xs font-bold uppercase tracking-wider text-amber-300">
              Risk Profile Radar
            </span>
          </div>
          <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-white/10 text-white font-mono">
            {score}/10 — {scoreLabel}
          </span>
        </div>

        {/* Visual 10-Segment Progress Gauge */}
        <div className="flex gap-1 my-2">
          {Array.from({ length: 10 }).map((_, idx) => (
            <div
              key={idx}
              className={cn(
                "h-2.5 flex-1 rounded-full transition-all duration-300",
                idx < score
                  ? idx < 3
                    ? "bg-emerald-400 shadow-sm shadow-emerald-400/50"
                    : idx < 6
                    ? "bg-amber-400 shadow-sm shadow-amber-400/50"
                    : "bg-rose-500 shadow-sm shadow-rose-500/50"
                  : "bg-white/10"
              )}
            />
          ))}
        </div>
        <p className="mt-2 text-xs text-white/70">{rawText}</p>
      </div>
    );
  }

  // 3. Key Takeaway Glassmorphic Banner
  return (
    <blockquote className="my-3.5 rounded-2xl border-l-4 border-vel-teal bg-gradient-to-r from-vel-teal/20 via-cyan-500/10 to-transparent p-4 text-white/95 text-xs md:text-sm font-medium shadow-lg shadow-black/40 backdrop-blur-md">
      <div className="flex items-center gap-2 mb-1 text-teal-300 font-bold uppercase text-[11px] tracking-wider">
        <Pin size={13} className="text-vel-teal" />
        <span>Executive Insight</span>
      </div>
      <div>{children}</div>
    </blockquote>
  );
}

// ── Smart Table Cell Badge Renderer ──
function SmartTableCell({ children }: any) {
  const text = extractText(children).trim();
  const upper = text.toUpperCase();

  const isBuy = ["BUY", "STRONG BUY", "BULLISH", "BEAT", "OUTPERFORM", "POSITIVE"].includes(upper);
  const isSell = ["SELL", "STRONG SELL", "BEARISH", "MISS", "UNDERPERFORM", "NEGATIVE"].includes(upper);
  const isHold = ["HOLD", "NEUTRAL"].includes(upper);

  if (isBuy || isSell || isHold) {
    return (
      <td className="px-3.5 py-2.5 text-white/85">
        <span className={cn(
          "inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider border",
          isBuy && "bg-emerald-500/20 text-emerald-400 border-emerald-500/30 shadow-sm shadow-emerald-500/20",
          isSell && "bg-rose-500/20 text-rose-400 border-rose-500/30 shadow-sm shadow-rose-500/20",
          isHold && "bg-amber-500/20 text-amber-400 border-amber-500/30"
        )}>
          {isBuy ? "🟢 " : isSell ? "🔴 " : "🟡 "}{text}
        </span>
      </td>
    );
  }

  return <td className="px-3.5 py-2.5 text-white/85">{children}</td>;
}

const markdownComponents = {
  h1: ({ children }: any) => (
    <h1 className="text-base md:text-lg font-bold text-transparent bg-clip-text bg-gradient-to-r from-teal-300 via-cyan-200 to-white mt-5 mb-2 pb-1 border-b border-white/10 flex items-center gap-2">
      {children}
    </h1>
  ),
  h2: ({ children }: any) => (
    <h2 className="text-sm md:text-base font-bold text-teal-300 mt-4 mb-2 flex items-center gap-2">
      {children}
    </h2>
  ),
  h3: ({ children }: any) => (
    <h3 className="text-[13px] md:text-[14px] font-semibold text-cyan-200/90 mt-3.5 mb-1.5 flex items-center gap-1.5">
      {children}
    </h3>
  ),
  p: ({ children }: any) => (
    <p className="text-[14px] leading-relaxed text-white/90 my-2">
      {children}
    </p>
  ),
  blockquote: InfographicBlockquote,
  table: ({ children }: any) => (
    <div className="my-4 overflow-hidden overflow-x-auto rounded-2xl border border-white/15 bg-[#080D1A]/90 backdrop-blur-md shadow-2xl">
      <table className="w-full text-left text-xs md:text-sm text-white/90 border-collapse">
        {children}
      </table>
    </div>
  ),
  thead: ({ children }: any) => (
    <thead className="bg-vel-teal/20 text-vel-teal border-b border-white/10 font-semibold uppercase tracking-wider text-[11px]">
      {children}
    </thead>
  ),
  tr: ({ children }: any) => (
    <tr className="border-b border-white/5 last:border-0 hover:bg-white/[0.04] transition-colors">
      {children}
    </tr>
  ),
  th: ({ children }: any) => (
    <th className="px-3.5 py-2.5 font-semibold text-teal-300">
      {children}
    </th>
  ),
  td: SmartTableCell,
  ul: ({ children }: any) => (
    <ul className="my-2.5 space-y-2 pl-1">
      {children}
    </ul>
  ),
  ol: ({ children }: any) => (
    <ol className="my-2.5 space-y-2 list-decimal pl-5 text-white/90">
      {children}
    </ol>
  ),
  li: ({ children }: any) => (
    <li className="flex items-start gap-2.5 text-[14px] text-white/90 leading-relaxed">
      <span className="inline-block h-1.5 w-1.5 rounded-full bg-vel-teal mt-2 shrink-0 shadow-sm shadow-vel-teal" />
      <span className="flex-1">{children}</span>
    </li>
  ),
  code: ({ inline, className, children }: any) => {
    if (inline) {
      return (
        <code className="rounded bg-white/10 px-1.5 py-0.5 text-[12px] font-mono text-cyan-300 border border-white/10">
          {children}
        </code>
      );
    }
    return (
      <div className="my-3 overflow-x-auto rounded-xl border border-white/10 bg-[#060A14] p-3 text-xs text-cyan-200 font-mono">
        <code>{children}</code>
      </div>
    );
  },
  strong: ({ children }: any) => (
    <strong className="font-semibold text-white bg-white/[0.08] border border-white/10 px-1.5 py-0.5 rounded text-[13.5px] shadow-sm">
      {children}
    </strong>
  ),
};

type ChatScreenProps = {
  initialPrompt?: string;
  skillContext?: SkillContext;
  onBack: () => void;
};

// Suggestion buttons shown after stock-context AI responses (from Ask Velora AI button)
const STOCK_SUGGESTIONS = [
  { label: "Suggest buying points", icon: "📈" },
  { label: "Suggest selling points", icon: "📉" },
  { label: "Can I hold it?", icon: "🤔" },
  { label: "What's your overall bias?", icon: "🎯" },
  { label: "Tell me more about this company", icon: "🏢" },
];

export function ChatScreen({ initialPrompt, skillContext, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [activeSuggestions, setActiveSuggestions] = useState<{ label: string; icon?: string }[]>([]);
  const [activeSystemPrompt, setActiveSystemPrompt] = useState<string>("");
  const [selectedModel, setSelectedModel] = useState<string>(DEFAULT_MODEL);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  const hasSubmittedInitial = useRef(false);

  // Auto-submit initial prompt or skill context (only once)
  useEffect(() => {
    if (hasSubmittedInitial.current) return;
    if (messages.length > 0) return;

    // Skill context takes priority
    if (skillContext) {
      hasSubmittedInitial.current = true;
      setActiveSystemPrompt(skillContext.systemPrompt);
      setActiveSuggestions(skillContext.suggestions.map(s => ({ label: s })));
      sendMessageWithHiddenContext(
        skillContext.displayMessage,
        skillContext.hiddenPrompt,
        skillContext.systemPrompt
      );
      return;
    }

    // Legacy: stock-context from Ask Velora AI button
    if (initialPrompt) {
      hasSubmittedInitial.current = true;
      const isStock = initialPrompt.includes("portfolio") && initialPrompt.includes("Do not list any suggest buying");
      if (isStock) {
        const symbolMatch = initialPrompt.match(/have (\w+) in my portfolio/);
        const symbol = symbolMatch ? symbolMatch[1] : "";
        const displayMessage = symbol ? `Analyze ${symbol} for me` : "Analyze this stock for me";
        setActiveSuggestions(STOCK_SUGGESTIONS);
        sendMessageWithHiddenContext(displayMessage, initialPrompt, "");
      } else {
        sendMessage(initialPrompt);
      }
    }
  }, [initialPrompt, skillContext]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessageWithHiddenContext = async (displayContent: string, hiddenPrompt: string, systemPrompt: string) => {
    if (isLoading) return;

    setInput("");
    const displayMessages: Message[] = [
      { role: "user", content: displayContent }
    ];
    setMessages(displayMessages);
    setIsLoading(true);

    try {
      const apiMessages: Message[] = [
        { role: "user", content: hiddenPrompt }
      ];

      const body: any = { messages: apiMessages, model: selectedModel };
      if (systemPrompt) {
        body.systemPrompt = systemPrompt;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status >= 500
            ? "AI model service timed out or experienced a temporary gateway issue. Please try again or switch model."
            : `Unexpected server response (${res.status}).`
        );
      }

      if (res.ok && data?.choices?.[0]?.message) {
        const msg = data.choices[0].message;
        if (!msg.content || !msg.content.trim()) {
          msg.content = "No output generated. Please try again or rephrase your request.";
        }
        setMessages((prev) => [...prev, msg]);
        setShowSuggestions(true);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "I encountered an error. Please try again."}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;

    setInput("");
    setShowSuggestions(false);
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: content.trim() }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const body: any = { messages: newMessages, model: selectedModel };
      if (activeSystemPrompt) {
        body.systemPrompt = activeSystemPrompt;
      }

      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body)
      });

      const contentType = res.headers.get("content-type") || "";
      let data: any;
      if (contentType.includes("application/json")) {
        data = await res.json();
      } else {
        const text = await res.text();
        throw new Error(
          res.status >= 500
            ? "AI model service timed out or experienced a temporary gateway issue. Please try again or switch model."
            : `Unexpected server response (${res.status}).`
        );
      }

      if (res.ok && data?.choices?.[0]?.message) {
        const msg = data.choices[0].message;
        if (!msg.content || !msg.content.trim()) {
          msg.content = "No output generated. Please try again or rephrase your request.";
        }
        setMessages((prev) => [...prev, msg]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err: any) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Error: ${err.message || "I encountered an error. Please try again."}` }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
  };

  const handleSuggestionClick = (suggestion: string) => {
    sendMessage(suggestion);
  };

  return (
    <div className="flex h-[calc(100vh-80px)] md:h-[calc(100vh-140px)] flex-col bg-[#05080F]">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b border-white/5">
        <button 
          onClick={onBack}
          className="grid h-9 w-9 place-items-center rounded-xl bg-white/5 text-white/70 hover:bg-white/10 hover:text-white transition"
        >
          <ArrowLeft size={18} />
        </button>
        <div className="flex items-center gap-2">
          <div className="h-8 w-8 rounded-full bg-vel-teal/20 flex items-center justify-center">
            <Bot size={16} className="text-vel-teal" />
          </div>
          <div>
            <h2 className="text-[15px] font-semibold text-white">Velora AI</h2>
            <p className="text-[11px] text-white/50">Powered by NVIDIA NIM & Tavily</p>
          </div>
        </div>
        <div className="flex-1" />
        <BuiModelSelector selectedModel={selectedModel} onSelectModel={setSelectedModel} />
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto app-scroll px-4 py-6 space-y-6">
        {messages.filter(m => m.role !== "system").map((msg, i) => (
          <motion.div 
            key={i}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className={cn(
              "flex gap-3 max-w-[85%]",
              msg.role === "user" ? "ml-auto flex-row-reverse" : ""
            )}
          >
            <div className={cn(
              "flex-none h-8 w-8 rounded-full flex items-center justify-center",
              msg.role === "user" ? "bg-white/10" : "bg-vel-teal/20"
            )}>
              {msg.role === "user" ? <User size={14} className="text-white/70" /> : <Bot size={14} className="text-vel-teal" />}
            </div>
            <div className={cn(
              "rounded-2xl px-4 py-3 text-[14px] leading-relaxed",
              msg.role === "user" 
                ? "bg-white/10 text-white" 
                : "bg-transparent border border-white/10 text-white/90"
            )}>
              {msg.role === "user" ? (
                <div className="whitespace-pre-wrap">{msg.content}</div>
              ) : (
                <div className="relative group">
                  {/* Beautiful UI Tool Chips & Thinking Trace for assistant */}
                  <BuiThinkingState isThinking={false} />
                  
                  <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents}>
                    {msg.content}
                  </ReactMarkdown>
                  <button
                    onClick={() => {
                      navigator.clipboard.writeText(msg.content);
                      setCopiedIndex(i);
                      setTimeout(() => setCopiedIndex(null), 2000);
                    }}
                    className="absolute -top-1 -right-1 opacity-0 group-hover:opacity-100 transition-opacity p-1.5 rounded-lg bg-white/10 text-white/60 hover:text-white hover:bg-white/20 text-xs flex items-center gap-1"
                    title="Copy response"
                  >
                    {copiedIndex === i ? <Check size={12} className="text-green-400" /> : <Copy size={12} />}
                  </button>
                </div>
              )}
            </div>
          </motion.div>
        ))}

        {/* Suggestion Buttons */}
        {showSuggestions && !isLoading && activeSuggestions.length > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3, duration: 0.4 }}
            className="flex flex-col gap-2 pl-11"
          >
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-vel-teal" />
              <span className="text-[11px] text-vel-muted font-medium uppercase tracking-wider">Quick Actions</span>
            </div>
            <div className="flex flex-wrap gap-2">
              {activeSuggestions.map((s, i) => (
                <motion.button
                  key={s.label}
                  initial={{ opacity: 0, scale: 0.9 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ delay: 0.4 + i * 0.08 }}
                  onClick={() => handleSuggestionClick(s.label)}
                  className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-white/5 border border-white/10 text-[13px] text-white/80 hover:bg-vel-teal/10 hover:border-vel-teal/30 hover:text-vel-teal transition-all duration-200"
                >
                  {s.icon && <span>{s.icon}</span>}
                  <span>{s.label}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}
        
        {isLoading && (
          <motion.div 
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex gap-3 max-w-[85%]"
          >
            <div className="flex-none h-8 w-8 rounded-full bg-vel-teal/20 flex items-center justify-center">
              <Bot size={14} className="text-vel-teal" />
            </div>
            <div className="flex flex-col gap-2">
              <BuiLoadingState label="Velora is analyzing markets" />
              <BuiThinkingState isThinking={true} />
            </div>
          </motion.div>
        )}
        <div ref={endOfMessagesRef} />
      </div>

      {/* Input */}
      <div className="p-4 bg-gradient-to-t from-[#05080F] via-[#05080F] to-transparent">
        <form 
          onSubmit={handleSubmit}
          className="flex items-end gap-2 rounded-2xl border border-vel-teal/30 bg-[#0A0F1C]/95 p-2 shadow-2xl shadow-black/80 backdrop-blur-2xl"
        >
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e);
              }
            }}
            placeholder="Ask me anything about the markets..."
            className="flex-1 bg-transparent text-[15px] text-white placeholder:text-white/40 focus:outline-none resize-none py-2 px-3 max-h-32 app-scroll"
            rows={input.split("\n").length > 1 ? Math.min(input.split("\n").length, 5) : 1}
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="h-10 w-10 flex-none rounded-xl bg-white/10 flex items-center justify-center disabled:opacity-50 hover:bg-white/20 transition mb-0.5 mr-0.5"
          >
            <ArrowUp size={18} className="text-white" />
          </button>
        </form>
      </div>

      {/* Floating Highlight-to-Ask Selection Actions Menu */}
      <BuiSelectionActions onAskAI={(selected) => sendMessage(`Analyze this excerpt: "${selected}"`)} />
    </div>
  );
}
