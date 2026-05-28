const FMP_KEY = "k5y0yZj4Em2fxm6v5E5ieGkDvWBfcFxp";
const BASE = "https://financialmodelingprep.com";
async function test() {
  try {
    const res = await fetch(`${BASE}/stable/ratios-ttm?symbol=AAPL&apikey=${FMP_KEY}`);
    const data = await res.json();
    console.log(Object.keys(data[0] || {}).join(', '));
  } catch(e) {}
}
test();
