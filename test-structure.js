const FMP_KEY = "k5y0yZj4Em2fxm6v5E5ieGkDvWBfcFxp";
const BASE = "https://financialmodelingprep.com";

const endpoints = {
  quote: `/stable/quote?symbol=AAPL&apikey=${FMP_KEY}`,
  profile: `/stable/profile?symbol=AAPL&apikey=${FMP_KEY}`,
  keyStats: `/stable/key-metrics-ttm?symbol=AAPL&apikey=${FMP_KEY}`,
  income: `/stable/income-statement?symbol=AAPL&period=annual&limit=5&apikey=${FMP_KEY}`
};

async function test() {
  for (const [name, path] of Object.entries(endpoints)) {
    try {
      const res = await fetch(`${BASE}${path}`);
      const data = await res.json();
      console.log(`[${name}] Keys of first item:`, Array.isArray(data) && data.length > 0 ? Object.keys(data[0]).join(', ') : 'Not an array or empty');
      if (name === 'quote' && Array.isArray(data) && data.length > 0) {
        console.log(`[quote] sample:`, data[0]);
      }
    } catch(err) {
      console.log(`[${name}] Error: ${err.message}`);
    }
  }
}
test();
