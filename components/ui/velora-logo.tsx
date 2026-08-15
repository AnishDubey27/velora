"use client";

import { VeloraVideoLogo } from "./velora-video-logo";

export function VeloraLogo({ showText = true, size = "sm" }: { showText?: boolean; size?: "xs" | "sm" | "md" | "lg" }) {
  return (
    <div className="flex items-center gap-2.5 text-[14px] font-extrabold tracking-[0.18em] text-white">
      <VeloraVideoLogo size={size} />
      {showText && (
        <span className="bg-gradient-to-r from-white via-zinc-200 to-zinc-400 bg-clip-text text-transparent">
          VELORA
        </span>
      )}
    </div>
  );
}
