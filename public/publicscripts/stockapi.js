const BASE = "https://api.allorigins.win/get?url=";

function proxy(url) {
  return `${BASE}${encodeURIComponent(url)}`;
}

export async function getStockPrice(symbol) {
  try {
    const now = Math.floor(Date.now() / 1000);
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=0&period2=${now}&interval=1d&events=history`;
    const res = await fetch(proxy(url));
    if (!res.ok) return null;
    const json = await res.json();
    const lines = json.contents.trim().split("\n").slice(1);
    const lastLine = lines[lines.length - 1].split(",");
    return parseFloat(lastLine[4]) || null;
  } catch { return null; }
}

export async function getCompanyName(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const res = await fetch(proxy(url));
    if (!res.ok) return symbol;
    const json = await res.json();
    const data = JSON.parse(json.contents);
    const result = data.quoteResponse.result[0];
    return result.longName || result.shortName || symbol;
  } catch {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  let from;
  if (range === "1D") from = now - 86400 * 4;
  else if (range === "1M") from = now - 86400 * 30;
  else if (range === "1Y") from = now - 86400 * 365;
  else from = now - 86400 * 30;

  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${from}&period2=${now}&interval=1d&events=history`;
    const res = await fetch(proxy(url));
    if (!res.ok) return [];
    const json = await res.json();
    const lines = json.contents.trim().split("\n").slice(1);
    return lines.map(line => {
      const [date, open, high, low, close] = line.split(",");
      if (!date || close === "null") return null;
      return { x: new Date(date).getTime(), o: +open, h: +high, l: +low, c: +close };
    }).filter(Boolean);
  } catch { return []; }
}