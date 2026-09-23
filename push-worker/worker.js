/**
 * Mobifixer reminder push sender.
 *
 * FCM does not schedule anything, so something has to wake at the due time,
 * find what is due and send it. That is this Worker, on a cron trigger.
 *
 * It reads reminders straight from the Realtime Database — the same node the
 * app writes — so there is no second copy to keep in sync.
 *
 * Secrets (never in this repo):
 *   FIREBASE_SERVICE_ACCOUNT  the service account JSON, as one string
 * Vars (wrangler.toml):
 *   PROJECT_ID, DATABASE_URL
 */

const SCOPES = [
  'https://www.googleapis.com/auth/firebase.messaging',
  'https://www.googleapis.com/auth/firebase.database',
  'https://www.googleapis.com/auth/userinfo.email'
].join(' ');

const b64url = (buf) =>
  btoa(String.fromCharCode(...new Uint8Array(buf)))
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');

const pemToArrayBuffer = (pem) => {
  const body = pem.replace(/-----(BEGIN|END) PRIVATE KEY-----/g, '').replace(/\s+/g, '');
  const bin = atob(body);
  const buf = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) buf[i] = bin.charCodeAt(i);
  return buf.buffer;
};

// Google's token is good for an hour, but the cron runs every minute - so the
// first version signed a fresh RS256 JWT and made an OAuth round trip 60 times
// more often than it needed to. On Cloudflare's free tier CPU time per
// invocation is the tightest limit and RSA signing is the only real CPU this
// Worker does, so it is worth not repeating.
//
// Cached in a module global: a Worker isolate is reused across invocations
// often, but not guaranteed, so this is an optimisation and never a
// requirement. Refreshed a minute early to avoid racing the expiry.
let tokenCache = { token: null, expiresAt: 0 };

export function _resetTokenCache() { tokenCache = { token: null, expiresAt: 0 }; }

export async function getCachedAccessToken(sa, fetchImpl = fetch, now = Date.now()) {
  if (tokenCache.token && now < tokenCache.expiresAt) return tokenCache.token;
  const token = await getAccessToken(sa, fetchImpl);
  tokenCache = { token, expiresAt: now + 55 * 60 * 1000 };
  return token;
}

/** Exchange the service account for a short-lived Google OAuth token. */
export async function getAccessToken(sa, fetchImpl = fetch) {
  const now = Math.floor(Date.now() / 1000);
  const header = { alg: 'RS256', typ: 'JWT' };
  const claim = {
    iss: sa.client_email,
    scope: SCOPES,
    aud: 'https://oauth2.googleapis.com/token',
    iat: now,
    exp: now + 3600
  };
  const unsigned =
    b64url(new TextEncoder().encode(JSON.stringify(header))) + '.' +
    b64url(new TextEncoder().encode(JSON.stringify(claim)));

  const key = await crypto.subtle.importKey(
    'pkcs8',
    pemToArrayBuffer(sa.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key, new TextEncoder().encode(unsigned));
  const jwt = unsigned + '.' + b64url(sig);

  const res = await fetchImpl('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'content-type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt
    })
  });
  if (!res.ok) throw new Error(`oauth ${res.status}: ${(await res.text()).slice(0, 200)}`);
  return (await res.json()).access_token;
}

/**
 * Which reminders are due right now.
 * Pure, so it can be unit tested without a network.
 */
export function selectDue(reminders, now) {
  return Object.entries(reminders || {})
    .filter(([, r]) => r && r.fired !== true && Number(r.dueAt) > 0 && Number(r.dueAt) <= now)
    .map(([sn, r]) => ({ ...r, sn: r.sn != null ? r.sn : sn }));
}

/** The data-only payload. sw.js draws the notification from this. */
export function buildMessage(token, shop, rem, job, now) {
  const who = (job && job.name) || `#${rem.sn}`;
  const device = job && Array.isArray(job.devices) && job.devices[0] ? job.devices[0].model : '';
  const lateMin = Math.round((now - Number(rem.dueAt)) / 60000);
  const late = lateMin >= 2;
  return {
    message: {
      token,
      // Data-only. A `notification` block would make FCM's own worker draw it
      // and we would lose the icon, badge and tag.
      data: {
        title: `${late ? 'Overdue reminder' : 'Reminder'} - ${who}`,
        body: [`#${rem.sn}${device ? ' - ' + device : ''}`, late ? `Was due ${lateMin} min ago.` : '']
          .filter(Boolean).join(' '),
        tag: `mobifixer-reminder-${rem.sn}`,
        hash: '',
        shop
      },
      webpush: { headers: { Urgency: 'high', TTL: '3600' } }
    }
  };
}

