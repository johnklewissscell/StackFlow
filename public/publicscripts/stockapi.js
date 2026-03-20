const liveMarket = {};
const marketHistory = {};

function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

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

function getPriceAtTime(symbol, timestamp) {
  let symbolSeed = 0;
  for (let i = 0; i < symbol.length; i++) {
    symbolSeed += symbol.charCodeAt(i);
  }
  
  let price = (symbolSeed % 500) + 20;
  const intervals = Math.floor(timestamp / 30000);
  
  for (let i = 0; i < 100; i++) {
    const stepSeed = symbolSeed + (intervals - (100 - i));
    const move = (seededRandom(stepSeed) * 10) - 5;
    price += move;
  }
  
  return Math.max(0.01, price);
}

export async function getStockPrice(symbol) {
  const now = Date.now();
  return getPriceAtTime(symbol, now);
}

export async function getCompanyName(symbol) {
  return `${symbol} Asset`;
}

export async function getHistoricalData(symbol, range = "1M") {
  const now = Date.now();
  let data = [];
  let points, intervalGap;

  if (range === "1D") { points = 40; intervalGap = 30000; } 
  else if (range === "1M") { points = 30; intervalGap = 86400000; } 
  else if (range === "1Y") { points = 100; intervalGap = 315360000; } 
  else { points = 200; intervalGap = 788400000; }

  for (let i = points; i >= 0; i--) {
    const t = now - (i * intervalGap);
    const p = getPriceAtTime(symbol, t);
    
    // Create some variance so the candles have shapes
    const volatility = p * 0.01; 
    const open = p + (seededRandom(t) * volatility - (volatility / 2));
    const close = p + (seededRandom(t + 1) * volatility - (volatility / 2));
    const high = Math.max(open, close) + (seededRandom(t + 2) * (volatility / 0.5));
    const low = Math.min(open, close) - (seededRandom(t + 3) * (volatility / 0.5));

    data.push({
      x: t,
      o: open,
      h: high,
      l: Math.max(0.01, low),
      c: close
    });
  }
  return data;
}