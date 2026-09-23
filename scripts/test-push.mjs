#!/usr/bin/env node
/**
 * Unit tests for the push sender's pure logic (push-worker/worker.js).
 *
 * These cover the decisions that decide whether a shop gets spammed, missed,
 * or told the wrong thing — due selection, payload shape and stale-token
 * pruning. They run with no network and no credentials.
 *
 * What they deliberately do NOT cover: the live FCM round trip and Google
 * OAuth, which need real credentials and a reachable fcm.googleapis.com.
 * Those are verified by deploying and sending to a real phone.
 *
 *   node scripts/test-push.mjs
 */
import { selectDue, buildMessage, isDeadToken, getCachedAccessToken, _resetTokenCache } from '../push-worker/worker.js';

let pass = 0, fail = 0;
const ck = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else { fail++; console.log(`  FAIL  ${name}${detail ? '  -> ' + detail : ''}`); }
};

const NOW = 1_700_000_000_000;
const min = (n) => n * 60000;

console.log('\nWhich reminders are due');
{
  const reminders = {
    101: { sn: 101, dueAt: NOW - min(5), fired: false },
    102: { sn: 102, dueAt: NOW + min(5), fired: false },   // future
    103: { sn: 103, dueAt: NOW - min(5), fired: true },    // already sent
    104: { sn: 104, dueAt: NOW },                          // exactly now
    105: { sn: 105, dueAt: 0, fired: false },              // no time set
    106: null,                                             // deleted mid-read
  };
  const due = selectDue(reminders, NOW).map(r => Number(r.sn)).sort((a, b) => a - b);
  ck('picks up a reminder that has passed', due.includes(101));
  ck('leaves a future reminder alone', !due.includes(102), JSON.stringify(due));
  ck('never re-sends one already fired', !due.includes(103));
  ck('fires exactly on the boundary', due.includes(104));
  ck('ignores a reminder with no due time', !due.includes(105));
  ck('survives a null entry', Array.isArray(due) && !due.includes(106));
  ck('finds only the two it should', due.length === 2, JSON.stringify(due));
  ck('empty and missing input are safe', selectDue({}, NOW).length === 0 && selectDue(null, NOW).length === 0);
  ck('falls back to the key when sn is absent',
    selectDue({ 777: { dueAt: NOW - 1 } }, NOW)[0].sn === '777');
}

