export async function onRequest(context) {
  const API_KEY = "GQOVP7IEEHP0PGOH";
  const url = new URL(context.request.url);
  const symbol = url.searchParams.get("symbol")?.toUpperCase() || "AAPL";

  try {
    const resp = await fetch(
      `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`
    );
    const data = await resp.json();

    // Check for Alpha Vantage error note
    if (data.Note || !data["Global Quote"]) {
      throw new Error(data.Note || "No data returned from Alpha Vantage");
    }

    const quote = data["Global Quote"];
    const price = parseFloat(quote?.["05. price"] ?? 0);

    return new Response(JSON.stringify({ price, name: symbol }), {
      headers: { "Content-Type": "application/json" }
    });

  } catch (err) {
    return new Response(
      JSON.stringify({ error: err.message, price: null, name: symbol }),
      { headers: { "Content-Type": "application/json" }, status: 500 }
    );
  }
}
