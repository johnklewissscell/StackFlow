import { getStockPrice, getCompanyName, getHistoricalData } from "./stockapi.js";

document.addEventListener("DOMContentLoaded", () => {
  let chart = null;
  let currentSymbol = null;
  let currentRange = "1M";
  let preferCandlestick = false;
  const portfoliosDiv = document.getElementById("portfolios");

  function parseCurrency(val) {
    return parseFloat(String(val).replace(/[^0-9.-]+/g, "")) || 0;
  }

  async function updateStock(symbol, range = "1M") {
    currentSymbol = symbol;
    currentRange = range;
    const stockInfo = document.getElementById("stock-info");
    
    const [price, name, candles] = await Promise.all([
      getStockPrice(symbol),
      getCompanyName(symbol),
      getHistoricalData(symbol, range)
    ]);

    if (!price) return alert("Ticker not found.");

    const displayName = name && name !== symbol ? `${name} (${symbol})` : symbol;
    stockInfo.innerHTML = `
      <strong style="font-size:20px; color: #000; display: block; margin-bottom: 4px;">${displayName}</strong>
      <span style="color: #000; font-weight: 600;">Price: $${price.toFixed(2)}</span>
    `;

    const container = document.getElementById("chart-container");
    container.style.display = "block";
    const ctx = document.getElementById("stockChart").getContext("2d");

    if (chart) chart.destroy();

    const ds = {
      label: displayName,
      data: preferCandlestick ? candles : candles.map(d => ({ x: d.x, y: d.c })),
      borderColor: "#203a43",
      backgroundColor: "rgba(32, 58, 67, 0.1)",
      fill: !preferCandlestick,
      tension: 0,
      pointRadius: 0
    };

    chart = new Chart(ctx, {
      type: preferCandlestick ? "candlestick" : "line",
      data: { datasets: [ds] },
      options: {
        animation: false,
        responsive: true,
        maintainAspectRatio: false,
        scales: {
          x: { 
            type: "time", 
            time: { unit: range === "1D" ? "hour" : "day" },
            ticks: { color: "#000", maxTicksLimit: 10 }
          },
          y: { ticks: { color: "#000" } }
        }
      }
    });
  }

  document.getElementById("get-price").addEventListener("click", () => {
    const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
    if (symbol) {
      preferCandlestick = false;
      updateStock(symbol, currentRange);
    }
  });

  document.getElementById("toggleCandle").addEventListener("click", () => {
    preferCandlestick = !preferCandlestick;
    if (currentSymbol) updateStock(currentSymbol, currentRange);
  });

  document.querySelectorAll("#time-range button").forEach((btn) => {
    btn.addEventListener("click", () => {
      const range = btn.getAttribute("data-range");
      if (currentSymbol) updateStock(currentSymbol, range);
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
    
    if (symbol !== "SECRETSAUCE") {
      const sellBtn = document.createElement("button");
      sellBtn.textContent = "Sell";
      sellBtn.onclick = async () => {
        const p = await getStockPrice(symbol);
        if (p) adjustCash(portEl, p * shares);
        row.remove();
      };
      row.children[8].appendChild(sellBtn);
    } else {
      row.children[8].innerText = "LOCKED";
    }
    tbody.appendChild(row);
  }

  async function addStockToPortfolio(portEl) {
    const symbol = prompt("Symbol:")?.toUpperCase();
    const shares = parseFloat(prompt("Shares:"));
    if (!symbol || !shares) return;

    if (symbol === "GME" && shares >= 10) adjustCash(portEl, 100);
    if (symbol === "SECRETSAUCE") adjustCash(portEl, 500);

    let price = await getStockPrice(symbol);
    if (!price) price = symbol === "SECRETSAUCE" ? 0 : parseFloat(prompt("Price:"));
    
    const cost = shares * price;
    if (cost > parseCurrency(portEl.querySelector(".portfolio-balance").innerText)) {
      return alert("No cash");
    }

    adjustCash(portEl, -cost);
    createStockRow(portEl, symbol, shares, price);
  }

  function createPortfolio(name = "Portfolio", bal = 10000) {
    let fBal = bal;
    const n = name.trim();

    if (n === "Mastercard") fBal *= 2;
    else if (n === "Bitcoin") fBal *= 3;
    else if (n === "Elon") fBal = 1000000;
    else if (n === "Warren") fBal += 10000;
    else if (n === "Jeff") fBal = 500000;
    else if (n === "Tesla") fBal = 69000;
    else if (n === "MemeCoin") fBal += 420;
    else if (n === "DogeCoin") fBal += 1337;
    else if (n === "Unicorn") fBal = 1111;
    else if (n === "Rainbow") fBal = 777;

    const port = document.createElement("div");
    port.className = "portfolio";
    port.innerHTML = `
      <div>
        <h3 contenteditable="true">${n}</h3>
        <button class="del-port">Delete</button>
      </div>
      <p>Balance: $<span class="portfolio-balance">${fBal.toFixed(2)}</span></p>
      <button class="add-s">Add Stock</button>
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
            <th>Port %</th>
            <th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    portfoliosDiv.appendChild(port);
    port.querySelector(".del-port").onclick = () => port.remove();
    port.querySelector(".add-s").onclick = () => addStockToPortfolio(port);
  }

  document.getElementById("add-portfolio").onclick = () => {
    const n = prompt("Name:");
    if(n) createPortfolio(n);
  };
});