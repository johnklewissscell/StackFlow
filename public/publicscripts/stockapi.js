const cache = new Map();

function parseYahooDate(dateStr) {
  return new Date(dateStr).getTime();
}

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v7/finance/quote?symbols=${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    const quote = data.quoteResponse.result[0];
    return quote ? quote.regularMarketPrice : null;
  } catch (e) {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(`https://query1.finance.yahoo.com/v10/finance/quoteSummary/${symbol}?modules=price`);
    if (!res.ok) return symbol;
    const data = await res.json();
    return data.quoteSummary?.result?.[0]?.price?.longName || symbol;
  } catch (e) {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const ticker = symbol.toUpperCase();
  const cacheKey = `${ticker}_${range}`;
  if (cache.has(cacheKey)) return cache.get(cacheKey);

  const today = Math.floor(Date.now() / 1000);
  let period1;
  if (range === "1D") period1 = today - 86400;
  else if (range === "1M") period1 = today - 86400 * 30;
  else if (range === "1Y") period1 = today - 86400 * 365;
  else if (range === "5Y") period1 = today - 86400 * 365 * 5;
  else period1 = today - 86400 * 30;

  const url = `https://query1.finance.yahoo.com/v7/finance/download/${ticker}?period1=${period1}&period2=${today}&interval=1d&events=history&includeAdjustedClose=true`;

  try {
    const res = await fetch(url);
    if (!res.ok) return [];
    const csv = await res.text();
    const lines = csv.split("\n").slice(1); // skip header
    const data = lines
      .map(line => {
        const [date, open, high, low, close] = line.split(",");
        if (!date || close === "null") return null;
        return {
          x: parseYahooDate(date),
          o: parseFloat(open),
          h: parseFloat(high),
          l: parseFloat(low),
          c: parseFloat(close)
        };
      })
      .filter(Boolean);

    cache.set(cacheKey, data);
    return data;
  } catch (e) {
    return [];
  }
}