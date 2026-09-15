import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";
import { resolveNvidiaModel } from "@/lib/nvidia";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

const SUPER_INVESTORS: Record<string, { name: string; person: string; description: string }> = {
  '0001035048': { name: 'Greenhaven Associates Inc', person: 'Edgar Wachenheim III', description: 'A New York-based investment firm managing concentrated portfolios of value stocks.' },
  '0001549575': { name: 'Dalal Street, LLC', person: 'Mohnish Pabrai', description: 'Managing Partner of the Pabrai Investment Funds. Follows the investment style of Warren Buffett.' },
  '0002045724': { name: 'Situational Awareness LP', person: 'Leopold Aschenbrenner', description: 'Hedge fund focused on AI infrastructure, semiconductors, and power.' },
  '0001045810': { name: 'NVIDIA Corp', person: 'Jensen Huang', description: 'CEO and co-founder of NVIDIA.' },
  '0001652044': { name: 'Alphabet Inc.', person: 'Sundar Pichai', description: 'CEO of Alphabet Inc. and Google.' },
  '0000858804': { name: 'Muhlenkamp & Co Inc', person: 'Ronald H. Muhlenkamp', description: 'Founder of Muhlenkamp & Co, focused on long-term capital appreciation.' },
  '0001540305': { name: 'Aquamarine Financial', person: 'Guy Spier', description: 'Manager of the Aquamarine Fund, famously known for his value investing approach.' },
  '0000049722': { name: 'Icahn Carl C', person: 'Carl Icahn', description: 'Legendary activist investor and founder of Icahn Enterprises.' },
  '0001112830': { name: 'Fairholme Capital Management', person: 'Bruce Berkowitz', description: 'Founder and Chief Investment Officer of Fairholme Capital Management.' },
  '0001719232': { name: 'Miller Value Partners, LLC', person: 'Bill Miller IV', description: 'Chief Investment Officer at Miller Value Partners.' },
  '0001009139': { name: 'Oaktree Capital Management LP', person: 'Howard Marks', description: 'Co-founder of Oaktree Capital Management, known for distressed debt and value investing.' },
  '0001131174': { name: 'Tiger Global Management LLC', person: 'Chase Coleman', description: 'Founder of Tiger Global Management, a renowned hedge fund and venture capital firm.' },
  '0000200217': { name: 'Dodge & Cox', person: 'David Hoeft', description: 'Dodge & Cox is an independent, employee-owned investment management firm.' },
  '0000862080': { name: 'Harris Associates LP', person: 'Bill Nygren', description: 'A value investing firm managing the Oakmark Funds.' },
  '0001067983': { name: 'Berkshire Hathaway Inc', person: 'Warren Buffett', description: 'The Oracle of Omaha. Chairman and CEO of Berkshire Hathaway.' },
  '0001029160': { name: 'Soros Fund Management', person: 'George Soros', description: 'Legendary macro trader and founder of Soros Fund Management.' },
  '0001166559': { name: 'Gates Foundation Trust', person: 'Bill Gates', description: 'The trust managing the endowment of the Bill & Melinda Gates Foundation.' },
  '0001849635': { name: 'Trump Media & Technology', person: 'Donald Trump', description: 'Majority shareholder of Trump Media & Technology Group.' },
  '0001350694': { name: 'Bridgewater Associates', person: 'Ray Dalio', description: 'Founder of Bridgewater Associates, the world\'s largest hedge fund.' },
  '0001336528': { name: 'Pershing Square Capital', person: 'Bill Ackman', description: 'Founder and CEO of Pershing Square Capital Management, known for activist investing.' },
  '0001649339': { name: 'Scion Asset Management', person: 'Michael Burry', description: 'Founder of Scion Asset Management. Famous for predicting the 2008 financial crisis.' },
  '0001656456': { name: 'Appaloosa Management', person: 'David Tepper', description: 'Founder of Appaloosa Management, known for distressed debt investing.' },
  '0001536411': { name: 'Duquesne Family Office', person: 'Stanley Druckenmiller', description: 'Former chairman of Duquesne Capital. One of the most successful macro traders.' },
  '0001079114': { name: 'Greenlight Capital', person: 'David Einhorn', description: 'Founder of Greenlight Capital, known for value investing and short selling.' },
  '0001040273': { name: 'Third Point LLC', person: 'Daniel Loeb', description: 'Founder of Third Point LLC, an activist hedge fund.' },
  '0001061768': { name: 'Baupost Group', person: 'Seth Klarman', description: 'Founder of the Baupost Group. Author of Margin of Safety.' },
};

const SEC_HEADERS = {
  'User-Agent': 'Velora contact@velora.app',
  'Accept': 'application/json',
};

type Holding = {
  company: string;
  cusip: string;
  value: number;
  shares: number;
};

// In-memory cache for parsed 13F filings (TTL: 6 hours)
const filingCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL_MS = 6 * 60 * 60 * 1000;

