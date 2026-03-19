import {
  getStockPrice,
  getCompanyName,
  getHistoricalData,
} from "./stockapi.js";

document.addEventListener("DOMContentLoaded", () => {
  let chart = null;
  let currentSymbol = null;
  let preferCandlestick = false;
  const portfoliosDiv = document.getElementById("portfolios");

  function parseCurrency(val) {
    return parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
  }

  async function updateStock(symbol, range = "1M") {
    currentSymbol = symbol;
    const [price, name, candles] = await Promise.all([
      getStockPrice(symbol),
      getCompanyName(symbol),
      getHistoricalData(symbol, range),
    ]);

    if (!price) return alert("Ticker '" + symbol + "' not found.");

    // Update Header Text (Black Letters)
    const stockInfo = document.getElementById("stock-info");
    const displayName =
      name && name !== symbol ? `${name} (${symbol})` : symbol;

    stockInfo.innerHTML = `
      <strong style="font-size:20px; color: #000; display: block; margin-bottom: 4px;">
        ${displayName}
      </strong>
      <span style="color: #000; font-weight: 600;">Price: $${price.toFixed(2)}</span>
    `;

    const container = document.getElementById("chart-container");
    container.style.display = "block";
    const ctx = document.getElementById("stockChart").getContext("2d");

    if (chart) chart.destroy();

    chart = new Chart(ctx, {
      type: preferCandlestick ? "candlestick" : "line",
      data: {
        datasets: [
          {
            label: `${displayName} Price`,
            data: candles.map((c) => ({
              x: c.t,
              o: c.o,
              h: c.h,
              l: c.l,
              c: c.c,
            })),
            borderColor: "#203a43",
            backgroundColor: "rgba(32, 58, 67, 0.1)",
            fill: !preferCandlestick,
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: true,
            labels: { color: "#000", font: { weight: "bold" } },
          },
        },
        scales: {
          x: { type: "time", time: { unit: "day" }, ticks: { color: "#000" } },
          y: { ticks: { color: "#000" } },
        },
      },
    });

    preferCandlestick = false;
  }

  document.getElementById("get-price").addEventListener("click", () => {
    const symbol = document
      .getElementById("stock-symbol")
      .value.trim()
      .toUpperCase();
    if (!symbol) return alert("Enter ticker symbol.");
    updateStock(symbol);
  });

  document.getElementById("toggleCandle").addEventListener("click", () => {
    preferCandlestick = true;
    if (currentSymbol) updateStock(currentSymbol);
  });

  document.querySelectorAll("#time-range button").forEach((btn) => {
    btn.addEventListener("click", () => {
      if (!currentSymbol) return alert("Pick a stock first.");
      updateStock(currentSymbol, btn.dataset.range);
    });
  });

  function adjustCash(portEl, delta) {
    const balEl = portEl.querySelector(".portfolio-balance");
    balEl.innerText = (parseCurrency(balEl.innerText) + delta).toFixed(2);
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

    const sellBtn = document.createElement("button");
    sellBtn.textContent = "Sell";
    sellBtn.addEventListener("click", async () => {
      const price = await getStockPrice(symbol);
      if (!price) return alert("Could not fetch price.");
      adjustCash(portEl, price * shares);
      row.remove();
    });
    row.children[8].appendChild(sellBtn);
    tbody.appendChild(row);
  }

  async function addStockToPortfolio(portEl) {
    const symbol = prompt("Stock Symbol:")?.toUpperCase();
    if (!symbol) return;
    const shares = parseFloat(prompt("Shares:"));
    if (!shares || shares <= 0) return alert("Invalid shares.");

    let price = await getStockPrice(symbol);
    if (!price) price = parseFloat(prompt("Price per share:"));
    if (!price || price <= 0) return alert("Invalid price.");

    const cost = shares * price;
    const cashAvailable = parseCurrency(
      portEl.querySelector(".portfolio-balance").innerText,
    );
    if (cost > cashAvailable) return alert("Not enough cash.");

    adjustCash(portEl, -cost);
    createStockRow(portEl, symbol, shares, price);
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
            <th>Ticker</th><th>Shares</th><th>Cost</th><th>Total</th><th>Market</th>
            <th>Gain</th><th>%</th><th>Portfolio %</th><th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;

    portfoliosDiv.appendChild(port);

    const nameEl = port.querySelector(".portfolio-name");
    const balanceElPort = port.querySelector(".portfolio-balance");
    let lastAppliedName = "";

    function applyEasterEggs() {
      const newName = nameEl.innerText.trim();
      if (lastAppliedName === newName) return;
      let bal = parseCurrency(balanceElPort.innerText);
      switch (newName) {
        case "Mastercard":
          bal *= 2;
          break;
        case "Bitcoin":
          bal *= 3;
          break;
        case "Elon":
          bal = 1000000;
          break;
        case "Warren":
          bal += 10000;
          break;
        case "Jeff":
          bal = 500000;
          break;
        case "Tesla":
          bal = 69000;
          break;
        case "MemeCoin":
          bal += 420;
          break;
        case "DogeCoin":
          bal += 1337;
          break;
        case "Unicorn":
          bal = 1111;
          break;
        case "Rainbow":
          bal = 777;
          break;
      }
      balanceElPort.innerText = bal.toFixed(2);
      lastAppliedName = newName;
    }

    applyEasterEggs();
    nameEl.addEventListener("blur", applyEasterEggs);
    port
      .querySelector(".delete-portfolio")
      .addEventListener("click", () => port.remove());
    port
      .querySelector(".add-stock")
      .addEventListener("click", () => addStockToPortfolio(port));
  }

  document.getElementById("add-portfolio").addEventListener("click", () => {
    const name = prompt("Portfolio name:") || "New Portfolio";
    createPortfolio(name);
  });
});
