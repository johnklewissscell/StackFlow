// functions/api/stock.js
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";
    const range = url.searchParams.get("range") || "1M";

    const ranges = {
      "1D": { interval: "1m", range: "1d" },
      "1M": { interval: "1d", range: "1mo" },
      "1Y": { interval: "1wk", range: "1y" },
      "5Y": { interval: "1mo", range: "5y" },
    };
    const r = ranges[range] || ranges["1M"];

    const yahooUrl = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?interval=${r.interval}&range=${r.range}`;

    const response = await fetch(yahooUrl, {
      headers: { "User-Agent": "Mozilla/5.0 (CF Pages Bot)" }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: `Yahoo rejected request`, status: response.status }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const data = await response.json();

    const result = data.chart?.result?.[0];
    if (!result) {
      return new Response(
        JSON.stringify({ error: `No chart data for ${symbol}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const timestamps = result.timestamp;
    const quotes = result.indicators?.quote?.[0];

    if (!timestamps || !quotes) {
      return new Response(
        JSON.stringify({ error: `Incomplete chart data for ${symbol}` }),
        { status: 404, headers: { "Content-Type": "application/json" } }
      );
    }

    const candles = timestamps.map((t, i) => ({
      t: t * 1000, // convert to ms
      o: quotes.open[i],
      h: quotes.high[i],
      l: quotes.low[i],
      c: quotes.close[i],
      v: quotes.volume[i]
    }));

    return new Response(
      JSON.stringify({
        candles,
        companyName: symbol
      }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" }
    });
  }
}
