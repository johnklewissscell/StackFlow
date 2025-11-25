// /api/stock.js
const API_KEY = "GQOVP7IEEHP0PGOH";

export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";

    // Use Alpha Vantage TIME_SERIES_DAILY
    const alphaUrl = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY_ADJUSTED&symbol=${symbol}&apikey=${API_KEY}`;

    const resp = await fetch(alphaUrl);
    if (!resp.ok) throw new Error(`Alpha Vantage error: ${resp.status}`);

    const data = await resp.json();
    const timeSeries = data["Time Series (Daily)"];
    if (!timeSeries) throw new Error("No data returned from Alpha Vantage");

    // Convert to chart-compatible candles
    const candles = Object.keys(timeSeries)
      .sort()
      .map(dateStr => {
        const day = timeSeries[dateStr];
        return {
          t: new Date(dateStr).getTime(),
          o: parseFloat(day["1. open"]),
          h: parseFloat(day["2. high"]),
          l: parseFloat(day["3. low"]),
          c: parseFloat(day["4. close"]),
          v: parseFloat(day["6. volume"])
        };
      });

    return new Response(JSON.stringify({ candles, companyName: symbol }), {
      headers: { "Content-Type": "application/json" }
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message, candles: [], companyName: symbol }), {
      headers: { "Content-Type": "application/json" },
      status: 500
    });
  }
}
