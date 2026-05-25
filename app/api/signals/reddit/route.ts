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

export async function GET() {
  try {
    const response = await fetch('https://apewisdom.io/api/v1.0/filter/all-stocks', {
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      throw new Error(`ApeWisdom API returned ${response.status}`);
    }

    const data: ApeWisdomResponse = await response.json();

    const top25 = data.results.slice(0, 25).map((item) => ({
      rank: item.rank,
      ticker: item.ticker,
      name: item.name,
      mentions: item.mentions,
      upvotes: item.upvotes,
      rankChange: item.rank_24h_ago - item.rank,
      mentions24hAgo: item.mentions_24h_ago,
    }));

    return Response.json({ results: top25 }, { status: 200 });
  } catch (error) {
    console.error('Failed to fetch Reddit trending data:', error);

    const fallback = [
      { rank: 1, ticker: 'GME', name: 'GameStop Corp', mentions: 512, upvotes: 3200, rankChange: 0, mentions24hAgo: 480 },
      { rank: 2, ticker: 'AMC', name: 'AMC Entertainment', mentions: 389, upvotes: 2100, rankChange: 1, mentions24hAgo: 350 },
      { rank: 3, ticker: 'TSLA', name: 'Tesla Inc', mentions: 345, upvotes: 1800, rankChange: -1, mentions24hAgo: 360 },
      { rank: 4, ticker: 'NVDA', name: 'NVIDIA Corp', mentions: 298, upvotes: 1650, rankChange: 2, mentions24hAgo: 210 },
      { rank: 5, ticker: 'AAPL', name: 'Apple Inc', mentions: 267, upvotes: 1400, rankChange: 0, mentions24hAgo: 250 },
    ];

    return Response.json({ results: fallback, isFallback: true }, { status: 200 });
  }
}
