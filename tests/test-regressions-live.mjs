import { queryVeloraAI } from "./run-live-acceptance.mjs";

async function runRegressions() {
  console.log("=== Testing Portfolio & Combined NVDA+TSLA Regressions against Production ===");

  console.log("\n--- Combined NVDA + TSLA Analysis (Deep mode) ---");
  const res1 = await queryVeloraAI("Give me a combined full analysis of NVDA and TSLA", "deep");
  console.log(`Status: ${res1.status}, TTFT: ${res1.ttft}ms, Duration: ${res1.duration}ms`);
  console.log("--- Excerpt (Section 5 / Portfolio Impact) ---");
  const sec5 = res1.fullText.split(/## 5\. Downside Risks & Portfolio Impact/i)[1] || res1.fullText.slice(-800);
  console.log(sec5.slice(0, 800));

  console.log("\n--- Health Check Query (Deep mode) ---");
  const res2 = await queryVeloraAI("Analyze my portfolio health", "deep");
  console.log(`Status: ${res2.status}, TTFT: ${res2.ttft}ms, Duration: ${res2.duration}ms`);
  console.log("--- Excerpt ---");
  console.log(res2.fullText.slice(0, 600));
}

runRegressions();
