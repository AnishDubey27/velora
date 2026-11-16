// Live Verification of Market Data Freshness & Temporal Grounding
import { queryVeloraAI } from "./run-live-acceptance.mjs";

async function run() {
  console.log("=== Testing Smarter AI Market Freshness against Live Production ===");
  console.log(`Timestamp: ${new Date().toISOString()}`);

  // -------------------------------------------------------------------------
  // Probe 1: Nifty 50 today (Deep mode)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("Probe 1 (Deep): How did the Nifty 50 perform today?");
  console.log("------------------------------------------------------------");
  try {
    const res1 = await queryVeloraAI("How did the Nifty 50 perform today?", "deep");
    console.log(`Status: ${res1.status}, TTFT: ${res1.ttft}ms, Duration: ${res1.duration}ms`);
    console.log("--- Answer Content ---");
    console.log(res1.fullText);
  } catch (err) {
    console.error("Probe 1 Error:", err);
  }

  // -------------------------------------------------------------------------
  // Probe 2: S&P 500 today (Deep mode)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("Probe 2 (Deep): How did the S&P 500 perform today?");
  console.log("------------------------------------------------------------");
  try {
    const res2 = await queryVeloraAI("How did the S&P 500 perform today?", "deep");
    console.log(`Status: ${res2.status}, TTFT: ${res2.ttft}ms, Duration: ${res2.duration}ms`);
    console.log("--- Answer Content ---");
    console.log(res2.fullText);
  } catch (err) {
    console.error("Probe 2 Error:", err);
  }

  // -------------------------------------------------------------------------
  // Probe 3: Explicit historical date (November 12, 2026) (Deep mode)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("Probe 3 (Deep): What did the Nifty 50 close at on November 12, 2026?");
  console.log("------------------------------------------------------------");
  try {
    const res3 = await queryVeloraAI("What did the Nifty 50 close at on November 12, 2026?", "deep");
    console.log(`Status: ${res3.status}, TTFT: ${res3.ttft}ms, Duration: ${res3.duration}ms`);
    console.log("--- Answer Content ---");
    console.log(res3.fullText);
  } catch (err) {
    console.error("Probe 3 Error:", err);
  }

  // -------------------------------------------------------------------------
  // Probe 4: Temporal Calendar Grounding (Deep mode)
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("Probe 4 (Deep): What is today's date / latest session you have data for?");
  console.log("------------------------------------------------------------");
  try {
    const res4 = await queryVeloraAI("What is today's date / latest session you have data for?", "deep");
    console.log(`Status: ${res4.status}, TTFT: ${res4.ttft}ms, Duration: ${res4.duration}ms`);
    console.log("--- Answer Content ---");
    console.log(res4.fullText);
  } catch (err) {
    console.error("Probe 4 Error:", err);
  }

  // -------------------------------------------------------------------------
  // Probe 5: Fast Mode check (Default) for Nifty 50
  // -------------------------------------------------------------------------
  console.log("\n------------------------------------------------------------");
  console.log("Probe 5 (Fast): How did the Nifty 50 perform today?");
  console.log("------------------------------------------------------------");
  try {
    const res5 = await queryVeloraAI("How did the Nifty 50 perform today?", "fast");
    console.log(`Status: ${res5.status}, TTFT: ${res5.ttft}ms, Duration: ${res5.duration}ms`);
    console.log("--- Answer Content ---");
    console.log(res5.fullText);
  } catch (err) {
    console.error("Probe 5 Error:", err);
  }
}

run();
