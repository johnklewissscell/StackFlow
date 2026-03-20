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
    const container = document.getElementById("chart-container");
    const canvas = document.getElementById("stockChart");

    stockInfo.innerHTML = `<div style="color: #666; font-style: italic;">Fetching ${symbol}...</div>`;

    const [price, name, candles] = await Promise.all([
      getStockPrice(symbol),
      getCompanyName(symbol),
      getHistoricalData(symbol, range)
    ]);

    if (!price || !candles || candles.length === 0) {
      alert("Ticker data not found.");
      stockInfo.innerHTML = "";
      return;
    }

    const displayName = name && name !== symbol ? `${name} (${symbol})` : symbol;
    stockInfo.innerHTML = `
      <strong style="font-size:20px; color: #000; display: block; margin-bottom: 4px;">${displayName}</strong>
      <span style="color: #000; font-weight: 600; font-size: 24px;">$${price.toFixed(2)}</span>
    `;

    container.style.display = "block";
    const ctx = canvas.getContext("2d");

    if (chart) chart.destroy();

    const isLine = !preferCandlestick;
    const chartData = isLine ? candles.map(d => ({ x: d.x, y: d.c })) : candles;

    chart = new Chart(ctx, {
      type: isLine ? "line" : "candlestick",
      data: {
        datasets: [{
          label: displayName,
          data: chartData,
          borderColor: "#203a43",
          backgroundColor: isLine ? "rgba(32, 58, 67, 0.1)" : undefined,
          fill: isLine,
          tension: 0.1,
          pointRadius: isLine ? 2 : 0,
          borderWidth: 2
        }]
      },
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
          y: { 
            ticks: { color: "#000" },
            beginAtZero: false 
          }
        }
      }
    });
  }

  document.getElementById("get-price").addEventListener("click", () => {
    const symbol = document.getElementById("stock-symbol").value.trim().toUpperCase();
    if (symbol) {
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
    const newBal = parseCurrency(balEl.innerText) + delta;
    balEl.innerText = newBal.toFixed(2);
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
        const currentPrice = p || price;
        adjustCash(portEl, currentPrice * shares);
        row.remove();
      };
      row.children[8].appendChild(sellBtn);
    } else {
      row.children[8].innerText = "LOCKED";
    }
    tbody.appendChild(row);
  }

  async function addStockToPortfolio(portEl) {
    const symbol = prompt("Enter Ticker Symbol:")?.toUpperCase();
    if (!symbol) return;
    
    const sharesInput = prompt("Enter Number of Shares:");
    const shares = parseFloat(sharesInput);
    if (isNaN(shares) || shares <= 0) return;

    if (symbol === "GME" && shares >= 10) {
      alert("Diamond Hands Bonus Activated! +$100");
      adjustCash(portEl, 100);
    }
    
    if (symbol === "SECRETSAUCE") {
      alert("Found the Secret Sauce! +$500");
      adjustCash(portEl, 500);
    }

    let price = await getStockPrice(symbol);
    if (!price) {
      if (symbol === "SECRETSAUCE") {
        price = 0;
      } else {
        const manualPrice = prompt("Price not found. Enter price manually:");
        price = parseFloat(manualPrice);
      }
    }
    
    if (isNaN(price)) return;
    
    const cost = shares * price;
    const currentBalance = parseCurrency(portEl.querySelector(".portfolio-balance").innerText);
    
    if (cost > currentBalance) {
      return alert("Insufficient funds for this trade.");
    }

    adjustCash(portEl, -cost);
    createStockRow(portEl, symbol, shares, price);
  }

  function createPortfolio(name = "Portfolio", bal = 10000) {
    let fBal = bal;
    const n = name.trim();

    const easterEggs = {
      "Mastercard": () => fBal *= 2,
      "Bitcoin": () => fBal *= 3,
      "Elon": () => fBal = 1000000,
      "Warren": () => fBal += 10000,
      "Jeff": () => fBal = 500000,
      "Tesla": () => fBal = 69000,
      "MemeCoin": () => fBal += 420,
      "DogeCoin": () => fBal += 1337,
      "Unicorn": () => fBal = 1111,
      "Rainbow": () => fBal = 777
    };

    if (easterEggs[n]) easterEggs[n]();

    const port = document.createElement("div");
    port.className = "portfolio";
    port.style = "border: 1px solid #ddd; padding: 15px; margin-bottom: 20px; border-radius: 8px; background: #fff;";
    port.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center;">
        <h3 contenteditable="true" style="margin: 0;">${n}</h3>
        <button class="del-port" style="background: #ff4d4d; color: white; border: none; padding: 5px 10px; border-radius: 4px; cursor: pointer;">Delete</button>
      </div>
      <p style="font-size: 18px; margin: 10px 0;">Balance: $<span class="portfolio-balance">${fBal.toFixed(2)}</span></p>
      <button class="add-s" style="margin-bottom: 10px; padding: 8px 12px; cursor: pointer;">Add Stock</button>
      <div style="overflow-x: auto;">
        <table class="stock-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="text-align: left; border-bottom: 2px solid #eee;">
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
      </div>
    `;
    portfoliosDiv.appendChild(port);
    port.querySelector(".del-port").onclick = () => port.remove();
    port.querySelector(".add-s").onclick = () => addStockToPortfolio(port);
  }

  document.getElementById("add-portfolio").onclick = () => {
    const n = prompt("Enter Portfolio Name:");
    if (n) createPortfolio(n);
  };
});