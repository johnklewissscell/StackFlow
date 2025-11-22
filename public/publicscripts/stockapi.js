// stockapi.js — ES module exports used by index.js
// Exports:
//   getStockPrice(symbol) -> number | null
//   getHistoricalData(symbol, range) -> { timestamps: number[], prices: number[] } | null

// Proxy URL for CORS
const proxyUrl = 'https://cors-anywhere.herokuapp.com/'; // CORS proxy to bypass restrictions

async function fetchYahooChart(symbol, rangeParam, intervalParam) {
  const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${rangeParam}&interval=${intervalParam}`;
  const resp = await fetch(proxyUrl + url); // Add proxyUrl to bypass CORS
  if (!resp.ok) throw new Error(`Network error: ${resp.status}`);
  const json = await resp.json();
  if (!json.chart || !json.chart.result) return null;
  return json.chart.result[0];
}

export async function getHistoricalData(symbol, range = '1M') {
  try {
    const map = {
      '1D': { r: '1d', interval: '5m' },
      '1M': { r: '1mo', interval: '1d' },
      '1Y': { r: '1y', interval: '1d' },
      '5Y': { r: '5y', interval: '1d' }
    };
    const cfg = map[range] || map['1M'];
    const result = await fetchYahooChart(symbol, cfg.r, cfg.interval);
    if (!result) return null;

    const timestamps = result.timestamp || [];
    const prices = (result.indicators && result.indicators.quote && result.indicators.quote[0].close) || [];
    return { timestamps, prices };
  } catch (err) {
    console.error('getHistoricalData error:', err);
    return null;
  }
}

export async function getStockPrice(symbol) {
  try {
    // Use 1D range to get the latest intraday price if available
    const data = await getHistoricalData(symbol, '1D');
    if (!data || !data.prices || data.prices.length === 0) {
      // Fall back to 1M range if no 1D data is available
      const fallback = await getHistoricalData(symbol, '1M');
      if (!fallback || !fallback.prices || fallback.prices.length === 0) return null;
      return fallback.prices[fallback.prices.length - 1];
    }
    return data.prices[data.prices.length - 1];
  } catch (err) {
    console.error('getStockPrice error:', err);
    return null;
  }
}
