const FMP_KEY = "k5y0yZj4Em2fxm6v5E5ieGkDvWBfcFxp";
const BASE = "https://financialmodelingprep.com";

const endpoints = [
  `/api/v3/analyst-stock-recommendations/AAPL?apikey=${FMP_KEY}`,
  `/api/v4/insider-trading?symbol=AAPL&apikey=${FMP_KEY}`,
  `/api/v3/historical/earning_calendar/AAPL?apikey=${FMP_KEY}`,
  `/api/v3/stock_news?tickers=AAPL&apikey=${FMP_KEY}`
];

async function test() {
  for (const path of endpoints) {
    try {
      const res = await fetch(`${BASE}${path}`);
      const text = await res.text();
      console.log(`[${path.split('?')[0]}] ${res.status}: ${text.substring(0, 150)}`);
    } catch(err) {
      console.log(`Error: ${err.message}`);
    }
  }
}
test();
