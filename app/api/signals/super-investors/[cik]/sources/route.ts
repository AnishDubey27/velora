import { NextResponse } from "next/server";

export const revalidate = 3600; // Cache for 1 hour
export const dynamic = "force-dynamic";

const SUPER_INVESTORS: Record<string, { name: string; person: string; topics: string[] }> = {
  '0001035048': { name: 'Greenhaven Associates Inc', person: 'Edgar Wachenheim III', topics: ['stock portfolio', 'value investing'] },
  '0001549575': { name: 'Dalal Street, LLC', person: 'Mohnish Pabrai', topics: ['stock picks', 'value investing', 'portfolio'] },
  '0002045724': { name: 'Situational Awareness LP', person: 'Leopold Aschenbrenner', topics: ['AI infrastructure', 'hedge fund', 'semiconductors'] },
  '0001045810': { name: 'NVIDIA Corp', person: 'Jensen Huang', topics: ['NVIDIA stock', 'AI chips', 'GPU'] },
  '0001652044': { name: 'Alphabet Inc.', person: 'Sundar Pichai', topics: ['Google stock', 'AI', 'Alphabet earnings'] },
  '0000858804': { name: 'Muhlenkamp & Co Inc', person: 'Ronald H. Muhlenkamp', topics: ['stock portfolio', 'investing'] },
  '0001540305': { name: 'Aquamarine Financial', person: 'Guy Spier', topics: ['value investing', 'Berkshire', 'portfolio'] },
  '0000049722': { name: 'Icahn Carl C', person: 'Carl Icahn', topics: ['activist investing', 'corporate raider', 'stock stake'] },
  '0001112830': { name: 'Fairholme Capital Management', person: 'Bruce Berkowitz', topics: ['value investing', 'portfolio', 'Fairholme Fund'] },
  '0001719232': { name: 'Miller Value Partners, LLC', person: 'Bill Miller IV', topics: ['value investing', 'stock picks', 'portfolio'] },
  '0001009139': { name: 'Oaktree Capital Management LP', person: 'Howard Marks', topics: ['distressed debt', 'credit investing', 'market outlook'] },
  '0001131174': { name: 'Tiger Global Management LLC', person: 'Chase Coleman', topics: ['tech investing', 'venture capital', 'hedge fund'] },
  '0000200217': { name: 'Dodge & Cox', person: 'David Hoeft', topics: ['mutual fund', 'value investing', 'portfolio'] },
  '0000862080': { name: 'Harris Associates LP', person: 'Bill Nygren', topics: ['Oakmark Funds', 'value investing', 'stock picks'] },
  '0001067983': { name: 'Berkshire Hathaway Inc', person: 'Warren Buffett', topics: ['Berkshire stock', 'Apple investment', 'annual meeting'] },
  '0001029160': { name: 'Soros Fund Management', person: 'George Soros', topics: ['macro trading', 'hedge fund', 'stock portfolio'] },
  '0001166559': { name: 'Gates Foundation Trust', person: 'Bill Gates', topics: ['Gates Foundation', 'stock portfolio', 'philanthropy'] },
  '0001849635': { name: 'Trump Media & Technology', person: 'Donald Trump', topics: ['Trump stock trades', 'crypto executive order', 'Trump investments'] },
  '0001350694': { name: 'Bridgewater Associates', person: 'Ray Dalio', topics: ['macro investing', 'economic outlook', 'portfolio'] },
  '0001336528': { name: 'Pershing Square Capital', person: 'Bill Ackman', topics: ['activist investing', 'stock picks', 'IPO'] },
  '0001649339': { name: 'Scion Asset Management', person: 'Michael Burry', topics: ['short selling', 'market crash', '13F filing'] },
  '0001656456': { name: 'Appaloosa Management', person: 'David Tepper', topics: ['hedge fund', 'stock picks', 'market outlook'] },
  '0001536411': { name: 'Duquesne Family Office', person: 'Stanley Druckenmiller', topics: ['macro trading', 'stock picks', 'tech stocks'] },
  '0001079114': { name: 'Greenlight Capital', person: 'David Einhorn', topics: ['value investing', 'short selling', 'stock picks'] },
  '0001040273': { name: 'Third Point LLC', person: 'Daniel Loeb', topics: ['activist investing', 'hedge fund', 'stock picks'] },
  '0001061768': { name: 'Baupost Group', person: 'Seth Klarman', topics: ['value investing', 'margin of safety', 'portfolio'] },
};

type SourceArticle = {
  title: string;
  url: string;
  source: string;
  pubDate: string;
};

type SourceCategory = {
  category: string;
  articles: SourceArticle[];
};

