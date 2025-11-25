// stock.js
export async function onRequest(context) {
  try {
    const url = new URL(context.request.url);
    const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";

    const API_KEY = "GQOVP7IEEHP0PGOH"; // <--- put your key here or use env

    // Fetch latest stock price using Global Quote
    const quoteResp = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${encodeURIComponent(symbol)}&apikey=${API_KEY}`
    );

    if (!quoteResp.ok) throw new Error(`Alpha Vantage rejected request: ${quoteResp.status}`);
    const quoteJson = await quoteResp.json();

    const globalQuote = quoteJson["Global Quote"];
    if (!globalQuote || !globalQuote["05. price"]) {
      return new Response(
        JSON.stringify({ candles: [], companyName: symbol }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    const price = parseFloat(globalQuote["05. price"]);
    const timestamp = Date.now();

    // Return a single "candle" so frontend chart always works
    const candles = [
      { t: timestamp, o: price, h: price, l: price, c: price, v: parseInt(globalQuote["06. volume"] || "0") }
    ];

    return new Response(JSON.stringify({ candles, companyName: symbol }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    console.error("stock.js error:", err);
    return new Response(
      JSON.stringify({ error: err.message, candles: [], companyName: "Unknown" }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
}
