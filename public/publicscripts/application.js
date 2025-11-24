// -----------------------------
// application.js
// -----------------------------

document.addEventListener('DOMContentLoaded', () => {

  // -----------------------------
  // Initial State
  // -----------------------------
  let balance = 10000;
  const balanceEl = document.getElementById('balance');
  if (balanceEl) balanceEl.innerText = balance.toFixed(2);

  let chart;
  let currentSymbol = null;
  let preferCandlestick = false;

  console.log('application.js loaded');

  // -----------------------------
  // Utility Functions
  // -----------------------------
  function parseCurrency(text) {
    return parseFloat(String(text).replace(/[^0-9.-]+/g, '')) || 0;
  }

  // -----------------------------
  // Fetch Stock Price
  // -----------------------------
  async function fetchStockPrice(symbol) {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1M`);
      if (!resp.ok) return null;
      const json = await resp.json();
      if (!json?.candles?.length) return null;

      const lastCandle = json.candles[json.candles.length - 1];
      const companyName = json.companyName?.trim() || json.meta?.name?.trim() || symbol;

      return { price: lastCandle.c, name: companyName };
    } catch (e) {
      console.error('fetchStockPrice error', e);
      return null;
    }
  }

  // -----------------------------
  // Get Price Button
  // -----------------------------
  const getPriceBtn = document.getElementById('get-price');
  if (getPriceBtn) {
    getPriceBtn.addEventListener('click', async () => {
      const symbolInput = document.getElementById('stock-symbol');
      if (!symbolInput) return;
      const symbol = symbolInput.value.trim().toUpperCase();
      if (!symbol) return alert('Please enter a stock symbol');

      currentSymbol = symbol;
      const data = await fetchStockPrice(symbol);
      if (!data) return alert('No price data found for ' + symbol);

      const priceEl = document.getElementById('stock-info');
      if (priceEl) {
        priceEl.innerHTML = `
          <strong style="font-size:20px;">${data.name}</strong><br>
          Price: $${data.price.toFixed(2)}<br>
        `;
      }

      updateChart(symbol, '1M');
    });
  }

  // -----------------------------
  // Candlestick Toggle
  // -----------------------------
  const toggleBtn = document.getElementById('toggleCandle');
  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      preferCandlestick = true;
      if (currentSymbol) updateChart(currentSymbol, '1M');
    });
  }

  // -----------------------------
  // Chat Panel
  // -----------------------------
  const chatMessages = document.getElementById('chat-messages');
  const chatInput = document.getElementById('chat-input');
  const chatSend = document.getElementById('chat-send');

  function addMessage(sender, text) {
    const div = document.createElement('div');
    div.style.marginBottom = '8px';
    div.innerHTML = `<strong>${sender}:</strong> ${text}`;
    if (chatMessages) {
      chatMessages.appendChild(div);
      chatMessages.scrollTop = chatMessages.scrollHeight;
    }
  }

  if (chatSend && chatInput) {
    chatSend.addEventListener('click', () => {
      const text = chatInput.value.trim();
      if (!text) return;
      addMessage("You", text);
      chatInput.value = "";
      if (typeof runGemini === 'function') runGemini(text);
    });

    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatSend.click();
      }
    });
  }

  // -----------------------------
  // Portfolio Management
  // -----------------------------
  const portfoliosDiv = document.getElementById('portfolios');
  const addPortfolioBtn = document.getElementById('add-portfolio');

  function adjustPortfolioBalance(portEl, deltaAmount) {
    const balEl = portEl.querySelector('.portfolio-balance');
    let bal = parseCurrency(balEl.innerText);
    bal += deltaAmount;
    balEl.innerText = bal.toFixed(2);
  }

  function updatePortfolioRow(portEl, symbol, price, deltaShares) {
    const tbody = portEl.querySelector('tbody');
    let row = Array.from(tbody.querySelectorAll('tr')).find(r => r.dataset.symbol === symbol);

    if (!row && deltaShares > 0) {
      const shares = deltaShares;
      const totalCost = shares * price;
      const marketValue = totalCost;
      const gain = 0;
      const percentGain = 0;

      row = document.createElement('tr');
      row.dataset.symbol = symbol;

      // Symbol cell
      const symbolTd = document.createElement('td');
      symbolTd.textContent = symbol;
      row.appendChild(symbolTd);

      // Other cells
      ['shares','costBasis','totalCost','marketValue','gain','percent','portfolioPercent'].forEach((field, idx) => {
        const td = document.createElement('td');
        switch(idx) {
          case 0: td.textContent = shares; break;
          case 1: td.textContent = `$${price.toFixed(2)}`; break;
          case 2: td.textContent = `$${totalCost.toFixed(2)}`; break;
          case 3: td.textContent = `$${marketValue.toFixed(2)}`; break;
          case 4: td.textContent = `$${gain.toFixed(2)}`; break;
          case 5: td.textContent = `${percentGain.toFixed(2)}%`; break;
          case 6: td.textContent = '—'; break;
        }
        row.appendChild(td);
      });

      // Action cell
      const actionTd = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-stock');
      removeBtn.textContent = '✖';
      removeBtn.addEventListener('click', () => {
        balance += parseCurrency(row.children[3].innerText);
        if(balanceEl) balanceEl.innerText = balance.toFixed(2);
        adjustPortfolioBalance(portEl, parseCurrency(row.children[3].innerText));
        row.remove();
      });
      actionTd.appendChild(removeBtn);
      row.appendChild(actionTd);

      tbody.appendChild(row);
      return;
    }

    // Update existing row
    if (row) {
      const sharesCell = row.children[1];
      const costBasisCell = row.children[2];
      const totalCostCell = row.children[3];

      const existingShares = parseFloat(sharesCell.innerText) || 0;
      const newShares = existingShares + deltaShares;
      if (newShares < 0) return alert('Not enough shares');

      const newTotalCost = newShares * price;
      sharesCell.innerText = newShares;
      costBasisCell.innerText = `$${price.toFixed(2)}`;
      totalCostCell.innerText = `$${newTotalCost.toFixed(2)}`;
    }
  }

  function createPortfolio(name="New Portfolio", startingBalance=10000) {
    if(!portfoliosDiv) return;
    const port = document.createElement('div');
    port.classList.add('portfolio');
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
            <th>Ticker</th><th>Shares</th><th>Cost</th><th>Total</th>
            <th>Market</th><th>Gain</th><th>%</th><th>Portfolio %</th><th>Action</th>
          </tr>
        </thead>
        <tbody></tbody>
      </table>
    `;
    portfoliosDiv.appendChild(port);

    // Delete portfolio
    port.querySelector('.delete-portfolio').addEventListener('click', () => port.remove());

    // Add stock
    port.querySelector('.add-stock').addEventListener('click', async () => {
      const ticker = prompt("Stock symbol:")?.toUpperCase();
      if(!ticker) return;
      const shares = parseFloat(prompt("Shares:"));
      if(isNaN(shares) || shares <=0) return alert("Invalid number");

      let price = 0;
      try {
        const data = await fetchStockPrice(ticker);
        if(data) price = data.price;
      } catch {}
      if(price <=0) price = parseFloat(prompt("Cost per share:"));

      updatePortfolioRow(port, ticker, price, shares);
      adjustPortfolioBalance(port, -shares*price);
    });
  }

  // Attach event to New Portfolio button
  if(addPortfolioBtn) {
    addPortfolioBtn.addEventListener('click', () => {
      const name = prompt("Portfolio name:");
      createPortfolio(name || "New Portfolio");
    });
  }

  // -----------------------------
  // Chart Update
  // -----------------------------
  async function updateChart(symbol, range) {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
      if(!resp.ok) return;
      const json = await resp.json();
      if(!json?.candles?.length) return;

      const data = json.candles.map(c => ({ x:new Date(c.t), o:c.o, h:c.h, l:c.l, c:c.c }));
      const container = document.getElementById('chart-container');
      if(container) container.style.display = 'block';
      let canvas = document.getElementById('stockChart');
      if(!canvas) { container.innerHTML = '<canvas id="stockChart"></canvas>'; canvas = document.getElementById('stockChart'); }
      const ctx = canvas.getContext('2d');
      if(chart) chart.destroy();

      if(!preferCandlestick){
        chart = new Chart(ctx, {
          type:'line',
          data: { labels: data.map(d=>d.x), datasets:[{label:`${symbol} Close`, data:data.map(d=>d.c), borderColor:'blue', fill:false}]},
          options:{responsive:true, maintainAspectRatio:false}
        });
        return;
      }

      chart = new Chart(ctx, {
        type:'candlestick',
        data:{datasets:[{label:`${symbol} Candles`, data:data}]},
        options:{responsive:true, maintainAspectRatio:false, scales:{x:{type:'time'},y:{title:{display:true,text:'Price ($)'}}}}
      });
      preferCandlestick=false;

    } catch(e) {
      console.error('updateChart error', e);
    }
  }

});
