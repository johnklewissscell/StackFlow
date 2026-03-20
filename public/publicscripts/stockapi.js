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

function initializeHistory(symbol) {
  if (!marketHistory[symbol]) {
    let price = STARTING_PRICES[symbol] || 100;
    let data = [];
    const now = Date.now();
    for (let i = 100; i >= 0; i--) {
      price += (Math.random() * 10) - 5;
      data.push({ x: now - (i * 30000), o: price, h: price + 2, l: price - 2, c: price });
    }
    marketHistory[symbol] = data;
    liveMarket[symbol] = price;
  }
}

export async function getStockPrice(symbol) {
  if (!liveMarket[symbol]) initializeHistory(symbol);
  return liveMarket[symbol];
}

export function updateMarketPrices() {
  if (!isMarketOpen()) return;

  Object.keys(STARTING_PRICES).forEach(symbol => {
    if (!liveMarket[symbol]) initializeHistory(symbol);

    const change = (Math.random() * 10) - 5;
    liveMarket[symbol] += change;
    if (liveMarket[symbol] < 0.01) liveMarket[symbol] = 0.01;

    const newPoint = {
      x: Date.now(),
      o: liveMarket[symbol] - (change / 2),
      h: Math.max(liveMarket[symbol], liveMarket[symbol] - change),
      l: Math.min(liveMarket[symbol], liveMarket[symbol] - change),
      c: liveMarket[symbol]
    };
    marketHistory[symbol].push(newPoint);
    
    if (marketHistory[symbol].length > 200) marketHistory[symbol].shift();
  });
}

setInterval(updateMarketPrices, 30000);

export async function getHistoricalData(symbol) {
  if (!marketHistory[symbol]) initializeHistory(symbol);
  return marketHistory[symbol];
}

export async function getCompanyName(symbol) {
    return symbol; 
}