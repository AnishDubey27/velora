"use client";

import { motion } from "framer-motion";
import { useEffect, useState } from "react";

interface VeloMascotProps {
  emailFocused: boolean;
  passwordFocused: boolean;
}

export function VeloMascot({ emailFocused, passwordFocused }: VeloMascotProps) {
  const [blinking, setBlinking] = useState(false);
  const [peeking, setPeeking] = useState(false);

  // Autonomous random blink loop
  useEffect(() => {
    let handle: ReturnType<typeof setTimeout>;
    const loop = () => {
      handle = setTimeout(
        () => {
          setBlinking(true);
          setTimeout(() => {
            setBlinking(false);
            loop();
          }, 130);
        },
        2800 + Math.random() * 3200,
      );
    };
    loop();
    return () => clearTimeout(handle);
  }, []);

  // Occasional peek through wings while password is focused
  useEffect(() => {
    if (!passwordFocused) {
      setPeeking(false);
      return;
    }
    let handle: ReturnType<typeof setTimeout>;
    const loop = () => {
      handle = setTimeout(
        () => {
          if (!passwordFocused) return;
          setPeeking(true);
          setTimeout(() => {
            setPeeking(false);
            if (passwordFocused) loop();
          }, 650);
        },
        3200 + Math.random() * 2400,
      );
    };
    loop();
    return () => {
      clearTimeout(handle);
      setPeeking(false);
    };
  }, [passwordFocused]);

  const fullyCovered = passwordFocused && !peeking;
  const coverY = fullyCovered ? -58 : peeking ? -20 : 0;
  const coverXL = fullyCovered ? 5 : 0;
  const coverXR = fullyCovered ? -5 : 0;

  // Pupil gaze shift
  const px = emailFocused ? -1.8 : 0;
  const py = emailFocused ? 2.8 : passwordFocused ? -1.5 : 0;

  return (
    <div className="flex justify-center select-none" style={{ height: 148 }}>
      <motion.svg
        width="160"
        height="168"
        viewBox="0 0 160 172"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        style={{ overflow: "visible" }}
        aria-hidden="true"
        animate={{ y: [0, -3, 0] }}
        transition={{ duration: 3.8, repeat: Infinity, ease: "easeInOut" }}
      >
        <defs>
          <filter id="velo-gv" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="3.5" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="velo-gc" x="-70%" y="-70%" width="240%" height="240%">
            <feGaussianBlur stdDeviation="2.8" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>
          <filter id="velo-ge" x="-120%" y="-120%" width="340%" height="340%">
            <feGaussianBlur stdDeviation="7" result="b" />
            <feMerge>
              <feMergeNode in="b" />
              <feMergeNode in="SourceGraphic" />
            </feMerge>
          </filter>

          <radialGradient id="velo-iris" cx="35%" cy="28%">
            <stop offset="0%" stopColor="#EDE9FE" />
            <stop offset="22%" stopColor="#A78BFA" />
            <stop offset="58%" stopColor="#6D28D9" />
            <stop offset="100%" stopColor="#160838" />
          </radialGradient>
          <radialGradient id="velo-head" cx="38%" cy="26%">
            <stop offset="0%" stopColor="#1E1B3C" />
            <stop offset="58%" stopColor="#0D0B1E" />
            <stop offset="100%" stopColor="#060510" />
          </radialGradient>
          <radialGradient id="velo-body" cx="42%" cy="18%">
            <stop offset="0%" stopColor="#1A1638" />
            <stop offset="100%" stopColor="#070614" />
          </radialGradient>
          <linearGradient id="velo-wl" x1="0%" y1="0%" x2="100%" y2="72%">
            <stop offset="0%" stopColor="#161240" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#07061A" stopOpacity="0.92" />
          </linearGradient>
          <linearGradient id="velo-wr" x1="100%" y1="0%" x2="0%" y2="72%">
            <stop offset="0%" stopColor="#161240" stopOpacity="0.97" />
            <stop offset="100%" stopColor="#07061A" stopOpacity="0.92" />
          </linearGradient>
        </defs>

        {/* ── LOWER WINGS ── */}
        <path d="M 76 108 C 56 122 22 148 12 164 C 26 152 56 138 72 122 Z" fill="url(#velo-wl)" opacity="0.75" />
        <path d="M 84 108 C 104 122 138 148 148 164 C 134 152 104 138 88 122 Z" fill="url(#velo-wr)" opacity="0.75" />
        <path d="M 76 108 C 56 122 22 148 12 164" stroke="#3B1F77" strokeWidth="0.55" strokeOpacity="0.3" fill="none" />
        <path d="M 84 108 C 104 122 138 148 148 164" stroke="#3B1F77" strokeWidth="0.55" strokeOpacity="0.3" fill="none" />

        {/* ── LEFT UPPER WING ── */}
        <path d="M 76 83 C 60 68 14 46 0 28 C 14 46 46 66 64 85 Z" fill="url(#velo-wl)" />
        <path d="M 76 83 C 60 68 14 46 0 28" stroke="#6D28D9" strokeWidth="1.4" strokeOpacity="0.55" fill="none" filter="url(#velo-gv)" />
        <circle cx="26" cy="54" r="6" fill="#7C3AED" opacity="0.14" filter="url(#velo-gv)" />
        <circle cx="26" cy="54" r="2.8" fill="#A78BFA" opacity="0.5" />
        <path d="M 74 85 C 56 70 24 54 6 36" stroke="#3B1F77" strokeWidth="0.65" strokeOpacity="0.42" fill="none" />
        <path d="M 72 89 C 58 80 38 72 18 64" stroke="#3B1F77" strokeWidth="0.42" strokeOpacity="0.3" fill="none" />
        <circle cx="3" cy="30" r="2.2" fill="#00D4FF" opacity="0.24" filter="url(#velo-gc)" />

        {/* ── RIGHT UPPER WING ── */}
        <path d="M 84 83 C 100 68 146 46 160 28 C 146 46 114 66 96 85 Z" fill="url(#velo-wr)" />
        <path d="M 84 83 C 100 68 146 46 160 28" stroke="#6D28D9" strokeWidth="1.4" strokeOpacity="0.55" fill="none" filter="url(#velo-gv)" />
        <circle cx="134" cy="54" r="6" fill="#7C3AED" opacity="0.14" filter="url(#velo-gv)" />
        <circle cx="134" cy="54" r="2.8" fill="#A78BFA" opacity="0.5" />
        <path d="M 86 85 C 104 70 136 54 154 36" stroke="#3B1F77" strokeWidth="0.65" strokeOpacity="0.42" fill="none" />
        <path d="M 88 89 C 102 80 122 72 142 64" stroke="#3B1F77" strokeWidth="0.42" strokeOpacity="0.3" fill="none" />
        <circle cx="157" cy="30" r="2.2" fill="#00D4FF" opacity="0.24" filter="url(#velo-gc)" />

        {/* ── BODY ── */}
        <ellipse cx="80" cy="112" rx="10" ry="23" fill="url(#velo-body)" />
        <ellipse cx="80" cy="104" rx="9" ry="5.5" fill="#1C183E" opacity="0.65" />
        <ellipse cx="80" cy="113" rx="8" ry="5" fill="#171433" opacity="0.65" />
        <ellipse cx="80" cy="122" rx="7" ry="5" fill="#12102A" opacity="0.65" />
        <ellipse cx="80" cy="130" rx="5.5" ry="4.5" fill="#0E0C22" opacity="0.65" />
        <ellipse cx="80" cy="112" rx="1.6" ry="18" fill="#7C3AED" opacity="0.08" filter="url(#velo-gv)" />

        {/* ── HEAD ── */}
        <circle cx="80" cy="72" r="40" fill="#5B21B6" opacity="0.04" filter="url(#velo-ge)" />
        <circle cx="80" cy="72" r="28" fill="url(#velo-head)" />
        <circle cx="80" cy="72" r="28" fill="none" stroke="#1E1A3E" strokeWidth="0.7" />
        <ellipse cx="70" cy="58" rx="12" ry="7" fill="white" opacity="0.025" transform="rotate(-15 70 58)" />

        {/* ── ANTENNAE ── */}
        <path d="M 68 46 C 57 30 42 18 34 8" stroke="#130F2C" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M 68 46 C 57 30 42 18 34 8" stroke="#6D28D9" strokeWidth="0.85" strokeLinecap="round" fill="none" opacity="0.38" />
        <circle cx="34" cy="8" r="5.2" fill="#7C3AED" opacity="0.58" filter="url(#velo-gv)" />
        <circle cx="34" cy="8" r="2.8" fill="#C4B5FD" />
        <circle cx="34" cy="8" r="1.1" fill="white" opacity="0.88" />

        <path d="M 92 46 C 103 30 118 18 126 8" stroke="#130F2C" strokeWidth="2.4" strokeLinecap="round" fill="none" />
        <path d="M 92 46 C 103 30 118 18 126 8" stroke="#6D28D9" strokeWidth="0.85" strokeLinecap="round" fill="none" opacity="0.38" />
        <circle cx="126" cy="8" r="5.2" fill="#7C3AED" opacity="0.58" filter="url(#velo-gv)" />
        <circle cx="126" cy="8" r="2.8" fill="#C4B5FD" />
        <circle cx="126" cy="8" r="1.1" fill="white" opacity="0.88" />

        {/* ── LEFT EYE ── */}
        <circle cx="66" cy="70" r="18" fill="#7C3AED" opacity="0.07" filter="url(#velo-ge)" />
        <circle cx="66" cy="70" r="11.5" fill="#EEEAFF" />
        <motion.g animate={{ x: px, y: py }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
          <circle cx="66" cy="70" r="7.5" fill="url(#velo-iris)" />
          <circle cx="66" cy="70" r="4.2" fill="#03020B" />
          <circle cx="64.6" cy="68.5" r="1.3" fill="#8B5CF6" opacity="0.42" />
        </motion.g>
        <circle cx="61.5" cy="64.5" r="3.2" fill="white" opacity="0.93" />
        <circle cx="69.5" cy="74.5" r="1.4" fill="white" opacity="0.36" />
        <motion.ellipse
          cx="66" cy="70" rx="11.5"
          fill="url(#velo-head)"
          animate={{ ry: blinking ? 11.5 : 0 }}
          transition={{ duration: 0.07 }}
        />

        {/* ── RIGHT EYE ── */}
        <circle cx="94" cy="70" r="18" fill="#7C3AED" opacity="0.07" filter="url(#velo-ge)" />
        <circle cx="94" cy="70" r="11.5" fill="#EEEAFF" />
        <motion.g animate={{ x: px, y: py }} transition={{ type: "spring", stiffness: 280, damping: 22 }}>
          <circle cx="94" cy="70" r="7.5" fill="url(#velo-iris)" />
          <circle cx="94" cy="70" r="4.2" fill="#03020B" />
          <circle cx="92.6" cy="68.5" r="1.3" fill="#8B5CF6" opacity="0.42" />
        </motion.g>
        <circle cx="89.5" cy="64.5" r="3.2" fill="white" opacity="0.93" />
        <circle cx="97.5" cy="74.5" r="1.4" fill="white" opacity="0.36" />
        <motion.ellipse
          cx="94" cy="70" rx="11.5"
          fill="url(#velo-head)"
          animate={{ ry: blinking ? 11.5 : 0 }}
          transition={{ duration: 0.07 }}
        />

        {/* ── LEFT WING COVER (elevates over eyes on password focus) ── */}
        <motion.g
          animate={{ y: coverY, x: coverXL }}
          transition={{ type: "spring", stiffness: 210, damping: 26 }}
        >
          <path d="M 78 116 C 68 106 44 102 32 108 C 32 128 54 136 78 130 Z" fill="url(#velo-wl)" />
          <path d="M 78 112 C 70 102 48 98 36 104 C 36 120 58 126 78 120 Z" fill="url(#velo-wl)" opacity="0.92" />
          <path d="M 78 112 C 70 102 48 98 36 104" stroke="#6D28D9" strokeWidth="1" strokeOpacity="0.5" fill="none" />
          <path d="M 76 114 C 64 104 48 102 40 106" stroke="#3B1F77" strokeWidth="0.5" strokeOpacity="0.38" fill="none" />
        </motion.g>

        {/* ── RIGHT WING COVER ── */}
        <motion.g
          animate={{ y: coverY, x: coverXR }}
          transition={{ type: "spring", stiffness: 210, damping: 26 }}
        >
          <path d="M 82 116 C 92 106 116 102 128 108 C 128 128 106 136 82 130 Z" fill="url(#velo-wr)" />
          <path d="M 82 112 C 90 102 112 98 124 104 C 124 120 102 126 82 120 Z" fill="url(#velo-wr)" opacity="0.92" />
          <path d="M 82 112 C 90 102 112 98 124 104" stroke="#6D28D9" strokeWidth="1" strokeOpacity="0.5" fill="none" />
          <path d="M 84 114 C 96 104 112 102 120 106" stroke="#3B1F77" strokeWidth="0.5" strokeOpacity="0.38" fill="none" />
        </motion.g>
      </motion.svg>
    </div>
  );
}
