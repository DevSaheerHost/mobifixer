#!/usr/bin/env node
/**
 * Tests the SERVICE app's database rules against the real rules engine.
 *
 * These rules are the only thing between the internet and every shop's
 * records: the Firebase config ships inside the APK and on the website, so
 * anyone who reads it can call the REST API directly and never open the app.
 * Reasoning about a rule is not the same as running it, and the cost of
 * getting one wrong is either an open database or a shop locked out of its
 * own data mid-shift.
 *
 * So this runs them. It seeds the three record shapes the 2026-09 export
 * actually holds, then checks every path the app uses, as each kind of
 * caller: nobody, the owner, a member, a stranger.
 *
 * Needs the emulator:
 *   firebase emulators:start --only database --project c24o-c038b
 *   node scripts/test-firebase-rules.mjs
 *
 * Skips cleanly when it is not running, so CI without it stays green.
 */
const HOST = process.env.RULES_EMULATOR || 'http://127.0.0.1:9000';
// The emulator serves the rules on <project>-default-rtdb. Point at a bare
// project id and it quietly creates a second, rule-less namespace where
// everything is permitted - which looks exactly like rules that do not work.
const NS = process.env.RULES_NS || 'c24o-c038b-default-rtdb';

/** The emulator trusts an unsigned JWT; only the uid in it matters here. */
const b64 = (o) => Buffer.from(JSON.stringify(o)).toString('base64url');
const token = (uid) =>
  `${b64({ alg: 'none', typ: 'JWT' })}.${b64({
    sub: uid, user_id: uid, iss: `https://securetoken.google.com/${NS}`,
    aud: NS, iat: Math.floor(Date.now() / 1000), exp: Math.floor(Date.now() / 1000) + 3600,
  })}.`;

const url = (path, auth) =>
  `${HOST}/${path}.json?ns=${NS}` + (auth ? `&auth=${encodeURIComponent(auth)}` : '');

/** Admin writes bypass the rules, so the fixtures land whatever they say. */
const seed = (path, body) =>
  fetch(`${HOST}/${path}.json?ns=${NS}`, {
    method: 'PUT',
    headers: { Authorization: 'Bearer owner', 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });

const read = (path, uid) => fetch(url(path, uid && token(uid))).then(r => r.status);
const write = (path, body, uid) =>
  fetch(url(path, uid && token(uid)), {
    method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
  }).then(r => r.status);

const OWNER = 'uid-owner-1';
const MEMBER = 'uid-member-2';
const LEGACY = 'uid-legacy-3';
const STRANGER = 'uid-stranger-9';
const ADMIN = 'uid-admin-7';

let pass = 0, fail = 0;
const ok = (label, got, want) => {
  const good = want === 'allow' ? got < 400 : got >= 400;
  if (good) { pass++; console.log('  ok   ', label); }
  else { fail++; console.log('  FAIL ', label, `(HTTP ${got}, wanted ${want})`); }
};

const up = await fetch(`${HOST}/.json?ns=${NS}`).then(() => true).catch(() => false);
if (!up) {
  console.log('\n  skip   database emulator not running; start it to check the rules\n');
  process.exit(0);
}

// ---------------------------------------------------------------------------
// The three shapes the export actually holds, plus a members map.
await seed('shops/ownershop', {
  shop: 'ownershop',
  owner: { name: 'Owner', email: 'owner@example.com', uid: OWNER },
  service: { 1: { name: 'A customer', number: '9000000000' } },
});
await seed('shops/legacyshop', {
  shop: 'legacyshop', owner: 'Just A Name', uid: LEGACY, email: 'legacy@example.com',
  service: { 1: { name: 'Another customer' } },
});
await seed('shops/teamshop', {
  shop: 'teamshop',
  owner: { name: 'Owner', email: 'team@example.com', uid: OWNER },
  members: { [MEMBER]: { addedAt: 1 } },
  service: { 1: { name: 'Third customer' } },
});
await seed('service', { 1: { legacy: 'pre-multi-tenant record' } });

console.log('\nA stranger cannot reach a shop');
ok('nobody can read a shop', await read('shops/ownershop'), 'deny');
ok('nobody can read its customers', await read('shops/ownershop/service'), 'deny');
ok('a signed-in stranger cannot either', await read('shops/ownershop', STRANGER), 'deny');
ok('  nor write to it', await write('shops/ownershop/service/99', { name: 'x' }, STRANGER), 'deny');
ok('  nor delete the lot', await write('shops/ownershop', null, STRANGER), 'deny');
ok('the root is shut', await read(''), 'deny');
ok('the legacy /service records are shut', await read('service'), 'deny');
ok('  even to a signed-in account', await read('service', STRANGER), 'deny');

console.log('\nThe shop itself still works');
ok('the owner reads their shop', await read('shops/ownershop', OWNER), 'allow');
ok('  and writes a job', await write('shops/ownershop/service/2', { name: 'New' }, OWNER), 'allow');
ok('the legacy top-level uid still opens its shop', await read('shops/legacyshop', LEGACY), 'allow');
ok('  and writes', await write('shops/legacyshop/service/2', { name: 'New' }, LEGACY), 'allow');

console.log('\nMembers are not locked out');
// main.js:5011 reads this map and :5031 treats a uid in it as a member. An
// owner-only rule would have shut every one of them out of their own shop.
ok('a member reads the shop', await read('shops/teamshop', MEMBER), 'allow');
ok('  and writes a job', await write('shops/teamshop/service/2', { name: 'New' }, MEMBER), 'allow');
ok('the owner still gets in too', await read('shops/teamshop', OWNER), 'allow');
ok('a stranger still does not', await read('shops/teamshop', STRANGER), 'deny');

console.log('\nSigning in, and signing up');
// lookupShopEmail runs before anyone is authenticated.
ok('the login lookup reads the email unauthenticated', await read('shops/ownershop/owner/email'), 'allow');
ok('  and the legacy top-level one', await read('shops/legacyshop/email'), 'allow');
ok('but that is the only leaf that is public', await read('shops/ownershop/owner'), 'deny');
ok('  the customers stay shut', await read('shops/ownershop/service/1'), 'deny');
// signup runs a transaction on the new name: that needs read as well as write.
ok('a free name can be read, so the signup transaction runs', await read('shops/brandnew', STRANGER), 'allow');
ok('  and claimed', await write('shops/brandnew', { shop: 'brandnew', owner: { uid: STRANGER } }, STRANGER), 'allow');
ok('  but a taken one cannot be overwritten', await write('shops/ownershop', { hijacked: true }, STRANGER), 'deny');
ok('nobody unauthenticated can claim a name', await write('shops/anothernew', { shop: 'x' }), 'deny');

console.log('\nA shop with an email but no uid anywhere is LOCKED OUT');
// This shape is why these rules are not the whole story. SECURITY-AUDIT.md F4
// says enforcement went on once every shop resolved to `member` "by uid in
// either location, or by the email on the record" - so the email was a real
// fallback for shops carrying no uid. main.js:5060 implements it: match the
// shop's email, then write members/$uid to repair the record.
//
// These rules have no email anchor, so that repair cannot run: the write is
// denied at the same rule that denied the read. The shop can still be found
// (the public leaf), the owner can still sign in, and then every read fails.
// main.js treats an unreadable shop as `allow`, so they are not signed out -
// they get an app with nothing in it.
//
// The one shop the operator calls real carries two uids, so it is unaffected.
// This is pinned as the known limit of the deployed rules, not as desired
// behaviour; the fix is an email anchor in the rule itself:
//   auth.token.email === data.child('owner/email').val()
// which is server-enforced and strictly stronger than the client check.
await seed('shops/emailonly', {
  shop: 'emailonly',
  owner: { name: 'Owner', email: 'owner@example.com' },
  service: { 1: { name: 'A customer' } },
});
const EMAILONLY = 'uid-email-owner-4';
ok('the shop can still be found before login', await read('shops/emailonly/owner/email'), 'allow');
ok('but its owner cannot read it', await read('shops/emailonly', EMAILONLY), 'deny');
ok('  nor their own jobs', await read('shops/emailonly/service', EMAILONLY), 'deny');
ok('  and cannot self-claim to repair it',
   await write(`shops/emailonly/members/${EMAILONLY}`, { claimedVia: 'client-claim' }, EMAILONLY), 'deny');

console.log('\nThe admin, and the limits on one');
// An admin is a uid in /admins, checked by the rules on the server. The
// dangerous half of this is not "can the admin read" - it is everything the
// exception must NOT grant: writing, self-promotion, or any change to what a
// normal account can already do.
await seed('admins', { [ADMIN]: true });

ok('an admin can list the shops', await read('shops', ADMIN), 'allow');
ok('  and read one it is not a member of', await read('shops/ownershop', ADMIN), 'allow');
ok('  including its presence map', await read('shops/ownershop/presence', ADMIN), 'allow');
ok('  and the audit trail', await read('shops/ownershop/authAudit', ADMIN), 'allow');

// Read-only, deliberately. Controls come later and will be their own rules.
ok('an admin CANNOT write to a shop',
   await write('shops/ownershop/service/99', { name: 'x' }, ADMIN), 'deny');
ok('  nor delete one', await write('shops/ownershop', null, ADMIN), 'deny');
ok('  nor write the shop list', await write('shops', { hijacked: true }, ADMIN), 'deny');

// The list is what makes an admin an admin, so nothing may touch it.
ok('nobody can promote themselves', await write(`admins/${STRANGER}`, true, STRANGER), 'deny');
ok('  not even an admin', await write(`admins/${STRANGER}`, true, ADMIN), 'deny');
ok('  and an admin cannot demote another', await write(`admins/${ADMIN}`, null, ADMIN), 'deny');

// An account may ask whether IT is an admin, so the app knows what to show,
// without the list of admins being readable by anyone who asks.
ok('an account can read its own entry', await read(`admins/${ADMIN}`, ADMIN), 'allow');
ok('  a stranger can read theirs, which is absent', await read(`admins/${STRANGER}`, STRANGER), 'allow');
ok('  but not somebody else\'s', await read(`admins/${ADMIN}`, STRANGER), 'deny');
ok('  and the list cannot be enumerated', await read('admins', ADMIN), 'deny');

// The exception must not have loosened anything for everyone else.
ok('a non-admin still cannot list the shops', await read('shops', STRANGER), 'deny');
ok('  nor read a shop it has no part in', await read('shops/ownershop', STRANGER), 'deny');
ok('  and the owner still reads its own', await read('shops/ownershop', OWNER), 'allow');
ok('  and still writes to it', await write('shops/ownershop/service/3', { name: 'ok' }, OWNER), 'allow');

console.log('\nPresence, which the dashboard reads');
ok('a member reports itself', await write('shops/teamshop/presence/d1',
   { online: true, platform: 'apk', lastSeen: 1 }, MEMBER), 'allow');
ok('  a stranger cannot', await write('shops/teamshop/presence/d2',
   { online: true, platform: 'web', lastSeen: 1 }, STRANGER), 'deny');
ok('  nor anonymously', await write('shops/teamshop/presence/d3', { online: true }), 'deny');
ok('  and a stranger cannot read who is online', await read('shops/teamshop/presence', STRANGER), 'deny');

console.log('\nThe audit trail and the click counter');
ok('a refused attempt is still recorded', await write('shops/ownershop/authAudit/x', { outcome: 'mismatch' }, STRANGER), 'allow');
ok('  but a stranger cannot read the trail', await read('shops/ownershop/authAudit', STRANGER), 'deny');
ok('  the shop can', await read('shops/ownershop/authAudit', OWNER), 'allow');
ok('clicks take a signed-in write', await write('clicks/ownershop/1', { at: 1 }, OWNER), 'allow');
ok('  not an anonymous one', await write('clicks/ownershop/2', { at: 1 }), 'deny');
ok('  and nobody reads them back', await read('clicks/ownershop', OWNER), 'deny');

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
