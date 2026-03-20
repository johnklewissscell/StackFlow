const BASE = "https://dark-fog-ad48.johnklewisss.workers.dev";
const cache = new Map();

function proxy(url) {
  return `${BASE}?url=${encodeURIComponent(url)}`;
}

export async function getStockPrice(symbol) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=0&period2=${now}&interval=1d&events=history`;
    const res = await fetch(proxy(url));
    if (!res.ok) return null;
    const text = await res.text();
    const lines = text.split("\n").slice(1);
    for (let i = lines.length - 1; i >= 0; i--) {
      const parts = lines[i].split(",");
      const close = parseFloat(parts[4]);
      if (!isNaN(close)) return close;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getCompanyName(symbol) {
  return symbol;
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `${ticker}_${range}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const now = Math.floor(Date.now() / 1000);
  let from;
  if (range === "1D") from = now - 86400;
  else if (range === "1M") from = now - 86400 * 30;
  else if (range === "1Y") from = now - 86400 * 365;
  else if (range === "5Y") from = now - 86400 * 365 * 5;
  else from = now - 86400 * 30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${from}&period2=${now}&interval=1d&events=history`;

  try {
    const res = await fetch(proxy(url));
    if (!res.ok) return [];
    const text = await res.text();
    const lines = text.split("\n").slice(1);
    const data = lines
      .map(line => {
        const [date, open, high, low, close] = line.split(",");
        if (!date || close === "null") return null;
        return {
          x: new Date(date).getTime(),
          o: +open,
          h: +high,
          l: +low,
          c: +close
        };
      })
      .filter(Boolean);
    cache.set(cacheKey, data);
    return data;
  } catch {
    return [];
  }
}