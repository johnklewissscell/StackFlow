// -----------------------------
// application.js
// -----------------------------

document.addEventListener('DOMContentLoaded', () => {

  let balance = 10000;
  const balanceEl = document.getElementById('balance');
  if (balanceEl) balanceEl.innerText = balance.toFixed(2);

  let chart;
  let currentSymbol = null;
  let preferCandlestick = false;

  console.log('application.js loaded');

  // -----------------------------
  // Stock Fetch & Display
  // -----------------------------
  async function fetchStockPrice(symbol) {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1M`);
      if (!resp.ok) return null;
      const json = await resp.json();
      if (!json || !json.candles || json.candles.length === 0) return null;

      const lastCandle = json.candles[json.candles.length - 1];
      const companyName = json.companyName?.trim() || json.meta?.name?.trim() || symbol;

      // CSP-safe local logo placeholder
      const logoUrl = `/img/logos/${symbol.toLowerCase()}.png`;

      return { price: lastCandle.c, name: companyName, logo: logoUrl };
    } catch (e) {
      console.error('fetchStockPrice error', e);
      return null;
    }
  }

  function createLogoImg(url, alt, size = 24) {
    const img = document.createElement('img');
    img.src = url;
    img.alt = alt;
    img.width = size;
    img.height = size;
    img.style.objectFit = 'contain';
    img.style.verticalAlign = 'middle';
    return img;
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

      const priceEl = document.getElementById('current-price');
      if (priceEl) priceEl.innerText = data.price.toFixed(2);

      updateChart(symbol, '1M');
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

  if (chatSend) {
    chatSend.addEventListener('click', () => {
      const text = chatInput.value.trim();
      if (!text) return;
      addMessage("You", text);
      chatInput.value = "";
      if (typeof runGemini === 'function') runGemini(text);
    });
  }

  if (chatInput) {
    chatInput.addEventListener("keydown", (e) => {
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        chatSend.click();
      }
    });
  }

  // -----------------------------
  // Time-range buttons
  // -----------------------------
  document.querySelectorAll('#time-range button').forEach(btn => {
    btn.addEventListener('click', () => {
      if (currentSymbol) {
        const stockInfo = document.getElementById('stock-info');
        if (stockInfo) stockInfo.innerHTML = 'Loading chart...';
        updateChart(currentSymbol, btn.dataset.range);
      }
    });
  });

  // -----------------------------
  // Portfolio Functions
  // -----------------------------
  function parseCurrency(text) {
    return parseFloat(String(text).replace(/[^0-9.-]+/g, '')) || 0;
  }

  function adjustPortfolioBalance(portEl, deltaAmount) {
    const balEl = portEl.querySelector('.portfolio-balance');
    let bal = parseCurrency(balEl.innerText);
    bal += deltaAmount;
    balEl.innerText = bal.toFixed(2);
  }

  function listPortfolios() {
    const nodes = Array.from(document.querySelectorAll('.portfolio'));
    return nodes.map((el, idx) => ({
      el,
      name: el.querySelector('.portfolio-name')?.innerText.trim() || `Portfolio ${idx + 1}`,
      idx: idx + 1
    }));
  }

  function promptChoosePortfolio() {
    const list = listPortfolios();
    if (!list.length) { alert('No portfolios found. Create one first.'); return null; }
    let msg = 'Choose a portfolio number:\n';
    list.forEach(p => { msg += `${p.idx}: ${p.name}\n`; });
    const pick = prompt(msg);
    if (!pick) return null;
    const num = parseInt(pick);
    if (isNaN(num) || num < 1 || num > list.length) { alert('Invalid portfolio selection'); return null; }
    return list[num - 1].el;
  }

  function updatePortfolioRow(portEl, symbol, price, deltaShares, logoUrl = null) {
    const tbody = portEl.querySelector('tbody');
    let row = Array.from(tbody.querySelectorAll('tr')).find(r => r.dataset.symbol === symbol);
    if (!row && deltaShares > 0) {
      const shares = deltaShares;
      const costBasis = price;
      const totalCost = shares * costBasis;
      const marketValue = shares * price;
      const gain = marketValue - totalCost;
      const percentGain = totalCost ? (gain / totalCost) * 100 : 0;

      row = document.createElement('tr');
      row.dataset.symbol = symbol;

      // Logo + Symbol cell
      const symbolTd = document.createElement('td');
      symbolTd.style.display = 'flex';
      symbolTd.style.alignItems = 'center';
      symbolTd.style.gap = '4px';

      const logoImg = createLogoImg(logoUrl || `/img/logos/${symbol.toLowerCase()}.png`, symbol, 24);
      symbolTd.appendChild(logoImg);

      const symText = document.createElement('span');
      symText.textContent = symbol;
      symbolTd.appendChild(symText);

      row.appendChild(symbolTd);

      // Other cells
      const sharesTd = document.createElement('td');
      sharesTd.textContent = shares;
      row.appendChild(sharesTd);

      const costTd = document.createElement('td');
      costTd.textContent = `$${costBasis.toFixed(2)}`;
      row.appendChild(costTd);

      const totalCostTd = document.createElement('td');
      totalCostTd.textContent = `$${totalCost.toFixed(2)}`;
      row.appendChild(totalCostTd);

      const marketValueTd = document.createElement('td');
      marketValueTd.textContent = `$${marketValue.toFixed(2)}`;
      row.appendChild(marketValueTd);

      const gainTd = document.createElement('td');
      gainTd.textContent = `${gain >= 0 ? '+' : ''}$${gain.toFixed(2)}`;
      row.appendChild(gainTd);

      const percentTd = document.createElement('td');
      percentTd.textContent = `${percentGain.toFixed(2)}%`;
      row.appendChild(percentTd);

      const portPercentTd = document.createElement('td');
      portPercentTd.textContent = '—';
      row.appendChild(portPercentTd);

      const actionTd = document.createElement('td');
      const removeBtn = document.createElement('button');
      removeBtn.classList.add('remove-stock');
      removeBtn.textContent = '✖';
      removeBtn.addEventListener('click', () => {
        const shares = parseFloat(row.children[1].innerText) || 0;
        const costBasis = parseCurrency(row.children[2].innerText) || 0;
        const totalCost = shares * costBasis;
        const marketValue = parseCurrency(row.children[4].innerText) || 0;
        const gainLoss = marketValue - totalCost;
        const refund = totalCost + gainLoss;

        balance += refund;
        if (balanceEl) balanceEl.innerText = balance.toFixed(2);

        const portBalEl = portEl.querySelector('.portfolio-balance');
        let portBal = parseCurrency(portBalEl.innerText);
        portBal += refund;
        portBalEl.innerText = portBal.toFixed(2);

        row.remove();
      });
      actionTd.appendChild(removeBtn);
      row.appendChild(actionTd);

      tbody.appendChild(row);
      return { sharesAdded: shares };
    }

    if (!row) return { sharesAdded: 0 };

    // Update existing row
    const sharesCell = row.children[1];
    const costBasisCell = row.children[2];
    const totalCostCell = row.children[3];

    const existingShares = parseFloat(sharesCell.innerText) || 0;
    const existingCostBasis = parseCurrency(costBasisCell.innerText) || 0;
    const existingTotalCost = existingShares * existingCostBasis;

    const newShares = existingShares + deltaShares;
    if (newShares < 0) { alert('Not enough shares to sell'); return { sharesAdded: 0 }; }

    let newTotalCost = existingTotalCost;
    if (deltaShares > 0) newTotalCost = existingTotalCost + price * deltaShares;
    else if (deltaShares < 0) newTotalCost = Math.max(0, existingTotalCost - existingCostBasis * Math.min(existingShares, Math.abs(deltaShares)));

    const newCostBasis = newShares > 0 ? newTotalCost / newShares : 0;
    const marketValue = newShares * price;
    const gain = marketValue - newTotalCost;
    const percentGain = newTotalCost ? (gain / newTotalCost) * 100 : 0;

    sharesCell.innerText = newShares;
    costBasisCell.innerText = `$${newCostBasis.toFixed(2)}`;
    totalCostCell.innerText = `$${newTotalCost.toFixed(2)}`;
    row.children[4].innerText = `$${marketValue.toFixed(2)}`;
    row.children[5].innerText = `${gain >= 0 ? '+' : ''}$${gain.toFixed(2)}`;
    row.children[6].innerText = `${percentGain.toFixed(2)}%`;

    if (newShares === 0) row.remove();
    return { sharesAdded: deltaShares };
  }

  // -----------------------------
  // Chart Update
  // -----------------------------
  async function updateChart(symbol, range) {
    try {
      const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
      if (!resp.ok) { 
        const info = document.getElementById('stock-info');
        if (info) info.innerHTML += '<p>No chart data available.</p>'; 
        return; 
      }
      const json = await resp.json();
      if (!json || !json.candles || json.candles.length === 0) {
        const info = document.getElementById('stock-info');
        if (info) info.innerHTML += '<p>No chart data available.</p>'; 
        return;
      }

      const financialData = json.candles.map(c => ({ x: new Date(c.t), o: c.o, h: c.h, l: c.l, c: c.c }));
      const container = document.getElementById('chart-container');
      if (container) container.style.display = 'block';
      let canvas = document.getElementById('stockChart');
      if (!canvas) { container.innerHTML = '<canvas id="stockChart"></canvas>'; canvas = document.getElementById('stockChart'); }
      const ctx = canvas.getContext('2d');
      try { if (chart) { chart.destroy(); chart = null; } } catch(e) {}

      if (!preferCandlestick) {
        const labels = financialData.map(d => d.x);
        const closePrices = financialData.map(d => d.c);
        chart = new Chart(ctx, {
          type: 'line',
          data: { labels, datasets: [{ label: `${symbol} Close`, data: closePrices, borderColor: 'blue', fill: false }] },
          options: { responsive: true, maintainAspectRatio: false }
        });
        return;
      }

      chart = new Chart(ctx, {
        type: 'candlestick',
        data: { datasets: [{ label: `${symbol} Candles`, data: financialData }] },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          scales: { x: { type: 'time', time: { unit: 'day' } }, y: { title: { display: true, text: 'Price ($)' } } }
        }
      });
      preferCandlestick = false;
    } catch (e) {
      console.error('updateChart error', e);
      const info = document.getElementById('stock-info');
      if (info) info.innerHTML += '<p>Error loading chart.</p>';
    }
  }

});
