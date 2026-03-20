const liveMarket = {};
const marketHistory = {};

function isMarketOpen() {
  const now = new Date();
  const etString = now.toLocaleString("en-US", { timeZone: "America/New_York" });
  const etDate = new Date(etString);
  const day = etDate.getDay();
  const hour = etDate.getHours();
  const minute = etDate.getMinutes();
  
  if (day === 0 || day === 6) return false;
  const totalMinutes = (hour * 60) + minute;
  return totalMinutes >= 570 && totalMinutes < 960;
}

function getDeterministicStartPrice(symbol) {
  let hash = 0;
  for (let i = 0; i < symbol.length; i++) {
    hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
  }
  return Math.abs(hash % 900) + 10;
}

function ensureStockExists(symbol) {
  if (!marketHistory[symbol]) {
    let price = getDeterministicStartPrice(symbol);
    let data = [];
    const now = Date.now();
    for (let i = 1825; i >= 0; i--) {
      const change = (Math.random() * 10) - 5;
      price += change;
      data.push({
        x: now - (i * 86400000),
        o: price - change,
        h: price + 2,
        l: price - 2,
        c: price
      });
    }
    marketHistory[symbol] = data;
    liveMarket[symbol] = price;
  }
}

export async function getStockPrice(symbol) {
  ensureStockExists(symbol);
  return liveMarket[symbol];
}

export async function getCompanyName(symbol) {
  return `${symbol} Asset`;
}

export async function getHistoricalData(symbol, range = "1M") {
  ensureStockExists(symbol);
  const allData = marketHistory[symbol];
  let points;
  if (range === "1D") points = 20;
  else if (range === "1M") points = 30;
  else if (range === "1Y") points = 365;
  else points = 1825;
  return allData.slice(-points);
}

function tick() {
  if (!isMarketOpen()) return;
  Object.keys(marketHistory).forEach(symbol => {
    const change = (Math.random() * 10) - 5;
    liveMarket[symbol] += change;
    if (liveMarket[symbol] < 0.01) liveMarket[symbol] = 0.01;
    marketHistory[symbol].push({
      x: Date.now(),
      o: liveMarket[symbol] - change,
      h: liveMarket[symbol] + 1,
      l: liveMarket[symbol] - 1,
      c: liveMarket[symbol]
    });
    marketHistory[symbol].shift();
  });
}

setInterval(tick, 30000);