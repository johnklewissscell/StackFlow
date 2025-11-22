export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol") || "AAPL";
    const range = url.searchParams.get("range") || "1M";

    // Map range to Yahoo intervals
    const ranges = {
      "1D": { interval: "1m", range: "1d" },
      "1M": { interval: "1d", range: "1mo" },
      "1Y": { interval: "1wk", range: "1y" },
      "5Y": { interval: "1mo", range: "5y" }
    };

    const r = ranges[range] || ranges["1M"];

    const yahooUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
      `?interval=${r.interval}&range=${r.range}`;

    const response = await fetch(yahooUrl);
    if (!response.ok) {
      return new Response(JSON.stringify({ error: "Yahoo request failed" }), {
        status: 500
      });
    }

    const data = await response.json();

    return new Response(JSON.stringify(data), {
      status: 200,
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500
    });
  }
}
