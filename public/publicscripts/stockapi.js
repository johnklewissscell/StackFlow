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
    const text = json.contents; 
    
    const lines = text.trim().split("\n").slice(1);
    const lastLine = lines[lines.length - 1];
    const parts = lastLine.split(",");
    const close = parseFloat(parts[4]);
    
    return isNaN(close) ? null : close;
  } catch (err) {
    console.error("Price fetch error:", err);
    return null;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const now = Math.floor(Date.now() / 1000);
  let from;
  
  if (range === "1D") from = now - 86400;
  else if (range === "1M") from = now - 86400 * 30;
  else if (range === "1Y") from = now - 86400 * 365;
  else from = now - 86400 * 30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${from}&period2=${now}&interval=1d&events=history`;

  try {
    const res = await fetch(proxy(url));
    if (!res.ok) return [];
    
    const json = await res.json();
    const text = json.contents;
    
    const lines = text.trim().split("\n").slice(1);
    return lines.map(line => {
      const [date, open, high, low, close] = line.split(",");
      if (!date || close === "null") return null;
      return {
        x: new Date(date).getTime(),
        o: +open,
        h: +high,
        l: +low,
        c: +close
      };
    }).filter(Boolean);
  } catch (err) {
    console.error("Historical fetch error:", err);
    return [];
  }
}

export async function getCompanyName(symbol) {
  return symbol;
}