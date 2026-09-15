"use client";

import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";

interface OlafMascotProps {
  activeField: "email" | "password" | null;
  textLength: number;
  passwordFocused: boolean;
  showPassword?: boolean;
  size?: number;
}

export function OlafMascot({
  activeField,
  textLength,
  passwordFocused,
  showPassword = false,
  size = 150,
}: OlafMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isBooped, setIsBooped] = useState(false);

  // Mouse tracking across viewport when not typing
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    const handlePointerMove = (e: PointerEvent) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const centerX = rect.left + rect.width / 2;
      const centerY = rect.top + rect.height / 2;

      const dx = e.clientX - centerX;
      const dy = e.clientY - centerY;
      const distance = Math.hypot(dx, dy);

      const maxShift = 7;
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(distance / 280, 1);

      setMousePos({
        x: Math.cos(angle) * maxShift * intensity,
        y: Math.sin(angle) * maxShift * intensity,
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  // Idle natural blink
  useEffect(() => {
    const interval = setInterval(() => {
      if (!passwordFocused) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 180);
      }
    }, 3800);

    return () => clearInterval(interval);
  }, [passwordFocused]);

  const handleBoop = () => {
    setIsBooped(true);
    setTimeout(() => setIsBooped(false), 450);
  };

  // When password is focused and hidden: Olaf covers his eyes
  const isCovering = passwordFocused && !showPassword;

  // When user is typing in a field (email or revealed password):
  // Gaze locks down to the input box and tracks horizontally as cursor advances!
  let gazeX = mousePos.x;
  let gazeY = mousePos.y;

  if (activeField === "email" || (activeField === "password" && showPassword)) {
    // Looking down towards the input field
    gazeY = 5.5;
    // Track cursor from left to right as user types (clamped -5 to +5)
    gazeX = Math.min(Math.max(-5 + textLength * 0.45, -5), 5);
  }

  // Head tilt follows gaze or straightens when covering
  const headRotate = isCovering ? 0 : gazeX * 0.7;
  const headY = isCovering ? 2 : gazeY * 0.3;

  return (
    <div
      ref={containerRef}
      className="flex justify-center mb-1 select-none relative group cursor-pointer"
      onClick={handleBoop}
      style={{ width: size, height: size * 1.12 }}
      title="Click to boop Olaf!"
    >
      {/* Soft snow & teal ambient glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-vel-teal/10 rounded-full blur-2xl pointer-events-none transition-all duration-500 group-hover:bg-vel-teal/20" />

      <motion.svg
        width={size}
        height={size * 1.12}
        viewBox="0 0 160 180"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          scale: isBooped ? 0.94 : 1,
          y: headY,
          rotate: headRotate,
        }}
        transition={{ type: "spring", stiffness: 340, damping: 22 }}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Olaf Snow Gradient */}
          <linearGradient id="olafSnow" x1="50" y1="20" x2="120" y2="150" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FFFFFF" />
            <stop offset="65%" stopColor="#F1F5F9" />
            <stop offset="100%" stopColor="#CBD5E1" />
          </linearGradient>

          {/* Carrot Orange Gradient */}
          <linearGradient id="carrotGrad" x1="75" y1="65" x2="85" y2="92" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#FB923C" />
            <stop offset="50%" stopColor="#F97316" />
            <stop offset="100%" stopColor="#C2410C" />
          </linearGradient>

          {/* Twig Wood Gradient */}
          <linearGradient id="woodGrad" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#78350F" />
            <stop offset="100%" stopColor="#451A03" />
          </linearGradient>

          {/* Coal Gradient */}
          <radialGradient id="coalGrad" cx="35%" cy="35%" r="65%">
            <stop offset="0%" stopColor="#475569" />
            <stop offset="100%" stopColor="#0F172A" />
          </radialGradient>
        </defs>

        {/* ── 1. TWIG HAIR (3 sticks sprouting from head) ── */}
        <g id="twig-hair">
          {/* Center twig */}
          <path d="M80 32 Q80 18 78 6" stroke="url(#woodGrad)" strokeWidth="3" strokeLinecap="round" />
          {/* Left twig */}
          <path d="M78 33 Q72 20 66 10" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
          {/* Right twig */}
          <path d="M82 33 Q86 22 93 12" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
        </g>

        {/* ── 2. TORSO & SHOULDERS (Body snowball with coal button) ── */}
        <g id="torso">
          {/* Upper Body Snowball */}
          <ellipse cx="80" cy="148" rx="38" ry="28" fill="url(#olafSnow)" stroke="#94A3B8" strokeWidth="1" />
          {/* Shadow under head */}
          <ellipse cx="80" cy="126" rx="24" ry="6" fill="#94A3B8" opacity="0.35" />
          {/* Coal Button on Chest */}
          <circle cx="80" cy="144" r="5" fill="url(#coalGrad)" />
          <circle cx="78.5" cy="142.5" r="1.5" fill="#94A3B8" opacity="0.5" />
        </g>

        {/* ── 3. TWIG ARMS (Originate from shoulders at (44, 138) and (116, 138)) ── */}
        {/* LEFT ARM & TWIG HAND */}
        <motion.g
          animate={{
            rotate: isCovering ? 108 : showPassword && passwordFocused ? 55 : 0,
            y: isCovering ? -32 : 0,
            x: isCovering ? 18 : 0,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          style={{ transformOrigin: "44px 138px" }}
        >
          {/* Arm Branch from shoulder */}
          <path
            d="M44 138 Q30 118 36 94"
            stroke="url(#woodGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Left Twig Hand (3 Fingers) */}
          <path d="M36 94 L30 82" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M36 94 L36 78" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M36 94 L44 82" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        {/* RIGHT ARM & TWIG HAND */}
        <motion.g
          animate={{
            rotate: isCovering ? -108 : showPassword && passwordFocused ? -55 : 0,
            y: isCovering ? -32 : 0,
            x: isCovering ? -18 : 0,
          }}
          transition={{ type: "spring", stiffness: 280, damping: 22 }}
          style={{ transformOrigin: "116px 138px" }}
        >
          {/* Arm Branch from shoulder */}
          <path
            d="M116 138 Q130 118 124 94"
            stroke="url(#woodGrad)"
            strokeWidth="3.5"
            strokeLinecap="round"
            fill="none"
          />
          {/* Right Twig Hand (3 Fingers) */}
          <path d="M124 94 L118 82" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 94 L124 78" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
          <path d="M124 94 L132 82" stroke="url(#woodGrad)" strokeWidth="2.5" strokeLinecap="round" />
        </motion.g>

        {/* ── 4. OLAF HEAD (Classic inverted pear / egg silhouette) ── */}
        <g id="head">
          {/* Upper Head */}
          <ellipse cx="80" cy="56" rx="33" ry="30" fill="url(#olafSnow)" />
          {/* Wide Lower Cheeks */}
          <ellipse cx="80" cy="86" rx="42" ry="28" fill="url(#olafSnow)" />
          {/* Outline definition */}
          <path
            d="M48 68 C44 78 40 98 56 108 C70 116 90 116 104 108 C120 98 116 78 112 68 C114 50 106 32 80 32 C54 32 46 50 48 68 Z"
            fill="url(#olafSnow)"
            stroke="#94A3B8"
            strokeWidth="1.2"
          />
        </g>

        {/* ── 5. MOUTH, BUCK TOOTH & TONGUE ── */}
        <g id="mouth">
          {/* Open Joyful Grin */}
          <path
            d="M56 86 C64 108 96 108 104 86 Q80 92 56 86 Z"
            fill="#0F172A"
          />
          {/* Pink Tongue */}
          <path
            d="M68 98 C74 94 86 94 92 98 C88 103 72 103 68 98 Z"
            fill="#F43F5E"
          />
          {/* Olaf's Signature Large White Buck Tooth */}
          <rect x="73" y="86" width="14" height="11" rx="2.5" fill="#FFFFFF" stroke="#CBD5E1" strokeWidth="0.8" />
        </g>

        {/* ── 6. EYES & EYEBROWS ── */}
        <g id="eyes">
          {/* LEFT EYE SCLERA */}
          <ellipse cx="64" cy="58" rx="10" ry="13" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />
          {/* RIGHT EYE SCLERA */}
          <ellipse cx="96" cy="58" rx="10" ry="13" fill="#FFFFFF" stroke="#94A3B8" strokeWidth="1" />

          {/* LEFT PUPIL (Tracks Mouse / Input Cursor) */}
          <motion.g
            animate={{
              x: isCovering ? 0 : gazeX,
              y: isCovering ? 0 : gazeY,
              scaleY: isBlinking ? 0.08 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            style={{ transformOrigin: "64px 58px" }}
          >
            <circle cx="64" cy="58" r="5" fill="url(#coalGrad)" />
            {/* Catchlight */}
            <circle cx="66" cy="55.5" r="1.8" fill="#FFFFFF" />
          </motion.g>

          {/* RIGHT PUPIL (Tracks Mouse / Input Cursor) */}
          <motion.g
            animate={{
              x: isCovering ? 0 : gazeX,
              y: isCovering ? 0 : gazeY,
              scaleY: isBlinking ? 0.08 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            style={{ transformOrigin: "96px 58px" }}
          >
            <circle cx="96" cy="58" r="5" fill="url(#coalGrad)" />
            {/* Catchlight */}
            <circle cx="98" cy="55.5" r="1.8" fill="#FFFFFF" />
          </motion.g>

          {/* EYEBROWS (Expressive wood / coal twigs) */}
          <motion.g
            animate={{
              y: isCovering ? 3 : gazeY < 0 ? -2 : 0,
              rotate: isCovering ? 10 : 0,
            }}
            style={{ transformOrigin: "64px 42px" }}
          >
            <path d="M55 45 Q64 41 73 44" stroke="url(#woodGrad)" strokeWidth="2.8" strokeLinecap="round" />
          </motion.g>

          <motion.g
            animate={{
              y: isCovering ? 3 : gazeY < 0 ? -2 : 0,
              rotate: isCovering ? -10 : 0,
            }}
            style={{ transformOrigin: "96px 42px" }}
          >
            <path d="M87 44 Q96 41 105 45" stroke="url(#woodGrad)" strokeWidth="2.8" strokeLinecap="round" />
          </motion.g>
        </g>

        {/* ── 7. CARROT NOSE (Pointed orange cone sticking forward) ── */}
        <g id="carrot-nose">
          {/* Nose shadow */}
          <ellipse cx="80" cy="74" rx="6" ry="3" fill="#64748B" opacity="0.25" />
          {/* Carrot Body */}
          <path
            d="M75 66 C75 62 85 62 85 66 L82 85 C81 88 79 88 78 85 Z"
            fill="url(#carrotGrad)"
            stroke="#9A3412"
            strokeWidth="0.8"
          />
          {/* Carrot Ridges */}
          <line x1="77" y1="70" x2="81" y2="70" stroke="#9A3412" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          <line x1="78" y1="75" x2="82" y2="75" stroke="#9A3412" strokeWidth="1" strokeLinecap="round" opacity="0.7" />
          <line x1="78" y1="80" x2="81" y2="80" stroke="#9A3412" strokeWidth="0.8" strokeLinecap="round" opacity="0.7" />
        </g>
      </motion.svg>
    </div>
  );
}
