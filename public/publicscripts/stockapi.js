const API_KEY = "SE35V6BRI6YHQ6TJ";
const BASE_URL = "https://www.alphavantage.co/query";

async function fetchJSON(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Network error");
  return await res.json();
}

export async function getStockPrice(symbol) {
  try {
    const res = await fetch(`/api/alpha?symbol=${symbol}`);
    if (!res.ok) return null;
    const data = await res.json();
    return data.price || null;
  } catch {
    return null;
  }
}

export async function getCompanyName(symbol) {
  try {
    const res = await fetch(`/api/alpha?symbol=${symbol}`);
    if (!res.ok) return symbol;
    const data = await res.json();
    return data.companyName ? `${data.companyName} (${symbol})` : symbol;
  } catch {
    return symbol;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  const functionType = "TIME_SERIES_DAILY_ADJUSTED";
  const outputSize = range === "5Y" ? "full" : "compact";
  const url = `${BASE_URL}?function=${functionType}&symbol=${symbol}&outputsize=${outputSize}&apikey=${API_KEY}`;
  const data = await fetchJSON(url);
  const timeSeries = data["Time Series (Daily)"];
  if (!timeSeries) return [];

  let dates = Object.keys(timeSeries).sort((a, b) => new Date(a) - new Date(b));
  const now = new Date();
  let cutoff;
  switch (range) {
    case "1D": cutoff = new Date(now.getTime() - 24 * 3600 * 1000); break;
    case "1M": cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate()); break;
    case "1Y": cutoff = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate()); break;
    case "5Y": cutoff = new Date(now.getFullYear() - 5, now.getMonth(), now.getDate()); break;
    default: cutoff = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
  }
  dates = dates.filter(d => new Date(d) >= cutoff);

  return dates.map(d => ({
    t: d,
    o: parseFloat(timeSeries[d]["1. open"]),
    h: parseFloat(timeSeries[d]["2. high"]),
    l: parseFloat(timeSeries[d]["3. low"]),
    c: parseFloat(timeSeries[d]["4. close"])
  }));
}