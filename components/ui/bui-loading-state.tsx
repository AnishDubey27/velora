"use client";

import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

type BuiLoadingStateProps = {
  label?: string;
  className?: string;
};

export function BuiLoadingState({ label = "Velora is analyzing", className }: BuiLoadingStateProps) {
  const [seconds, setSeconds] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setSeconds((prev) => +(prev + 0.1).toFixed(1));
    }, 100);
    return () => clearInterval(timer);
  }, []);

  return (
    <div className={cn("flex items-center gap-3 py-2.5 px-3.5 rounded-xl bg-white/[0.03] border border-white/10 w-fit backdrop-blur-md shadow-lg", className)}>
      {/* 3x3 Pixel Grid Matrix */}
      <span aria-hidden="true" className="grid grid-cols-3 gap-[2px]">
        {[90, 180, 270, 0, 90, 180, 90, 180, 270].map((delay, i) => (
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
            "linear-gradient(90deg, rgba(255,255,255,0.4) 25%, rgba(0,229,255,1) 50%, rgba(255,255,255,0.4) 75%)",
          backgroundSize: "200% 100%",
          animation: "shimmer-text 1.4s linear infinite",
        }}
      >
        {label}
      </span>

      {/* Elapsed Timer */}
      <span className="font-mono text-[11px] text-white/40 tabular-nums">
        {seconds.toFixed(1)}s
      </span>
    </div>
  );
}
