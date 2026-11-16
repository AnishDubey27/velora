import assert from "node:assert/strict";
import {
  SUPPORTED_INDICES,
  getMarketSessionStatus,
  detectIndicesInQuery,
  extractRequestedDateFromQuery,
  fetchVerifiedIndex,
} from "../lib/index-grounding.ts";

console.log("=== Running Market Data Freshness & Temporal Grounding Regression Tests ===");

// ---------------------------------------------------------------------------
// Test 1: detectIndicesInQuery
// ---------------------------------------------------------------------------
console.log("Test 1: Query Index Detection...");
{
  const q1 = "How did the Nifty 50 perform today?";
  const matches1 = detectIndicesInQuery(q1);
  assert.equal(matches1.length, 1);
  assert.equal(matches1[0].id, "nifty");

  const q2 = "How did the S&P 500 perform today?";
  const matches2 = detectIndicesInQuery(q2);
  assert.equal(matches2.length, 1);
  assert.equal(matches2[0].id, "sp500");

  const q3 = "Compare the Sensex and Dow Jones industrial average";
  const matches3 = detectIndicesInQuery(q3);
  const ids3 = matches3.map(m => m.id).sort();
  assert.deepEqual(ids3, ["dow", "sensex"]);

  const q4 = "What is Nasdaq composite index doing?";
  const matches4 = detectIndicesInQuery(q4);
  assert.equal(matches4[0].id, "nasdaq");

  const q5 = "What is Tesla's stock price and P/E ratio?";
  const matches5 = detectIndicesInQuery(q5);
  assert.equal(matches5.length, 0, "Ticker query must not match index keywords");

  console.log("✓ Test 1 Passed: Index queries detected accurately");
}

// ---------------------------------------------------------------------------
// Test 2: extractRequestedDateFromQuery
// ---------------------------------------------------------------------------
console.log("Test 2: Requested Date Extraction...");
{
  assert.equal(
    extractRequestedDateFromQuery("What did the Nifty 50 close at on November 12, 2026?")?.dateStr,
    "2026-11-12"
  );
  assert.equal(
    extractRequestedDateFromQuery("Sensex close on Nov 12, 2026")?.dateStr,
    "2026-11-12"
  );
  assert.equal(
    extractRequestedDateFromQuery("What was S&P 500 on 2026-11-13?")?.dateStr,
    "2026-11-13"
  );
  assert.equal(
    extractRequestedDateFromQuery("Nifty 50 performance today"),
    null,
    "Today query must return null date"
  );
  console.log("✓ Test 2 Passed: Historical date extraction works cleanly");
}

// ---------------------------------------------------------------------------
// Test 3: Market Session Status Computation
// ---------------------------------------------------------------------------
console.log("Test 3: Session Status Computation...");
{
  // Simulated Time: Monday Nov 16, 2026, 16:30 IST (11:00 UTC)
  const mondayPostCloseIndia = new Date("2026-11-16T11:00:00Z");
  const inSession = getMarketSessionStatus("IN", mondayPostCloseIndia);
  assert.equal(inSession.phase, "POST_CLOSE");
  assert.equal(inSession.isOpen, false);
  assert.ok(inSession.latestCompletedSessionLabel.includes("today's close (11/16/2026)"));

  const usPreMarket = getMarketSessionStatus("US", mondayPostCloseIndia);
  // In US (New York), 11:00 UTC is 06:00 EST -> Pre-market
  assert.equal(usPreMarket.phase, "PRE_MARKET");
  assert.equal(usPreMarket.isOpen, false);
  assert.ok(usPreMarket.latestCompletedSessionLabel.includes("Friday's close (11/13/2026)"));
  assert.ok(usPreMarket.nextSessionOpensLabel.includes("09:30 EST (20:00 IST)"));

  // Simulated Time: Sunday Nov 15, 2026, 12:00 IST
  const sunday = new Date("2026-11-15T06:30:00Z");
  const inWeekend = getMarketSessionStatus("IN", sunday);
  assert.equal(inWeekend.phase, "WEEKEND_CLOSED");
  assert.ok(inWeekend.latestCompletedSessionLabel.includes("Friday's close (11/13/2026)"));

  console.log("✓ Test 3 Passed: Session calculations for IN and US match expectations");
}

// ---------------------------------------------------------------------------
// Test 4: Live Verified Index Fetching & Historical Nov 12 Nifty Candle
// ---------------------------------------------------------------------------
console.log("Test 4: Live Verified Index Fetch & Historical Candle Lookup...");
{
  const niftyDef = SUPPORTED_INDICES.find(i => i.id === "nifty");
  assert.ok(niftyDef, "Nifty 50 index definition must exist");

  const niftyResult = await fetchVerifiedIndex(niftyDef);
  assert.ok(niftyResult, "fetchVerifiedIndex must return a result");
  assert.ok(niftyResult.price > 20000, `Nifty price should be > 20000, got ${niftyResult.price}`);
  assert.ok(niftyResult.candles.length > 0, "Historical candles should be populated");
  
  // Historical query for Nov 12, 2026
  const targetCandle = niftyResult.candles.find(c => c.date === "2026-11-12");
  assert.ok(targetCandle, "Historical target candle for 2026-11-12 must be found");
  assert.equal(targetCandle.date, "2026-11-12");
  // The verified close for Nifty 50 on Nov 12, 2026 was 25,299.35
  const diff = Math.abs(targetCandle.close - 25299.35);
  assert.ok(diff < 2.0, `Expected Nifty close on Nov 12 to be ~25,299.35, got ${targetCandle.close}`);
  console.log(`✓ Test 4 Passed: Nifty Nov 12 historical close accurately retrieved (${targetCandle.close.toFixed(2)})`);
}

// ---------------------------------------------------------------------------
// Test 5: S&P 500 Verification & Session Date
// ---------------------------------------------------------------------------
console.log("Test 5: S&P 500 Verification & Session Date...");
{
  const spDef = SUPPORTED_INDICES.find(i => i.id === "sp500");
  assert.ok(spDef, "S&P 500 index definition must exist");
  const spResult = await fetchVerifiedIndex(spDef);
  assert.ok(spResult, "fetchVerifiedIndex for S&P 500 must return a result");
  assert.ok(spResult.price > 5000, `S&P 500 price should be > 5000, got ${spResult.price}`);
  assert.equal(spResult.freshness, "FRESH", "Latest session data must be marked FRESH");
  assert.ok(spResult.dataDateStr.startsWith("2026-11"), `Quote date should be in Nov 2026, got ${spResult.dataDateStr}`);
  console.log(`✓ Test 5 Passed: S&P 500 verified data is fresh (${spResult.dataDateStr}: ${spResult.price.toFixed(2)})`);
}

console.log("=== All Market Data Freshness Regression Tests PASSED Successfully ===");
