// stock.js (Cloudflare Worker / Functions)
export async function onRequest(context) {
  const ALPHA_VANTAGE_KEY = "GQOVP7IEEHP0PGOH"; // Replace with your key or env var

  try {
    const url = new URL(context.request.url);
    const symbol = (url.searchParams.get("symbol") || "AAPL").toUpperCase();
    const range = url.searchParams.get("range") || "1M";

    // Determine which API function and slice to use
    let functionType = "TIME_SERIES_DAILY_ADJUSTED";
    let outputsize = "compact"; // compact = last 100 points, full = all history
    if (range === "5Y") outputsize = "full";

    const alphaUrl = `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol}&outputsize=${outputsize}&apikey=${ALPHA_VANTAGE_KEY}`;

    const response = await fetch(alphaUrl);
    if (!response.ok) throw new Error(`Alpha Vantage rejected request: ${response.status}`);

    const data = await response.json();

    const tsKey = "Time Series (Daily)";
    const series = data[tsKey];
    if (!series) {
      return new Response(JSON.stringify({ candles: [], companyName: symbol }), {
        headers: { "Content-Type": "application/json" },
      });
    }

    // Convert to array of { t, o, h, l, c, v }
    let candles = Object.entries(series).map(([date, vals]) => ({
      t: new Date(date).getTime(),
      o: parseFloat(vals["1. open"]),
      h: parseFloat(vals["2. high"]),
      l: parseFloat(vals["3. low"]),
      c: parseFloat(vals["4. close"]),
      v: parseFloat(vals["6. volume"]),
    }));

    // Sort oldest → newest
    candles.sort((a, b) => a.t - b.t);

    // Slice based on range
    const now = new Date();
    let startTime;
    switch (range) {
      case "1D":
        startTime = now.getTime() - 1 * 24 * 60 * 60 * 1000;
        break;
      case "1M":
        startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
        break;
      case "1Y":
        startTime = now.getTime() - 365 * 24 * 60 * 60 * 1000;
        break;
      case "5Y":
        startTime = now.getTime() - 5 * 365 * 24 * 60 * 60 * 1000;
        break;
      default:
        startTime = now.getTime() - 30 * 24 * 60 * 60 * 1000;
    }

    candles = candles.filter(c => c.t >= startTime);

    return new Response(JSON.stringify({ candles, companyName: symbol }), {
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error("stock.js error:", err);
    return new Response(JSON.stringify({ error: err.message, candles: [], companyName: "Unknown" }), {
      headers: { "Content-Type": "application/json" },
      status: 500,
    });
  }
}
