#!/usr/bin/env node
/**
 * Read-only audit of cashbook shop accounts and membership.
 *
 * This is the go/no-go gate for enforcing membership (ENFORCE_MEMBERSHIP in
 * cashbook/main.js). Run it, read the verdict, and only enforce once every
 * active shop reports READY.
 *
 * WHY THIS SCRIPT WAS REWRITTEN
 * The first version asked whether each shop had signupInfo.email, on the
 * assumption that an owner could self-claim their shop on next login. Against
 * the live database that assumption is wrong: signupInfo holds device
 * telemetry (platform/time/userAgent) for most shops and carries an email for
 * only two of twelve. Every other shop would have been reported as simply
 * BLOCKED, with a reason that pointed nowhere.
 *
 * The real split is which of the app's TWO login paths created the shop:
 *
 *   - cashbook/main.js uses Firebase Auth (signInWithEmailAndPassword), so the
 *     account has a uid, and a uid is the only thing a members map can hold.
 *     These shops can be mapped.
 *
 *   - cashbook/auth/index.html writes the password into the database at signup
 *     (:125) and compares it in the browser (:141). There is no uid anywhere,
 *     so there is nothing a members map could be keyed by. These shops cannot
 *     be mapped at all until their owners move to Firebase Auth.
 *
 * So the question is not "has this shop self-claimed yet" but "does this shop
 * have an identity that membership can even refer to".
 *
 * Usage, either way round:
 *   node scripts/audit-membership.mjs <export.json>
 *
 * The export may be a full console export (Realtime Database -> Export JSON)
 * or a presence-only extract. Values are never printed: the script reports
 * usernames, counts and booleans only, so its output is safe to paste into a
 * chat or an issue. It writes nothing and contacts no network.
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/audit-membership.mjs <firebase-export.json>');
  process.exit(2);
}

let root;
try {
  root = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error(`could not read ${file}: ${err.message}`);
  process.exit(2);
}

const shops = root.users || {};
const audit = root.authAudit || {};
const names = Object.keys(shops).sort();

if (!names.length) {
  console.error('no /users node in that export - is it the right database?');
  process.exit(2);
}

const pad = (s, n) => String(s).padEnd(n);
const rows = [];
let ready = 0, mappable = 0, unmappable = 0, review = 0;
const plaintext = [];
const strays = [];

for (const shop of names) {
  const s = shops[shop] || {};

  // A node under /users that carries no account fields is not a shop. /clicks
  // is one of these: a click counter that ended up in the same subtree. Left
  // in the tally it would show as a broken shop forever.
  const looksLikeShop = ['username', 'signupInfo', 'password', 'role', 'fullname']
    .some(k => s[k] !== undefined);
  if (!looksLikeShop) {
    strays.push(shop);
    continue;
  }

  const memberUids = Object.keys(s.members || {});
  // Provenance matters: while the rules are open, a client-written claim is
  // only as trustworthy as the rules are. A server-side backfill is not.
  const viaBackfill = memberUids.filter(u => (s.members[u] || {}).claimedVia === 'backfill');
  const viaClient   = memberUids.filter(u => (s.members[u] || {}).claimedVia === 'client-claim');

  // The two login paths, told apart by what they left behind.
  const hasPassword = s.password !== undefined;
  const hasAuthEmail = Boolean(s.signupInfo && s.signupInfo.email);
  if (hasPassword) plaintext.push(shop);

  const events = Object.values(audit[shop] || {});
  const tally = {};
  for (const e of events) tally[e && e.outcome] = (tally[e && e.outcome] || 0) + 1;
  const seenUids = new Set(events.map(e => e && e.uid).filter(Boolean));

  let status, note;
  if (memberUids.length) {
    // A uid that logged in but is not in the members map is either a real
    // cross-shop attempt or a second legitimate device/account to add.
    const strangers = [...seenUids].filter(u => !memberUids.includes(u));
    if (strangers.length) {
      status = 'REVIEW';
      note = `${strangers.length} uid(s) logged in that are not members`;
      review++;
    } else {
      status = 'READY';
      const prov = [];
      if (viaBackfill.length) prov.push(`${viaBackfill.length} server-backfilled`);
      if (viaClient.length) prov.push(`${viaClient.length} client-claimed`);
      note = `${memberUids.length} member uid(s)${prov.length ? ' (' + prov.join(', ') + ')' : ''}`;
      ready++;
    }
  } else if (hasAuthEmail) {
    status = 'MAPPABLE';
    note = 'Firebase Auth identity, no members map yet - can be backfilled';
    mappable++;
  } else {
    status = 'NO-UID';
    note = hasPassword
      ? 'password-in-database login: no uid exists to map'
      : 'no Firebase Auth identity and no password: cannot be mapped or logged in';
    unmappable++;
  }

  rows.push({ shop, status, note, tally, hasPassword, clientClaimed: viaClient.length > 0 });
}

console.log('\nCashbook shop account audit');
console.log('='.repeat(78));
console.log(`${pad('SHOP', 24)}${pad('STATUS', 10)}${pad('PWD', 5)}NOTE`);
console.log('-'.repeat(78));
for (const r of rows) {
  console.log(`${pad(r.shop, 24)}${pad(r.status, 10)}${pad(r.hasPassword ? 'db' : '-', 5)}${r.note}`);
  const t = Object.entries(r.tally);
  if (t.length) console.log(`${' '.repeat(39)}login outcomes: ${t.map(([k, v]) => `${k}=${v}`).join(', ')}`);
}
console.log('-'.repeat(78));
console.log(`${rows.length} shops | READY ${ready} | MAPPABLE ${mappable} | NO-UID ${unmappable} | REVIEW ${review}`);
if (strays.length) {
  console.log(`\nNot shops, ignored: ${strays.join(', ')} (no account fields under /users)`);
}

if (plaintext.length) {
  console.log(`\nCRITICAL: ${plaintext.length} of ${rows.length} shops store a password in the`);
  console.log('database, which cashbook/auth/index.html compares in the browser.');
  console.log('While /users is world-readable those passwords are readable by anyone,');
  console.log('and no database rule can fix that - the field has to stop being stored.');
  console.log(`  affected: ${plaintext.join(', ')}`);
}

const blockers = unmappable + mappable + review;
if (blockers === 0) {
  console.log('\nVerdict: safe to set ENFORCE_MEMBERSHIP = true in cashbook/main.js.');
  if (rows.some(r => r.clientClaimed)) {
    console.log('  Caveat: some mappings were written by the client, which anyone');
    console.log('  could forge while the database rules are still open. Re-run a');
    console.log('  server-side backfill first if you want this gate to be trustworthy.');
  }
} else {
  console.log('\nVerdict: DO NOT enforce membership yet.');
  if (unmappable) console.log(`  - ${unmappable} shop(s) have no uid at all; enforcing locks them out permanently.`);
  if (mappable) console.log(`  - ${mappable} shop(s) have an identity but no members map; backfill them first.`);
  if (review) console.log(`  - ${review} shop(s) need a manual decision (see REVIEW rows).`);
}
console.log('');
