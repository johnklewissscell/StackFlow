// api/stock.js
import express from "express";
import fetch from "node-fetch"; // npm install node-fetch

const router = express.Router();
const API_KEY = "GQOVP7IEEHP0PGOH"; // Replace with your key

router.get("/stock", async (req, res) => {
  const symbol = (req.query.symbol || "AAPL").toUpperCase();
  const functionType = "TIME_SERIES_DAILY"; // simplest for testing

  const url = `https://www.alphavantage.co/query?function=${functionType}&symbol=${symbol}&apikey=${API_KEY}`;

  try {
    const response = await fetch(url);
    const data = await response.json();

    const series = data["Time Series (Daily)"];
    if (!series) return res.json({ candles: [], companyName: symbol });

    const candles = Object.entries(series)
      .slice(0, 60) // last 60 days
      .map(([date, values]) => ({
        t: new Date(date).getTime(),
        o: parseFloat(values["1. open"]),
        h: parseFloat(values["2. high"]),
        l: parseFloat(values["3. low"]),
        c: parseFloat(values["4. close"]),
        v: parseFloat(values["5. volume"])
      }))
      .reverse(); // oldest → newest

    res.json({ candles, companyName: symbol });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message, candles: [], companyName: symbol });
  }
});

export default router;
