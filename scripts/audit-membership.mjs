#!/usr/bin/env node
/**
 * Read-only audit of cashbook shop membership.
 *
 * This is the go/no-go gate for Phase 2 (flipping ENFORCE_MEMBERSHIP to true
 * in cashbook/main.js). Run it, read the verdict, and only enforce once every
 * active shop reports READY.
 *
 * Usage:
 *   1. Firebase Console -> Realtime Database (project recat-auth-test)
 *      -> the three-dot menu -> Export JSON
 *   2. node scripts/audit-membership.mjs <path-to-export.json>
 *
 * It writes nothing and contacts no network. It deliberately prints only shop
 * usernames, counts and booleans -- never an email address, password, token
 * or API key -- so its output is safe to paste into a chat or an issue.
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
let ready = 0, claimable = 0, blocked = 0;

for (const shop of names) {
  const s = shops[shop] || {};
  const memberUids = Object.keys(s.members || {});
  // Provenance matters: under today's open rules a client-written claim is
  // only as trustworthy as the rules are. A server-side backfill is not.
  const viaBackfill = memberUids.filter(u => (s.members[u] || {}).claimedVia === 'backfill');
  const viaClient   = memberUids.filter(u => (s.members[u] || {}).claimedVia === 'client-claim');
  const hasSignupEmail = Boolean(s.signupInfo && s.signupInfo.email);

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
      blocked++;
    } else {
      status = 'READY';
      const prov = [];
      if (viaBackfill.length) prov.push(`${viaBackfill.length} server-backfilled`);
      if (viaClient.length) prov.push(`${viaClient.length} client-claimed`);
      note = `${memberUids.length} member uid(s)${prov.length ? ' (' + prov.join(', ') + ')' : ''}`;
      ready++;
    }
  } else if (hasSignupEmail) {
    status = 'PENDING';
    note = 'no members yet; will self-claim on the owner\'s next login';
    claimable++;
  } else {
    status = 'BLOCKED';
    note = 'no members AND no signupInfo.email - cannot self-claim';
    blocked++;
  }

  rows.push({ shop, status, note, tally, clientClaimed: viaClient.length > 0 });
}

console.log('\nCashbook membership audit');
console.log('='.repeat(72));
console.log(`${pad('SHOP', 24)}${pad('STATUS', 10)}NOTE`);
console.log('-'.repeat(72));
for (const r of rows) {
  console.log(`${pad(r.shop, 24)}${pad(r.status, 10)}${r.note}`);
  const t = Object.entries(r.tally);
  if (t.length) console.log(`${' '.repeat(34)}login outcomes: ${t.map(([k, v]) => `${k}=${v}`).join(', ')}`);
}
console.log('-'.repeat(72));
console.log(`${names.length} shops | READY ${ready} | PENDING ${claimable} | needs attention ${blocked}`);

const anyClientClaimed = rows.some(r => r.clientClaimed);
if (blocked === 0 && claimable === 0) {
  console.log('\nVerdict: safe to set ENFORCE_MEMBERSHIP = true in cashbook/main.js.');
  if (anyClientClaimed) {
    console.log('  Caveat: some mappings were written by the client, which anyone');
    console.log('  could forge while the database rules are still open. Re-run a');
    console.log('  server-side backfill first if you want this gate to be trustworthy.');
  }
} else {
  console.log('\nVerdict: DO NOT enforce yet.');
  if (claimable) console.log(`  - ${claimable} shop(s) still need their owner to log in once to self-claim.`);
  if (blocked) console.log(`  - ${blocked} shop(s) need a manual decision (see REVIEW / BLOCKED rows).`);
}
console.log('');
