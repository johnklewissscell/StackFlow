const FINNHUB_KEY = "d6u59v1r01qp1k9ba7p0d6u59v1r01qp1k9ba7pg";
const cache = new Map();
let currentAbortController = null;

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`,
    );
    const data = await res.json();
    return data.c ? parseFloat(data.c) : null;
  } catch (e) {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`,
    );
    const data = await res.json();
    return data.name || symbol;
  } catch (e) {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `${ticker}-${range}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  if (currentAbortController) currentAbortController.abort();
  currentAbortController = new AbortController();

  try {
    const rMap = { "1D": "1d", "1M": "1mo", "1Y": "1y", "5Y": "5y" };
    const yRange = rMap[range] || "1mo";
    const interval = range === "1D" ? "15m" : "1d";

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${ticker}?range=${yRange}&interval=${interval}`;
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(yahooUrl)}`;

    const response = await fetch(proxyUrl, {
      signal: currentAbortController.signal,
    });
    const json = await response.json();
    const data = JSON.parse(json.contents);

    if (!data.chart || !data.chart.result) return [];

    const result = data.chart.result[0];
    const timestamps = result.timestamp;
    const quotes = result.indicators.quote[0];

    const formatted = timestamps
      .map((time, i) => {
        if (!quotes.open || quotes.open[i] === null) return null;
        return {
          x: time * 1000,
          o: quotes.open[i],
          h: quotes.high[i],
          l: quotes.low[i],
          c: quotes.close[i],
        };
      })
      .filter((item) => item !== null);

    cache.set(cacheKey, formatted);
    return formatted;
  } catch (e) {
    if (e.name === "AbortError") return null;
    return [];
  }
}