async function fetchHoldingsFromSEC(cik: string): Promise<{
  filingDate: string | null;
  reportDate: string | null;
  holdings: Holding[];
}> {
  const url = `https://data.sec.gov/submissions/CIK${cik}.json`;
  const res = await fetch(url, { headers: SEC_HEADERS });
  if (!res.ok) throw new Error(`SEC returned ${res.status}`);

  const data = await res.json();
  const filings = data?.filings?.recent;

  if (!filings?.form) {
    return { filingDate: null, reportDate: null, holdings: [] };
  }

  // Find the latest 13F-HR filing
  const forms: string[] = filings.form;
  const idx = forms.findIndex((f: string) => f === '13F-HR' || f === '13F-HR/A');

  if (idx < 0) {
    return { filingDate: null, reportDate: null, holdings: [] };
  }

  const filingDate = filings.filingDate[idx];
  const reportDate = filings.reportDate?.[idx] || null;
  const accessionNumber = filings.accessionNumber[idx];

  const cikNumber = cik.replace(/^0+/, '');
  const accPath = accessionNumber.replace(/-/g, '');
  const indexUrl = `https://www.sec.gov/Archives/edgar/data/${cikNumber}/${accPath}/${accessionNumber}-index.html`;

  try {
    const indexRes = await fetch(indexUrl, { headers: SEC_HEADERS });
    if (!indexRes.ok) throw new Error(`Index page returned ${indexRes.status}`);

    const indexHtml = await indexRes.text();

    // Match raw XML file links (excluding xsl styled views and primary_doc.xml)
    const xmlLinks = [...indexHtml.matchAll(/href="([^"]*\.xml)"/gi)]
      .map(m => m[1])
      .filter(href => !href.includes('xsl') && !href.includes('primary_doc'));

    const xmlHref = xmlLinks[0];
    if (xmlHref) {
      const xmlUrl = xmlHref.startsWith('/')
        ? `https://www.sec.gov${xmlHref}`
        : `https://www.sec.gov/Archives/edgar/data/${cikNumber}/${accPath}/${xmlHref}`;

      const xmlRes = await fetch(xmlUrl, { headers: SEC_HEADERS });
      if (xmlRes.ok) {
        const xmlText = await xmlRes.text();
        const holdings = parseInfoTableXml(xmlText);
        if (holdings.length > 0) {
          return { filingDate, reportDate, holdings };
        }
      }
    }
  } catch (err) {
    console.error(`Failed to fetch info table for CIK ${cik}:`, err);
  }

  return { filingDate, reportDate, holdings: [] };
}

function parseInfoTableXml(xml: string): Holding[] {
  const holdings: Holding[] = [];

  // Match each infoTable entry (handling optional XML namespaces)
  const entryRegex = /<(?:[a-zA-Z0-9_]+:)?infoTable[^>]*>([\s\S]*?)<\/(?:[a-zA-Z0-9_]+:)?infoTable>/gi;
  let match;

  while ((match = entryRegex.exec(xml)) !== null) {
    const entry = match[1];

    const nameMatch = entry.match(/<(?:[a-zA-Z0-9_]+:)?nameOfIssuer[^>]*>(.*?)<\/(?:[a-zA-Z0-9_]+:)?nameOfIssuer>/i);
    const cusipMatch = entry.match(/<(?:[a-zA-Z0-9_]+:)?cusip[^>]*>(.*?)<\/(?:[a-zA-Z0-9_]+:)?cusip>/i);
    const valueMatch = entry.match(/<(?:[a-zA-Z0-9_]+:)?value[^>]*>(.*?)<\/(?:[a-zA-Z0-9_]+:)?value>/i);
    const sharesMatch = entry.match(/<(?:[a-zA-Z0-9_]+:)?sshPrnamt[^>]*>(.*?)<\/(?:[a-zA-Z0-9_]+:)?sshPrnamt>/i);

    if (nameMatch) {
      const rawVal = parseInt((valueMatch?.[1] || '0').replace(/,/g, '').trim(), 10) || 0;
      const rawShares = parseInt((sharesMatch?.[1] || '0').replace(/,/g, '').trim(), 10) || 0;

      holdings.push({
        company: nameMatch[1].trim(),
        cusip: cusipMatch ? cusipMatch[1].trim() : '',
        value: rawVal,
        shares: rawShares,
      });
    }
  }

  // Sort by value descending
  holdings.sort((a, b) => b.value - a.value);
  return holdings;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ cik: string }> }
) {
  const { cik } = await params;
  const paddedCik = cik.padStart(10, '0');
  const investorMeta = SUPER_INVESTORS[paddedCik];

  if (!investorMeta) {
    return NextResponse.json(
      { error: `Unknown investor CIK: ${cik}` },
      { status: 404 }
    );
  }

  // Check in-memory cache
  const cached = filingCache.get(paddedCik);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return NextResponse.json(cached.data);
  }

  try {
    const { filingDate, reportDate, holdings } = await fetchHoldingsFromSEC(paddedCik);
    const totalValue = holdings.reduce((sum, h) => sum + h.value, 0);

    const result = {
      investor: {
        name: investorMeta.name,
        person: investorMeta.person,
        cik: paddedCik,
        description: investorMeta.description,
      },
      filingDate: filingDate || 'Recent',
      reportDate: reportDate || 'Latest',
      holdings,
      totalValue,
      source: 'SEC EDGAR Form 13F-HR',
    };

    if (holdings.length > 0) {
      filingCache.set(paddedCik, { data: result, timestamp: Date.now() });
    }

    return NextResponse.json(result);
  } catch (err) {
    console.error(`Error fetching investor profile for CIK ${cik}:`, err);

    if (cached) {
      return NextResponse.json({ ...cached.data, isStale: true });
    }

    return NextResponse.json(
      {
        investor: {
          name: investorMeta.name,
          person: investorMeta.person,
          cik: paddedCik,
          description: investorMeta.description,
        },
        filingDate: 'Unavailable',
        reportDate: 'Unavailable',
        holdings: [],
        totalValue: 0,
        error: 'SEC 13F filing temporarily unavailable from EDGAR',
      },
      { status: 503 }
    );
  }
}
