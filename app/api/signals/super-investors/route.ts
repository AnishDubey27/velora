import { NextResponse } from "next/server";
import { getEnv } from "@/lib/env";

export const revalidate = 86400;
export const dynamic = "force-dynamic";

const SUPER_INVESTORS = [
  { name: 'Greenhaven Associates Inc', person: 'Edgar Wachenheim III', cik: '0001035048', description: 'A New York-based investment firm managing concentrated portfolios of value stocks.' },
  { name: 'Dalal Street, LLC', person: 'Mohnish Pabrai', cik: '0001549575', description: 'Managing Partner of the Pabrai Investment Funds. Follows the investment style of Warren Buffett.' },
  { name: 'Situational Awareness LP', person: 'Leopold Aschenbrenner', cik: '0002045724', description: 'Hedge fund focused on AI infrastructure, semiconductors, and power.' },
  { name: 'NVIDIA Corp', person: 'Jensen Huang', cik: '0001045810', description: 'CEO and co-founder of NVIDIA.' },
  { name: 'Alphabet Inc.', person: 'Sundar Pichai', cik: '0001652044', description: 'CEO of Alphabet Inc. and Google.' },
  { name: 'Muhlenkamp & Co Inc', person: 'Ronald H. Muhlenkamp', cik: '0000858804', description: 'Founder of Muhlenkamp & Co, focused on long-term capital appreciation.' },
  { name: 'Aquamarine Financial', person: 'Guy Spier', cik: '0001540305', description: 'Manager of the Aquamarine Fund, famously known for his value investing approach.' },
  { name: 'Icahn Carl C', person: 'Carl Icahn', cik: '0000049722', description: 'Legendary activist investor and founder of Icahn Enterprises.' },
  { name: 'Fairholme Capital Management', person: 'Bruce Berkowitz', cik: '0001112830', description: 'Founder and Chief Investment Officer of Fairholme Capital Management.' },
  { name: 'Miller Value Partners, LLC', person: 'Bill Miller IV', cik: '0001719232', description: 'Chief Investment Officer at Miller Value Partners.' },
  { name: 'Oaktree Capital Management LP', person: 'Howard Marks', cik: '0001009139', description: 'Co-founder of Oaktree Capital Management, known for distressed debt and value investing.' },
  { name: 'Tiger Global Management LLC', person: 'Chase Coleman', cik: '0001131174', description: 'Founder of Tiger Global Management, a renowned hedge fund and venture capital firm.' },
  { name: 'Dodge & Cox', person: 'David Hoeft', cik: '0000200217', description: 'Dodge & Cox is an independent, employee-owned investment management firm.' },
  { name: 'Harris Associates LP', person: 'Bill Nygren', cik: '0000862080', description: 'A value investing firm managing the Oakmark Funds.' },
  { name: 'Berkshire Hathaway Inc', person: 'Warren Buffett', cik: '0001067983', description: 'The Oracle of Omaha. Chairman and CEO of Berkshire Hathaway.' },
  { name: 'Soros Fund Management', person: 'George Soros', cik: '0001029160', description: 'Legendary macro trader and founder of Soros Fund Management.' },
  { name: 'Gates Foundation Trust', person: 'Bill Gates', cik: '0001166559', description: 'The trust managing the endowment of the Bill & Melinda Gates Foundation.' },
  { name: 'Trump Media & Technology', person: 'Donald Trump', cik: '0001849635', description: 'Majority shareholder of Trump Media & Technology Group.' },
  { name: 'Bridgewater Associates', person: 'Ray Dalio', cik: '0001350694', description: 'Founder of Bridgewater Associates, the world\'s largest hedge fund.' },
  { name: 'Pershing Square Capital', person: 'Bill Ackman', cik: '0001336528', description: 'Founder and CEO of Pershing Square Capital Management, known for activist investing.' },
  { name: 'Scion Asset Management', person: 'Michael Burry', cik: '0001649339', description: 'Founder of Scion Asset Management. Famous for predicting the 2008 financial crisis.' },
  { name: 'Appaloosa Management', person: 'David Tepper', cik: '0001656456', description: 'Founder of Appaloosa Management, known for distressed debt investing.' },
  { name: 'Duquesne Family Office', person: 'Stanley Druckenmiller', cik: '0001536411', description: 'Former chairman of Duquesne Capital. One of the most successful macro traders.' },
  { name: 'Greenlight Capital', person: 'David Einhorn', cik: '0001079114', description: 'Founder of Greenlight Capital, known for value investing and short selling.' },
  { name: 'Third Point LLC', person: 'Daniel Loeb', cik: '0001040273', description: 'Founder of Third Point LLC, an activist hedge fund.' },
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
    { "investor": "Investor Name", "ticker": "TICKER", "details": "46M shares sold at $182.36", "action": "New Position", "value": "+$2.4B" },
    { "investor": "Investor Name", "ticker": "TICKER", "details": "93M shares sold at $4.28", "action": "Exited", "value": "-$398M" },
    { "investor": "Investor Name", "ticker": "TICKER", "details": "213M shares bought at $13.90", "action": "Reduced", "value": "-$1.3B" }
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
      { person: 'Edgar Wachenheim III', firm: 'Greenhaven Associates Inc', ytdReturn: 76928.5 },
      { person: 'Mohnish Pabrai', firm: 'Dalal Street, LLC', ytdReturn: 19.8 },
      { person: 'Leopold Aschenbrenner', firm: 'Situational Awareness LP', ytdReturn: 18.4 },
      { person: 'Jensen Huang', firm: 'NVIDIA Corp', ytdReturn: 12.4 },
      { person: 'Sundar Pichai', firm: 'Alphabet Inc.', ytdReturn: 11.1 },
      { person: 'Ronald H. Muhlenkamp', firm: 'Muhlenkamp & Co Inc', ytdReturn: 10.8 },
      { person: 'Guy Spier', firm: 'Aquamarine Financial', ytdReturn: 10.3 },
      { person: 'Carl Icahn', firm: 'Icahn Carl C', ytdReturn: 9.4 },
      { person: 'Bruce Berkowitz', firm: 'Fairholme Capital Management', ytdReturn: 6.6 },
      { person: 'Bill Miller IV', firm: 'Miller Value Partners, LLC', ytdReturn: 5.9 },
    ],
    notableTrades: [
      { investor: 'Oaktree Capital Management LP', ticker: 'ASRT', details: '213M shares bought at $13.90', action: 'New Position', value: '+$3.0B' },
      { investor: 'Tiger Global Management LLC', ticker: 'GRAB', details: '93M shares sold at $4.28', action: 'Exited', value: '-$398M' },
      { investor: 'Dodge & Cox', ticker: 'SUNB', details: '53M shares bought at $70.63', action: 'New Position', value: '+$3.8B' },
      { investor: 'Harris Associates LP', ticker: 'WBD', details: '46M shares sold at $27.99', action: 'Reduced', value: '-$1.3B' },
      { investor: 'Berkshire Hathaway Inc', ticker: 'CVX', details: '46M shares sold at $182.36', action: 'Reduced', value: '-$8.3B' },
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
