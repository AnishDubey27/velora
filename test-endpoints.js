const FMP_KEY = "k5y0yZj4Em2fxm6v5E5ieGkDvWBfcFxp";
const BASE = "https://financialmodelingprep.com";

const endpoints = {
  chartIntraday: `/stable/historical-chart/1hour?symbol=AAPL&apikey=${FMP_KEY}`,
  income: `/stable/income-statement?symbol=AAPL&period=annual&limit=5&apikey=${FMP_KEY}`,
  analyst: `/stable/analyst-stock-recommendations?symbol=AAPL&apikey=${FMP_KEY}`,
  earnings: `/stable/earnings-calendar-confirmed?symbol=AAPL&apikey=${FMP_KEY}`,
  insider: `/stable/insider-trading?symbol=AAPL&page=0&limit=50&apikey=${FMP_KEY}`,
  news: `/stable/stock-news?symbol=AAPL&limit=20&apikey=${FMP_KEY}`
};

async function test() {
  for (const [name, path] of Object.entries(endpoints)) {
    try {
      const res = await fetch(`${BASE}${path}`);
      const text = await res.text();
      console.log(`[${name}] ${res.status}: ${text.substring(0, 100)}`);
    } catch(err) {
      console.log(`[${name}] Error: ${err.message}`);
    }
  }
}
test();
