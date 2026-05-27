"use client";

import { useMemo } from "react";
import type { AnalystRating } from "@/lib/types";

/* ─── Gauge geometry ─── */
const CX = 140;
const CY = 130;
const R = 100;
const START_ANGLE = Math.PI;       // 180° (left)
const END_ANGLE = 0;               // 0° (right)
const STROKE_W = 18;

/* ─── Segment colours & labels ─── */
const SEGMENTS = [
  { label: "Strong\nSell", color: "#991B1B" },   // dark red
  { label: "Sell",          color: "#EF4444" },   // red
  { label: "Hold",          color: "#F6C45F" },   // amber
  { label: "Buy",           color: "#3DF0A4" },   // green
  { label: "Strong\nBuy",   color: "#059669" },   // dark green
] as const;

function polarToCartesian(cx: number, cy: number, r: number, angle: number) {
  return { x: cx + r * Math.cos(angle), y: cy - r * Math.sin(angle) };
}

function arcPath(cx: number, cy: number, r: number, startAngle: number, endAngle: number) {
  const start = polarToCartesian(cx, cy, r, startAngle);
  const end = polarToCartesian(cx, cy, r, endAngle);
  const largeArc = startAngle - endAngle > Math.PI ? 1 : 0;
  return `M ${start.x} ${start.y} A ${r} ${r} 0 ${largeArc} 0 ${end.x} ${end.y}`;
}

function getConsensusColor(consensus: string) {
  const c = consensus.toLowerCase();
  if (c.includes("strong buy")) return "#059669";
  if (c.includes("buy")) return "#3DF0A4";
  if (c.includes("strong sell")) return "#991B1B";
  if (c.includes("sell")) return "#EF4444";
  return "#F6C45F"; // hold
}

export function AnalystGauge({ rating }: { rating: AnalystRating }) {
  const needleAngle = useMemo(() => {
    const total = rating.strongBuy + rating.buy + rating.hold + rating.sell + rating.strongSell;
    if (total === 0) return Math.PI / 2; // center

    // Weighted score: 1 = strongSell … 5 = strongBuy
    const score =
      (rating.strongSell * 1 +
        rating.sell * 2 +
        rating.hold * 3 +
        rating.buy * 4 +
        rating.strongBuy * 5) /
      total;

    // Map score 1-5 → angle π-0
    const t = (score - 1) / 4; // 0 → 1
    return START_ANGLE - t * (START_ANGLE - END_ANGLE);
  }, [rating]);

  const needleTip = polarToCartesian(CX, CY, R - STROKE_W / 2 - 8, needleAngle);
  const total = rating.strongBuy + rating.buy + rating.hold + rating.sell + rating.strongSell;

  return (
    <div className="flex flex-col items-center">
      <svg viewBox="0 0 280 165" className="w-full max-w-[280px]">
        {/* ─── Arc segments ─── */}
        {SEGMENTS.map((seg, i) => {
          const segStart = START_ANGLE - (i / 5) * Math.PI;
          const segEnd = START_ANGLE - ((i + 1) / 5) * Math.PI;
          return (
            <path
              key={i}
              d={arcPath(CX, CY, R, segStart, segEnd)}
              fill="none"
              stroke={seg.color}
              strokeWidth={STROKE_W}
              strokeLinecap="butt"
              opacity={0.85}
            />
          );
        })}

        {/* ─── Segment labels ─── */}
        {SEGMENTS.map((seg, i) => {
          const midAngle = START_ANGLE - ((i + 0.5) / 5) * Math.PI;
          const labelPos = polarToCartesian(CX, CY, R + 22, midAngle);
          const lines = seg.label.split("\n");
          return (
            <text
              key={`label-${i}`}
              x={labelPos.x}
              y={labelPos.y}
              textAnchor="middle"
              dominantBaseline="middle"
              className="fill-white/40"
              fontSize="8"
              fontWeight="600"
            >
              {lines.map((line, li) => (
                <tspan key={li} x={labelPos.x} dy={li === 0 ? 0 : 10}>
                  {line}
                </tspan>
              ))}
            </text>
          );
        })}

        {/* ─── Needle ─── */}
        <line
          x1={CX}
          y1={CY}
          x2={needleTip.x}
          y2={needleTip.y}
          stroke="#F4F7FB"
          strokeWidth="2.5"
          strokeLinecap="round"
        />
        <circle cx={CX} cy={CY} r={6} fill="#151A2B" stroke="#F4F7FB" strokeWidth="2" />

        {/* ─── Total analysts count ─── */}
        <text
          x={CX}
          y={CY - 16}
          textAnchor="middle"
          className="fill-white/80"
          fontSize="20"
          fontWeight="800"
        >
          {total}
        </text>
        <text
          x={CX}
          y={CY - 2}
          textAnchor="middle"
          className="fill-white/35"
          fontSize="8"
          fontWeight="600"
        >
          ANALYSTS
        </text>
      </svg>

      {/* ─── Consensus label ─── */}
      <div className="flex items-center gap-2 -mt-2">
        <div
          className="w-2.5 h-2.5 rounded-full"
          style={{ background: getConsensusColor(rating.consensus) }}
        />
        <span
          className="text-sm font-bold uppercase tracking-wide"
          style={{ color: getConsensusColor(rating.consensus) }}
        >
          {rating.consensus}
        </span>
      </div>
    </div>
  );
}
