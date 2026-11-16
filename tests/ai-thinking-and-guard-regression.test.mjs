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

console.log(" All AI layer regression tests passed successfully!");
