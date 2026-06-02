import yahooFinance from 'yahoo-finance2';

async function test() {
  try {
    const summary = await yahooFinance.quoteSummary('RELIANCE.NS', { 
      modules: ['earnings', 'earningsHistory', 'earningsTrend'] 
    });
    console.log("earningsHistory:", JSON.stringify(summary.earningsHistory, null, 2));
    console.log("earnings:", JSON.stringify(summary.earnings, null, 2));
    console.log("earningsTrend:", JSON.stringify(summary.earningsTrend, null, 2));
  } catch (e) {
    console.error(e);
  }
}

test();
