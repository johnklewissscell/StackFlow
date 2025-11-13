import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import sql from "mssql";
import bcrypt from "bcryptjs";

const app = express();

// Must come BEFORE any POST routes!
app.use(express.json());

// Get directory path
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// --- SQL Server Config ---
const dbConfig = {
  user: "sa", // or your username
  password: "did8trip",
  server: "localhost\\SQLEXPRESS",
  database: "StackFlowDB",
  options: {
    trustServerCertificate: true
  }
};


// Express static files from public folder
app.use(express.static(path.join(__dirname, "public")));

// Serve index.html at root
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// --- STOCK API ---
app.get('/api/stock', async (req, res) => {
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
app.post("/signup", async (req, res) => {
  const { username, email, password } = req.body;

  if (!username || !email || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const pool = await sql.connect(dbConfig);

    // Check if username or email already exists
    const existing = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .query("SELECT * FROM Users WHERE username=@username OR email=@email");

    if (existing.recordset.length > 0)
      return res.status(400).json({ error: "User already exists" });

    const hashed = await bcrypt.hash(password, 10);

    await pool
      .request()
      .input("username", sql.NVarChar, username)
      .input("email", sql.NVarChar, email)
      .input("password", sql.NVarChar, hashed)
      .query(
        "INSERT INTO Users (username, email, password) VALUES (@username, @email, @password)"
      );

    res.json({ success: true, message: "Account created successfully!" });
  } catch (err) {
    console.error("Signup error:", err.message || err);
    res.status(500).json({ error: "Database connection failed. Check your SQL Server settings." });
  }
});

// --- LOGIN ---
app.post("/login", async (req, res) => {
  const { username, password } = req.body;

  if (!username || !password)
    return res.status(400).json({ error: "All fields required" });

  try {
    const pool = await sql.connect(dbConfig);

    const result = await pool
      .request()
      .input("username", sql.NVarChar, username)
      .query("SELECT * FROM Users WHERE username=@username OR email=@username");

    if (result.recordset.length === 0)
      return res.status(400).json({ error: "User not found" });

    const user = result.recordset[0];
    const match = await bcrypt.compare(password, user.password);

    if (!match) return res.status(401).json({ error: "Incorrect password" });

    // SUCCESS → frontend should redirect to app.html
    res.json({ success: true, redirect: "/app.html" });
  } catch (err) {
    console.error("Login error:", err.message || err);
    res.status(500).json({ error: "Database connection failed. Check your SQL Server settings." });
  }
});



// Start server
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
});
