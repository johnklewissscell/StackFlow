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
  
  const drift = (seededRandom(symbolSeed) - 0.45) * 0.8; 
  const volatility = (symbolSeed % 10) / 4 + 0.2;
  
  let price = (symbolSeed % 400) + 100;
  const intervals = Math.floor(timestamp / 3600000); 
  
  for (let i = 0; i < 500; i++) {
    const stepSeed = symbolSeed + (intervals - (500 - i));
    const change = (seededRandom(stepSeed) - 0.5) * 15 * volatility;
    price += change + drift;
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
  let points;
  let intervalGap;

  if (range === "1D") {
    points = 60;
    intervalGap = 600000;
  } else if (range === "1M") {
    points = 30;
    intervalGap = 86400000;
  } else if (range === "1Y") {
    points = 52;
    intervalGap = 604800000;
  } else {
    points = 60;
    intervalGap = 2592000000;
  }

  for (let i = points; i >= 0; i--) {
    const t = now - (i * intervalGap);
    const p = getPriceAtTime(symbol, t);
    
    const candleSeed = Math.floor(t / 1000) + symbol.length;
    const v = p * 0.02;
    
    const open = p + (seededRandom(candleSeed) * v - (v / 2));
    const close = p + (seededRandom(candleSeed + 1) * v - (v / 2));
    const high = Math.max(open, close) + (seededRandom(candleSeed + 2) * v);
    const low = Math.min(open, close) - (seededRandom(candleSeed + 3) * v);

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