console.log('\nThe message a phone receives');
{
  const rem = { sn: 1206, dueAt: NOW - min(1) };
  const job = { name: 'Arun Kumar', devices: [{ model: 'Realme 9 Pro' }] };
  const m = buildMessage('tok-abc', 'demoshop', rem, job, NOW).message;
  ck('addressed to the device token', m.token === 'tok-abc');
  ck('is data-only, so sw.js draws it', !m.notification && !!m.data, JSON.stringify(Object.keys(m)));
  ck('names the customer', /Arun Kumar/.test(m.data.title), m.data.title);
  ck('includes job number and device', /#1206/.test(m.data.body) && /Realme 9 Pro/.test(m.data.body), m.data.body);
  ck('tagged per job so it replaces, never stacks', m.data.tag === 'mobifixer-reminder-1206');
  ck('every data value is a string (FCM requirement)',
    Object.values(m.data).every(v => typeof v === 'string'), JSON.stringify(m.data));

  const onTime = buildMessage('t', 's', { sn: 1, dueAt: NOW }, null, NOW).message;
  ck('a punctual reminder is not called overdue', !/Overdue/.test(onTime.data.title), onTime.data.title);

  const late = buildMessage('t', 's', { sn: 1, dueAt: NOW - min(180) }, null, NOW).message;
  ck('a late one says overdue', /Overdue/.test(late.data.title), late.data.title);
  ck('  and says how late', /180 min ago/.test(late.data.body), late.data.body);

  const noJob = buildMessage('t', 's', { sn: 42, dueAt: NOW }, null, NOW).message;
  ck('copes with a deleted job', /#42/.test(noJob.data.title), noJob.data.title);
  const noDev = buildMessage('t', 's', { sn: 43, dueAt: NOW }, { name: 'X', devices: [] }, NOW).message;
  ck('copes with a job that has no device', /#43/.test(noDev.data.body), noDev.data.body);
}

console.log('\nPruning tokens for phones that are gone');
{
  ck('404 is dead', isDeadToken(404, ''));
  ck('UNREGISTERED is dead', isDeadToken(400, '{"error":{"status":"UNREGISTERED"}}'));
  ck('NOT_FOUND is dead', isDeadToken(400, 'NOT_FOUND'));
  ck('a server wobble is NOT dead', !isDeadToken(500, 'INTERNAL'), 'must not delete a good token');
  ck('a rate limit is NOT dead', !isDeadToken(429, 'QUOTA_EXCEEDED'));
  ck('an auth problem is NOT dead', !isDeadToken(401, 'UNAUTHENTICATED'));
}

console.log('\nThe OAuth token is not re-minted every minute');
{
  // Google's token lasts an hour; the cron runs every minute. Signing a fresh
  // RS256 JWT 60 times an hour is the only real CPU this Worker spends, and CPU
  // per invocation is the tightest limit on Cloudflare's free tier.
  //
  // A real RSA key, so this exercises the actual signing path rather than
  // stubbing the thing under test.
  const { generateKeyPairSync } = await import('node:crypto');
  const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  const SA = {
    client_email: 'push@example.iam.gserviceaccount.com',
    private_key: privateKey.export({ type: 'pkcs8', format: 'pem' })
  };

  let mints = 0;
  const fakeFetch = async () => {
    mints++;
    return { ok: true, json: async () => ({ access_token: 'tok-' + mints }) };
  };

  _resetTokenCache();
  const t0 = Date.parse('2026-01-01T00:00:00Z');

  const first = await getCachedAccessToken(SA, fakeFetch, t0);
  ck('the first run mints a token', first === 'tok-1', first);

  await getCachedAccessToken(SA, fakeFetch, t0 + 60 * 1000);
  ck('a minute later it reuses it', mints === 1, `minted ${mints} times`);

  const late = await getCachedAccessToken(SA, fakeFetch, t0 + 54 * 60 * 1000);
  ck('and still at 54 minutes', mints === 1 && late === 'tok-1', `minted ${mints} times`);

  await getCachedAccessToken(SA, fakeFetch, t0 + 56 * 60 * 1000);
  ck('it refreshes before the hour is up, not after', mints === 2, `minted ${mints} times`);

  // 60 runs an hour used to mean 60 signatures and 60 OAuth round trips. Two
  // now, not one: 60 minutes of runs crosses the 55-minute refresh once.
  _resetTokenCache();
  let hourly = 0;
  const counting = async () => { hourly++; return { ok: true, json: async () => ({ access_token: 't' }) }; };
  for (let m = 0; m < 60; m++) await getCachedAccessToken(SA, counting, t0 + m * 60 * 1000);
  ck('an hour of runs costs two signatures, not sixty', hourly === 2, `${hourly} in 60 runs`);

  const { readFileSync: read } = await import('node:fs');
  ck('and the sweep uses the cached getter',
     read('push-worker/worker.js', 'utf8').includes('getCachedAccessToken(sa, fetch, now)'));
  _resetTokenCache();
}

console.log('\nWhat sw.js draws when a push arrives');
{
  const { readFileSync } = await import('node:fs');
  const src = readFileSync('sw.js', 'utf8');
  const listeners = {};
  const shown = [];
  const self = {
    addEventListener: (t, fn) => { listeners[t] = fn; },
    registration: {
      scope: 'https://devsaheerhost.github.io/mobifixer/',
      showNotification: (title, opts) => { shown.push({ title, opts }); return Promise.resolve(); }
    },
    skipWaiting: () => {},
    clients: { matchAll: async () => [], openWindow: async () => {} }
  };
  new Function('self', 'clients', src)(self, self.clients);
  ck('sw.js registers a push handler', typeof listeners.push === 'function');

  const fire = (payload) => {
    shown.length = 0;
    listeners.push({
      data: { json: () => payload, text: () => JSON.stringify(payload) },
      waitUntil: () => {}
    });
    return shown[0];
  };

  const n = fire({ data: { title: 'Reminder - Arun Kumar', body: '#1206 - Realme 9 Pro', tag: 'mobifixer-reminder-1206' } });
  ck('uses the pushed title and body', n.title === 'Reminder - Arun Kumar' && /#1206/.test(n.opts.body), JSON.stringify(n));
  ck('keeps the per-job tag', n.opts.tag === 'mobifixer-reminder-1206');
  ck('uses the real logo, not a square', /notification-logo\.png/.test(n.opts.icon), n.opts.icon);
  ck('uses the transparent badge', /badge-96\.png/.test(n.opts.badge), n.opts.badge);

  const bare = fire({ title: 'Flat', body: 'no data wrapper' });
  ck('accepts a payload without the data wrapper', bare.title === 'Flat', JSON.stringify(bare));

  shown.length = 0;
  listeners.push({ data: null, waitUntil: () => {} });
  ck('an empty push still shows something rather than throwing', shown.length === 1 && !!shown[0].title, JSON.stringify(shown));

  shown.length = 0;
  listeners.push({ data: { json: () => { throw new Error('bad json'); }, text: () => 'plain text' }, waitUntil: () => {} });
  ck('malformed JSON falls back to text', shown.length === 1, JSON.stringify(shown));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
