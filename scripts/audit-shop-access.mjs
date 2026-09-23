#!/usr/bin/env node
/**
 * Reads a Realtime Database export and reports, per shop, whether it is ready
 * for Firebase Security Rules to be switched on.
 *
 * The rules in firebase/service-app.rules.json grant access on
 * `auth.uid === owner.uid`. A shop with no uid recorded would be locked out of
 * its own data the moment those rules go live — so this has to say READY for
 * every active shop first. That is the whole reason it exists.
 *
 * It reads a local file and nothing else: no network, no credentials, no
 * writes. Emails are masked and passwords are never printed — only whether one
 * is still there.
 *
 *   Firebase console -> Realtime Database -> ⋮ -> Export JSON
 *   node scripts/audit-shop-access.mjs ~/Downloads/c24o-c038b-export.json
 */
import { readFileSync } from 'node:fs';

const file = process.argv[2];
if (!file) {
  console.error('usage: node scripts/audit-shop-access.mjs <export.json>');
  process.exit(2);
}

let root;
try {
  root = JSON.parse(readFileSync(file, 'utf8'));
} catch (err) {
  console.error('Could not read that export: ' + err.message);
  process.exit(2);
}

// Accept the whole database export or just the shops subtree.
const shops = root.shops || root;
if (!shops || typeof shops !== 'object') {
  console.error('No "shops" node in that file. Export the whole database, or just the shops subtree.');
  process.exit(2);
}

const mask = (e) => {
  const s = String(e || '');
  const [u, d] = s.split('@');
  return (u && d) ? `${u.slice(0, 2)}***@${d}` : '(none)';
};

const rows = [];
for (const [name, shopRaw] of Object.entries(shops)) {
  const shop = shopRaw && typeof shopRaw === 'object' ? shopRaw : {};
  const owner = shop.owner && typeof shop.owner === 'object' ? shop.owner : {};

  const ownerUid = owner.uid || shop.uid || null;
  const email = owner.email || shop.email || null;
  const members = shop.members && typeof shop.members === 'object' ? shop.members : null;
  const memberUids = members ? Object.keys(members) : [];
  const plaintext = typeof shop.password === 'string' && shop.password.length > 0;
  const services = shop.service && typeof shop.service === 'object' ? Object.keys(shop.service).length : 0;

  // owner as a bare string plus a top-level email is the shape the removed
  // Google sign-in wrote. Those shops have no password, so they need one set
  // before they can log in any other way.
  const googleShape = typeof shop.owner === 'string';

  const provenance = {};
  for (const uid of memberUids) {
    const via = (members[uid] && members[uid].claimedVia) || 'unknown';
    provenance[via] = (provenance[via] || 0) + 1;
  }

  let verdict, why;
  if (googleShape) { verdict = 'NEEDS-MIGRATION'; why = 'created by Google sign-in (now removed) — needs a password set'; }
  else if (!ownerUid && !memberUids.length && !email) { verdict = 'AT-RISK'; why = 'no uid and no email — cannot be mapped or recovered automatically'; }
  else if (!ownerUid && !memberUids.length) { verdict = 'NEEDS-MIGRATION'; why = 'no uid recorded — maps itself on next login, or use the backfill'; }
  else if (plaintext) { verdict = 'NEEDS-MIGRATION'; why = 'mapped, but still carries a plaintext password to clear'; }
  else { verdict = 'READY'; why = ''; }

  rows.push({ name, verdict, why, ownerUid: !!ownerUid, members: memberUids.length,
              provenance, plaintext, email: mask(email), hasEmail: !!email, services });
}

rows.sort((a, b) => (a.verdict === b.verdict ? b.services - a.services : a.verdict.localeCompare(b.verdict)));

const pad = (s, n) => String(s).padEnd(n);
console.log('');
console.log(pad('SHOP', 22) + pad('VERDICT', 18) + pad('UID', 5) + pad('MEMBERS', 9) + pad('PW', 4) + pad('JOBS', 6) + 'EMAIL');
console.log('-'.repeat(96));
for (const r of rows) {
  console.log(
    pad(r.name.slice(0, 21), 22) + pad(r.verdict, 18) + pad(r.ownerUid ? 'yes' : '—', 5) +
    pad(r.members || '—', 9) + pad(r.plaintext ? 'YES' : '—', 4) + pad(r.services, 6) + r.email
  );
  if (r.why) console.log(' '.repeat(22) + '↳ ' + r.why);
}

const count = (v) => rows.filter(r => r.verdict === v).length;
const ready = count('READY'), needs = count('NEEDS-MIGRATION'), risk = count('AT-RISK');
const claimed = rows.reduce((n, r) => n + (r.provenance['client-claim'] || 0), 0);
const backfilled = rows.reduce((n, r) => n + (r.provenance['backfill'] || 0), 0);

console.log('');
console.log(`${rows.length} shops: ${ready} READY, ${needs} NEEDS-MIGRATION, ${risk} AT-RISK`);
console.log(`member records: ${claimed} client-claimed, ${backfilled} server-backfilled`);
if (claimed && !backfilled) {
  console.log('');
  console.log('Note: every mapping so far is a client claim, which is only as trustworthy as');
  console.log('the rules — and the rules are still open. Run the server-side backfill before');
  console.log('treating these numbers as proof.');
}
console.log('');
if (ready === rows.length) {
  console.log('✅ Every shop is mapped. ENFORCE_SHOP_ACCESS can be switched on.');
} else {
  console.log(`⛔ Do NOT enable rules yet — ${needs + risk} shop(s) would lose access to their own data.`);
}
console.log('');
process.exit(0);
