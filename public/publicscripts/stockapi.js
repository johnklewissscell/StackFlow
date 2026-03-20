const liveMarket = {};

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

export async function getStockPrice(symbol) {
  if (!liveMarket[symbol]) {
    liveMarket[symbol] = STARTING_PRICES[symbol] || Math.floor(Math.random() * 400) + 20;
  }
  return liveMarket[symbol];
}

export function updateMarketPrices() {
  if (!isMarketOpen()) return;

  Object.keys(STARTING_PRICES).forEach(symbol => {
    if (!liveMarket[symbol]) liveMarket[symbol] = STARTING_PRICES[symbol];

    const change = (Math.random() * 10) - 5;
    liveMarket[symbol] += change;
    
    if (liveMarket[symbol] < 0.01) liveMarket[symbol] = 0.01;
  });
}

setInterval(updateMarketPrices, 30000);

export async function getHistoricalData(symbol, range = "1M") {
  let price = await getStockPrice(symbol);
  let data = [];
  const points = range === "1Y" ? 100 : 30;
  for (let i = points; i >= 0; i--) {
    let d = new Date();
    d.setDate(d.getDate() - i);
    price += (Math.random() * 10) - 5;
    data.push({ x: d.getTime(), o: price, h: price + 2, l: price - 2, c: price });
  }
  return data;
}