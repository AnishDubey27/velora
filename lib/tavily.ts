import { getEnv } from "./env";

// ─── Types ──────────────────────────────────────────────────────────

export type TavilySearchOptions = {
  query: string;
  searchDepth?: "basic" | "advanced";
  topic?: "general" | "news" | "finance";
  maxResults?: number;
  includeAnswer?: boolean;
  includeRawContent?: boolean;
  includeImages?: boolean;
  includeDomains?: string[];
  excludeDomains?: string[];
  timeRange?: "day" | "week" | "month" | "year";
};

export type TavilySearchResult = {
  title: string;
  url: string;
  content: string;
  raw_content?: string;
  score: number;
  published_date?: string;
};

export type TavilySearchResponse = {
  query: string;
  answer?: string;
  results: TavilySearchResult[];
  images?: { url: string; description?: string }[];
  response_time: number;
};

export type TavilyExtractOptions = {
  urls: string[];
  query?: string;
  extractDepth?: "basic" | "advanced";
  includeImages?: boolean;
  format?: "markdown" | "text";
};

export type TavilyExtractResult = {
  url: string;
  raw_content: string;
  images?: string[];
};

export type TavilyExtractResponse = {
  results: TavilyExtractResult[];
  failed_results: { url: string; error: string }[];
  response_time: number;
};

// ─── Constants ──────────────────────────────────────────────────────

const TAVILY_BASE_URL = "https://api.tavily.com";

// ─── Client Functions ───────────────────────────────────────────────

/**
 * Perform a web search via Tavily.
 * Costs 1 credit (basic) or 2 credits (advanced) per call.
 */
export async function tavilySearch(
  options: TavilySearchOptions
): Promise<TavilySearchResponse> {
  const apiKey = getEnv("TAVILY_API_KEY");
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    query: options.query,
    search_depth: options.searchDepth ?? "basic",
    topic: options.topic ?? "general",
    max_results: options.maxResults ?? 5,
    include_answer: options.includeAnswer ?? false,
    include_raw_content: options.includeRawContent ?? false,
    include_images: options.includeImages ?? false,
  };

  if (options.includeDomains?.length) body.include_domains = options.includeDomains;
  if (options.excludeDomains?.length) body.exclude_domains = options.excludeDomains;
  if (options.timeRange) body.time_range = options.timeRange;

  const res = await fetch(`${TAVILY_BASE_URL}/search`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Tavily search failed (${res.status}): ${errorText || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Extract clean content from URLs via Tavily.
 * Costs 1 credit per 5 URLs (basic) or 2 credits per 5 URLs (advanced).
 */
export async function tavilyExtract(
  options: TavilyExtractOptions
): Promise<TavilyExtractResponse> {
  const apiKey = getEnv("TAVILY_API_KEY");
  if (!apiKey) {
    throw new Error("TAVILY_API_KEY is not configured.");
  }

  const body: Record<string, unknown> = {
    urls: options.urls,
    extract_depth: options.extractDepth ?? "basic",
    include_images: options.includeImages ?? false,
    format: options.format ?? "text",
  };

  if (options.query) body.query = options.query;

  const res = await fetch(`${TAVILY_BASE_URL}/extract`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const errorText = await res.text().catch(() => "");
    throw new Error(
      `Tavily extract failed (${res.status}): ${errorText || res.statusText}`
    );
  }

  return res.json();
}

/**
 * Helper: Check if Tavily is configured and available.
 */
export function isTavilyConfigured(): boolean {
  return !!getEnv("TAVILY_API_KEY");
}
