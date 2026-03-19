import express from "express";
import path from "path";
import { fileURLToPath } from "url";
import fetch from "node-fetch";

const app = express();
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const ALPHA_KEY = "SE35V6BRI6YHQ6TJ";

app.get("/api/alpha", async (req, res) => {
  const symbol = (req.query.symbol || "").toUpperCase();
  const func = req.query.function || "GLOBAL_QUOTE";

  if (!symbol) return res.status(400).json({ error: "Symbol required" });

  try {
    const url = `https://www.alphavantage.co/query?function=${func}&symbol=${symbol}&apikey=${API_KEY}`;
    const response = await fetch(url);
    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: "server_error" });
  }
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = 3000;
app.listen(PORT, () =>
  console.log(`Server running at http://localhost:${PORT}`),
);
