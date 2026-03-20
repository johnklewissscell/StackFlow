const cache = new Map();

function buildProxyUrl(url) {
  return `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
}

export async function getStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=0&period2=${Math.floor(Date.now()/1000)}&interval=1d&events=history&includeAdjustedClose=true`;
    const proxy = buildProxyUrl(url);
    const res = await fetch(proxy);
    if (!res.ok) return null;
    const data = await res.json();
    const lines = data.contents.split("\n").slice(1);
    for (let i = lines.length-1; i >= 0; i--) {
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
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=0&period2=${Math.floor(Date.now()/1000)}&interval=1d&events=history`;
    const proxy = buildProxyUrl(url);
    const res = await fetch(proxy);
    if (!res.ok) return symbol;
    const data = await res.json();
    const firstLine = data.contents.split("\n")[1];
    if (!firstLine) return symbol;
    return symbol;
  } catch {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range="1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `${ticker}_${range}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const today = Math.floor(Date.now() / 1000);
  let from;
  if (range === "1D") from = today - 86400;
  else if (range === "1M") from = today - 86400*30;
  else if (range === "1Y") from = today - 86400*365;
  else if (range === "5Y") from = today - 86400*365*5;
  else from = today - 86400*30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${from}&period2=${today}&interval=1d&events=history`;
  const proxy = buildProxyUrl(url);

  try {
    const res = await fetch(proxy);
    if (!res.ok) return [];
    const data = await res.json();
    const lines = data.contents.split("\n").slice(1);
    const parsed = lines
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
    cache.set(cacheKey, parsed);
    return parsed;
  } catch {
    return [];
  }
}