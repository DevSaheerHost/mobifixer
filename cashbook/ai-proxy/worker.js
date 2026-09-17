/**
 * Cashbook AI proxy — Cloudflare Worker.
 *
 * Holds the Gemini + Groq API keys as Worker SECRETS (never in the repo) and
 * forwards requests from the cashbook app, injecting the key server-side so no
 * key is ever shipped to the browser.
 *
 * Routes:
 *   POST /gemini/v1beta/models/{model}:generateContent  -> Google Generative Language
 *   GET  /gemini/v1beta/models                          -> list models (for discovery)
 *   POST /groq/chat                                     -> Groq OpenAI-compatible chat
 *   GET  /health                                        -> { ok: true }
 *
 * Secrets (wrangler secret put ...): GEMINI_KEY, GROQ_KEY
 * Optional var: ALLOWED_ORIGINS (comma-separated).
 */

const DEFAULT_ALLOWED = [
  'https://mobifixer.vercel.app',
  'http://localhost:3000',
  'http://localhost:5500',
  'http://127.0.0.1:5500',
];

function allowedOrigins(env) {
  if (env && env.ALLOWED_ORIGINS) {
    return env.ALLOWED_ORIGINS.split(',').map(s => s.trim()).filter(Boolean);
  }
  return DEFAULT_ALLOWED;
}

function corsHeaders(origin, env) {
  const allow = allowedOrigins(env);
  const ok = origin && allow.includes(origin);
  return {
    'Access-Control-Allow-Origin': ok ? origin : allow[0],
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    'Vary': 'Origin',
  };
}

function isAllowed(origin, env) {
  // No Origin (curl/health checks) is fine; browsers must be on the allow-list.
  return !origin || allowedOrigins(env).includes(origin);
}

function errorJson(cors, status, message, code) {
  return new Response(JSON.stringify({ error: { status, message } }), {
    status: code || 400,
    headers: { ...cors, 'Content-Type': 'application/json' },
  });
}

async function passthrough(upstream, cors) {
  const body = await upstream.text();
  return new Response(body, {
    status: upstream.status,
    headers: { ...cors, 'Content-Type': upstream.headers.get('Content-Type') || 'application/json' },
  });
}

export default {
  async fetch(request, env) {
    const origin = request.headers.get('Origin') || '';
    const cors = corsHeaders(origin, env);

    if (request.method === 'OPTIONS') {
      return new Response(null, { status: 204, headers: cors });
    }
    if (!isAllowed(origin, env)) {
      return errorJson(cors, 'PERMISSION_DENIED', 'Origin not allowed', 403);
    }

    const url = new URL(request.url);
    const path = url.pathname;

    try {
      if (path === '/' || path === '/health') {
        return new Response(JSON.stringify({ ok: true }), {
          status: 200, headers: { ...cors, 'Content-Type': 'application/json' },
        });
      }

      // ---- Gemini ----
      if (path.startsWith('/gemini/')) {
        if (!env.GEMINI_KEY) return errorJson(cors, 'FAILED_PRECONDITION', 'GEMINI_KEY not configured', 500);
        const upstreamPath = path.slice('/gemini/'.length);
        const sep = url.search ? '&' : '?';
        const target = `https://generativelanguage.googleapis.com/${upstreamPath}${url.search}${sep}key=${env.GEMINI_KEY}`;
        const upstream = await fetch(target, {
          method: request.method,
          headers: { 'Content-Type': 'application/json' },
          body: request.method === 'POST' ? await request.text() : undefined,
        });
        return passthrough(upstream, cors);
      }

      // ---- Groq ----
      if (path === '/groq/chat' && request.method === 'POST') {
        if (!env.GROQ_KEY) return errorJson(cors, 'FAILED_PRECONDITION', 'GROQ_KEY not configured', 500);
        const upstream = await fetch('https://api.groq.com/openai/v1/chat/completions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${env.GROQ_KEY}` },
          body: await request.text(),
        });
        return passthrough(upstream, cors);
      }

      return errorJson(cors, 'NOT_FOUND', 'Unknown route', 404);
    } catch (e) {
      return errorJson(cors, 'UNKNOWN', String((e && e.message) || e), 502);
    }
  },
};