/** FCM answers for a token that no longer exists; prune those. */
export function isDeadToken(status, bodyText) {
  if (status === 404) return true;
  if (status === 400 && /INVALID_ARGUMENT/.test(bodyText || '') && /token/i.test(bodyText || '')) return true;
  return /UNREGISTERED|NOT_FOUND|InvalidRegistration|NotRegistered/.test(bodyText || '');
}

const dbGet = async (env, path, token, q = '') => {
  const res = await fetch(`${env.DATABASE_URL}/${path}.json${q}`, {
    headers: { Authorization: `Bearer ${token}` }
  });
  if (!res.ok) throw new Error(`db read ${path} ${res.status}`);
  return res.json();
};
const dbPatch = async (env, path, token, body) => {
  await fetch(`${env.DATABASE_URL}/${path}.json`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}`, 'content-type': 'application/json' },
    body: JSON.stringify(body)
  });
};
const dbDelete = async (env, path, token) => {
  await fetch(`${env.DATABASE_URL}/${path}.json`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${token}` }
  });
};

export async function sweep(env, now = Date.now()) {
  const sa = JSON.parse(env.FIREBASE_SERVICE_ACCOUNT);
  const access = await getCachedAccessToken(sa, fetch, now);
  const sent = { shops: 0, due: 0, pushes: 0, pruned: 0 };

  // shallow=true returns only the shop names, so this stays tiny however
  // much data the shops hold.
  const shops = await dbGet(env, 'shops', access, '?shallow=true');
  for (const shop of Object.keys(shops || {})) {
    sent.shops++;
    const reminders = await dbGet(env, `shops/${shop}/reminders`, access);
    const due = selectDue(reminders, now);
    if (!due.length) continue;
    sent.due += due.length;

    const tokens = (await dbGet(env, `shops/${shop}/pushTokens`, access)) || {};
    const entries = Object.entries(tokens).filter(([, t]) => t && t.token);

    for (const rem of due) {
      const job = await dbGet(env, `shops/${shop}/service/${rem.sn}`, access).catch(() => null);
      for (const [id, t] of entries) {
        const res = await fetch(
          `https://fcm.googleapis.com/v1/projects/${env.PROJECT_ID}/messages:send`,
          {
            method: 'POST',
            headers: { Authorization: `Bearer ${access}`, 'content-type': 'application/json' },
            body: JSON.stringify(buildMessage(t.token, shop, rem, job, now))
          }
        );
        if (res.ok) { sent.pushes++; continue; }
        const text = await res.text();
        if (isDeadToken(res.status, text)) {
          await dbDelete(env, `shops/${shop}/pushTokens/${id}`, access);
          sent.pruned++;
        } else {
          console.log(`fcm ${res.status} for ${shop}/${rem.sn}: ${text.slice(0, 160)}`);
        }
      }
      // Mark fired regardless of delivery: the in-app path will still surface
      // it, and a reminder that retries forever would become spam.
      await dbPatch(env, `shops/${shop}/reminders/${rem.sn}`, access, {
        fired: true, firedAt: now, firedBy: 'push'
      });
    }
  }
  return sent;
}

export default {
  async scheduled(_event, env, ctx) {
    ctx.waitUntil(sweep(env).then(r => console.log('sweep', JSON.stringify(r))));
  },
  // Manual trigger for checking the setup after deploy. Requires the same
  // secret, so it cannot be poked by anyone who finds the URL.
  async fetch(req, env) {
    const url = new URL(req.url);
    if (url.pathname === '/health') return new Response('ok');
    if (url.pathname === '/run' && url.searchParams.get('key') === env.RUN_KEY && env.RUN_KEY) {
      try { return Response.json(await sweep(env)); }
      catch (e) { return new Response(String(e), { status: 500 }); }
    }
    return new Response('not found', { status: 404 });
  }
};
