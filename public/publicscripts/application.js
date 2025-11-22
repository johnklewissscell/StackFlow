// ----------------------
// application.js (CSP-safe, patched)
// ----------------------

console.log("application.js loaded");

// ----------------------
// Global variables
// ----------------------
let balance = 10000;
const balanceEl = document.getElementById("balance");
if (balanceEl) balanceEl.innerText = balance.toFixed(2);

let chart;
let currentSymbol = null;
let preferCandlestick = false;

// ----------------------
// Update Chart Function
// ----------------------
async function updateChart(symbol, range) {
  try {
    const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
    if (!resp.ok) {
      document.getElementById("stock-info").innerHTML += `<p>No chart data available.</p>`;
      return;
    }

    const json = await resp.json();
    if (!json?.candles?.length) {
      document.getElementById("stock-info").innerHTML += `<p>No chart data available.</p>`;
      return;
    }

    const financialData = json.candles.map(c => ({ x: new Date(c.t), o: c.o, h: c.h, l: c.l, c: c.c }));
    const container = document.getElementById("chart-container");
    if (!container) return;

    container.style.display = "block";

    let canvas = document.getElementById("stockChart");
    if (!canvas) {
      container.innerHTML = '<canvas id="stockChart"></canvas>';
      canvas = document.getElementById("stockChart");
    }

    if (!preferCandlestick) {
      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();
      const labels = financialData.map(d => d.x);
      const closePrices = financialData.map(d => d.c);

      chart = new Chart(ctx, {
        type: "line",
        data: { labels, datasets: [{ label: `${symbol} Close`, data: closePrices, borderColor: "blue", fill: false }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
      return;
    }

    // Candlestick fallback using Chart.js
    try {
      const ctx = canvas.getContext("2d");
      if (chart) chart.destroy();
      chart = new Chart(ctx, {
        type: "candlestick",
        data: { datasets: [{ label: `${symbol} Candles`, data: financialData }] },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } catch (e) {
      console.error("Candlestick render failed", e);
    } finally {
      preferCandlestick = false;
    }

  } catch (err) {
    console.error("updateChart error", err);
    document.getElementById("stock-info").innerHTML += `<p>Error loading chart.</p>`;
  }
}

// ----------------------
// Stock Fetch Button
// ----------------------
document.addEventListener("DOMContentLoaded", () => {
  const getStockBtn = document.getElementById("getStock");
  if (getStockBtn) {
    getStockBtn.addEventListener("click", async () => {
      const symbolInput = document.getElementById("symbol");
      const stockInfo = document.getElementById("stock-info");
      if (!symbolInput || !stockInfo) return;

      const symbol = symbolInput.value.trim().toUpperCase();
      if (!symbol) return;

      stockInfo.innerHTML = "Loading...";

      try {
        const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1M`);
        if (!resp.ok) {
          stockInfo.innerHTML = `No data for ${symbol}`;
          return;
        }

        const json = await resp.json();
        if (!json?.candles?.length) {
          stockInfo.innerHTML = `No data for ${symbol}`;
          return;
        }

        const price = json.candles.at(-1).c;
        if (price == null) {
          stockInfo.innerHTML = `No price data`;
          return;
        }

        currentSymbol = symbol;
        const companyName = json.companyName?.trim() || symbol;

        stockInfo.innerHTML = `
          <h2>${companyName} <small style="font-weight:normal; font-size:0.8em; color:#666">(${symbol})</small></h2>
          <p>
            Current Price: $<span id="current-price">${price.toFixed(2)}</span>
            <small id="last-updated" style="color:#666;font-size:0.85em">(updated just now)</small>
          </p>
          <button id="buyBtn">Buy</button>
          <button id="sellBtn">Sell</button>
        `;

        document.getElementById("buyBtn").addEventListener("click", () => trade("buy", price));
        document.getElementById("sellBtn").addEventListener("click", () => trade("sell", price));

        updateChart(symbol, "1M");

      } catch (err) {
        console.error("price fetch error", err);
        stockInfo.innerHTML = `<p style="color:red">Error: ${err.message}</p>`;
      }
    });
  }

  // Candlestick toggle
  const toggleCandleBtn = document.getElementById("toggleCandle");
  if (toggleCandleBtn) {
    toggleCandleBtn.addEventListener("click", () => {
      preferCandlestick = true;
      if (currentSymbol) updateChart(currentSymbol, "1M");
    });
  }
});

// ----------------------
// Rest of your application.js
// Keep your chat, portfolio, polling, etc., exactly as in your original full file
// ----------------------
