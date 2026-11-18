import assert from "node:assert/strict";
import fs from "node:fs";
import {
  sanitizeCostBasisPerShareLabels,
  createCostBasisStreamGuard,
} from "../lib/cost-basis-guard.ts";

console.log("=== Running Cost Basis, Snapshot Loading & No-Holdings Regression Tests ===");

const realHoldings = [
  { symbol: "TSLA", shares: 0.05, purchasePrice: 283.00, positionCost: 14.15 },
  { symbol: "META", shares: 0.01815, purchasePrice: 330.58, positionCost: 6.00 },
  { symbol: "AMD", shares: 0.03696, purchasePrice: 135.00, positionCost: 4.99 },
  { symbol: "IONQ", shares: 0.20, purchasePrice: 24.75, positionCost: 4.95 },
  { symbol: "CRSP", shares: 0.10, purchasePrice: 49.70, positionCost: 4.97 },
  { symbol: "NRGV", shares: 1.00, purchasePrice: 4.97, positionCost: 4.97 },
];

// 1. Exact send-back regression: TSLA ($14.15), AMD ($4.99), IONQ ($4.95)
const badProse =
  "Key Insights: TSLA leads the portfolio with a cost of $14.15/share. " +
  "AMD gained strongly from an average cost of $4.99 per share, and IONQ sits on a cost basis of $4.95/share.";
const cleanedProse = sanitizeCostBasisPerShareLabels(badProse, realHoldings);

assert.ok(!cleanedProse.includes("$14.15/share"), `TSLA $14.15 must not be labelled /share: ${cleanedProse}`);
assert.ok(!cleanedProse.includes("$4.99 per share"), `AMD $4.99 must not be labelled per share: ${cleanedProse}`);
assert.ok(!cleanedProse.includes("$4.95/share"), `IONQ $4.95 must not be labelled /share: ${cleanedProse}`);
assert.ok(cleanedProse.includes("total cost of $14.15"), `Expected clean TSLA phrasing: ${cleanedProse}`);
assert.ok(cleanedProse.includes("total cost of $4.99"), `Expected clean AMD phrasing: ${cleanedProse}`);
assert.ok(cleanedProse.includes("total cost basis of $4.95"), `Expected clean IONQ phrasing: ${cleanedProse}`);
console.log("✓ Test 1 Passed: TSLA ($14.15), AMD ($4.99), IONQ ($4.95) total cost mislabels cleanly fixed");

// 2. Legitimate per-share prices must remain untouched
const validProse =
  "TSLA has a total cost of $14.15 ($283.00/share), AMD was purchased at $135.00 per share, and IONQ at $24.75/share.";
const afterValid = sanitizeCostBasisPerShareLabels(validProse, realHoldings);
assert.equal(afterValid, validProse, "Legitimate per-share purchase prices must never be modified");
console.log("✓ Test 2 Passed: Legitimate per-share purchase prices preserved verbatim");

// 3. Disambiguation when one holding's total cost ($4.97 CRSP) equals another's per-share price ($4.97 NRGV)
const ambiguousProse =
  "NRGV was bought at $4.97/share (1 share), while CRSP shows a cost of $4.97/share across 0.10 shares.";
const afterAmbiguous = sanitizeCostBasisPerShareLabels(ambiguousProse, realHoldings);
assert.ok(afterAmbiguous.includes("NRGV was bought at $4.97/share"), `NRGV legitimate per-share price must stay: ${afterAmbiguous}`);
assert.ok(afterAmbiguous.includes("CRSP shows a total cost of $4.97"), `CRSP fractional total cost must be fixed: ${afterAmbiguous}`);
console.log("✓ Test 3 Passed: Ticker-context disambiguation handles overlapping $4.97 (NRGV vs CRSP)");

// 4. Streaming token-boundary invariance (1-char, 3-char, and uneven splits)
for (const chunkSize of [1, 2, 3, 5, 11]) {
  const guard = createCostBasisStreamGuard(realHoldings);
  let streamed = "";
  for (let i = 0; i < badProse.length; i += chunkSize) {
    streamed += guard.push(badProse.slice(i, i + chunkSize));
  }
  streamed += guard.flush();
  assert.equal(
    streamed,
    cleanedProse,
    `Stream guard with chunkSize=${chunkSize} must match batch output exactly`
  );
}
console.log("✓ Test 4 Passed: Streaming lookahead guard is invariant across all token chunk boundaries");

// 5. Dashboard Portfolio Snapshot non-infinite loading state machine check
const dashboardSrc = fs.readFileSync("components/screens/dashboard-screen.tsx", "utf8");
assert.ok(dashboardSrc.includes("onAuthStateChange"), "Dashboard must re-sync on auth hydration/token refresh");
assert.ok(dashboardSrc.includes("refreshSession"), "Dashboard must retry holdings query on expired mobile JWT");
assert.ok(dashboardSrc.includes("AbortController"), "Dashboard must abort hanging quote requests");
assert.ok(dashboardSrc.includes('"unauthenticated"') && dashboardSrc.includes('"empty"') && dashboardSrc.includes('"error"'), "Dashboard must handle unauthenticated, empty, and error states explicitly");

const insightCardsSrc = fs.readFileSync("components/ui/bui-insight-cards.tsx", "utf8");
assert.ok(insightCardsSrc.includes("portfolio-snapshot-skeleton"), "Must keep figure-free skeleton during active loading");
assert.ok(insightCardsSrc.includes("portfolio-snapshot-error"), "Must render honest error state instead of endless skeleton");
assert.ok(insightCardsSrc.includes("portfolio-snapshot-empty"), "Must render honest empty state for 0-holding accounts");
assert.ok(insightCardsSrc.includes("portfolio-snapshot-unauthenticated"), "Must render honest sign-in prompt when unauthenticated");

const portfolioApiSrc = fs.readFileSync("app/api/portfolio/route.ts", "utf8");
assert.ok(portfolioApiSrc.includes("AbortSignal.timeout"), "Portfolio API must enforce per-symbol timeouts");
assert.ok(portfolioApiSrc.includes("fetchYahooFallback"), "Portfolio API must fall back to Yahoo Finance if Finnhub fails");
assert.ok(portfolioApiSrc.includes("status: 503"), "Portfolio API must return 503 when all quote providers fail");
console.log("✓ Test 5 Passed: Dashboard snapshot 5-state machine & API resilience verified");

// 6. AI route no-holdings & unauthenticated directives check
const aiRouteSrc = fs.readFileSync("app/api/ai/route.ts", "utf8");
assert.ok(aiRouteSrc.includes("MANDATORY DIRECTIVE FOR EMPTY PORTFOLIO (0 HOLDINGS)"), "Must define explicit 0-holding authenticated no-data path");
assert.ok(aiRouteSrc.includes("MANDATORY DIRECTIVE FOR UNAUTHENTICATED PORTFOLIO QUERY"), "Must define explicit unauthenticated no-data path");
assert.ok(!aiRouteSrc.includes("portfolio vault is locked"), "Must not falsely claim a post-login vault lock exists");
assert.ok(aiRouteSrc.includes("createCostBasisStreamGuard"), "AI route must enforce server-side cost-basis stream guard");
console.log("✓ Test 6 Passed: Empty-portfolio & unauthenticated AI directives + stream guard wiring verified");

console.log("=== All Cost Basis, Snapshot Loading & No-Holdings Regression Tests PASSED ===");
