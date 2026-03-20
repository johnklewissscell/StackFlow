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
  
  const drift = (seededRandom(symbolSeed) - 0.5) * 2;
  const volatility = (symbolSeed % 10) / 5 + 0.5;
  
  let price = (symbolSeed % 500) + 50;
  const intervals = Math.floor(timestamp / 30000);
  
  for (let i = 0; i < 150; i++) {
    const stepSeed = symbolSeed + (intervals - (150 - i));
    const noise = (seededRandom(stepSeed) * 10 - 5) * volatility;
    price += noise + (drift * 2);
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
    points = 40;
    intervalGap = 30000;
  } else if (range === "1M") {
    points = 30;
    intervalGap = 86400000;
  } else if (range === "1Y") {
    points = 100;
    intervalGap = 315360000;
  } else {
    points = 200;
    intervalGap = 788400000;
  }

  for (let i = points; i >= 0; i--) {
    const t = now - (i * intervalGap);
    const p = getPriceAtTime(symbol, t);
    
    const candleSeed = t + symbol.length;
    const bodySize = p * 0.015;
    const wickSize = p * 0.03;
    
    const open = p + (seededRandom(candleSeed) * bodySize - (bodySize / 2));
    const close = p + (seededRandom(candleSeed + 1) * bodySize - (bodySize / 2));
    const high = Math.max(open, close) + (seededRandom(candleSeed + 2) * wickSize);
    const low = Math.min(open, close) - (seededRandom(candleSeed + 3) * wickSize);

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