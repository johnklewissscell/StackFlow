import express from "express";
import cors from "cors";
import { onRequest } from "firebase-functions/v2/https";

const app = express();

// Middleware
app.use(cors({ origin: true }));
app.use(express.json());

// In-memory user storage for demo
const users = {};

// --- STOCK API ---
app.get('/stock', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const range = req.query.range || '1M';
  if (!symbol) return res.status(400).json({ error: 'symbol query required' });

  try {
    const map = {
      '1D': { r: '1d', interval: '5m' },
      '1M': { r: '1mo', interval: '1d' },
      '1Y': { r: '1y', interval: '1d' },
      '5Y': { r: '5y', interval: '1d' }
    };
    const cfg = map[range] || map['1M'];
    const url = `https://query1.finance.yahoo.com/v8/finance/chart/${symbol}?range=${cfg.r}&interval=${cfg.interval}`;
    const r = await fetch(url);
    if (!r.ok) return res.status(502).json({ error: 'upstream_fetch_failed' });
    const json = await r.json();
    if (!json.chart || !json.chart.result) return res.status(404).json({ error: 'no_data' });

    const result = json.chart.result[0];
    const ts = result.timestamp || [];
    const quote = (result.indicators && result.indicators.quote && result.indicators.quote[0]) || {};
    const o = quote.open || [];
    const h = quote.high || [];
    const l = quote.low || [];
    const c = quote.close || [];

    const candles = ts.map((t, i) => ({
      t: new Date(t * 1000).toISOString(),
      o: o[i] == null ? null : +o[i],
      h: h[i] == null ? null : +h[i],
      l: l[i] == null ? null : +l[i],
      c: c[i] == null ? null : +c[i]
    })).filter(cndl => cndl.o != null && cndl.h != null && cndl.l != null && cndl.c != null);

    let companyName = (result.meta && (result.meta.longName || result.meta.shortName || result.meta.instrumentName)) || symbol;
    
    if (!companyName || companyName.toUpperCase() === symbol.toUpperCase()) {
      const localMap = {
        'AAPL': 'Apple Inc.',
        'MSFT': 'Microsoft Corporation',
        'GOOGL': 'Alphabet Inc.',
        'GOOG': 'Alphabet Inc.',
        'AMZN': 'Amazon.com, Inc.',
        'TSLA': 'Tesla, Inc.'
      };
      if (localMap[symbol.toUpperCase()]) companyName = localMap[symbol.toUpperCase()];
    }

    res.json({ symbol, range, candles, companyName });
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// --- SIGNUP ---
app.post("/signup", (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  if (users[username] || Object.values(users).find(u => u.email === email)) {
    return res.status(400).json({ error: "User already exists" });
  }

  users[username] = { email, password };
  res.json({ success: true, message: "Account created successfully!" });
});

// --- LOGIN ---
app.post("/login", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "All fields required" });

  const user = users[username];
  if (!user || user.password !== password) {
    return res.status(401).json({ error: "Invalid credentials" });
  }

  res.json({ success: true, redirect: "/app.html" });
});

// Export the Express app as a Cloud Function
export const api = onRequest(app);
