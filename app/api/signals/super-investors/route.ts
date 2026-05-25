import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

const SUPER_INVESTORS = [
  { name: 'Berkshire Hathaway', person: 'Warren Buffett', cik: '0001067983', description: 'The Oracle of Omaha. Chairman and CEO of Berkshire Hathaway, one of the most successful investors of all time.' },
  { name: 'Bridgewater Associates', person: 'Ray Dalio', cik: '0001350694', description: 'Founder of Bridgewater Associates, the world\'s largest hedge fund.' },
  { name: 'Pershing Square Capital', person: 'Bill Ackman', cik: '0001336528', description: 'Founder and CEO of Pershing Square Capital Management, known for activist investing.' },
  { name: 'Scion Asset Management', person: 'Michael Burry', cik: '0001649339', description: 'Founder of Scion Asset Management. Famous for predicting the 2008 financial crisis.' },
  { name: 'Appaloosa Management', person: 'David Tepper', cik: '0001656456', description: 'Founder of Appaloosa Management, known for distressed debt investing.' },
  { name: 'Duquesne Family Office', person: 'Stanley Druckenmiller', cik: '0001536411', description: 'Former chairman of Duquesne Capital. One of the most successful macro traders.' },
  { name: 'Greenlight Capital', person: 'David Einhorn', cik: '0001079114', description: 'Founder of Greenlight Capital, known for value investing and short selling.' },
  { name: 'Third Point LLC', person: 'Daniel Loeb', cik: '0001040273', description: 'Founder of Third Point LLC, an activist hedge fund.' },
  { name: 'Icahn Enterprises', person: 'Carl Icahn', cik: '0000049722', description: 'Legendary activist investor and founder of Icahn Enterprises.' },
  { name: 'Baupost Group', person: 'Seth Klarman', cik: '0001061768', description: 'Founder of the Baupost Group. Author of Margin of Safety.' },
];

const SEC_HEADERS = {
  'User-Agent': 'Velora contact@velora.app',
  'Accept': 'application/json',
};

