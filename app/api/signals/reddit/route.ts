export const dynamic = 'force-dynamic';
export const revalidate = 3600;

interface ApeWisdomResult {
  rank: number;
  ticker: string;
  name: string;
  mentions: number;
  upvotes: number;
  rank_24h_ago: number;
  mentions_24h_ago: number;
}

interface ApeWisdomResponse {
  results: ApeWisdomResult[];
}

let redditCache: { data: any; timestamp: number } | null = null;
const CACHE_TTL = 15 * 60 * 1000; // 15 minutes

export async function GET() {
  if (redditCache && Date.now() - redditCache.timestamp < CACHE_TTL) {
    return Response.json(redditCache.data, { status: 200 });
  }

  try {
    const response = await fetch('https://apewisdom.io/api/v1.0/filter/all-stocks', {
      headers: { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)' },
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`ApeWisdom API returned ${response.status}`);
    }

    const data: ApeWisdomResponse = await response.json();

    const top25 = (data.results || []).slice(0, 25).map((item) => ({
      rank: item.rank,
      ticker: item.ticker,
      name: item.name,
      mentions: item.mentions,
      upvotes: item.upvotes,
      rankChange: (item.rank_24h_ago || item.rank) - item.rank,
      mentions24hAgo: item.mentions_24h_ago || 0,
    }));

    const result = { results: top25 };
    redditCache = { data: result, timestamp: Date.now() };

    return Response.json(result, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch Reddit trending data:', error);

    if (redditCache) {
      return Response.json({ ...redditCache.data, isStale: true }, { status: 200 });
    }

    return Response.json({ results: [], error: 'Reddit data temporarily unavailable' }, { status: 503 });
  }
}
