"use client";

import { useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

interface RobotMascotProps {
  passwordFocused: boolean;
  showPassword?: boolean;
  size?: number;
}

export function RobotMascot({
  passwordFocused,
  showPassword = false,
  size = 140,
}: RobotMascotProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mousePos, setMousePos] = useState({ x: 0, y: 0 });
  const [isBlinking, setIsBlinking] = useState(false);
  const [isBooped, setIsBooped] = useState(false);

  // Track cursor position relative to the robot center
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

      // Clamp maximum eye shift distance
      const maxShift = 10;
      const angle = Math.atan2(dy, dx);
      const intensity = Math.min(distance / 250, 1);

      setMousePos({
        x: Math.cos(angle) * maxShift * intensity,
        y: Math.sin(angle) * maxShift * intensity,
      });
    };

    window.addEventListener("pointermove", handlePointerMove, { passive: true });
    return () => window.removeEventListener("pointermove", handlePointerMove);
  }, []);

  // Idle natural blink loop
  useEffect(() => {
    const blinkInterval = setInterval(() => {
      if (!passwordFocused) {
        setIsBlinking(true);
        setTimeout(() => setIsBlinking(false), 160);
      }
    }, 4200);

    return () => clearInterval(blinkInterval);
  }, [passwordFocused]);

  const handleBoop = () => {
    setIsBooped(true);
    setTimeout(() => setIsBooped(false), 500);
  };

  // When password is focused and NOT revealed, robot enters privacy / cover mode
  const isCovering = passwordFocused && !showPassword;

  // Head tilt based on mouse position
  const headRotate = isCovering ? 0 : mousePos.x * 0.8;
  const headTranslateY = isCovering ? 4 : mousePos.y * 0.4;

  return (
    <div
      ref={containerRef}
      className="flex justify-center mb-2 select-none relative group cursor-pointer"
      onClick={handleBoop}
      style={{ width: size, height: size * 1.05 }}
    >
      {/* Background ambient cyan glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-28 h-28 bg-vel-teal/15 rounded-full blur-2xl pointer-events-none transition-all duration-500 group-hover:bg-vel-teal/25" />

      <motion.svg
        width={size}
        height={size * 1.05}
        viewBox="0 0 140 145"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        animate={{
          scale: isBooped ? 0.94 : 1,
          rotate: headRotate,
          y: headTranslateY,
        }}
        transition={{ type: "spring", stiffness: 350, damping: 20 }}
        style={{ overflow: "visible" }}
      >
        <defs>
          {/* Ceramic White Helmet Gradient */}
          <linearGradient id="chassisGrad" x1="20" y1="15" x2="120" y2="115" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#F8FAFC" />
            <stop offset="40%" stopColor="#E2E8F0" />
            <stop offset="100%" stopColor="#94A3B8" />
          </linearGradient>

          {/* Dark Glass Visor Gradient */}
          <linearGradient id="visorGrad" x1="30" y1="35" x2="110" y2="85" gradientUnits="userSpaceOnUse">
            <stop offset="0%" stopColor="#0B1120" />
            <stop offset="60%" stopColor="#050811" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>

          {/* Glowing Cyan LED Eye Gradient */}
          <linearGradient id="cyanEye" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor="#38BDF8" />
            <stop offset="50%" stopColor="#00D4FF" />
            <stop offset="100%" stopColor="#0284C7" />
          </linearGradient>

          {/* Shutter Privacy Plate Gradient */}
          <linearGradient id="shutterGrad" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#1E293B" />
            <stop offset="100%" stopColor="#0F172A" />
          </linearGradient>
        </defs>

        {/* ── ROBOT ANTENNA / HEAD CREST ── */}
        <path d="M70 20 V8" stroke="#64748B" strokeWidth="3" strokeLinecap="round" />
        <circle cx="70" cy="7" r="4.5" fill="#00D4FF" />
        <circle cx="70" cy="7" r="2" fill="#FFFFFF" />

        {/* ── ROBOT EARS / SIDE PODS ── */}
        <rect x="14" y="52" width="7" height="24" rx="3.5" fill="#64748B" />
        <rect x="119" y="52" width="7" height="24" rx="3.5" fill="#64748B" />
        {/* Glowing ear indicators */}
        <circle cx="17.5" cy="64" r="1.8" fill="#00D4FF" opacity="0.8" />
        <circle cx="122.5" cy="64" r="1.8" fill="#00D4FF" opacity="0.8" />

        {/* ── HEAD CHASSIS (Olaf-style rounded dome) ── */}
        <rect
          x="19"
          y="20"
          width="102"
          height="88"
          rx="44"
          fill="url(#chassisGrad)"
          stroke="#334155"
          strokeWidth="1.5"
        />

        {/* Top Shell Specular Reflection */}
        <path
          d="M38 27 C50 23 90 23 102 27 C92 25 48 25 38 27 Z"
          fill="#FFFFFF"
          opacity="0.8"
        />

        {/* ── BLACK GLASS VISOR ── */}
        <rect
          x="27"
          y="35"
          width="86"
          height="54"
          rx="27"
          fill="url(#visorGrad)"
          stroke="#1E293B"
          strokeWidth="2"
        />

        {/* Visor Glare / Curved Specular Highlight */}
        <path
          d="M34 44 C45 39 80 39 104 44 C78 40 46 40 34 44 Z"
          fill="#FFFFFF"
          opacity="0.15"
        />

        {/* ── DIGITAL LED EYES ── */}
        <g id="eyes">
          {/* LEFT EYE */}
          <motion.g
            animate={{
              x: isCovering ? 0 : mousePos.x,
              y: isCovering ? 0 : mousePos.y,
              scaleY: isBlinking || isCovering ? 0.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            style={{ transformOrigin: "52px 62px" }}
          >
            {/* Eye Outer Glow */}
            <circle cx="52" cy="62" r="11" fill="#00D4FF" opacity="0.25" filter="blur(2px)" />
            {/* Main Iris */}
            <rect x="42" y="52" width="20" height="20" rx="7" fill="url(#cyanEye)" />
            {/* Core Pupil */}
            <circle cx="52" cy="62" r="5" fill="#0369A1" />
            {/* Catchlight */}
            <circle cx="55" cy="58" r="2.2" fill="#FFFFFF" />
          </motion.g>

          {/* RIGHT EYE */}
          <motion.g
            animate={{
              x: isCovering ? 0 : mousePos.x,
              y: isCovering ? 0 : mousePos.y,
              scaleY: isBlinking || isCovering ? 0.1 : 1,
            }}
            transition={{ type: "spring", stiffness: 450, damping: 28 }}
            style={{ transformOrigin: "88px 62px" }}
          >
            {/* Eye Outer Glow */}
            <circle cx="88" cy="62" r="11" fill="#00D4FF" opacity="0.25" filter="blur(2px)" />
            {/* Main Iris */}
            <rect x="78" y="52" width="20" height="20" rx="7" fill="url(#cyanEye)" />
            {/* Core Pupil */}
            <circle cx="88" cy="62" r="5" fill="#0369A1" />
            {/* Catchlight */}
            <circle cx="91" cy="58" r="2.2" fill="#FFFFFF" />
          </motion.g>

          {/* PEEKING EYE WHEN PASSWORD VISIBLE (Excited Scanner Mode) */}
          {passwordFocused && showPassword && (
            <motion.g
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            >
              {/* Scan Reticle crosshair */}
              <circle cx="70" cy="62" r="26" stroke="#00D4FF" strokeWidth="1" strokeDasharray="3 3" opacity="0.6" />
              <line x1="70" y1="38" x2="70" y2="42" stroke="#00D4FF" strokeWidth="1.5" />
              <line x1="70" y1="82" x2="70" y2="86" stroke="#00D4FF" strokeWidth="1.5" />
            </motion.g>
          )}
        </g>

        {/* ── ROBOT CHEEKS / SUBTLE BLUSH LEDS ── */}
        <circle cx="36" cy="72" r="3" fill="#00D4FF" opacity={passwordFocused ? "0.8" : "0.2"} />
        <circle cx="104" cy="72" r="3" fill="#00D4FF" opacity={passwordFocused ? "0.8" : "0.2"} />

        {/* ── MOUTH / STATUS LIGHT ── */}
        <rect x="63" y="77" width="14" height="2.5" rx="1.25" fill="#334155" />
        {passwordFocused && (
          <rect x="65" y="77" width="10" height="2.5" rx="1.25" fill="#00D4FF" opacity="0.8" />
        )}

        {/* ── ROBOT COLLAR / TORSO BASE ── */}
        <path
          d="M48 107 C48 107 58 114 70 114 C82 114 92 107 92 107 L96 128 C96 128 84 133 70 133 C56 133 44 128 44 128 Z"
          fill="#334155"
        />
        <circle cx="70" cy="122" r="3" fill="#00D4FF" opacity="0.8" />

        {/* ── ROBOT MECHANICAL HANDS (Cover Eyes When Password Is Focused) ── */}
        {/* Left Arm & Hand */}
        <motion.g
          animate={{
            y: isCovering ? -28 : 16,
            rotate: isCovering ? 14 : -10,
            opacity: isCovering ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          style={{ transformOrigin: "42px 105px" }}
        >
          {/* Arm link */}
          <rect x="34" y="90" width="14" height="26" rx="7" fill="#64748B" stroke="#334155" strokeWidth="1" />
          {/* Hand plate */}
          <rect x="30" y="74" width="28" height="24" rx="10" fill="url(#chassisGrad)" stroke="#475569" strokeWidth="1.5" />
          {/* Finger segments */}
          <circle cx="38" cy="78" r="3" fill="#94A3B8" />
          <circle cx="44" cy="76" r="3" fill="#94A3B8" />
          <circle cx="50" cy="78" r="3" fill="#94A3B8" />
        </motion.g>

        {/* Right Arm & Hand */}
        <motion.g
          animate={{
            y: isCovering ? -28 : 16,
            rotate: isCovering ? -14 : 10,
            opacity: isCovering ? 1 : 0,
          }}
          transition={{ type: "spring", stiffness: 320, damping: 22 }}
          style={{ transformOrigin: "98px 105px" }}
        >
          {/* Arm link */}
          <rect x="92" y="90" width="14" height="26" rx="7" fill="#64748B" stroke="#334155" strokeWidth="1" />
          {/* Hand plate */}
          <rect x="82" y="74" width="28" height="24" rx="10" fill="url(#chassisGrad)" stroke="#475569" strokeWidth="1.5" />
          {/* Finger segments */}
          <circle cx="90" cy="78" r="3" fill="#94A3B8" />
          <circle cx="96" cy="76" r="3" fill="#94A3B8" />
          <circle cx="102" cy="78" r="3" fill="#94A3B8" />
        </motion.g>
      </motion.svg>
    </div>
  );
}
