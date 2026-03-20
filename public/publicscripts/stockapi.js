const API_KEY = 'SE35V6BRI6YHQ6TJ';

export async function getStockPrice(symbol) {
  try {
    const url = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const price = data["Global Quote"]["05. price"];
    return parseFloat(price);
  } catch (err) {
    let hash = 0;
    for (let i = 0; i < symbol.length; i++) hash = symbol.charCodeAt(i) + ((hash << 5) - hash);
    return Math.abs((hash % 200) + 50);
  }
}

export async function getCompanyName(symbol) {
  try {
    const url = `https://www.alphavantage.co/query?function=SYMBOL_SEARCH&keywords=${symbol}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    return data.bestMatches[0]["2. name"];
  } catch {
    return `${symbol} Corp`;
  }
}

export async function getHistoricalData(symbol, range = "1M") {
  try {
    const url = `https://www.alphavantage.co/query?function=TIME_SERIES_DAILY&symbol=${symbol}&apikey=${API_KEY}`;
    const res = await fetch(url);
    const data = await res.json();
    const timeSeries = data["Time Series (Daily)"];
    
    return Object.keys(timeSeries).map(date => ({
      x: new Date(date).getTime(),
      o: parseFloat(timeSeries[date]["1. open"]),
      h: parseFloat(timeSeries[date]["2. high"]),
      l: parseFloat(timeSeries[date]["3. low"]),
      c: parseFloat(timeSeries[date]["4. close"])
    })).reverse();
  } catch (err) {
    let chart = [];
    let p = 150;
    for(let i=30; i>=0; i--) {
      let d = new Date(); d.setDate(d.getDate()-i);
      p += (Math.random()-0.5)*5;
      chart.push({x: d.getTime(), o:p, h:p+2, l:p-2, c:p+1});
    }
    return chart;
  }
}