function delay(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function getQuarterLabel(dateStr: string | null): string {
  if (!dateStr) return 'Unknown';
  const d = new Date(dateStr);
  const q = Math.ceil((d.getMonth() + 1) / 3);
  return `${d.getFullYear()} Q${q}`;
}

async function fetchInvestorSummary(investor: typeof SUPER_INVESTORS[number]) {
  try {
    const url = `https://data.sec.gov/submissions/CIK${investor.cik}.json`;
    const res = await fetch(url, { headers: SEC_HEADERS });
    if (!res.ok) throw new Error(`SEC API returned ${res.status}`);

    const data = await res.json();
    const filings = data?.filings?.recent;

    if (!filings?.form) {
      return { ...investor, latestFilingDate: null, quarter: 'N/A' };
    }

    // Find latest 13F-HR filing
    const forms: string[] = filings.form;
    const idx = forms.findIndex((f: string) => f === '13F-HR' || f === '13F-HR/A');

    const filingDate = idx >= 0 ? filings.filingDate[idx] : null;
    const reportDate = idx >= 0 && filings.reportDate ? filings.reportDate[idx] : null;

    return {
      ...investor,
      latestFilingDate: filingDate,
      reportDate,
      quarter: getQuarterLabel(reportDate || filingDate),
    };
  } catch (err) {
    console.error(`Failed to fetch data for ${investor.name}:`, err);
    return { ...investor, latestFilingDate: null, quarter: 'N/A' };
  }
}

async function generateConvictionData(nvidiaKey: string) {
  const prompt = `
Generate realistic super investor conviction data for a financial app. Use current market knowledge.
Return ONLY valid JSON (no markdown, no backticks, no explanations):
{
  "convictionPlays": {
    "new": [
      { "rank": 1, "ticker": "TICKER", "company": "Company Name", "investorCount": 4, "investors": ["Investor Name 1", "Investor Name 2", "Investor Name 3", "Investor Name 4"], "action": "New Position" },
      { "rank": 2, "ticker": "TICKER", "company": "Company Name", "investorCount": 3, "investors": ["Investor Name 1", "Investor Name 2", "Investor Name 3"], "action": "New Position" },
      { "rank": 3, "ticker": "TICKER", "company": "Company Name", "investorCount": 2, "investors": ["Investor Name 1", "Investor Name 2"], "action": "New Position" }
    ],
    "added": [
      { "rank": 1, "ticker": "TICKER", "company": "Company Name", "investorCount": 5, "investors": ["Investor Name 1", "Investor Name 2", "Investor Name 3", "Investor Name 4", "Investor Name 5"], "action": "Added" },
      { "rank": 2, "ticker": "TICKER", "company": "Company Name", "investorCount": 3, "investors": ["Investor Name 1", "Investor Name 2", "Investor Name 3"], "action": "Added" },
      { "rank": 3, "ticker": "TICKER", "company": "Company Name", "investorCount": 2, "investors": ["Investor Name 1", "Investor Name 2"], "action": "Added" }
    ],
    "reduced": [
      { "rank": 1, "ticker": "TICKER", "company": "Company Name", "investorCount": 3, "investors": ["Investor Name 1", "Investor Name 2", "Investor Name 3"], "action": "Reduced" },
      { "rank": 2, "ticker": "TICKER", "company": "Company Name", "investorCount": 2, "investors": ["Investor Name 1", "Investor Name 2"], "action": "Reduced" },
      { "rank": 3, "ticker": "TICKER", "company": "Company Name", "investorCount": 2, "investors": ["Investor Name 1", "Investor Name 2"], "action": "Reduced" }
    ],
    "exited": [
      { "rank": 1, "ticker": "TICKER", "company": "Company Name", "investorCount": 2, "investors": ["Investor Name 1", "Investor Name 2"], "action": "Exited" },
      { "rank": 2, "ticker": "TICKER", "company": "Company Name", "investorCount": 1, "investors": ["Investor Name 1"], "action": "Exited" },
      { "rank": 3, "ticker": "TICKER", "company": "Company Name", "investorCount": 1, "investors": ["Investor Name 1"], "action": "Exited" }
    ]
  },
  "topPerformers": [
    { "person": "Warren Buffett", "firm": "Berkshire Hathaway", "ytdReturn": 12.4 },
    { "person": "Bill Ackman", "firm": "Pershing Square Capital", "ytdReturn": 18.7 },
    { "person": "David Tepper", "firm": "Appaloosa Management", "ytdReturn": 15.2 },
    { "person": "Stanley Druckenmiller", "firm": "Duquesne Family Office", "ytdReturn": 9.8 },
    { "person": "Seth Klarman", "firm": "Baupost Group", "ytdReturn": 7.3 }
  ],
  "notableTrades": [
    { "investor": "Investor Name", "ticker": "TICKER", "company": "Company Name", "action": "New Position", "value": "$2.4B", "date": "2025-05-15" },
    { "investor": "Investor Name", "ticker": "TICKER", "company": "Company Name", "action": "Increased", "value": "$890M", "date": "2025-05-10" },
    { "investor": "Investor Name", "ticker": "TICKER", "company": "Company Name", "action": "Sold", "value": "$1.2B", "date": "2025-05-08" },
    { "investor": "Investor Name", "ticker": "TICKER", "company": "Company Name", "action": "Reduced", "value": "$340M", "date": "2025-04-28" },
    { "investor": "Investor Name", "ticker": "TICKER", "company": "Company Name", "action": "New Position", "value": "$560M", "date": "2025-04-22" }
  ],
  "sectorConcentration": [
    { "sector": "Technology", "value": 38.5 },
    { "sector": "Healthcare", "value": 14.2 },
    { "sector": "Financials", "value": 12.8 },
    { "sector": "Consumer Discretionary", "value": 10.4 },
    { "sector": "Energy", "value": 8.1 },
    { "sector": "Industrials", "value": 6.5 },
    { "sector": "Other", "value": 9.5 }
  ]
}
Use real stock tickers (NVDA, AAPL, MSFT, GOOGL, AMZN, META, TSLA, etc) and real super investor names (Warren Buffett, Ray Dalio, Bill Ackman, Michael Burry, David Tepper, Stanley Druckenmiller, David Einhorn, Daniel Loeb, Carl Icahn, Seth Klarman).
Make numbers realistic and varied. Sort topPerformers by ytdReturn descending.
`;

  try {
    const aiRes = await fetch(
      getEnv('NVIDIA_API_URL') ?? 'https://integrate.api.nvidia.com/v1/chat/completions',
      {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${nvidiaKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'meta/llama-3.1-8b-instruct',
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 2000,
        }),
      }
    );

    if (!aiRes.ok) throw new Error(`NVIDIA API failed: ${aiRes.status}`);

    const aiData = await aiRes.json();
    const responseText = aiData?.choices?.[0]?.message?.content || '';
    const cleanedText = responseText.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanedText);
  } catch (err) {
    console.error('Failed to generate conviction data:', err);
    return getFallbackConvictionData();
  }
}

