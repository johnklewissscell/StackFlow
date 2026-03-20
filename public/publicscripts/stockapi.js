const FINNHUB_KEY = "d6uak2hr01qp1k9bru30d6uak2hr01qp1k9bru3g";
const cache = new Map();
let currentAbortController = null;

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/quote?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.c ? parseFloat(data.c) : null;
  } catch (e) {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(`https://finnhub.io/api/v1/stock/profile2?symbol=${symbol.toUpperCase()}&token=${FINNHUB_KEY}`);
    if (!res.ok) return symbol;
    const data = await res.json();
    return data.name || symbol;
  } catch (e) {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  let from;

  if (range === "1D") from = now - 86400;
  else if (range === "1M") from = now - 86400 * 30;
  else if (range === "1Y") from = now - 86400 * 365;
  else if (range === "5Y") from = now - 86400 * 365 * 5;
  else from = now - 86400 * 30;

  if (from >= now) from = now - 86400;

  const resolution = range === "1D" ? "15" : "D";
  const cacheKey = `${ticker}_${range}`;

  if (cache.has(cacheKey)) return cache.get(cacheKey);

  try {
    const res = await fetch(
      `https://finnhub.io/api/v1/stock/candle?symbol=${ticker}&resolution=${resolution}&from=${from}&to=${now}&token=${FINNHUB_KEY}`
    );
    if (!res.ok) return [];
    const data = await res.json();
    if (data.s !== "ok") return [];
    const formatted = data.t.map((time, i) => ({
      x: time * 1000,
      o: data.o[i],
      h: data.h[i],
      l: data.l[i],
      c: data.c[i]
    }));
    cache.set(cacheKey, formatted);
    return formatted;
  } catch (e) {
    return [];
  }
}