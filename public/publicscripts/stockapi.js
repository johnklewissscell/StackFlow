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
  
  const trendDirection = (seededRandom(symbolSeed) - 0.5) * 10; 
  const volatility = (symbolSeed % 10) / 5 + 0.2;
  
  let price = (symbolSeed % 400) + 100;
  
  const intervalIndex = Math.floor(timestamp / 30000);
  const historyWindow = 1000;
  const startPoint = intervalIndex - historyWindow;

  for (let i = 0; i < historyWindow; i++) {
    const stepSeed = symbolSeed + (startPoint + i);
    const randomNoise = (seededRandom(stepSeed) - 0.5) * 2 * volatility;
    
    price += trendDirection + randomNoise;
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
    const openPrice = getPriceAtTime(symbol, t);
    const closePrice = getPriceAtTime(symbol, t + (intervalGap * 0.9));
    
    const candleSeed = Math.floor(t / 30000);
    const wickRange = openPrice * 0.015;

    data.push({
      x: t,
      o: openPrice,
      h: Math.max(openPrice, closePrice) + (seededRandom(candleSeed) * wickRange),
      l: Math.min(openPrice, closePrice) - (seededRandom(candleSeed + 1) * wickRange),
      c: closePrice
    });
  }
  return data;
}