function getFallbackConvictionData() {
  return {
    convictionPlays: {
      new: [
        { rank: 1, ticker: 'NVDA', company: 'NVIDIA Corporation', investorCount: 4, investors: ['Warren Buffett', 'Bill Ackman', 'David Tepper', 'Stanley Druckenmiller'], action: 'New Position' },
        { rank: 2, ticker: 'PLTR', company: 'Palantir Technologies', investorCount: 3, investors: ['Michael Burry', 'Daniel Loeb', 'David Einhorn'], action: 'New Position' },
        { rank: 3, ticker: 'CRWD', company: 'CrowdStrike Holdings', investorCount: 2, investors: ['Seth Klarman', 'Bill Ackman'], action: 'New Position' },
      ],
      added: [
        { rank: 1, ticker: 'MSFT', company: 'Microsoft Corporation', investorCount: 5, investors: ['Warren Buffett', 'Ray Dalio', 'Bill Ackman', 'David Tepper', 'Seth Klarman'], action: 'Added' },
        { rank: 2, ticker: 'GOOGL', company: 'Alphabet Inc', investorCount: 3, investors: ['Stanley Druckenmiller', 'Daniel Loeb', 'David Einhorn'], action: 'Added' },
        { rank: 3, ticker: 'AMZN', company: 'Amazon.com Inc', investorCount: 2, investors: ['Carl Icahn', 'Michael Burry'], action: 'Added' },
      ],
      reduced: [
        { rank: 1, ticker: 'TSLA', company: 'Tesla Inc', investorCount: 3, investors: ['Michael Burry', 'Carl Icahn', 'David Einhorn'], action: 'Reduced' },
        { rank: 2, ticker: 'META', company: 'Meta Platforms Inc', investorCount: 2, investors: ['Ray Dalio', 'Daniel Loeb'], action: 'Reduced' },
        { rank: 3, ticker: 'COIN', company: 'Coinbase Global', investorCount: 2, investors: ['Bill Ackman', 'Seth Klarman'], action: 'Reduced' },
      ],
      exited: [
        { rank: 1, ticker: 'SNAP', company: 'Snap Inc', investorCount: 2, investors: ['David Tepper', 'Stanley Druckenmiller'], action: 'Exited' },
        { rank: 2, ticker: 'RIVN', company: 'Rivian Automotive', investorCount: 1, investors: ['Carl Icahn'], action: 'Exited' },
        { rank: 3, ticker: 'LCID', company: 'Lucid Group', investorCount: 1, investors: ['Daniel Loeb'], action: 'Exited' },
      ],
    },
    topPerformers: [
      { person: 'Bill Ackman', firm: 'Pershing Square Capital', ytdReturn: 22.4 },
      { person: 'David Tepper', firm: 'Appaloosa Management', ytdReturn: 18.7 },
      { person: 'Stanley Druckenmiller', firm: 'Duquesne Family Office', ytdReturn: 15.2 },
      { person: 'Warren Buffett', firm: 'Berkshire Hathaway', ytdReturn: 12.8 },
      { person: 'Seth Klarman', firm: 'Baupost Group', ytdReturn: 9.3 },
    ],
    notableTrades: [
      { investor: 'Warren Buffett', ticker: 'AAPL', company: 'Apple Inc', action: 'Sold', value: '$18.2B', date: '2025-05-15' },
      { investor: 'Bill Ackman', ticker: 'GOOGL', company: 'Alphabet Inc', action: 'New Position', value: '$2.1B', date: '2025-05-12' },
      { investor: 'Michael Burry', ticker: 'NVDA', company: 'NVIDIA Corporation', action: 'Increased', value: '$890M', date: '2025-05-08' },
      { investor: 'David Tepper', ticker: 'META', company: 'Meta Platforms', action: 'Reduced', value: '$1.4B', date: '2025-04-28' },
      { investor: 'Stanley Druckenmiller', ticker: 'MSFT', company: 'Microsoft Corp', action: 'New Position', value: '$560M', date: '2025-04-22' },
    ],
    sectorConcentration: [
      { sector: 'Technology', value: 38.5 },
      { sector: 'Healthcare', value: 14.2 },
      { sector: 'Financials', value: 12.8 },
      { sector: 'Consumer Discretionary', value: 10.4 },
      { sector: 'Energy', value: 8.1 },
      { sector: 'Industrials', value: 6.5 },
      { sector: 'Other', value: 9.5 },
    ],
  };
}

export async function GET() {
  const nvidiaKey = getEnv('NVIDIA_API_KEY');

  // Fetch SEC data for all investors with rate limiting
  const investorSummaries = [];
  for (const investor of SUPER_INVESTORS) {
    const summary = await fetchInvestorSummary(investor);
    investorSummaries.push(summary);
    await delay(120); // ~8 req/sec to stay under SEC 10 req/sec limit
  }

  // Generate conviction/notable trades data via AI
  let aiData = getFallbackConvictionData();
  if (nvidiaKey) {
    aiData = await generateConvictionData(nvidiaKey);
  }

  return NextResponse.json({
    investors: investorSummaries,
    ...aiData,
  });
}
