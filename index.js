let balance = 10000;
let chart;
let currentSymbol = null;
let preferCandlestick = false;

document.getElementById('getStock').addEventListener('click', async () => {
  const symbol = document.getElementById('symbol').value.trim().toUpperCase();
  if (!symbol) return;
  document.getElementById('stock-info').innerHTML = "Loading...";
  let price = null;
  try {
    const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=1M`);
    if (!resp.ok) {
      document.getElementById('stock-info').innerHTML = `No data for ${symbol}`;
      return;
    }
    const json = await resp.json();
    if (!json || !json.candles || json.candles.length === 0) {
      document.getElementById('stock-info').innerHTML = `No data for ${symbol}`;
      return;
    }
    price = json.candles[json.candles.length - 1].c;
    if (price == null) {
      document.getElementById('stock-info').innerHTML = `No data for ${symbol}`;
      return;
    }
  } catch (err) {
    console.error('price fetch error', err);
    document.getElementById('stock-info').innerHTML = `No data for ${symbol}`;
    return;
  }
  currentSymbol = symbol;
  document.getElementById('stock-info').innerHTML = `
    <h2>${symbol}</h2>
    <p>Current Price: $${price.toFixed(2)}</p>
    <button id="buy">Buy</button>
    <button id="sell">Sell</button>
  `;
  document.getElementById('buy').onclick = () => trade('buy', price);
  document.getElementById('sell').onclick = () => trade('sell', price);
  updateChart(symbol, "1M");
});

document.getElementById('toggleCandle').addEventListener('click', () => {
  preferCandlestick = true;
  if (currentSymbol) updateChart(currentSymbol, '1M');
});

// Chat UI wiring
const chatMessages = document.getElementById('chat-messages');
const chatInput = document.getElementById('chat-input');
const chatSend = document.getElementById('chat-send');
const chatStatus = document.getElementById('chat-status');

function appendChat(who, text) {
  const div = document.createElement('div');
  div.style.marginBottom = '8px';
  div.innerHTML = `<strong>${who}:</strong> ${text}`;
  chatMessages.appendChild(div);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

chatSend.addEventListener('click', async () => {
  const text = chatInput.value.trim();
  if (!text) return;
  appendChat('You', text);
  chatInput.value = '';
  chatStatus.innerText = 'Thinking...';
  try {
    const resp = await fetch('/api/stackai', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: text }) });
    if (!resp.ok) {
      const t = await resp.text();
      appendChat('System', `Error: ${resp.status} ${t}`);
      chatStatus.innerText = '';
      return;
    }
    const j = await resp.json();
    appendChat('AI', j.reply || JSON.stringify(j));
  } catch (err) {
    appendChat('System', 'Chat failed: ' + err.message);
  } finally {
    chatStatus.innerText = '';
  }
});

document.querySelectorAll('#time-range button').forEach(btn => {
  btn.addEventListener('click', () => {
    if (currentSymbol) {
      document.getElementById('stock-info').innerHTML = 'Loading chart...';
      updateChart(currentSymbol, btn.dataset.range);
    }
  });
});

function trade(type, price) {
  if (type === 'buy' && balance >= price) balance -= price;
  else if (type === 'sell') balance += price;
  document.getElementById('balance').innerText = balance.toFixed(2);
}

async function updateChart(symbol, range) {
  try {
    const resp = await fetch(`/api/stock?symbol=${encodeURIComponent(symbol)}&range=${encodeURIComponent(range)}`);
    if (!resp.ok) {
      const txt = await resp.text();
      console.error('Proxy error', resp.status, txt);
      document.getElementById('stock-info').innerHTML += `<p>No chart data available (proxy error).</p>`;
      return;
    }

    const json = await resp.json();
    console.log('updateChart fetched json', json);
    if (!json || !json.candles || json.candles.length === 0) {
      document.getElementById('stock-info').innerHTML += `<p>No chart data available.</p>`;
      return;
    }

    // Transform to financial plugin format: { x: Date, o,h,l,c }
    const financialData = json.candles.map(c => ({
      x: new Date(c.t),
      o: c.o,
      h: c.h,
      l: c.l,
      c: c.c
    }));

    const canvas = document.getElementById('stockChart');
    const ctx = canvas.getContext('2d');
    // destroy existing Chart instances attached to the canvas
    try {
      const existing = Chart.getChart(canvas);
      if (existing) existing.destroy();
    } catch (e) { /* ignore */ }
    if (chart) { try { chart.destroy(); } catch (e) {} chart = null; }
    const container = document.getElementById('chart-container');
    if (container) container.style.display = 'block';

    // By default draw a line chart (close prices). If user requested candlestick, attempt that.
    const labels = financialData.map(d => d.x);
    const closePrices = financialData.map(d => d.c);
    try {
      chart = new Chart(ctx, {
        type: 'line',
        data: {
          labels,
          datasets: [{ label: `${symbol} Close`, data: closePrices, borderColor: 'blue', fill: false }]
        },
        options: { responsive: true, maintainAspectRatio: false }
      });
    } catch (lineErr) {
      console.error('line chart render failed', lineErr);
      document.getElementById('stock-info').innerHTML += `<pre>${lineErr.stack}</pre>`;
    }

    if (preferCandlestick) {
      // attempt to create candlestick chart (may fail if controllers aren't registered)
      try {
        // destroy current line chart first
        const existing = Chart.getChart(canvas);
        if (existing) existing.destroy();
        chart = new Chart(ctx, { type: 'candlestick', data: { datasets: [{ label: `${symbol} Candles`, data: financialData }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day' } }, y: { title: { display: true, text: 'Price ($)' } } } } });
      } catch (chartErr) {
        console.error('candlestick attempt failed', chartErr);
        // try to register controllers and retry once
        try {
          const toRegister = [];
          if (window.CandlestickController) toRegister.push(window.CandlestickController);
          if (window.CandlestickElement) toRegister.push(window.CandlestickElement);
          if (window.OhlcController) toRegister.push(window.OhlcController);
          if (window.OhlcElement) toRegister.push(window.OhlcElement);
          if (toRegister.length) Chart.register(...toRegister);
        } catch (regErr) { console.error('register failed', regErr); }

        try {
          const existing2 = Chart.getChart(canvas);
          if (existing2) existing2.destroy();
          chart = new Chart(ctx, { type: 'candlestick', data: { datasets: [{ label: `${symbol} Candles`, data: financialData }] }, options: { responsive: true, maintainAspectRatio: false, scales: { x: { type: 'time', time: { unit: 'day' } }, y: { title: { display: true, text: 'Price ($)' } } } } });
        } catch (retryErr) {
          console.error('candlestick retry failed', retryErr);
          // keep the line chart and show message
          document.getElementById('stock-info').innerHTML += `<p>Could not render candlestick chart: ${retryErr.message}</p>`;
        }
      }
      // reset prefer flag so next navigation keeps default behavior
      preferCandlestick = false;
    }
  } catch (err) {
    console.error('updateChart error', err);
    document.getElementById('stock-info').innerHTML += `<p>Error loading chart.</p><pre>${err.stack}</pre>`;
  }
}
