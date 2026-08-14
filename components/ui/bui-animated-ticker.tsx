"use client";

import { useEffect, useRef, useState } from "react";
import { motion, useSpring, useTransform } from "framer-motion";

type BuiAnimatedTickerProps = {
  value: number;
  prefix?: string;
  suffix?: string;
  decimals?: number;
  className?: string;
};

export function BuiAnimatedTicker({
  value,
  prefix = "",
  suffix = "",
  decimals = 2,
  className = "",
}: BuiAnimatedTickerProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const spring = useSpring(value, { mass: 0.8, stiffness: 75, damping: 15 });

  useEffect(() => {
    spring.set(value);
  }, [value, spring]);

  useEffect(() => {
    return spring.on("change", (latest) => {
      setDisplayValue(latest);
    });
  }, [spring]);

  const formatted = `${prefix}${displayValue.toLocaleString("en-US", {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  })}${suffix}`;

  return (
    <motion.span className={`inline-block font-mono tracking-tight ${className}`}>
      {formatted}
    </motion.span>
  );
}
