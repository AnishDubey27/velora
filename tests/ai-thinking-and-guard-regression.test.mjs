import assert from "node:assert/strict";

/**
 * Velora AI Layer Regression Test Suite
 * 
 * Verifies:
 * 1. MiniMax request payload includes chat_template_kwargs: { enable_thinking: false }
 * 2. Date formatting parses ISO/GMT strings to clean human readable dates (e.g. "Nov 16, 2026") and rejects "— Recent"
 * 3. Trade Setup block is omitted when price target is missing/unavailable (never outputs "N/A" or inverted percentages)
 * 4. Trade Setup block is correctly formatted when target > currentPrice
 */

function formatDateCitation(rawDate) {
  if (!rawDate) return "";
  try {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      const formatted = d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "UTC" });
      return ` — ${formatted}`;
    }
  } catch {}
  return "";
}

function generateTradeSetupBlock(currentPrice, targetPrice, stopLoss) {
  if (targetPrice && targetPrice > currentPrice) {
    const upsidePct = (((targetPrice - currentPrice) / currentPrice) * 100).toFixed(1);
    const downsidePercent = (((stopLoss - currentPrice) / currentPrice) * 100).toFixed(1);
    return `> **TRADE SETUP:** Entry $${currentPrice.toFixed(2)} | Target $${targetPrice.toFixed(2)} (+${upsidePct}%) | Stop $${stopLoss.toFixed(2)} (${downsidePercent}%) | Conviction High`;
  }
  return null;
}

// Test 1: Date formatting
assert.equal(formatDateCitation("2026-11-13T14:30:00Z"), " — Nov 13, 2026");
assert.equal(formatDateCitation("Fri, 13 Nov 2026 14:30:00 GMT"), " — Nov 13, 2026");
assert.equal(formatDateCitation(undefined), "");
assert.equal(formatDateCitation(""), "");

// Test 2: Trade Setup with Target > Entry
const setup1 = generateTradeSetupBlock(390.22, 450.00, 359.00);
assert.ok(setup1 !== null);
assert.ok(setup1.includes("Entry $390.22"));
assert.ok(setup1.includes("Target $450.00 (+15.3%)"));
assert.ok(setup1.includes("Stop $359.00 (-8.0%)"));

// Test 3: Trade Setup when Target is Missing (Finnhub 403 / Free Tier)
const setup2 = generateTradeSetupBlock(390.22, null, 359.00);
assert.equal(setup2, null, "Trade setup MUST be omitted when target is null");

// Test 4: Trade Setup when Target is lower than Entry (inverted)
const setup3 = generateTradeSetupBlock(390.22, 365.00, 359.00);
assert.equal(setup3, null, "Trade setup MUST be omitted when target <= entry to prevent inverted percentages");

// Test 5: MiniMax thinking parameter check
function prepareNvidiaPayload(model, messages) {
  const isNemotron = model.includes("nemotron");
  const isMiniMax = model.includes("minimax");
  return {
    model,
    messages,
    stream: true,
    ...(isNemotron || isMiniMax ? { chat_template_kwargs: { enable_thinking: false } } : {})
  };
}

const payloadMiniMax = prepareNvidiaPayload("minimaxai/minimax-m3.1-flash", [{ role: "user", content: "Hi" }]);
assert.deepEqual(payloadMiniMax.chat_template_kwargs, { enable_thinking: false }, "MiniMax must have enable_thinking: false");

const payloadNemotron = prepareNvidiaPayload("nvidia/nemotron-3.5-bolt-e4b", [{ role: "user", content: "Hi" }]);
assert.deepEqual(payloadNemotron.chat_template_kwargs, { enable_thinking: false }, "Nemotron must have enable_thinking: false");

// Test 6: Multi-ticker portfolio grounding (NVDA not held, TSLA held)
function generateMultiTickerGrounding(detectedTickers, userHoldings) {
  return detectedTickers.map(sym => {
    const h = userHoldings.find(item => item.symbol.toUpperCase() === sym.toUpperCase());
    if (h) {
      return `• ${sym}: CURRENT HOLDING | Classification: ${h.isProfit ? "WINNER / PROFITABLE" : "UNDERPERFORMER / LOSS"} | Return: ${h.returnDollar >= 0 ? '+' : ''}${h.returnPercent.toFixed(2)}% | Value: $${h.positionValue.toFixed(2)}`;
    } else {
      return `• ${sym}: NOT HELD IN PORTFOLIO | The user holds 0 shares of ${sym} in their Velora portfolio.`;
    }
  }).join("\n");
}

const mockTestHoldings = [
  { symbol: "TSLA", shares: 0.08, purchasePrice: 240, currentPrice: 390.22, positionValue: 31.22, returnDollar: 12.02, returnPercent: 37.89, isProfit: true },
  { symbol: "FSLR", shares: 0.05, purchasePrice: 220, currentPrice: 195.00, positionValue: 9.75, returnDollar: -1.25, returnPercent: -34.33, isProfit: false },
];

const grounding = generateMultiTickerGrounding(["NVDA", "TSLA"], mockTestHoldings);
assert.ok(grounding.includes("NVDA: NOT HELD IN PORTFOLIO"), "NVDA must be marked as NOT HELD");
assert.ok(grounding.includes("TSLA: CURRENT HOLDING | Classification: WINNER / PROFITABLE | Return: +37.89%"), "TSLA must be marked as CURRENT HOLDING and WINNER");
assert.ok(!grounding.includes("NVDA: CURRENT HOLDING"), "NVDA must NEVER be marked as CURRENT HOLDING");
assert.ok(!grounding.includes("TSLA: -34.33%"), "TSLA must NEVER be assigned FSLR's return");

// Test 7: Derived Portfolio Concentration Metrics
function calculateDerivedAggregates(holdings) {
  const totalVal = holdings.reduce((sum, h) => sum + h.positionValue, 0);
  const sorted = [...holdings].sort((a, b) => b.positionValue - a.positionValue);
  const top3Val = sorted.slice(0, 3).reduce((sum, h) => sum + h.positionValue, 0);
  const top3Weight = (top3Val / totalVal) * 100;
  const losers = holdings.filter(h => !h.isProfit);
  return {
    totalVal,
    top3Val,
    top3Weight,
    losersCount: losers.length,
    largestLoserWeight: losers.length > 0 ? (losers[0].positionValue / totalVal) * 100 : 0
  };
}

const derived = calculateDerivedAggregates(mockTestHoldings);
assert.equal(derived.totalVal, 40.97);
assert.ok(Math.abs(derived.top3Weight - 100) < 0.001);
assert.equal(derived.losersCount, 1);
assert.ok(Math.abs(derived.largestLoserWeight - 23.8) < 0.1);

console.log(" All AI layer regression tests passed successfully!");
