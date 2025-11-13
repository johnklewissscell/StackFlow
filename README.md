# StackFlow

This repository is a small stock simulator web app with an optional local AI assistant (StackAI).

Features
- Web UI (index.html + index.js) to fetch stock price & chart data via a server-side proxy.
- Server: `server.js` (Express) serves static files, provides `/api/stock` proxy for Yahoo Finance chart data, and `/api/stackai` for AI chat.
- Optional Chat AI:
  - If `OPENAI_API_KEY` is set, the server will use OpenAI Chat Completions for high-quality replies.
  - Otherwise the server attempts to spawn a local Python runner (`StackAI/run_chat.py`) which imports `StackAI/chatbot.py`.
  - If Python or the model is not available, the server returns a safe fallback reply so the chat UI still works.
- Candlestick support via `chartjs-chart-financial` (when served/registered correctly).

Quick start (Node.js)

Requirements
- Node.js (v16+ recommended)
- npm
- Optional: Python 3.x (if you want to run the local Chatbot) and Python packages (`transformers`, `torch`) for the real model.

Install dependencies
```powershell
npm install
```

Start server
```powershell
# from project root
npm run start
# Server will be available at http://localhost:3000
```

Try the site
- Open http://localhost:3000/ in your browser.
- Use the symbol input and "Get Price" to fetch price and chart data.
- Use the chat panel to ask StackAI questions.

  Another way to view the site is using stackflow-1.web.app

Chat AI: options

1) Use OpenAI (recommended for high quality)
- Set your OpenAI API key in the environment before starting the server:
```powershell
$env:OPENAI_API_KEY = "sk-..."
npm run start
```
- The server will call the OpenAI Chat Completions API and return its reply.

2) Use local Python Chatbot
- Create a Python virtual environment and install dependencies (example):
```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install --upgrade pip
pip install transformers torch
```
- Restart the Node server (server will spawn `python`/`py`/`python3` to run `StackAI/run_chat.py`).

3) No Python / No OpenAI
- The server will return a friendly fallback reply (non-actionable) so the chat UI remains useful.

Configuration
- `OPENAI_API_KEY`: optional. When set, OpenAI is used first.
- `OPENAI_MODEL`: optional. Default `gpt-3.5-turbo`.
- `PYTHON_CMD`: optional. If your Python binary is not on PATH or has a custom name, set this to the executable path.

Candlestick plugin (chartjs-chart-financial)
- The project tries to serve the plugin from `/vendor/node_modules/...` but if you see a 404 or the browser reports "candlestick is not a registered controller", do the following:
```powershell
mkdir vendor
copy node_modules\chartjs-chart-financial\dist\chartjs-chart-financial.min.js vendor\
# then update the <script> tag in index.html to load /vendor/chartjs-chart-financial.min.js if you changed it
```
- Hard-refresh the browser after making the change.

Troubleshooting
- If `npm run start` exits or crashes with a python spawn error (ENOENT), install Python or set `PYTHON_CMD`.
- If the browser reports "Failed to fetch" when using the chat, check the server is running and accessible at `http://localhost:3000`.
- For more verbose server logs, run `node server.js` directly and observe console output.

Security & Notes
- Do not commit your `OPENAI_API_KEY` to source control.
- The local Chatbot using `transformers` may download large model files and requires GPU/CPU resources. Use small models for local testing.

Next improvements
- Add prompt enrichment: include recent stock candles in the prompt sent to the model so replies are context-aware.
- Add tests for the /api endpoints.
- Add a lightweight Dockerfile for consistent local environment.

If you want, I can:
- Start the server and test the chat endpoint here now.
- Copy the financial plugin into `vendor/` and update `index.html` so candlesticks load reliably.
- Add a short UI disclaimer into the chat panel.

Tell me which of these you want me to do next.
