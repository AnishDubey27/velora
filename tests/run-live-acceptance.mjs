// Live acceptance test runner against production https://velora.anishdubey.com/api/ai

const LIVE_URL = "https://velora.anishdubey.com/api/ai";

async function queryVeloraAI(prompt, model, hiddenPrompt = null, systemPrompt = null) {
  const startTime = Date.now();
  let firstTokenTime = null;
  let fullText = "";
  let chunkCount = 0;

  const messages = [];
  if (systemPrompt) {
    messages.push({ role: "system", content: systemPrompt });
  }
  messages.push({ role: "user", content: hiddenPrompt || prompt });

  const res = await fetch(LIVE_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      messages,
      model,
      stream: true,
      hiddenPrompt: hiddenPrompt || undefined
    })
  });

  if (!res.ok) {
    const errText = await res.text();
    return {
      status: res.status,
      error: errText,
      duration: Date.now() - startTime
    };
  }

  const reader = res.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith(":")) continue;
      if (trimmed === "data: [DONE]") break;
      if (trimmed.startsWith("data: ")) {
        try {
          const parsed = JSON.parse(trimmed.slice(6));
          if (parsed.text) {
            if (!firstTokenTime) {
              firstTokenTime = Date.now();
            }
            fullText += parsed.text;
            chunkCount++;
          }
        } catch {}
      }
    }
  }

  const endTime = Date.now();
  const ttft = firstTokenTime ? firstTokenTime - startTime : null;
  const duration = endTime - startTime;

  return {
    status: 200,
    ttft,
    duration,
    chunkCount,
    textLength: fullText.length,
    fullText,
    sourcesCheck: {
      hasSources: fullText.includes("## Sources") || fullText.includes("Sources:"),
      hasRecentWithoutDate: fullText.includes("— Recent") || fullText.includes("- Recent"),
      sourcesBlock: fullText.split(/## Sources|Sources:/i)[1]?.slice(0, 500) || "NONE"
    },
    disclaimerCheck: fullText.includes("Velora AI provides financial intelligence for informational and research purposes only, not investment advice"),
    tradeSetupCheck: {
      hasTradeSetup: fullText.includes("TRADE SETUP"),
      hasNA: fullText.includes("N/A"),
      tradeSetupSnippet: (fullText.match(/> \*\*TRADE SETUP:\*\*.*$/m) || ["NONE"])[0]
    }
  };
}

export { queryVeloraAI };
