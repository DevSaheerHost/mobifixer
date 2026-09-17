# Cashbook AI Proxy (Cloudflare Worker)

A tiny **free** Cloudflare Worker that keeps the **Gemini** and **Groq** API keys
**server-side** (as Worker secrets), so they never ship to the browser. The
cashbook app calls this Worker instead of calling the AI providers directly.

## Why
A public repo can't hold live API keys — they get scanned, auto-revoked and
abused. This Worker holds the keys as secrets and injects them per request.

## Deploy (one time, ~5 minutes)

1. Install Wrangler and log in:
   ```bash
   npm install -g wrangler
   wrangler login
   ```

2. From this folder (`cashbook/ai-proxy/`), deploy:
   ```bash
   wrangler deploy
   ```

3. Set the two secrets (paste each key when prompted):
   ```bash
   wrangler secret put GEMINI_KEY
   wrangler secret put GROQ_KEY
   ```
   Use **freshly rotated** keys — rotate any key that was previously exposed.

4. Copy the URL Wrangler prints, e.g.
   `https://cashbook-ai-proxy.<your-subdomain>.workers.dev`
   then set it as `AI_PROXY` in `cashbook/main.js`.

## Restricting access
Only origins in `ALLOWED_ORIGINS` (or the defaults in `worker.js`) may call the
Worker from a browser. To change them, uncomment `[vars]` in `wrangler.toml`,
or:
```bash
wrangler deploy --var ALLOWED_ORIGINS:"https://mobifixer.vercel.app"
```

## Routes
- `POST /gemini/v1beta/models/{model}:generateContent`
- `GET  /gemini/v1beta/models`
- `POST /groq/chat`
- `GET  /health` -> `{ "ok": true }`

## Rotating keys later
```bash
wrangler secret put GEMINI_KEY
wrangler secret put GROQ_KEY
```
No app redeploy needed.
