import express from "express";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";

console.log('server.js executing...');

process.on('uncaughtException', (err) => {
  console.error('uncaughtException:', err && err.stack ? err.stack : err);
});
process.on('unhandledRejection', (reason) => {
  console.error('unhandledRejection:', reason && reason.stack ? reason.stack : reason);
});

const app = express();
const _filename = fileURLToPath(import.meta.url);
const _dirname = path.dirname(_filename);

app.use((req, res, next) => {
  console.log(new Date().toISOString(), req.method, req.url);
  next();
});

// Early root handler: explicitly serve index.html for '/' before any static middleware
app.get('/', (req, res) => {
  console.log('early root handler invoked for', req.originalUrl);
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    return res.sendFile(path.join(_dirname, 'index.html'), (err) => {
      if (err) {
        console.error('early root sendFile error', err);
        if (!res.headersSent) res.status(500).send('server error');
      }
    });
  } catch (e) {
    console.error('early root handler failed', e);
    return res.status(500).send('server error');
  }
});

// Serve static files and use index.html as the default index for '/'
app.use(express.static(_dirname, { index: 'index.html' }));
app.use('/vendor', express.static(path.join(_dirname, 'vendor')));
app.use('/vendor/node_modules', express.static(path.join(_dirname, 'node_modules')));

app.get('/vendor_debug/financial', (req, res) => {
  try {
    const pluginPath = path.join(_dirname, 'node_modules', 'chartjs-chart-financial', 'dist', 'chartjs-chart-financial.min.js');
    console.log('debug: pluginPath =', pluginPath);
    import('fs').then(fs => {
      const exists = fs.existsSync(pluginPath);
      console.log('debug: exists =', exists);
      if (!exists) return res.status(404).send('plugin file not found on disk');
      res.sendFile(pluginPath);
    }).catch(err => {
      console.error('debug: fs import error', err);
      res.status(500).send('server fs error');
    });
  } catch (err) {
    console.error('debug route error', err);
    res.status(500).send('server error');
  }
});

app.get('/api/stock', async (req, res) => {
  const symbol = (req.query.symbol || '').toUpperCase();
  const range = req.query.range || '1M';
  if (!symbol) return res.status(400).json({ error: 'symbol query required' });

  try {
    // map range to Yahoo params
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

    // build candles array with ISO timestamps and numeric OHLC
    const candles = ts.map((t, i) => ({
      t: new Date(t * 1000).toISOString(),
      o: o[i] == null ? null : +o[i],
      h: h[i] == null ? null : +h[i],
      l: l[i] == null ? null : +l[i],
      c: c[i] == null ? null : +c[i]
    })).filter(cndl => cndl.o != null && cndl.h != null && cndl.l != null && cndl.c != null);

    res.json({ symbol, range, candles });
  } catch (err) {
    console.error('proxy error', err);
    res.status(500).json({ error: 'server_error' });
  }
});

// Fallback root handler placed late to guarantee '/' returns index.html in all cases
app.get('/', (req, res) => {
  console.log('fallback root handler invoked for', req.originalUrl)
  try {
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate')
    res.set('Pragma', 'no-cache')
    res.set('Expires', '0')
    return res.sendFile(path.join(_dirname, 'index.html'))
  } catch (e) {
    console.error('fallback root send failed', e)
    return res.status(500).send('server error')
  }
})

app.listen(3000, () => {
  console.log("Server running at http://localhost:3000");
});

