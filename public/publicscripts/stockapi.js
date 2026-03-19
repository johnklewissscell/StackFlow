const FINNHUB_KEY = "d6u59v1r01qp1k9ba7p0d6u59v1r01qp1k9ba7pg";
const cache = new Map();
let currentAbortController = null;

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
  const ticker = symbol.toUpperCase();
  const cacheKey = `stock_data_${ticker}_${range}`;
  
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const saved = localStorage.getItem(cacheKey);
  if (saved) {
    const parsed = JSON.parse(saved);
    if (Date.now() - parsed.time < 300000) return parsed.data;
  }

  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();

  try {
    const rMap = { "1D": "1d", "1M": "1mo", "1Y": "1y", "5Y": "5y" };
    const yRange = rMap[range] || "1mo";
    const interval = range === "1D" ? "15m" : "1d";
    
    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${yRange}&interval=${interval}`;
    
    const response = await fetch(`https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`, { 
      signal: currentAbortController.signal 
    });
    
    const data = await response.json();

    if (!data.chart || !data.chart.result) return [];
    
    const result = data.chart.result[0];
    const formatted = result.timestamp.map((time, i) => {
      const q = result.indicators.quote[0];
      if (!q.open || q.open[i] === null) return null;
      return { x: time * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] };
    }).filter(item => item !== null);

    cache.set(cacheKey, formatted);
    localStorage.setItem(cacheKey, JSON.stringify({time: Date.now(), data: formatted}));
    return formatted;
  } catch (e) {
    return [];
  }
}