async function fetchGoogleNewsRSS(query: string, maxResults: number = 8): Promise<SourceArticle[]> {
  const encoded = encodeURIComponent(query);
  const url = `https://news.google.com/rss/search?q=${encoded}&hl=en-US&gl=US&ceid=US:en`;

  try {
    const res = await fetch(url, {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
      },
    });

    if (!res.ok) throw new Error(`RSS fetch failed: ${res.status}`);

    const xml = await res.text();
    const articles: SourceArticle[] = [];

    // Parse RSS items
    const itemRegex = /<item>([\s\S]*?)<\/item>/gi;
    let match;

    while ((match = itemRegex.exec(xml)) !== null && articles.length < maxResults) {
      const itemXml = match[1];

      const titleMatch = itemXml.match(/<title><!\[CDATA\[(.*?)\]\]><\/title>|<title>(.*?)<\/title>/);
      const linkMatch = itemXml.match(/<link>(.*?)<\/link>|<link><!\[CDATA\[(.*?)\]\]><\/link>/);
      const pubDateMatch = itemXml.match(/<pubDate>(.*?)<\/pubDate>/);
      const sourceMatch = itemXml.match(/<source[^>]*>(.*?)<\/source>|<source[^>]*><!\[CDATA\[(.*?)\]\]><\/source>/);

      const title = titleMatch?.[1] || titleMatch?.[2] || '';
      const url = linkMatch?.[1] || linkMatch?.[2] || '';
      const pubDate = pubDateMatch?.[1] || '';
      const source = sourceMatch?.[1] || sourceMatch?.[2] || extractSourceFromTitle(title);

      if (title && url) {
        articles.push({
          title: cleanHtml(title),
          url: url.trim(),
          source: cleanHtml(source),
          pubDate,
        });
      }
    }

    return articles;
  } catch (err) {
    console.error(`Failed to fetch news for "${query}":`, err);
    return [];
  }
}

function cleanHtml(text: string): string {
  return text.replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#39;/g, "'").trim();
}

function extractSourceFromTitle(title: string): string {
  // Google News titles often end with " - Source Name"
  const parts = title.split(' - ');
  if (parts.length > 1) {
    return parts[parts.length - 1].trim();
  }
  return 'News';
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;
  const investor = SUPER_INVESTORS[cik];

  if (!investor) {
    return NextResponse.json(
      { error: 'Investor not found' },
      { status: 404 }
    );
  }

  const categories: SourceCategory[] = [];

  // 1. Primary search: investor/person name + stock/trading
  const primaryQuery = `"${investor.person}" stock trading 2025 2026`;
  const primaryArticles = await fetchGoogleNewsRSS(primaryQuery, 10);
  if (primaryArticles.length > 0) {
    categories.push({
      category: `${investor.person.toUpperCase()} — TRADE & PORTFOLIO NEWS`,
      articles: primaryArticles,
    });
  }

  await delay(200);

  // 2. Fund/company name search
  const fundQuery = `"${investor.name}" investment portfolio`;
  const fundArticles = await fetchGoogleNewsRSS(fundQuery, 8);
  if (fundArticles.length > 0) {
    // Deduplicate against primary
    const existingUrls = new Set(primaryArticles.map(a => a.url));
    const unique = fundArticles.filter(a => !existingUrls.has(a.url));
    if (unique.length > 0) {
      categories.push({
        category: `${investor.name.toUpperCase()} — FUND UPDATES`,
        articles: unique,
      });
    }
  }

  await delay(200);

  // 3. Topic-specific searches
  for (const topic of investor.topics.slice(0, 3)) {
    const topicQuery = `${investor.person} ${topic}`;
    const topicArticles = await fetchGoogleNewsRSS(topicQuery, 5);

    // Deduplicate
    const allExistingUrls = new Set(
      categories.flatMap(c => c.articles.map(a => a.url))
    );
    const unique = topicArticles.filter(a => !allExistingUrls.has(a.url));

    if (unique.length > 0) {
      categories.push({
        category: `${topic.toUpperCase()}`,
        articles: unique,
      });
    }

    await delay(200);
  }

  // If nothing found at all, return a minimal response
  if (categories.length === 0) {
    categories.push({
      category: 'SEC FILINGS',
      articles: [
        {
          title: `${investor.name} — SEC EDGAR Filings`,
          url: `https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=${cik}&type=13F-HR&dateb=&owner=include&count=10`,
          source: 'SEC.gov',
          pubDate: new Date().toISOString(),
        },
      ],
    });
  }

  return NextResponse.json({
    investor: {
      name: investor.name,
      person: investor.person,
      cik,
    },
    categories,
    fetchedAt: new Date().toISOString(),
  });
}
