/**
 * Beautiful UI (https://www.beautifului.dev/)
 * Copyright (c) 2026 Shane Levine
 * Licensed under the MIT License.
 *
 * Adapted for Velora AI Financial Intelligence
 */

"use client";

import React, { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type BuiLoadingStateProps = {
  label?: string;
  isDeep?: boolean;
  className?: string;
  onElapsedUpdate?: (seconds: number) => void;
};

// Beautiful UI 3x3 Drive pattern
const CHEVRON_DELAYS = [90, 180, 270, 0, 90, 180, 90, 180, 270];

export function BuiLoadingState({
  label,
  isDeep = false,
  className,
  onElapsedUpdate,
}: BuiLoadingStateProps) {
  const [tenths, setTenths] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setTenths((prev) => {
        const next = prev + 1;
        if (onElapsedUpdate) {
          onElapsedUpdate(Number((next / 10).toFixed(1)));
        }
        return next;
      });
    }, 100);
    return () => clearInterval(timer);
  }, [onElapsedUpdate]);

  const totalSecs = tenths / 10;
  const elapsedStr = totalSecs < 60
    ? `${totalSecs.toFixed(1)}s`
    : `${Math.floor(totalSecs / 60)}m ${(totalSecs % 60).toFixed(1)}s`;

  const defaultLabel = isDeep
    ? "Velora Deep Analyst is synthesizing market intelligence"
    : "Velora is generating instant analysis";

  const resolvedLabel = label || defaultLabel;

  return (
    <div
      role="status"
      className={cn(
        "flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 w-fit backdrop-blur-md shadow-lg",
        className
      )}
    >
      {/* Beautiful UI Pixel Grid Matrix (Drive Wavefront) */}
      <span aria-hidden="true" className="grid grid-cols-3 gap-[2px] shrink-0">
        {CHEVRON_DELAYS.map((delay, i) => (
          <span
            key={i}
            className="size-[3.5px] bg-vel-teal rounded-[1px]"
            style={{
              animation: `pixel-on 650ms ease-in-out ${delay}ms infinite`,
            }}
          />
        ))}
      </span>

      {/* Shimmer Text */}
      <span
        className="bg-clip-text text-xs md:text-sm font-medium text-transparent"
        style={{
          backgroundImage:
            "linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(0,212,255,1) 50%, rgba(255,255,255,0.4) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {resolvedLabel}
      </span>

      {/* Live Elapsed Timer */}
      <span className="font-mono text-[11px] text-teal-300/80 tabular-nums font-semibold">
        {elapsedStr}
      </span>
    </div>
  );
}
