const BASE = "https://corsproxy.io/?";

function proxy(url) {
  return `${BASE}${encodeURIComponent(url)}`;
}

export async function getStockPrice(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const res = await fetch(proxy(url));
    const data = await res.json();
    return data.quoteResponse.result[0].regularMarketPrice;
  } catch (err) {
    console.error("Price error:", err);
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const url = `https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`;
    const res = await fetch(proxy(url));
    const data = await res.json();
    const res0 = data.quoteResponse.result[0];
    return res0.longName || res0.shortName || symbol;
  } catch {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const now = Math.floor(Date.now() / 1000);
  let from;
  if (range === "1D") from = now - 86400 * 4; 
  else if (range === "1M") from = now - 86400 * 30;
  else if (range === "1Y") from = now - 86400 * 365;
  else from = now - 86400 * 30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${symbol}?period1=${from}&period2=${now}&interval=1d&events=history`;

  try {
    const res = await fetch(proxy(url));
    const text = await res.text();
    const lines = text.trim().split("\n").slice(1);
    return lines.map(line => {
      const [date, open, high, low, close] = line.split(",");
      if (!date || close === "null" || isNaN(parseFloat(open))) return null;
      return {
        x: new Date(date).getTime(),
        o: parseFloat(open),
        h: parseFloat(high),
        l: parseFloat(low),
        c: parseFloat(close)
      };
    }).filter(Boolean);
  } catch (err) {
    console.error("History error:", err);
    return [];
  }
}