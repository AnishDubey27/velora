/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useRef, useEffect, useState } from "react";
import { ArrowUp, Square, Mic, Paperclip } from "lucide-react";
import { cn } from "@/lib/utils";
import { BuiModelSelector } from "./bui-model-selector";

export type BuiPromptBarProps = {
  value: string;
  onChange: (value: string) => void;
  onSubmit: () => void;
  onStop?: () => void;
  isLoading?: boolean;
  selectedModel: string;
  onSelectModel: (modelId: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  onQuickPrompt?: (prompt: string) => void;
};

export function BuiPromptBar({
  value,
  onChange,
  onSubmit,
  onStop,
  isLoading = false,
  selectedModel,
  onSelectModel,
  placeholder = "Ask Velora anything about the markets, stocks, or your portfolio...",
  disabled = false,
  className,
}: BuiPromptBarProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Auto-resize textarea to fit content up to 160px
  useEffect(() => {
    const el = textareaRef.current;
    if (!el) return;
    el.style.height = "auto";
    const newHeight = Math.min(el.scrollHeight, 160);
    el.style.height = `${Math.max(newHeight, 44)}px`;
  }, [value]);

  // Speech dictation equalizer support (Web Speech API)
  useEffect(() => {
    if (typeof window !== "undefined") {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      if (SpeechRecognition) {
        const recognition = new SpeechRecognition();
        recognition.continuous = false;
        recognition.interimResults = false;
        recognition.lang = "en-US";

        recognition.onresult = (event: any) => {
          const transcript = event.results[0]?.[0]?.transcript;
          if (transcript) {
            onChange(value ? `${value} ${transcript}` : transcript);
          }
          setIsListening(false);
        };

        recognition.onerror = () => {
          setIsListening(false);
        };

        recognition.onend = () => {
          setIsListening(false);
        };

        recognitionRef.current = recognition;
      }
    }
  }, [value, onChange]);

  const toggleDictation = () => {
    if (!recognitionRef.current) {
      setIsListening((prev) => !prev);
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    } else {
      try {
        recognitionRef.current.start();
        setIsListening(true);
      } catch {
        setIsListening(false);
      }
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (value.trim() && !isLoading && !disabled) {
        onSubmit();
      }
    }
  };

  const handleAttachClick = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      const file = files[0];
      onChange(value ? `${value} [Attached: ${file.name}]` : `Analyze this attached filing: ${file.name}`);
    }
  };

  return (
    <div className={cn("relative w-full max-w-4xl mx-auto", className)}>
      {/* Beautiful UI Continuous Ambient Glow (360-degree perimeter aura) */}
      <div
        className={cn(
          "absolute -inset-1 rounded-full transition-all duration-700 pointer-events-none",
          isFocused || isListening
            ? "opacity-100 bg-gradient-to-r from-teal-500/60 via-cyan-400/70 to-emerald-500/60 blur-md shadow-[0_0_30px_rgba(20,184,166,0.4)]"
            : "ambient-glow bg-gradient-to-r from-teal-500/40 via-cyan-400/50 to-emerald-500/40 blur-md"
        )}
      />

      {/* Main Composer Box (True capsule pill silhouette with rounded-full) */}
      <div
        className={cn(
          "relative flex flex-col rounded-full border bg-[#080D1A]/95 backdrop-blur-2xl shadow-2xl transition-all duration-200 overflow-hidden",
          isFocused
            ? "border-teal-500/50 shadow-[0_0_24px_rgba(0,212,255,0.25)]"
            : "border-white/15 hover:border-white/25"
        )}
      >
        {/* Hidden File Input */}
        <input
          ref={fileInputRef}
          type="file"
          className="hidden"
          accept=".csv,.pdf,.png,.jpg,.jpeg,.txt"
          onChange={handleFileChange}
        />

        {/* Top Input Area with generous pill cap padding */}
        <div className="flex items-start gap-2 px-7 md:px-8 pt-3.5 pb-2">
          <textarea
            ref={textareaRef}
            value={value}
            onChange={(e) => onChange(e.target.value)}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            onKeyDown={handleKeyDown}
            placeholder={isListening ? "Listening... Speak now..." : placeholder}
            disabled={disabled}
            rows={1}
            className="flex-1 bg-transparent text-[14px] md:text-[15px] text-white placeholder:text-white/40 focus:outline-none resize-none app-scroll leading-relaxed min-h-[44px]"
          />
        </div>

        {/* Bottom Toolbar: Attach Affordance, Model Selector Badge, Dictation & Send */}
        <div className="flex items-center justify-between px-7 md:px-8 py-2.5 border-t border-white/5 bg-white/[0.015]">
          {/* Left: Model Selector & Attach Affordance */}
          <div className="flex items-center gap-2">
            <BuiModelSelector
              selectedModel={selectedModel}
              onSelectModel={onSelectModel}
            />

            {/* Attach Affordance Button */}
            <button
              type="button"
              onClick={handleAttachClick}
              className="h-7 w-7 rounded-lg bg-white/[0.04] border border-white/10 text-white/50 hover:text-white hover:bg-white/10 flex items-center justify-center transition cursor-pointer"
              title="Attach document, CSV portfolio, or screenshot"
            >
              <Paperclip size={13} className="text-white/60 hover:text-teal-300" />
            </button>
          </div>

          {/* Right: Dictation Equalizer & Send/Stop Buttons */}
          <div className="flex items-center gap-2">
            {/* Dictation Equalizer Button */}
            <button
              type="button"
              onClick={toggleDictation}
              className={cn(
                "h-8 px-2.5 rounded-xl border flex items-center gap-1.5 transition-all text-xs cursor-pointer",
                isListening
                  ? "bg-rose-500/20 border-rose-500/40 text-rose-300 shadow-sm shadow-rose-500/20"
                  : "bg-white/[0.04] border-white/10 text-white/60 hover:text-white hover:bg-white/10"
              )}
              title={isListening ? "Stop voice dictation" : "Dictate with voice"}
            >
              {isListening ? (
                <>
                  <div className="flex items-center gap-[2px] h-3.5 px-0.5">
                    <span className="w-[2.5px] bg-rose-400 rounded-full animate-eq-bounce" style={{ animationDelay: "0ms" }} />
                    <span className="w-[2.5px] bg-rose-400 rounded-full animate-eq-bounce" style={{ animationDelay: "150ms" }} />
                    <span className="w-[2.5px] bg-rose-400 rounded-full animate-eq-bounce" style={{ animationDelay: "300ms" }} />
                  </div>
                  <span className="font-mono text-[10.5px]">Rec</span>
                </>
              ) : (
                <Mic size={14} />
              )}
            </button>

            {/* Submit or Stop Button */}
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="h-8 px-3 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 flex items-center gap-1.5 hover:bg-rose-500/30 transition text-xs font-semibold cursor-pointer shadow-sm shadow-rose-500/20"
                title="Stop generation"
              >
                <Square size={13} className="fill-current" />
                <span>Stop</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={onSubmit}
                disabled={!value.trim() || disabled}
                className={cn(
                  "h-8 px-3 rounded-xl flex items-center gap-1.5 transition text-xs font-semibold cursor-pointer shadow-sm",
                  value.trim() && !disabled
                    ? "bg-teal-500 text-black hover:bg-teal-400 shadow-teal-500/20"
                    : "bg-white/10 text-white/30 cursor-not-allowed"
                )}
                title="Send message (Enter)"
              >
                <span>Send</span>
                <ArrowUp size={13} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
