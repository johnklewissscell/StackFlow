const cache = new Map();

export async function getStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    if (!res.ok) return null;
    const data = await res.json();
    const quote = data.quoteResponse?.result?.[0];
    return quote ? quote.regularMarketPrice : null;
  } catch {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`;
    const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;
    const res = await fetch(proxy);
    if (!res.ok) return symbol;
    const data = await res.json();
    return data.quoteSummary?.result?.[0]?.price?.longName || symbol;
  } catch {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `${ticker}_${range}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const today = Math.floor(Date.now() / 1000);
  let from;
  if (range === "1D") from = today - 86400;
  else if (range === "1M") from = today - 86400 * 30;
  else if (range === "1Y") from = today - 86400 * 365;
  else if (range === "5Y") from = today - 86400 * 365 * 5;
  else from = today - 86400 * 30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${from}&period2=${today}&interval=1d&events=history`;
  const proxy = `https://corsproxy.io/?${encodeURIComponent(url)}`;

  try {
    const res = await fetch(proxy);
    if (!res.ok) return [];
    const csv = await res.text();
    const lines = csv.split("\n").slice(1);
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