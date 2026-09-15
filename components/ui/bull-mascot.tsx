"use client";

import { motion } from "framer-motion";

interface BullMascotProps {
  passwordFocused: boolean;
}

export function BullMascot({ passwordFocused }: BullMascotProps) {
  return (
    <div className="flex justify-center mb-2 select-none">
      <svg
        width="110"
        height="130"
        viewBox="0 0 100 120"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
        aria-hidden="true"
      >
        {/* ── HORNS (drawn first, sit behind head) ── */}
        <path d="M26 44 C20 28 24 13 30 7 C33 21 31 36 29 44" fill="#1C2240" />
        <path d="M74 44 C80 28 76 13 70 7 C67 21 69 36 71 44" fill="#1C2240" />
        {/* Teal horn tips */}
        <path d="M30 7 C31 13 30 18 28 22 C27 16 27 10 30 7" fill="#00D4FF" opacity="0.55" />
        <path d="M70 7 C69 13 70 18 72 22 C73 16 73 10 70 7" fill="#00D4FF" opacity="0.55" />

        {/* ── EARS ── */}
        <ellipse cx="16" cy="56" rx="8" ry="10" fill="#1C2240" />
        <ellipse cx="84" cy="56" rx="8" ry="10" fill="#1C2240" />
        <ellipse cx="16" cy="56" rx="4.5" ry="6.5" fill="#101524" />
        <ellipse cx="84" cy="56" rx="4.5" ry="6.5" fill="#101524" />

        {/* ── HEAD ── */}
        <ellipse cx="50" cy="67" rx="36" ry="33" fill="#101524" />
        {/* Subtle top highlight on head */}
        <ellipse cx="50" cy="50" rx="22" ry="8" fill="#00D4FF" opacity="0.04" />

        {/* ── SNOUT ── */}
        <ellipse cx="50" cy="83" rx="17" ry="11" fill="#1C2240" />
        {/* Nostrils */}
        <ellipse cx="44.5" cy="85.5" rx="3" ry="3.5" fill="#0A0F1C" />
        <ellipse cx="55.5" cy="85.5" rx="3" ry="3.5" fill="#0A0F1C" />

        {/* ── BROW (furrows when covering eyes) ── */}
        <motion.g
          animate={{ y: passwordFocused ? 3 : 0 }}
          transition={{ type: "spring", stiffness: 300, damping: 20 }}
        >
          <path
            d="M29 51 C33 48 39 48 43 51"
            stroke="#252B3E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
          <path
            d="M57 51 C61 48 67 48 71 51"
            stroke="#252B3E"
            strokeWidth="2.5"
            strokeLinecap="round"
          />
        </motion.g>

        {/* ── EYES ── */}
        {/* Left eye sclera */}
        <circle cx="37" cy="63" r="9" fill="white" />
        {/* Left iris */}
        <circle cx="37" cy="63.5" r="5.5" fill="#0A0F1C" />
        {/* Left iris ring (teal) */}
        <circle
          cx="37"
          cy="63.5"
          r="5.5"
          fill="none"
          stroke="#00D4FF"
          strokeWidth="1.2"
          opacity="0.5"
        />
        {/* Left pupil highlight */}
        <circle cx="39" cy="61.5" r="1.8" fill="white" />

        {/* Right eye sclera */}
        <circle cx="63" cy="63" r="9" fill="white" />
        {/* Right iris */}
        <circle cx="63" cy="63.5" r="5.5" fill="#0A0F1C" />
        <circle
          cx="63"
          cy="63.5"
          r="5.5"
          fill="none"
          stroke="#00D4FF"
          strokeWidth="1.2"
          opacity="0.5"
        />
        {/* Right pupil highlight */}
        <circle cx="65" cy="61.5" r="1.8" fill="white" />

        {/* ── LEFT HOOF (animates up to cover left eye) ── */}
        <motion.g
          animate={{ y: passwordFocused ? -46 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
        >
          {/* Arm */}
          <rect x="25" y="93" width="17" height="28" rx="8.5" fill="#1C2240" />
          {/* Hoof cap */}
          <ellipse cx="33.5" cy="113" rx="11.5" ry="7.5" fill="#252B3E" />
          <ellipse cx="33.5" cy="111" rx="9" ry="5" fill="#1C2240" />
        </motion.g>

        {/* ── RIGHT HOOF (animates up to cover right eye) ── */}
        <motion.g
          animate={{ y: passwordFocused ? -46 : 0 }}
          transition={{ type: "spring", stiffness: 240, damping: 22 }}
        >
          {/* Arm */}
          <rect x="58" y="93" width="17" height="28" rx="8.5" fill="#1C2240" />
          {/* Hoof cap */}
          <ellipse cx="66.5" cy="113" rx="11.5" ry="7.5" fill="#252B3E" />
          <ellipse cx="66.5" cy="111" rx="9" ry="5" fill="#1C2240" />
        </motion.g>
      </svg>
    </div>
  );
}
