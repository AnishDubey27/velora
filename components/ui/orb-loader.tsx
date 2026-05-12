"use client";

import { motion } from "framer-motion";

export function OrbLoader({ compact = false }: { compact?: boolean }) {
  return (
    <div className="relative grid place-items-center">
      <motion.div
        className="absolute rounded-full bg-vel-teal/20 blur-2xl"
        animate={{
          width: compact ? [90, 118, 90] : [148, 190, 148],
          height: compact ? [90, 118, 90] : [148, 190, 148],
          opacity: [0.18, 0.42, 0.18]
        }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="relative rounded-full border border-white/10 bg-[radial-gradient(circle_at_35%_24%,rgba(255,255,255,0.92),rgba(100,116,139,0.18)_18%,rgba(4,7,13,0.98)_42%,#000_100%)] shadow-[inset_0_12px_18px_rgba(255,255,255,0.08),0_0_38px_rgba(0,212,255,0.24)]"
        animate={{
          scale: [1, 1.09, 0.98, 1.04, 1],
          boxShadow: [
            "inset 0 12px 18px rgba(255,255,255,0.08), 0 0 28px rgba(0,212,255,0.18)",
            "inset 0 18px 22px rgba(255,255,255,0.12), 0 0 54px rgba(0,212,255,0.42)",
            "inset 0 9px 16px rgba(255,255,255,0.06), 0 0 22px rgba(0,212,255,0.14)",
            "inset 0 14px 22px rgba(255,255,255,0.1), 0 0 44px rgba(0,212,255,0.32)",
            "inset 0 12px 18px rgba(255,255,255,0.08), 0 0 28px rgba(0,212,255,0.18)"
          ]
        }}
        transition={{ duration: 1.58, repeat: Infinity, ease: [0.45, 0, 0.2, 1] }}
        style={{ width: compact ? 58 : 92, height: compact ? 58 : 92 }}
      >
        <motion.span
          className="absolute left-[24%] top-[17%] h-[22%] w-[34%] rounded-full bg-white/90 blur-[2px]"
          animate={{ opacity: [0.62, 0.96, 0.52], y: [0, -2, 1] }}
          transition={{ duration: 1.3, repeat: Infinity, ease: "easeInOut" }}
        />
      </motion.div>
    </div>
  );
}
