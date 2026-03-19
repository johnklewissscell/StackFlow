const FINNHUB_KEY = "d6u59v1r01qp1k9ba7p0d6u59v1r01qp1k9ba7pg";
const cache = new Map();
let currentAbortController = null;

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.c ? parseFloat(data.c) : null;
  } catch (e) {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    const data = await res.json();
    return data.name || symbol;
  } catch (e) {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `stock_data_${ticker}_${range}`;
  const saved = localStorage.getItem(cacheKey);

  if (saved) {
    const parsed = JSON.parse(saved);
    if (Date.now() - parsed.time < 300000) return parsed.data;
  }

  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();

  const rMap = { "1D": "1d", "1M": "1mo", "1Y": "1y", "5Y": "5y" };
  const yRange = rMap[range] || "1mo";
  const interval = range === "1D" ? "15m" : "1d";
  const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${yRange}&interval=${interval}`;

  const fetchFromProxy = async (proxyUrl, isWrapped) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);
    try {
      const response = await fetch(proxyUrl, { signal: controller.signal });
      if (!response.ok) throw new Error(response.status);
      const rawData = await response.json();
      const data = isWrapped ? JSON.parse(rawData.contents) : rawData;
      if (!data.chart || !data.chart.result) throw new Error("Data");
      const result = data.chart.result[0];
      return result.timestamp.map((time, i) => {
        const q = result.indicators.quote[0];
        if (!q.close || q.close[i] === null) return null;
        return { x: time * 1000, o: q.open[i], h: q.high[i], l: q.low[i], c: q.close[i] };
      }).filter(item => item !== null);
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const proxyConfigs = [
    { url: `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`, wrapped: true },
    { url: `https://api.codetabs.com/v1/proxy?quest=${encodeURIComponent(yahooUrl)}`, wrapped: false },
    { url: `https://corsproxy.io/?${encodeURIComponent(yahooUrl)}`, wrapped: false }
  ];

  try {
    const formatted = await Promise.any(proxyConfigs.map(p => fetchFromProxy(p.url, p.wrapped)));
    if (formatted && formatted.length > 0) {
      localStorage.setItem(cacheKey, JSON.stringify({ time: Date.now(), data: formatted }));
      return formatted;
    }
  } catch (e) {
    return [];
  }
  return [];
}