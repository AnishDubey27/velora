"use client";

import { useRef, useEffect } from "react";
import { cn } from "@/lib/utils";

type VeloraVideoLogoProps = {
  className?: string;
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  glow?: boolean;
};

const sizeClasses = {
  xs: "w-6 h-6 rounded-lg",
  sm: "w-8 h-8 rounded-xl",
  md: "w-10 h-10 rounded-xl",
  lg: "w-16 h-16 md:w-20 md:h-20 rounded-2xl",
  xl: "w-24 h-24 md:w-28 md:h-28 rounded-3xl",
};

export function VeloraVideoLogo({ className, size = "md", glow = true }: VeloraVideoLogoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.play().catch(() => {
        // Autoplay may be restricted by battery saving; muted prevents most blocks
      });
    }
  }, []);

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)}>
      {/* Ambient Radial Glow */}
      {glow && (
        <div className="absolute inset-0 rounded-full bg-vel-teal/25 blur-xl pointer-events-none scale-125" />
      )}

      {/* Video Container */}
      <div
        className={cn(
          "relative overflow-hidden bg-black/40 border border-white/10 shadow-2xl flex items-center justify-center",
          sizeClasses[size]
        )}
      >
        <video
          ref={videoRef}
          src="/velora-logo.mp4"
          poster="/velora-logo.png"
          autoPlay
          loop
          muted
          playsInline
          className="w-full h-full object-cover select-none pointer-events-none"
        />
      </div>
    </div>
  );
}
