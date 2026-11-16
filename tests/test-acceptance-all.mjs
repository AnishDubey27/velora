import { queryVeloraAI } from "./run-live-acceptance.mjs";

const DEEP_MODEL = "minimaxai/minimax-m3.1-flash";

async function main() {
  console.log("================================================================================");
  console.log("STARTING LIVE ACCEPTANCE SUITE FOR SPRINT SEND-BACK (https://velora.anishdubey.com)");
  console.log("================================================================================\n");

  const results = [];

  // Acceptance 1: Combined NVDA+TSLA analysis x3 (Deep)
  console.log(">>> [1/2] Deep Mode: 'Give me a combined full analysis of NVDA and TSLA' (3 runs)");
  for (let i = 1; i <= 3; i++) {
    console.log(`\n--- Combined NVDA+TSLA Run ${i}/3 ---`);
    const r = await queryVeloraAI("Give me a combined full analysis of NVDA and TSLA", DEEP_MODEL);
    console.log(`Status: ${r.status} | TTFT: ${r.ttft}ms | Duration: ${r.duration}ms | Length: ${r.textLength} chars`);
    
    // Extract Section 5 Portfolio Impact
    const sec5Match = r.fullText.match(/## 5\.[^#]+/i) || r.fullText.match(/5\.\s*Downside Risks & Portfolio Impact[^#]+/i);
    const sec5Text = sec5Match ? sec5Match[0] : "SECTION 5 NOT FOUND";
    console.log("\n[Section 5 Extracted]:\n" + sec5Text + "\n");

    const tslaAsWinner = /TSLA.*(?:Winner|profitable|\+[0-9]+%)/i.test(sec5Text) || sec5Text.includes("TSLA");
    const nvdaNotHeld = /NVDA.*(?:not (?:held|listed|in the user's portfolio)|does not own)/i.test(sec5Text) || /not held/i.test(sec5Text);
    const tslaNotFslr = !sec5Text.includes("-34.33%");

    console.log(`Check: TSLA identified correctly: ${tslaAsWinner}`);
    console.log(`Check: NVDA stated as not held: ${nvdaNotHeld}`);
    console.log(`Check: TSLA does NOT have -34.33% (FSLR's return): ${tslaNotFslr}`);

    results.push({
      test: `Combined NVDA+TSLA Run ${i}`,
      sec5Text,
      tslaAsWinner,
      nvdaNotHeld,
      tslaNotFslr,
      ...r
    });
  }

  // Acceptance 2: Portfolio Health Check x2 (Deep)
  console.log("\n>>> [2/2] Deep Mode: Portfolio Health Check (2 runs)");
  const portfolioHiddenPrompt = `Analyze my entire portfolio. Assess diversification, concentration risk, overall risk/reward, and suggest specific improvements based on my current holdings.`;
  for (let i = 1; i <= 2; i++) {
    console.log(`\n--- Portfolio Health Check Run ${i}/2 ---`);
    const r = await queryVeloraAI(
      "Analyze my whole portfolio using Velora",
      DEEP_MODEL,
      portfolioHiddenPrompt,
      "You are a personal financial advisor at Velora. Analyze the user's actual portfolio holdings with care, precision, and a constructive tone."
    );
    console.log(`Status: ${r.status} | TTFT: ${r.ttft}ms | Duration: ${r.duration}ms | Length: ${r.textLength} chars`);
    
    console.log("\n[Health Check Sample Preview]:\n" + r.fullText.slice(0, 800) + "...\n");
    results.push({
      test: `Portfolio Health Check Run ${i}`,
      ...r
    });
  }

  console.log("\n================================================================================");
  console.log("ACCEPTANCE SUMMARY");
  console.log("================================================================================");
  for (const res of results) {
    console.log(`- ${res.test}: TTFT=${res.ttft}ms | Duration=${res.duration}ms | Length=${res.textLength} chars | Status=${res.status}`);
  }
}

main().catch(console.error);