// POST /api/stackai - forward prompt to Python runner and return reply
app.use(express.json());
app.post('/api/stackai', async (req, res) => {
  const prompt = (req.body && req.body.prompt) ? String(req.body.prompt) : '';
  if (!prompt) return res.status(400).json({ error: 'prompt required' });

  try {
    // If an OpenAI API key is configured, prefer using OpenAI for higher-quality responses.
    const OPENAI_KEY = process.env.OPENAI_API_KEY;
    if (OPENAI_KEY) {
      try {
        const model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
        // Minimal system instruction to keep answers helpful and non-actionable for finance
        const systemMsg = process.env.OPENAI_SYSTEM_PROMPT || 'You are StackAI, a helpful assistant. When asked finance or investment questions, give general information only and include a clear non-actionable disclaimer.';
        const oaResp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${OPENAI_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            model,
            messages: [ { role: 'system', content: systemMsg }, { role: 'user', content: prompt } ],
            max_tokens: 700,
            temperature: 0.8
          })
        });

        if (!oaResp.ok) {
          const txt = await oaResp.text();
          console.error('OpenAI error', oaResp.status, txt);
          // fall through to python runner below
        } else {
          const body = await oaResp.json();
          const reply = (body.choices && body.choices[0] && (body.choices[0].message && body.choices[0].message.content)) || body.choices?.[0]?.text;
          if (reply) return res.json({ reply, provider: 'openai' });
        }
      } catch (oe) {
        console.error('OpenAI request failed', oe);
        // continue to fallback runner
      }
    }
    // helper to run the python runner with a few candidate executables
    async function runPythonRunner(promptText) {
      const { spawn } = await import('child_process');
      const candidates = [];
      if (process.env.PYTHON_CMD) candidates.push(process.env.PYTHON_CMD);
      // try Windows launcher and common names
      candidates.push('py', 'python', 'python3');

      for (const cmd of candidates) {
        try {
          const runnerPath = path.join(_dirname, 'StackAI', 'run_chat.py');
          const proc = spawn(cmd, [runnerPath], { stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true });
          let stdout = '';
          let stderr = '';
          proc.stdout.on('data', d => { stdout += d.toString(); });
          proc.stderr.on('data', d => { stderr += d.toString(); });

          proc.stdin.write(JSON.stringify({ prompt: promptText }));
          proc.stdin.end();

          const result = await new Promise(resolve => {
            // Allow more time for a local model to initialize on first run (may download weights)
            const timeoutMs = 120_000; // 120s
            const timer = setTimeout(() => {
              try { proc.kill(); } catch (e) {}
              resolve({ error: 'timeout', stderr });
            }, timeoutMs);

            proc.on('error', err => {
              clearTimeout(timer);
              resolve({ error: 'spawn_error', err, stderr });
            });

            proc.on('close', code => {
              clearTimeout(timer);
              resolve({ code, stdout, stderr });
            });
          });

          if (result.error) {
            // If the command wasn't found, try the next candidate
            if (result.error === 'spawn_error' && result.err && result.err.code === 'ENOENT') {
              console.warn(`python candidate not found: ${cmd}`);
              continue;
            }
            return result;
          }
          return result;
        } catch (e) {
          console.error('runner attempt exception for', cmd, e);
          continue;
        }
      }
      return { error: 'no_python' };
    }

    const result = await runPythonRunner(prompt);
    // If no python, fall back to a lightweight JS reply so the UI remains functional
    if (result.error === 'no_python') {
      const fallback = (p) => {
        if (!p || !p.trim()) return 'Please say something.';
        const pp = p.trim().toLowerCase();
        if (pp.includes('hello') || pp.includes('hi')) return "Hi! I'm StackAI (fallback). Ask me about stocks or trading.";
        if (pp.includes('price') || pp.includes('stock')) return "I can fetch stock prices from the site. Try 'Get Price' in the UI.";
        return "Sorry, the AI model isn't available locally. This is a lightweight fallback reply from the server.";
      };
      return res.json({ reply: fallback(prompt), warning: 'python_not_found' });
    }
    if (result.error === 'timeout') {
      return res.status(504).json({ error: 'timeout', detail: result.stderr });
    }
    if (result.error === 'spawn_error') {
      console.error('stackai spawn error', result.err, result.stderr);
      return res.status(500).json({ error: 'spawn_error', detail: String(result.err && result.err.message) });
    }

    if (result.stderr) console.error('StackAI stderr:', result.stderr);
    if (!result.stdout) return res.status(502).json({ error: 'no_response', detail: result.stderr || 'no stdout' });
    try {
      const obj = JSON.parse(result.stdout);
      return res.json(obj);
    } catch (e) {
      return res.status(502).json({ error: 'invalid_response', raw: result.stdout });
    }

  } catch (err) {
    console.error('stackai proxy error', err);
    res.status(500).json({ error: 'server_error' });
  }
});