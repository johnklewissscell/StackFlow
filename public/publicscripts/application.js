// -----------------------------
// application.js
// -----------------------------
document.addEventListener("DOMContentLoaded", () => {

  console.log("application.js loaded");

  let chart = null;
  let currentSymbol = null;
  let preferCandlestick = false;

  // -----------------------------
  // Utility
  // -----------------------------
  function parseCurrency(val) {
    return parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
  }

  // -----------------------------
  // Fetch stock price using Cloudflare function
  // -----------------------------
  async function fetchStockPrice(symbol, range = "1M") {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${range}`);
      if (!resp.ok) return null;

      const json = await resp.json();
      const quote = json.chart?.result?.[0];
      if (!quote) return null;

      const lastClose = quote.indicators?.quote?.[0]?.close?.slice(-1)[0];
      if (!lastClose) return null;

      return { price: lastClose, name: symbol };
    } catch (err) {
      console.error("fetchStockPrice error", err);
      return null;
    }
  }

  // -----------------------------
  // Update chart
  // -----------------------------
  async function updateChart(symbol, range) {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${range}`);
      if (!resp.ok) return;
      const json = await resp.json();
      const quote = json.chart?.result?.[0];
      if (!quote || !quote.timestamp?.length) return;

      const timestamps = quote.timestamp.map(t => new Date(t * 1000));
      const closes = quote.indicators.quote[0].close;

      const data = timestamps.map((t, i) => ({
        x: t,
        o: quote.indicators.quote[0].open[i],
        h: quote.indicators.quote[0].high[i],
        l: quote.indicators.quote[0].low[i],
        c: closes[i]
      }));

      const container = document.getElementById("chart-container");
      if (container) container.style.display = "block";

      let canvas = document.getElementById("stockChart");
      if (!canvas) {
        container.innerHTML = `<canvas id="stockChart"></canvas>`;
        canvas = document.getElementById("stockChart");
      }
      const ctx = canvas.getContext("2d");

      if (chart) chart.destroy();

      if (!preferCandlestick) {
        chart = new Chart(ctx, {
          type: "line",
          data: {
            labels: data.map(d => d.x),
            datasets: [
              { label: `${symbol} Close`, data: data.map(d => d.c), borderColor: "blue", fill: false }
            ]
          },
          options: { responsive: true, maintainAspectRatio: false }
        });
      } else {
        chart = new Chart(ctx, {
          type: "candlestick",
          data: { datasets: [{ label: `${symbol} Candles`, data }] },
          options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: "time" } } }
        });
        preferCandlestick = false;
      }
    } catch (err) {
      console.error("updateChart error", err);
    }
  }

  // -----------------------------
  // Price Lookup
  // -----------------------------
  const getPriceBtn = document.getElementById("get-price");
  if (getPriceBtn) {
    getPriceBtn.addEventListener("click", async () => {
      const input = document.getElementById("stock-symbol");
      const symbol = input.value.trim().toUpperCase();
      if (!symbol) return alert("Enter ticker symbol.");

      currentSymbol = symbol;

      const info = await fetchStockPrice(symbol);
      if (!info) return alert("No data for " + symbol);

      const stockInfo = document.getElementById("stock-info");
      stockInfo.innerHTML = `<strong style="font-size:20px;">${info.name}</strong><br>Price: $${info.price.toFixed(2)}`;

      updateChart(symbol, "1M");
    });
  }

  // -----------------------------
  // Candlestick toggle
  // -----------------------------
  const toggleBtn = document.getElementById("toggleCandle");
  if (toggleBtn) {
    toggleBtn.addEventListener("click", () => {
      preferCandlestick = true;
      if (currentSymbol) updateChart(currentSymbol, "1M");
    });
  }

  // -----------------------------
  // Time range buttons
  // -----------------------------
  document.querySelectorAll("#time-range button").forEach(btn => {
    btn.addEventListener("click", () => {
      if (!currentSymbol) return alert("Pick a stock first.");
      const range = btn.dataset.range;
      updateChart(currentSymbol, range);
    });
  });

  // -----------------------------
  // PORTFOLIOS
  // -----------------------------
  const portfoliosDiv = document.getElementById("portfolios");
  const addPortfolioBtn = document.getElementById("add-portfolio");

  function adjustCash(portEl, delta) {
    const balEl = portEl.querySelector(".portfolio-balance");
    const current = parseCurrency(balEl.innerText);
    balEl.innerText = (current + delta).toFixed(2);
  }

  async function createStockRow(portEl, symbol, shares, price) {
    const tbody = portEl.querySelector("tbody");
    const totalCost = shares * price;

    const row = document.createElement("tr");
    row.dataset.symbol = symbol;
    row.innerHTML = `
      <td>${symbol}</td>
      <td>${shares}</td>
      <td>$${price.toFixed(2)}</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$${totalCost.toFixed(2)}</td>
      <td>$0.00</td>
      <td>0.00%</td>
      <td>—</td>
      <td></td>
    `;

    const actionCell = row.children[8];
    const sellBtn = document.createElement("button");
    sellBtn.textContent = "Sell";
    sellBtn.addEventListener("click", async () => {
      const data = await fetchStockPrice(symbol);
      if (!data) return alert("Could not fetch price.");
      const revenue = data.price * shares;
      adjustCash(portEl, revenue);
      row.remove();
    });
    actionCell.appendChild(sellBtn);
    tbody.appendChild(row);
  }

  async function addStockToPortfolio(portEl) {
    let ticker = prompt("Stock Symbol:")?.toUpperCase();
    if (!ticker) return;

    let shares = parseFloat(prompt("Shares:"));
    if (!shares || shares <= 0) return alert("Invalid shares.");

    let data = await fetchStockPrice(ticker);
    let price = data?.price ?? parseFloat(prompt("Price per share:"));
    if (!price || price <= 0) return alert("Invalid price.");

    const cost = shares * price;
    const cashAvailable = parseCurrency(portEl.querySelector(".portfolio-balance").innerText);
    if (cost > cashAvailable) return alert("Not enough cash.");

    // Stock-based easter eggs
    if (ticker === "GME" && shares > 10) adjustCash(portEl, 100);
    if (ticker === "SECRETSAUCE") adjustCash(portEl, 500);

    adjustCash(portEl, -cost);
    createStockRow(portEl, ticker, shares, price);
  }

  function createPortfolio(name = "New Portfolio", startingBalance = 10000) {
    const port = document.createElement("div");
    port.classList.add("portfolio");

    port.innerHTML = `
      <div style="display:flex;justify-content:space-between;align-items:center;">
        <h3 contenteditable="true" class="portfolio-name">${name}</h3>
        <button class="delete-portfolio">Delete</button>
      </div>
      <p>Balance: $<span class="portfolio-balance">${startingBalance.toFixed(2)}</span></p>
      <button class="add-stock">Add Stock</button>
      <table class="stock-table">
        <thead>
          <tr>
            <th>Ticker</th>
            <th>Shares</th>
            <th>Cost</th>
            <th>Total</th>
            <th>Market</th>
            <th>Gain</th>
            <th>%</th>
            <th>Portfolio %</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    portfoliosDiv.appendChild(port);

    const nameEl = port.querySelector(".portfolio-name");
    const balanceElPort = port.querySelector(".portfolio-balance");

    const state = { lastAppliedName: "" };

    function applyEasterEggs() {
      const newName = nameEl.innerText.trim();
      if (state.lastAppliedName === newName) return;

      let bal = parseCurrency(balanceElPort.innerText);

      switch (newName) {
        case "Mastercard": bal *= 2; break;
        case "Bitcoin": bal *= 3; break;
        case "Elon": bal = 1000000; break;
        case "Warren": bal += 10000; break;
        case "Jeff": bal = 500000; break;
        case "Tesla": bal = 69000; break;
        case "MemeCoin": bal += 420; break;
        case "DogeCoin": bal += 1337; break;
        case "Unicorn": bal = 1111; break;
        case "Rainbow": bal = 777; break;
      }

      balanceElPort.innerText = bal.toFixed(2);
      state.lastAppliedName = newName;
    }

    // Apply easter egg immediately
    applyEasterEggs();
    nameEl.addEventListener("blur", applyEasterEggs);

    port.querySelector(".delete-portfolio").addEventListener("click", () => port.remove());
    port.querySelector(".add-stock").addEventListener("click", () => addStockToPortfolio(port));
  }

  if (addPortfolioBtn) {
    addPortfolioBtn.addEventListener("click", () => {
      const name = prompt("Portfolio name:") || "New Portfolio";
      createPortfolio(name);
    });
  }

  // -----------------------------
  // Refresh stock prices (does not change cash)
  // -----------------------------
  const refreshBtn = document.getElementById("refresh-control");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      if (currentSymbol) updateChart(currentSymbol, "1M");

      const portfolios = document.querySelectorAll(".portfolio");
      for (const port of portfolios) {
        const rows = port.querySelectorAll("tbody tr");
        for (const row of rows) {
          const symbol = row.dataset.symbol;
          const shares = parseFloat(row.children[1].innerText);
          const costBasis = parseCurrency(row.children[2].innerText);

          try {
            const info = await fetchStockPrice(symbol);
            if (!info) continue;

            const marketVal = info.price * shares;
            const totalCost = costBasis * shares;
            const gain = marketVal - totalCost;
            const pct = totalCost ? (gain / totalCost) * 100 : 0;

            row.children[3].innerText = `$${totalCost.toFixed(2)}`;
            row.children[4].innerText = `$${marketVal.toFixed(2)}`;
            row.children[5].innerText = `$${gain.toFixed(2)}`;
            row.children[6].innerText = `${pct.toFixed(2)}%`;

          } catch (err) {
            console.error("Refresh error", err);
          }
        }
      }
    });
  }

});
