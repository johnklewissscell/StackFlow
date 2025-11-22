export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol") || "AAPL";
    const range = url.searchParams.get("range") || "1M";

    const ranges = {
      "1D": { interval: "1m", range: "1d" },
      "1M": { interval: "1d", range: "1mo" },
      "1Y": { interval: "1wk", range: "1y" },
      "5Y": { interval: "1mo", range: "5y" },
    };

    const r = ranges[range] || ranges["1M"];

    const yahooUrl =
      `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}` +
      `?interval=${r.interval}&range=${r.range}`;

    const response = await fetch(yahooUrl, {
      headers: {
        "User-Agent": "Mozilla/5.0 (StackFlowBot)"
      }
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Yahoo rejected request", status: response.status }),
        { status: 500 }
      );
    }

    const data = await response.json();
    return new Response(JSON.stringify(data), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), { status: 500 });
  }
}
