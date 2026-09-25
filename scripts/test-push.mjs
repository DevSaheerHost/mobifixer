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
import worker, { selectDue, buildMessage, isDeadToken, getCachedAccessToken, _resetTokenCache, sweep } from '../push-worker/worker.js';
import { readFileSync, writeFileSync, unlinkSync } from 'node:fs';
import { execFileSync } from 'node:child_process';

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

/* ---------------------------------------------------------------------------
 * Getting a token saved in the first place.
 *
 * The worker can be running perfectly and still send nothing: it reads
 * shops/<shop>/pushTokens, and if the shop has no token there, there is nowhere
 * to deliver to. registerPush() was called once at load and returned early
 * unless permission was ALREADY granted, so a person who allowed notifications
 * and carried on never got a token written until their next load.
 * ------------------------------------------------------------------------ */

console.log('\nThe device registers when permission is given, not a load later');
{
  const main = readFileSync('main.js', 'utf8');

  ck('asking for permission and registering is one step',
     /async function askForPushPermission\(\)/.test(main));
  ck('and it registers as soon as permission comes back granted',
     /if \(permission !== 'granted'\) return;\s*\n\s*const result = await registerPush\(\);/.test(main));

  // Both prompts must go through it; neither may call requestPermission alone.
  // Comments stripped - main.js explains the change in prose, and the phrase
  // "Notification.requestPermission()" appears in two of those explanations.
  const code = main.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^[ \t]*\/\/.*$/gm, '');
  const prompts = [...code.matchAll(/Notification\.requestPermission\(\)/g)].length;
  ck('only one place asks the browser', prompts === 1, String(prompts));
  ck('and the dead notification helper that was a second route is gone',
     !/notification\s*=\s*\(msg\)/.test(main));
  ck('while sw.js is still registered exactly once',
     (code.match(/serviceWorker\.register\(/g) || []).length === 1,
     String((code.match(/serviceWorker\.register\(/g) || []).length));
  // Matched against the comment-stripped source. An earlier version of this
  // check keyed on the explanatory comment above the call, which would have
  // passed with the call itself deleted.
  const calls = [...code.matchAll(/(?<!function )askForPushPermission\(\)/g)].length;
  ck('both prompts call it, and nothing else does', calls === 2, String(calls));
  ck('the reminder sheet goes through it, next to the reminder it just saved',
     /logActivity\('reminder'[\s\S]{0,200}askForPushPermission\(\);/.test(code));
  ck('so does the settings toggle', /if \(on\) askForPushPermission\(\);/.test(code));

  ck('registerPush says why it failed rather than failing silently',
     ["'not-configured'", "'no-shop'", "'unsupported'", "'not-granted'", "'no-token'", "'ok'"]
       .every(r => main.includes('return ' + r)));
  ck('a blocked permission is explained rather than re-prompted',
     /Notification\.permission === 'denied'/.test(main) && /Notifications are blocked/.test(main));
  ck('and success is confirmed, so it is testable from the shop floor',
     /This device will be told even when the app is closed/.test(main));
  // Anchored to the write itself. Matching the path anywhere in main.js passed
  // with the write moved elsewhere, because the same path is spelt out again
  // where a device unsubscribes.
  const WRITE = /await update\(ref\(db, `shops\/\$\{shopName\}\/pushTokens\/\$\{pushDeviceId\(\)\}`\)/;
  ck('the token is written under the shop, keyed by device', WRITE.test(code));

  // And the worker reads that same node. Two halves of one contract, in two
  // files, with nothing between them to keep them honest.
  const wsrc = readFileSync('push-worker/worker.js', 'utf8');
  ck('which is exactly the node the worker reads',
     /dbGet\(env, `shops\/\$\{shop\}\/pushTokens`/.test(wsrc));
}

console.log('\n/health can say whether the worker is configured to send');
{
  const w = readFileSync('push-worker/worker.js', 'utf8');
  ck('it reports whether the service account parses', /out\.serviceAccount = 'parsed'/.test(w));
  ck('and names truncation, which is how it failed the first time',
     /truncated\? `wrangler secret put` reads one line/.test(w));
  ck('it reports whether a token can actually be minted', /out\.canMintToken = !!\(await getAccessToken\(sa\)\)/.test(w));
  ck('and whether RUN_KEY was ever set', /runKeySet: !!env\.RUN_KEY/.test(w));

  ck('and /run still needs the key', /url\.searchParams\.get\('key'\) === env\.RUN_KEY && env\.RUN_KEY/.test(w));
}

console.log('\n/health answers without handing out the service account');
{
  // Actually call it. Guessing at the source with regexes was how the first
  // version of this check "passed" - it matched `out.hasPrivateKey =
  // !!sa.private_key`, which is a boolean, and would have missed a real leak
  // written any other way.
  // The PEM markers are assembled rather than written out, so that this
  // fixture does not trip scripts/check.mjs, which refuses to let anything
  // shaped like a private key be committed. The guard is not being loosened to
  // make room for the fixture - it is still proved below to catch a real one.
  const BEGIN = '-----' + 'BEGIN PRIVATE KEY' + '-----';
  const END = BEGIN.replace('BEGIN', 'END');
  const FAKE_KEY = `${BEGIN}\nMIIfake0000SECRET0000KEYMATERIAL\n${END}\n`;
  const FAKE_EMAIL = 'pusher@c24o-c038b.iam.gserviceaccount.com';
  const sa = JSON.stringify({ type: 'service_account', project_id: 'c24o-c038b',
    private_key_id: 'deadbeef', private_key: FAKE_KEY, client_email: FAKE_EMAIL });

  const env = { FIREBASE_SERVICE_ACCOUNT: sa, PROJECT_ID: 'c24o-c038b',
                DATABASE_URL: 'https://example.invalid', RUN_KEY: '' };
  const res = await worker.fetch(new Request('https://w.dev/health'), env);
  const body = await res.text();
  const json = JSON.parse(body);

  ck('it answers as JSON', res.status === 200 && typeof json === 'object');
  ck('and says the service account parsed', json.serviceAccount === 'parsed', json.serviceAccount);
  ck('that the key is present, as a boolean only', json.hasPrivateKey === true);
  ck('and that RUN_KEY is not set, which is why /run is unusable',
     json.runKeySet === false, String(json.runKeySet));

  ck('the private key is not in the response', !body.includes('SECRET'), body.slice(0, 120));
  ck('nor any part of the PEM', !/BEGIN PRIVATE KEY|MIIfake/.test(body));
  ck('nor the service account address', !body.includes(FAKE_EMAIL), body.slice(0, 120));
  ck('nor the raw secret', !body.includes('private_key_id') && !body.includes('deadbeef'));
  ck('a fake key cannot mint a token, and it says so rather than pretending',
     json.ok === false && json.canMintToken === false, JSON.stringify(json.ok));
  ck('and any error it reports is short and not key material',
     !json.tokenError || (json.tokenError.length <= 200 && !json.tokenError.includes('SECRET')),
     String(json.tokenError));

  // A truncated secret is the failure this endpoint was added for.
  const cut = await worker.fetch(new Request('https://w.dev/health'),
    { ...env, FIREBASE_SERVICE_ACCOUNT: sa.slice(0, 40) });
  const cutJson = await cut.json();
  ck('a truncated secret is named as such',
     /not-json/.test(cutJson.serviceAccount), cutJson.serviceAccount);
  ck('with its length, so the size is obvious at a glance',
     cutJson.serviceAccountLength === 40, String(cutJson.serviceAccountLength));

  const none = await (await worker.fetch(new Request('https://w.dev/health'),
    { ...env, FIREBASE_SERVICE_ACCOUNT: '' })).json();
  ck('and a missing one is not mistaken for a broken one',
     none.serviceAccount === 'missing' && none.ok === false, none.serviceAccount);

  // /run still guards the part that reads the database.
  const run = await worker.fetch(new Request('https://w.dev/run'), env);
  ck('/run is refused without the key', run.status === 404, String(run.status));
  ck('and refused with a wrong one',
     (await worker.fetch(new Request('https://w.dev/run?key=guess'), { ...env, RUN_KEY: 'real' })).status === 404);
}

console.log('\nA broken secret is loud rather than silent');
{
  // sweep() used to start with a bare JSON.parse and be handed to waitUntil
  // with no .catch. A truncated secret therefore threw once a minute into
  // nothing at all, which is exactly how this shipped looking healthy while
  // sending nothing.
  const wsrc = readFileSync('push-worker/worker.js', 'utf8');
  ck('the scheduled sweep catches its own failure',
     /ctx\.waitUntil\(sweep\(env\)[\s\S]{0,200}\.catch\(/.test(wsrc));

  let err = null;
  try { await sweep({ FIREBASE_SERVICE_ACCOUNT: '{"type":"service_account","private_key":"-----B' }); }
  catch (e) { err = e; }
  ck('a truncated secret throws rather than sweeping nothing', !!err);
  ck('and the message names the cause', /not valid JSON/.test(err?.message || ''), err?.message);
  ck('with the length, which is how truncation is spotted',
     /47 chars/.test(err?.message || ''), err?.message);
  ck('and does not quote the secret back into the log',
     !/private_key|BEGIN/.test(err?.message || ''), err?.message);

  let missing = null;
  try { await sweep({}); } catch (e) { missing = e; }
  ck('an unset secret says so', /is not set/.test(missing?.message || ''), missing?.message);

  let partial = null;
  try { await sweep({ FIREBASE_SERVICE_ACCOUNT: '{"type":"service_account"}' }); }
  catch (e) { partial = e; }
  ck('and a complete-but-useless one says which field is missing',
     /missing client_email or private_key/.test(partial?.message || ''), partial?.message);
}

console.log('\nThe secret scanner still catches a real key');
{
  // The fixture above builds its PEM markers at runtime so it is not itself
  // flagged. That only holds up if the guard is still armed, so prove it: drop
  // a file shaped like a leaked key into the repo and make scripts/check.mjs
  // refuse it. If someone ever loosens that rule to make a test quieter, this
  // is what fails.
  const probe = '.check-probe.tmp.txt';
  let refused = false, why = '';
  try {
    writeFileSync(probe, ['-----', 'BEGIN PRIVATE KEY', '-----'].join('') + '\nMIIprobe\n');
    try { execFileSync(process.execPath, ['scripts/check.mjs'], { stdio: 'pipe' }); why = 'check.mjs passed'; }
    catch (e) { const o = String(e.stdout || '') + String(e.stderr || '');
                refused = o.includes('a PEM private key') && o.includes(probe); why = o.slice(-160); }
  } finally { try { unlinkSync(probe); } catch {} }
  ck('a committed private key is still refused by scripts/check.mjs', refused, why);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
