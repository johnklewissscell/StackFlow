export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";
    const range = url.searchParams.get("range") || "1M";

    const ranges = {
      "1D": { interval: "5m", range: "1d" },
      "1M": { interval: "1d", range: "1mo" },
      "1Y": { interval: "1wk", range: "1y" },
      "5Y": { interval: "1mo", range: "5y" },
    };
    const r = ranges[range] || ranges["1M"];

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${r.interval}&range=${r.range}`;
    const response = await fetch(yahooUrl, { headers: { "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) throw new Error(`Yahoo rejected request: ${response.status}`);

    const data = await response.json();
    console.log("Yahoo raw data:", JSON.stringify(data, null, 2)); // debug log
    const result = data.chart?.result?.[0];

    if (!result) return new Response(JSON.stringify({ candles: [], companyName: symbol, error: "No result" }), { headers: { "Content-Type": "application/json" } });

    const timestamps = result.timestamp || [];
    const quotes = result.indicators?.quote?.[0];

    const candles = timestamps
      .map((t, i) => {
        const o = quotes?.open[i];
        const h = quotes?.high[i];
        const l = quotes?.low[i];
        const c = quotes?.close[i];
        const v = quotes?.volume[i];
        if ([o,h,l,c].some(v => v == null)) return null;
        return { t: t*1000, o, h, l, c, v };
      })
      .filter(c => c != null);

    if (candles.length === 0) {
      return new Response(JSON.stringify({ candles: [], companyName: symbol, error: "No OHLC data returned" }), { headers: { "Content-Type": "application/json" } });
    }

    return new Response(JSON.stringify({ candles, companyName: symbol }), { headers: { "Content-Type": "application/json" } });
  } catch (err) {
    console.error("stock.js error:", err);
    return new Response(JSON.stringify({ error: err.message, candles: [], companyName: "Unknown" }), { headers: { "Content-Type": "application/json" }, status: 500 });
  }
}
