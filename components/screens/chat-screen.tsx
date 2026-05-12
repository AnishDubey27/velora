"use client";

import { useEffect, useRef, useState } from "react";
import { ArrowUp, Bot, User, ArrowLeft, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { cn } from "@/lib/utils";

type Message = {
  role: "system" | "user" | "assistant";
  content: string;
};

type ChatScreenProps = {
  initialPrompt?: string;
  onBack: () => void;
};

export function ChatScreen({ initialPrompt, onBack }: ChatScreenProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState(initialPrompt || "");
  const [isLoading, setIsLoading] = useState(false);
  const endOfMessagesRef = useRef<HTMLDivElement>(null);
  
  // Auto-submit initial prompt if provided
  useEffect(() => {
    if (initialPrompt && messages.length === 0) {
      sendMessage(initialPrompt);
    }
  }, [initialPrompt]);

  useEffect(() => {
    endOfMessagesRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  const sendMessage = async (content: string) => {
    if (!content.trim() || isLoading) return;
    
    setInput("");
    const newMessages: Message[] = [
      ...messages,
      { role: "user", content: content.trim() }
    ];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      const res = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: newMessages })
      });
      
      const data = await res.json();
      
      if (res.ok && data?.choices?.[0]?.message) {
        setMessages((prev) => [...prev, data.choices[0].message]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (err) {
      console.error(err);
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I encountered an error. Please try again." }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    sendMessage(input);
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
            <p className="text-[11px] text-white/50">Powered by NVIDIA NIM & Brave</p>
          </div>
        </div>
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
              <div className="whitespace-pre-wrap">{msg.content}</div>
            </div>
          </motion.div>
        ))}
        
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
