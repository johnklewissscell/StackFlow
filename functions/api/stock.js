export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";
    const range = url.searchParams.get("range") || "1M";

    const ranges = {
      "1D": { interval: "5m", range: "1d" }, // use 5m instead of 1m
      "1M": { interval: "1d", range: "1mo" },
      "1Y": { interval: "1wk", range: "1y" },
      "5Y": { interval: "1mo", range: "5y" },
    };
    const r = ranges[range] || ranges["1M"];

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${r.interval}&range=${r.range}`;

    const response = await fetch(yahooUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`Yahoo rejected request: ${response.status}`);

    const data = await response.json();
    const result = data.chart?.result?.[0];

    if (!result) return new Response(JSON.stringify({ candles: [], companyName: symbol }), { headers: { "Content-Type": "application/json" } });

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    const candles = timestamps.map((t, i) => ({
      t: t * 1000,
      o: quotes?.open[i] ?? null,
      h: quotes?.high[i] ?? null,
      l: quotes?.low[i] ?? null,
      c: quotes?.close[i] ?? null,
      v: quotes?.volume[i] ?? null
    }));

    return new Response(JSON.stringify({ candles, companyName: symbol }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("stock.js error:", err);
    return new Response(JSON.stringify({ error: err.message, candles: [], companyName: "Unknown" }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
}
