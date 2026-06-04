"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, User, ArrowLeft, Loader2, Sparkles } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

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
  const [selectedModel, setSelectedModel] = useState<string>("z-ai/glm-5.1");
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

      const data = await res.json();

      if (res.ok && data?.choices?.[0]?.message) {
        setMessages((prev) => [...prev, data.choices[0].message]);
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

      const data = await res.json();

      if (res.ok && data?.choices?.[0]?.message) {
        setMessages((prev) => [...prev, data.choices[0].message]);
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
        <select
          value={selectedModel}
          onChange={(e) => setSelectedModel(e.target.value)}
          className="bg-white/5 border border-white/10 text-white/80 text-xs rounded-lg px-2 py-1.5 outline-none focus:border-vel-teal/50 cursor-pointer max-w-[140px] md:max-w-[200px]"
        >
          <option value="z-ai/glm-5.1" className="bg-[#05080F]">GLM 5.1</option>
          <option value="meta/llama-4-maverick-17b-128e-instruct" className="bg-[#05080F]">Llama 4 Maverick</option>
          <option value="minimaxai/minimax-m2.7" className="bg-[#05080F]">MiniMax M2.7</option>
          <option value="stepfun-ai/step-3.7-flash" className="bg-[#05080F]">Step 3.7 Flash</option>
          <option value="mistralai/mistral-nemotron" className="bg-[#05080F]">Mistral Nemotron</option>
          <option value="mistralai/mistral-large-3-675b-instruct-2512" className="bg-[#05080F]">Mistral Large 3</option>
          <option value="bytedance/seed-oss-36b-instruct" className="bg-[#05080F]">Seed OSS 36B</option>
        </select>
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
                <div className="prose prose-invert prose-sm max-w-none prose-p:leading-relaxed prose-pre:bg-white/5 prose-pre:border prose-pre:border-white/10 text-white/90 marker:text-vel-teal">
                  <ReactMarkdown remarkPlugins={[remarkGfm]}>
                    {msg.content}
                  </ReactMarkdown>
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
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex gap-3 max-w-[85%]"
          >
            <div className="flex-none h-8 w-8 rounded-full bg-vel-teal/20 flex items-center justify-center">
              <Bot size={14} className="text-vel-teal" />
            </div>
            <div className="rounded-2xl px-4 py-3 bg-transparent border border-white/10 flex items-center gap-2">
              <Loader2 size={16} className="animate-spin text-vel-teal" />
              <span className="text-sm text-white/50">Analyzing...</span>
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
    </div>
  );
}
