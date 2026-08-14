"use client";

import { useEffect, useState } from "react";
import { Sparkles, HelpCircle, Search, Copy, Check } from "lucide-react";
import { cn } from "@/lib/utils";

type BuiSelectionActionsProps = {
  onAskAI?: (selectedText: string) => void;
};

export function BuiSelectionActions({ onAskAI }: BuiSelectionActionsProps) {
  const [selectedText, setSelectedText] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    function handleSelectionChange() {
      const selection = window.getSelection();
      if (!selection || selection.isCollapsed || !selection.toString().trim()) {
        setPosition(null);
        setSelectedText("");
        return;
      }

      const text = selection.toString().trim();
      if (text.length < 2) return;

      const range = selection.getRangeAt(0);
      const rect = range.getBoundingClientRect();

      setSelectedText(text);
      setPosition({
        top: rect.top + window.scrollY - 48,
        left: rect.left + window.scrollX + rect.width / 2,
      });
    }

    document.addEventListener("selectionchange", handleSelectionChange);
    return () => document.removeEventListener("selectionchange", handleSelectionChange);
  }, []);

  if (!position || !selectedText) return null;

  return (
    <div
      style={{ top: `${position.top}px`, left: `${position.left}px` }}
      className="fixed z-50 -translate-x-1/2 flex items-center gap-1 p-1 rounded-xl border border-white/20 bg-[#0B132B]/95 shadow-2xl backdrop-blur-2xl animate-pop-in"
    >
      <button
        type="button"
        onClick={() => {
          if (onAskAI) onAskAI(selectedText);
          setPosition(null);
        }}
        className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-vel-teal/20 text-teal-300 text-xs font-semibold hover:bg-vel-teal/30 transition cursor-pointer"
      >
        <Sparkles size={12} /> Ask AI
      </button>

      <button
        type="button"
        onClick={() => {
          navigator.clipboard.writeText(selectedText);
          setCopied(true);
          setTimeout(() => setCopied(false), 2000);
        }}
        className="flex items-center gap-1 px-2 py-1 rounded-lg bg-white/5 text-white/70 text-xs hover:bg-white/10 hover:text-white transition cursor-pointer"
        title="Copy text"
      >
        {copied ? <Check size={12} className="text-emerald-400" /> : <Copy size={12} />}
      </button>
    </div>
  );
}
