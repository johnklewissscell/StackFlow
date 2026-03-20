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

    stockInfo.innerHTML = `<div style="color: #666; font-style: italic;">Analyzing ${symbol}...</div>`;

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
      <div style="background: #f9f9f9; padding: 15px; border-radius: 8px; border-left: 5px solid #203a43;">
        <strong style="font-size:22px; color: #203a43; display: block; margin-bottom: 4px;">${displayName}</strong>
        <span style="color: #000; font-weight: 700; font-size: 28px;">$${price.toFixed(2)}</span>
      </div>
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
            ticks: { color: "#333", maxTicksLimit: 10 }
          },
          y: { 
            ticks: { color: "#333" },
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

  document.getElementById("toggleCandle").addEventListener("click", (e) => {
    preferCandlestick = !preferCandlestick;
    e.target.innerText = preferCandlestick ? "Switch to Line" : "Try Candlestick";
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

  async function updatePortfolioValues() {
  const rows = document.querySelectorAll(".stock-table tbody tr");
  for (const row of rows) {
    const symbol = row.cells[0].innerText;
    if (symbol === "SECRETSAUCE") continue;

    const shares = parseFloat(row.cells[1].innerText);
    const avgCost = parseCurrency(row.cells[2].innerText);
    const currentPrice = await getStockPrice(symbol);
    
    const marketValue = shares * currentPrice;
    const gainLoss = marketValue - (shares * avgCost);
    const gainPercent = ((currentPrice - avgCost) / avgCost) * 100;

    row.cells[4].innerText = `$${marketValue.toFixed(2)}`;
    row.cells[5].innerText = `$${gainLoss.toFixed(2)}`;
    row.cells[5].style.color = gainLoss >= 0 ? "green" : "red";
    row.cells[6].innerText = `${gainPercent.toFixed(2)}%`;
    row.cells[6].style.color = gainPercent >= 0 ? "green" : "red";
  }
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
  
  const sellBtn = document.createElement("button");
  sellBtn.textContent = "Sell";
  sellBtn.className = "specialbutton";
  sellBtn.onclick = async () => {
    const currentPrice = await getStockPrice(symbol);
    const totalReturn = shares * currentPrice;
    adjustCash(portEl, totalReturn);
    row.remove();
  };
  row.children[8].appendChild(sellBtn);
  tbody.appendChild(row);
}

setInterval(async () => {
  if (currentSymbol) {
    await updateStock(currentSymbol, currentRange);
  }
  await updatePortfolioValues();
}, 30000);

  async function addStockToPortfolio(portEl) {
    const symbol = prompt("Enter Ticker Symbol:")?.toUpperCase();
    if (!symbol) return;
    
    const sharesInput = prompt("Enter Number of Shares:");
    const shares = parseFloat(sharesInput);
    if (isNaN(shares) || shares <= 0) return;

    if (symbol === "GME" && shares >= 10) {
      alert("Diamond Hands Bonus! +$100.00");
      adjustCash(portEl, 100);
    }
    
    if (symbol === "SECRETSAUCE") {
      alert("Found the Hidden Formula! +$500.00");
      adjustCash(portEl, 500);
    }

    let price = await getStockPrice(symbol);
    if (!price) {
      if (symbol === "SECRETSAUCE") {
        price = 0;
      } else {
        const manualPrice = prompt("Market closed or symbol unknown. Enter cost per share:");
        price = parseFloat(manualPrice);
      }
    }
    
    if (isNaN(price)) return;
    
    const cost = shares * price;
    const currentBalance = parseCurrency(portEl.querySelector(".portfolio-balance").innerText);
    
    if (cost > currentBalance) {
      return alert("Transaction declined: Insufficient Cash.");
    }

    adjustCash(portEl, -cost);
    createStockRow(portEl, symbol, shares, price);
  }

  function createPortfolio(name = "Portfolio", bal = 10000) {
    let fBal = bal;
    const n = name.trim();

    const mods = {
      "Mastercard": () => fBal *= 2,
      "Bitcoin": () => fBal *= 3,
      "Elon": () => fBal = 1000000,
      "Warren": () => fBal += 10000,
      "Jeff": () => fBal = 500000,
      "Tesla": () => fBal = 69420,
      "MemeCoin": () => fBal += 420,
      "DogeCoin": () => fBal += 1337,
      "Unicorn": () => fBal = 11111,
      "Rainbow": () => fBal = 7777
    };

    if (mods[n]) mods[n]();

    const port = document.createElement("div");
    port.className = "portfolio";
    port.style = "background: #fff; border: 1px solid #ccc; padding: 20px; margin-bottom: 30px; border-radius: 12px; box-shadow: 0 4px 6px rgba(0,0,0,0.05);";
    port.innerHTML = `
      <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 15px;">
        <h3 contenteditable="true" style="margin: 0; color: #203a43; font-size: 22px;">${n}</h3>
        <button class="del-port" style="background: #e63946; color: white; border: none; padding: 6px 12px; border-radius: 6px; cursor: pointer; font-weight: 600;">Delete</button>
      </div>
      <p style="font-size: 20px; font-weight: 600; margin: 10px 0;">Available Cash: $<span class="portfolio-balance">${fBal.toFixed(2)}</span></p>
      <button class="add-s specialbutton" style="margin-bottom: 20px;">+ Add Stock</button>
      <div style="overflow-x: auto;">
        <table class="stock-table" style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="background: #f1f1f1; text-align: left;">
              <th style="padding: 10px;">Ticker</th>
              <th>Shares</th>
              <th>Cost</th>
              <th>Total</th>
              <th>Market</th>
              <th>Gain</th>
              <th>%</th>
              <th>Weight</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody style="font-family: 'Courier New', monospace;"></tbody>
        </table>
      </div>
    `;
    portfoliosDiv.appendChild(port);
    port.querySelector(".del-port").onclick = () => port.remove();
    port.querySelector(".add-s").onclick = () => addStockToPortfolio(port);
  }

  document.getElementById("add-portfolio").onclick = () => {
    const n = prompt("Give your portfolio a name:");
    if (n) createPortfolio(n);
  };

  document.getElementById("refresh-control").onclick = () => {
    if (currentSymbol) updateStock(currentSymbol, currentRange);
  };
});

setInterval(async () => {
  if (currentSymbol) {
    await updateStock(currentSymbol, currentRange);
  }
}, 30000);

document.querySelectorAll("#time-range button").forEach((btn) => {
  btn.addEventListener("click", async () => {
    currentRange = btn.getAttribute("data-range");
    if (currentSymbol) {
      await updateStock(currentSymbol, currentRange);
    }
  });
});