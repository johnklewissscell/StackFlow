import express from "express";
import fetch from "node-fetch";
import path from "path";
import { fileURLToPath } from "url";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const API_KEY = "SE35V6BRI6YHQ6TJ";

app.get("/api/alpha", async (req, res) => {
  const symbol = (req.query.symbol || "").toUpperCase();
  if (!symbol) return res.status(400).json({ error: "symbol required" });

  try {
    const quoteUrl = `https://www.alphavantage.co/query?function=GLOBAL_QUOTE&symbol=${symbol}&apikey=${API_KEY}`;
    const overviewUrl = `https://www.alphavantage.co/query?function=OVERVIEW&symbol=${symbol}&apikey=${API_KEY}`;

    const [quoteResp, overviewResp] = await Promise.all([fetch(quoteUrl), fetch(overviewUrl)]);
    const quoteData = await quoteResp.json();
    const overviewData = await overviewResp.json();

    const price = parseFloat(quoteData["Global Quote"]?.["05. price"]) || null;
    const companyName = overviewData.Name || symbol;

    res.json({ symbol, companyName, price });
  } catch (err) {
    console.error("Alpha fetch error", err);
    res.status(500).json({ error: "server_error" });
  }
});

const PORT = 3000;
app.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));