"use client";

import { useEffect, useRef, useState } from "react";

const DIRECTIONS = [
  "up-left",
  "up",
  "up-right",
  "left",
  "center",
  "right",
  "down-left",
  "down",
  "down-right",
] as const;

const REACTIONS = [
  "blink",
  "heart",
  "sparkle",
  "surprised",
  "wink",
  "bashful",
  "sleepy",
  "dizzy",
  "delighted",
] as const;

const CLOCKWISE = [
  "right",
  "down-right",
  "down",
  "down-left",
  "left",
  "up-left",
  "up",
  "up-right",
] as const;

const SECTOR = (Math.PI * 2) / CLOCKWISE.length;
const HYSTERESIS = 0.12;
const DEAD_ZONE = 70;
const PAYOFFS = ["heart", "sparkle", "delighted"] as const;
const BOOP_PAYOFF = 120;
const BOOP_END = 560;
const SQUASH_MS = 420;
const DIZZY_AFTER = 4;
const DIZZY_WINDOW = 1600;
const DIZZY_END = 1100;

const SQUASH = [
  { transform: "scale(1, 1)", easing: "ease-in" },
  { transform: "scale(1.10, 0.86)", offset: 0.18, easing: "ease-out" },
  { transform: "scale(0.95, 1.08)", offset: 0.45, easing: "ease-in-out" },
  { transform: "scale(1.03, 0.97)", offset: 0.72, easing: "ease-in-out" },
  { transform: "scale(1, 1)" },
];

function cell(index: number) {
  return {
    backgroundPosition: `${(index % 3) * 50}% ${Math.floor(index / 3) * 50}%`,
  };
}

function wrap(angle: number) {
  return Math.atan2(Math.sin(angle), Math.cos(angle));
}

const layerStyle: React.CSSProperties = {
  position: "absolute",
  inset: 0,
  backgroundSize: "300% 300%",
  backgroundRepeat: "no-repeat",
};

interface MascotProps {
  directions?: string;
  reactions?: string;
  size?: number;
  passwordFocused?: boolean;
  className?: string;
  label?: string;
}

export function Mascot({
  directions = "/mascots/fox-directions.png",
  reactions = "/mascots/fox-reactions.png",
  size = 130,
  passwordFocused = false,
  className = "",
  label = "fox mascot",
}: MascotProps) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  const squashRef = useRef<HTMLSpanElement>(null);
  const timersRef = useRef<number[]>([]);
  const boopsRef = useRef({ count: 0, at: 0 });

  const [direction, setDirection] = useState<string>("center");
  const [reaction, setReaction] = useState<string | null>(null);

  // Track cursor movement across viewport
  useEffect(() => {
    if (!window.matchMedia("(hover: hover) and (pointer: fine)").matches) {
      return;
    }

    let sector = -1;
    let pointer: { x: number; y: number } | null = null;

    const aim = () => {
      const button = buttonRef.current;
      if (!button || !pointer) {
        return;
      }
      const box = button.getBoundingClientRect();
      const dx = pointer.x - (box.left + box.width / 2);
      const dy = pointer.y - (box.top + box.height / 2);

      if (Math.hypot(dx, dy) < DEAD_ZONE) {
        sector = -1;
        setDirection("center");
        return;
      }

      const angle = Math.atan2(dy, dx);
      if (
        sector !== -1 &&
        Math.abs(wrap(angle - sector * SECTOR)) < SECTOR / 2 + HYSTERESIS
      ) {
        return;
      }

      sector = (Math.round(angle / SECTOR) + CLOCKWISE.length) % CLOCKWISE.length;
      setDirection(CLOCKWISE[sector]);
    };

    const onPointerMove = (event: PointerEvent) => {
      pointer = { x: event.clientX, y: event.clientY };
      aim();
    };

    window.addEventListener("pointermove", onPointerMove, { passive: true });
    window.addEventListener("scroll", aim, { passive: true });

    return () => {
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("scroll", aim);
    };
  }, []);

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      timersRef.current.forEach(window.clearTimeout);
    };
  }, []);

  // Handle click / boop
  const boop = () => {
    timersRef.current.forEach(window.clearTimeout);
    timersRef.current = [];

    const later = (ms: number, next: string | null) => {
      timersRef.current.push(
        window.setTimeout(() => setReaction(next), ms) as unknown as number
      );
    };

    const now = Date.now();
    const boops = boopsRef.current;
    boops.count = now - boops.at < DIZZY_WINDOW ? boops.count + 1 : 1;
    boops.at = now;

    if (boops.count >= DIZZY_AFTER) {
      boops.count = 0;
      setReaction("dizzy");
      later(DIZZY_END, null);
    } else {
      setReaction("blink");
      later(BOOP_PAYOFF, PAYOFFS[(boops.count - 1) % PAYOFFS.length]);
      later(BOOP_END, null);
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      return;
    }

    squashRef.current?.animate(SQUASH, {
      duration: SQUASH_MS,
      easing: "linear",
    });
  };

  // When password field is focused, show "bashful" (eyes covered / closed & blushing)
  const activeReaction = passwordFocused ? "bashful" : reaction;
  const isReacting = Boolean(activeReaction);

  const directionIndex = DIRECTIONS.indexOf(
    direction as (typeof DIRECTIONS)[number]
  );
  const reactionIndex = REACTIONS.indexOf(
    (activeReaction ?? "blink") as (typeof REACTIONS)[number]
  );

  return (
    <div className="flex justify-center mb-3 select-none relative group">
      {/* Subtle soft backdrop glow */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-32 h-32 bg-vel-teal/10 rounded-full blur-2xl pointer-events-none transition-all duration-500 group-hover:bg-vel-teal/20" />

      <button
        ref={buttonRef}
        type="button"
        onClick={boop}
        aria-label={`Boop the ${label}`}
        className={`relative block flex-shrink-0 p-0 border-0 bg-transparent cursor-pointer select-none transition-transform active:scale-95 ${className}`}
        style={{
          width: size,
          height: size,
          appearance: "none",
        }}
      >
        <span
          ref={squashRef}
          style={{
            position: "relative",
            display: "block",
            width: "100%",
            height: "100%",
            transformOrigin: "50% 78%",
          }}
        >
          {/* Directions Layer (tracks mouse) */}
          <span
            style={{
              ...layerStyle,
              backgroundImage: `url(${directions})`,
              ...cell(directionIndex >= 0 ? directionIndex : 4),
              opacity: isReacting ? 0 : 1,
              transition: "opacity 120ms ease-out",
            }}
          />

          {/* Reactions Layer (blinking / bashful / boop / password peek) */}
          <span
            style={{
              ...layerStyle,
              backgroundImage: `url(${reactions})`,
              ...cell(reactionIndex >= 0 ? reactionIndex : 0),
              opacity: isReacting ? 1 : 0,
              transition: "opacity 120ms ease-out",
            }}
          />


        </span>
      </button>
    </div>
  );
}
