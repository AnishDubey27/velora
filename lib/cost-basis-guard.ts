export type HoldingCostInfo = {
  symbol: string;
  positionCost: number;
  purchasePrice: number;
  shares: number;
};

/**
 * Deterministically fixes any AI prose that mistakenly labels a holding's
 * TOTAL cost basis as a per-share price (e.g. "$14.15/share" or "cost of $4.99 per share"
 * when $14.15 / $4.99 is the total position cost basis, not the per-share purchase price).
 *
 * - Never alters legitimate per-share prices.
 * - Never alters total cost figures when shares === 1 (total cost === per-share cost).
 */
export function sanitizeCostBasisPerShareLabels(
  text: string,
  holdings: HoldingCostInfo[]
): string {
  if (!text || !holdings || holdings.length === 0) return text;
  if (!text.includes("$")) return text;

  // Holdings where total position cost differs meaningfully from per-share purchase price
  const nonUnitHoldings = holdings.filter(
    (h) =>
      Number.isFinite(h.positionCost) &&
      Number.isFinite(h.purchasePrice) &&
      h.positionCost > 0 &&
      Math.abs(h.positionCost - h.purchasePrice) > 0.02
  );

  if (nonUnitHoldings.length === 0) return text;

  // Match optional leading article/cost phrase + "$<amount>" + per-share suffix
  // Examples caught:
  //   "cost of $14.15/share" -> "total cost of $14.15"
  //   "an average cost of $4.99 per share" -> "a total cost of $4.99"
  //   "cost basis of $4.95/sh" -> "total cost basis of $4.95"
  //   "$14.15/share" -> "$14.15 total cost"
  const pattern =
    /(\ban\s+)?((?:(?:avg\.?|average|purchase|unit|entry)\s+)?(?:cost(?:\s+basis)?|price)\s+(?:of|at)\s+)?\$(\d{1,3}(?:,\d{3})*(?:\.\d{1,4})?|\d+(?:\.\d{1,4})?)\s*(?:\/\s*sh(?:are)?s?|per[\s-]sh(?:are)?s?)\b/gi;

  return text.replace(
    pattern,
    (
      fullMatch,
      leadingAn: string | undefined,
      leadingPhrase: string | undefined,
      amountStr: string,
      offset: number
    ) => {
      const amount = Number(amountStr.replace(/,/g, ""));
      if (!Number.isFinite(amount)) return fullMatch;

      // Does this dollar value match a non-unit holding's TOTAL positionCost?
      const matchingTotalCostHoldings = nonUnitHoldings.filter(
        (h) => Math.abs(h.positionCost - amount) <= 0.02
      );
      if (matchingTotalCostHoldings.length === 0) {
        return fullMatch;
      }

      // Safety check: does any holding actually have this exact figure as a legitimate per-share purchasePrice?
      const matchingPerShareHoldings = holdings.filter(
        (h) => Number.isFinite(h.purchasePrice) && Math.abs(h.purchasePrice - amount) <= 0.02
      );
      if (matchingPerShareHoldings.length > 0) {
        // Disambiguate using nearby ticker symbol context (preceding 140 characters)
        const lookback = text.slice(Math.max(0, offset - 140), offset).toUpperCase();
        const mentionsTotalCostTicker = matchingTotalCostHoldings.some((h) =>
          new RegExp(`\\b${h.symbol.toUpperCase()}\\b`).test(lookback)
        );
        const mentionsPerShareTicker = matchingPerShareHoldings.some((h) =>
          new RegExp(`\\b${h.symbol.toUpperCase()}\\b`).test(lookback)
        );
        if (mentionsPerShareTicker && !mentionsTotalCostTicker) {
          return fullMatch;
        }
      }

      if (leadingPhrase) {
        const normalized = leadingPhrase.toLowerCase();
        const articlePrefix = leadingAn ? (leadingAn[0] === "A" ? "A " : "a ") : "";
        if (normalized.includes("cost basis")) {
          return `${articlePrefix}total cost basis of $${amountStr}`;
        }
        return `${articlePrefix}total cost of $${amountStr}`;
      }

      return `${leadingAn || ""}$${amountStr} total cost`;
    }
  );
}

/**
 * Streaming sliding-window wrapper around sanitizeCostBasisPerShareLabels.
 * Keeps a small lookahead window (~64 chars) so multi-token phrases like
 * "an average cost of $14.15 per share" are never split mid-word across chunks,
 * while retaining the recent ticker lookback context for disambiguation.
 */
export function createCostBasisStreamGuard(holdings: HoldingCostInfo[]) {
  const hasNonUnit = holdings.some(
    (h) =>
      Number.isFinite(h.positionCost) &&
      Number.isFinite(h.purchasePrice) &&
      h.positionCost > 0 &&
      Math.abs(h.positionCost - h.purchasePrice) > 0.02
  );

  const LOOKAHEAD_CHARS = 64;
  const CONTEXT_HISTORY_CHARS = 160;
  let recentHistory = "";
  let buffer = "";

  return {
    push(chunk: string): string {
      if (!hasNonUnit) return chunk;
      if (!chunk) return "";

      buffer += chunk;
      if (buffer.length <= LOOKAHEAD_CHARS + 20) {
        return "";
      }

      // Leave an uninspected trailing tail (>= 20 chars) so partial suffixes like
      // "/sh" (before "are" arrives) are NEVER prematurely matched at buffer end.
      let inspectEnd = buffer.length - 20;
      const tailWs = buffer.lastIndexOf(" ", inspectEnd);
      if (tailWs > 0) {
        inspectEnd = tailWs + 1;
      }

      const inspectable = buffer.slice(0, inspectEnd);
      const untrimmedTail = buffer.slice(inspectEnd);

      const combined = recentHistory + inspectable;
      const sanitizedCombined = sanitizeCostBasisPerShareLabels(combined, holdings);
      buffer = sanitizedCombined.slice(recentHistory.length) + untrimmedTail;

      if (buffer.length <= LOOKAHEAD_CHARS) {
        return "";
      }

      // Cut at a whitespace boundary before the lookahead tail
      let cutIdx = buffer.length - LOOKAHEAD_CHARS;
      const spaceIdx = buffer.lastIndexOf(" ", cutIdx);
      if (spaceIdx > 0) {
        cutIdx = spaceIdx + 1;
      }

      const safeOut = buffer.slice(0, cutIdx);
      buffer = buffer.slice(cutIdx);
      recentHistory = (recentHistory + safeOut).slice(-CONTEXT_HISTORY_CHARS);
      return safeOut;
    },

    flush(): string {
      if (!hasNonUnit || !buffer) return "";
      const combined = recentHistory + buffer;
      const sanitizedCombined = sanitizeCostBasisPerShareLabels(combined, holdings);
      const out = sanitizedCombined.slice(recentHistory.length);
      recentHistory = (recentHistory + out).slice(-CONTEXT_HISTORY_CHARS);
      buffer = "";
      return out;
    },
  };
}
