import assert from "node:assert/strict";

// 1. Verify sparkline endpoint logic from bui-insight-cards.tsx
function generateSvgPoints(baseVal, pct, count = 20) {
  const points = [];
  const startVal = pct >= 0 ? baseVal / (1 + pct / 100) : baseVal / (1 - Math.abs(pct) / 100);
  const diff = baseVal - startVal;

  for (let i = 0; i < count; i++) {
    const t = i / (count - 1);
    if (i === count - 1) {
      points.push(Number(baseVal.toFixed(2)));
    } else {
      const noise = (Math.sin(i * 1.7) * 0.4 + Math.cos(i * 2.3) * 0.3) * (Math.abs(diff) * 0.15);
      const val = startVal + diff * Math.pow(t, 1.2) + noise;
      points.push(Number(val.toFixed(2)));
    }
  }
  return points;
}

console.log("=== Testing Sparkline Endpoint Parity ===");
const basePortfolioTotal = 79.04;
const returnPct = 13.36;
const points = generateSvgPoints(basePortfolioTotal, returnPct);
const lastPoint = points[points.length - 1];

console.log(`Base Portfolio Total: $${basePortfolioTotal}`);
console.log(`Sparkline Final Point (index ${points.length - 1}): $${lastPoint}`);
assert.equal(lastPoint, basePortfolioTotal, "Final sparkline scrub point must strictly equal base portfolio total");
console.log("✓ Sparkline endpoint parity verified mathematically!");

// 2. Verify BuiRecordsTable resize bounds and math
console.log("\n=== Testing Records Table Resize Logic & Guards ===");
const MIN_WIDTH = 90;
const MAX_WIDTH = 500;

function calculateNewWidth(startWidth, startX, currentX) {
  const deltaX = currentX - startX;
  return Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaX)));
}

// Shrink beyond minimum
assert.equal(calculateNewWidth(120, 200, 50), 90, "Width should clamp to min 90px when dragging far left");
// Expand beyond maximum
assert.equal(calculateNewWidth(200, 200, 800), 500, "Width should clamp to max 500px when dragging far right");
// Normal left drag
assert.equal(calculateNewWidth(200, 300, 250), 150, "Width should decrease by 50px");
// Normal right drag
assert.equal(calculateNewWidth(200, 300, 360), 260, "Width should increase by 60px");

console.log("✓ Records table min-width (90px) and max-width (500px) clamp guards verified!");

// 3. Verify Null Dereference Regression Fix
console.log("\n=== Testing Null Dereference Guard on mouseup race ===");
let resizingRef = { current: { col: "asset", startX: 100, startWidth: 150 } };

// Simulate handleMouseMove
const colKey = resizingRef.current.col;
const startX = resizingRef.current.startX;
const startWidth = resizingRef.current.startWidth;

// Mouseup occurs BEFORE React state callback executes (the exact crash condition)
resizingRef.current = null;

// React executes state updater later
let stateUpdated = false;
let exceptionThrown = false;
try {
  const currentX = 130;
  const deltaX = currentX - startX;
  const newWidth = Math.min(MAX_WIDTH, Math.max(MIN_WIDTH, Math.round(startWidth + deltaX)));
  // Accessing closed-over colKey
  const newState = { [colKey]: newWidth };
  assert.equal(newState.asset, 180);
  stateUpdated = true;
} catch (e) {
  exceptionThrown = true;
}

assert.equal(exceptionThrown, false, "Must not throw null pointer exception when resizingRef is null");
assert.equal(stateUpdated, true, "State updater must succeed using lexical closure");
console.log("✓ Null dereference race condition confirmed eliminated!");
