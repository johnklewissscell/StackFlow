const liveMarket = {};
const marketHistory = {};

const STARTING_PRICES = {
  "AAPL": 249.12,
  "TSLA": 382.45,
  "NVDA": 178.90,
  "GME": 15.20,
  "BTC": 72000.00
};

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

function ensureHistoryExists(symbol) {
  if (!marketHistory[symbol]) {
    let price = STARTING_PRICES[symbol] || 100;
    let data = [];
    const now = Date.now();
    for (let i = 60; i >= 0; i--) {
      const change = (Math.random() * 10) - 5;
      price += change;
      data.push({
        x: now - (i * 30000),
        o: price - (change / 2),
        h: price + Math.abs(change),
        l: price - Math.abs(change),
        c: price
      });
    }
    marketHistory[symbol] = data;
    liveMarket[symbol] = price;
  }
}

export async function getStockPrice(symbol) {
  ensureHistoryExists(symbol);
  return liveMarket[symbol];
}

export function getCompanyName(symbol) {
  return symbol;
}

export function updateMarketPrices() {
  if (!isMarketOpen()) return;

  Object.keys(marketHistory).forEach(symbol => {
    const change = (Math.random() * 10) - 5;
    liveMarket[symbol] += change;
    if (liveMarket[symbol] < 0.01) liveMarket[symbol] = 0.01;

    const newPoint = {
      x: Date.now(),
      o: liveMarket[symbol] - change,
      h: Math.max(liveMarket[symbol], liveMarket[symbol] - change) + 1,
      l: Math.min(liveMarket[symbol], liveMarket[symbol] - change) - 1,
      c: liveMarket[symbol]
    };
    
    marketHistory[symbol].push(newPoint);
    if (marketHistory[symbol].length > 100) marketHistory[symbol].shift();
  });
}

setInterval(updateMarketPrices, 30000);

export async function getHistoricalData(symbol) {
  ensureHistoryExists(symbol);
  return marketHistory[symbol];
}