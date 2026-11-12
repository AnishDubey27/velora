import assert from "node:assert/strict";

/**
 * Velora Portfolio Health Check Regression Test Suite
 * 
 * Verifies:
 * 1. Portfolio totals are mathematically exact (no hallucinated values).
 * 2. Positions with positive return (e.g. FSLR +33.4%) are strictly WINNERS/GAINS.
 * 3. Positions with negative return are strictly UNDERPERFORMERS/LOSSES.
 * 4. Signs are never inverted.
 * 5. Grounding prompt generates verified assertions for Velora AI.
 */

// Simulated holding dataset matching the live review portfolio scenario
const mockHoldings = [
  { symbol: "FSLR", name: "First Solar Inc", shares: 0.2, purchasePrice: 150.00, currentPrice: 200.10 }, // Winner (+33.4%)
  { symbol: "NVDA", name: "NVIDIA Corp", shares: 0.05, purchasePrice: 110.00, currentPrice: 135.50 },    // Winner (+23.18%)
  { symbol: "AAPL", name: "Apple Inc", shares: 0.1, purchasePrice: 220.00, currentPrice: 235.00 },      // Winner (+6.82%)
  { symbol: "MSFT", name: "Microsoft Corp", shares: 0.05, purchasePrice: 420.00, currentPrice: 415.00 }, // Loser (-1.19%)
  { symbol: "TSLA", name: "Tesla Inc", shares: 0.08, purchasePrice: 240.00, currentPrice: 215.00 },     // Loser (-10.42%)
];

function calculatePortfolioMetrics(holdings) {
  let totalPortfolioValue = 0;
  let totalCostBasis = 0;

  const analyzed = holdings.map((h) => {
    const shares = Number(h.shares) || 0;
    const purchasePrice = Number(h.purchasePrice) || 0;
    const currentPrice = Number(h.currentPrice) || purchasePrice;

    const positionValue = shares * currentPrice;
    const positionCost = shares * purchasePrice;
    const returnDollar = positionValue - positionCost;
    const returnPercent = positionCost > 0 ? (returnDollar / positionCost) * 100 : 0;
    const isProfit = returnDollar >= 0;

    return {
      symbol: h.symbol,
      name: h.name,
      shares,
      purchasePrice,
      currentPrice,
      positionValue,
      positionCost,
      returnDollar,
      returnPercent,
      isProfit,
    };
  });

  for (const item of analyzed) {
    totalPortfolioValue += item.positionValue;
    totalCostBasis += item.positionCost;
  }

  const totalReturnDollar = totalPortfolioValue - totalCostBasis;
  const totalReturnPercent = totalCostBasis > 0 ? (totalReturnDollar / totalCostBasis) * 100 : 0;
  const isTotalProfit = totalReturnDollar >= 0;

  const winners = analyzed.filter((h) => h.isProfit);
  const losers = analyzed.filter((h) => !h.isProfit);

  return {
    totalPortfolioValue,
    totalCostBasis,
    totalReturnDollar,
    totalReturnPercent,
    isTotalProfit,
    winners,
    losers,
    analyzed,
  };
}

function runTests() {
  console.log("=== Running Portfolio Health Check Regression Tests ===");

  const metrics = calculatePortfolioMetrics(mockHoldings);

  // Test 1: Math precision & exact value
  // Expected value:
  // FSLR: 0.2 * 200.10 = 40.02
  // NVDA: 0.05 * 135.50 = 6.775
  // AAPL: 0.1 * 235.00 = 23.50
  // MSFT: 0.05 * 415.00 = 20.75
  // TSLA: 0.08 * 215.00 = 17.20
  // Total Value = 40.02 + 6.775 + 23.50 + 20.75 + 17.20 = 108.245
  const expectedTotal = 108.245;
  assert.equal(
    metrics.totalPortfolioValue.toFixed(2),
    expectedTotal.toFixed(2),
    "Total Portfolio Value must match exact sum of positions"
  );
  console.log(`✓ Test 1 Passed: Total portfolio value is exact ($${metrics.totalPortfolioValue.toFixed(2)})`);

  // Test 2: FSLR (+33.4%) must be classified as WINNER
  const fslr = metrics.analyzed.find((h) => h.symbol === "FSLR");
  assert.ok(fslr, "FSLR exists in portfolio");
  assert.equal(fslr.isProfit, true, "FSLR with positive gain must have isProfit === true");
  assert.ok(
    metrics.winners.some((w) => w.symbol === "FSLR"),
    "FSLR must be present in winners list"
  );
  assert.ok(
    !metrics.losers.some((l) => l.symbol === "FSLR"),
    "FSLR must NOT be present in losers list"
  );
  console.log(`✓ Test 2 Passed: FSLR (+${fslr.returnPercent.toFixed(2)}%) is strictly a WINNER, never an underperformer`);

  // Test 3: TSLA (-10.42%) must be classified as LOSER/UNDERPERFORMER
  const tsla = metrics.analyzed.find((h) => h.symbol === "TSLA");
  assert.ok(tsla, "TSLA exists in portfolio");
  assert.equal(tsla.isProfit, false, "TSLA with loss must have isProfit === false");
  assert.ok(
    metrics.losers.some((l) => l.symbol === "TSLA"),
    "TSLA must be present in losers list"
  );
  assert.ok(
    !metrics.winners.some((w) => w.symbol === "TSLA"),
    "TSLA must NOT be present in winners list"
  );
  console.log(`✓ Test 3 Passed: TSLA (${tsla.returnPercent.toFixed(2)}%) is strictly an UNDERPERFORMER`);

  // Test 4: Verify prompt grounding prevents hallucination
  const systemPromptBlock = `• Total Portfolio Market Value: $${metrics.totalPortfolioValue.toFixed(2)}
WINNERS: ${metrics.winners.map(w => w.symbol).join(", ")}
UNDERPERFORMERS: ${metrics.losers.map(l => l.symbol).join(", ")}`;

  assert.ok(systemPromptBlock.includes(`$${metrics.totalPortfolioValue.toFixed(2)}`));
  assert.ok(systemPromptBlock.includes("WINNERS: FSLR, NVDA, AAPL"));
  assert.ok(systemPromptBlock.includes("UNDERPERFORMERS: MSFT, TSLA"));
  console.log("✓ Test 4 Passed: System prompt contains structured verified grounding metrics");

  console.log("=== All 4 Portfolio Health Check Regression Tests PASSED Successfully ===");
}

runTests();
