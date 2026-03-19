const FINNHUB_KEY = "d6u59v1r01qp1k9ba7p0d6u59v1r01qp1k9ba7pg";

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.c ? parseFloat(data.c) : null;
  } catch (e) { return null; }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.name || symbol;
  } catch (e) { return symbol; }
}

export async function getHistoricalData(symbol, range = "1M") {
  try {
    const ticker = symbol.toUpperCase();
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${range.toLowerCase()}&interval=1d`;
    
    // Using AllOrigins proxy to bypass CORS
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;
    
    const response = await fetch(proxyUrl);
    const proxyData = await response.json();
    const data = JSON.parse(proxyData.contents);
    
    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    return timestamps.map((time, i) => ({
      t: new Date(time * 1000),
      o: quotes.open[i],
      h: quotes.high[i],
      l: quotes.low[i],
      c: quotes.close[i],
    })).filter(item => item.c !== null);
  } catch (e) {
    console.error("Historical fetch failed", e);
    return [];
  }
}