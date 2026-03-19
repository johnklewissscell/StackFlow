import { getStockPrice, getCompanyName, getHistoricalData } from "./stockapi.js";

document.addEventListener("DOMContentLoaded", () => {
  let chart = null;
  let currentSymbol = null;
  let preferCandlestick = false;

  async function updateChart(symbol, range) {
    const container = document.getElementById("chart-container");
    container.style.display = "block";
    const canvas = document.getElementById("stockChart");
    const ctx = canvas.getContext("2d");

    const candles = await getHistoricalData(symbol, range);
    if (!candles.length) return;

    if (chart) chart.destroy();

    if (preferCandlestick) {
      chart = new Chart(ctx, {
        type: "candlestick",
        data: { datasets: [{ label: symbol, data: candles }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } else {
      chart = new Chart(ctx, {
        type: "line",
        data: {
          labels: candles.map(c => c.t),
          datasets: [{ label: symbol, data: candles.map(c => c.c), borderColor: "blue", fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    }

    preferCandlestick = false;
  }

  document.getElementById("get-price").addEventListener("click", async () => {
    const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
    if (!symbol) return alert("Enter ticker symbol.");

    currentSymbol = symbol;
    const price = await getStockPrice(symbol);
    if (!price) return alert("No data for " + symbol);

    const companyName = await getCompanyName(symbol);
    document.getElementById("stock-info").innerHTML =
      `<strong style="font-size:20px;">${companyName} (${symbol})</strong><br>Price: $${price.toFixed(2)}`;

    updateChart(symbol, "1M");
  });

  document.getElementById("toggleCandle").addEventListener("click", () => {
    preferCandlestick = true;
    if (currentSymbol) updateChart(currentSymbol, "1M");
  });

  document.querySelectorAll("#time-range button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!currentSymbol) return alert("Pick a stock first.");
      const range = btn.dataset.range;
      updateChart(currentSymbol, range);
    });
  });
});