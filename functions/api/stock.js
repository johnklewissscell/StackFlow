// functions/api/stock.js
export async function onRequest(context) {
  const API_KEY = "GQOVP7IEEHP0PGOH";
  const url = new URL(context.request.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";

  try {
    const resp = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );

    if (!resp.ok) throw new Error(`Alpha Vantage returned ${resp.status}`);
    const data = await resp.json();

    // Only return the needed info for the client
    const quote = data["Global Quote"];
    const price = parseFloat(quote?.["05. price"] ?? 0);

    return new Response(
      JSON.stringify({ price, name: symbol }),
      { headers: { "Content-Type": "application/json" } }
    );

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, price: null, name: symbol }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
}
