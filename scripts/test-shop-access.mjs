#!/usr/bin/env node
/**
 * Regression tests for shop access in the service app (project c24o-c038b).
 *
 * The hole this closes: signing in proved WHO you were and nothing else. The
 * shop came from localStorage —
 *
 *     const shopName = localStorage.getItem('shopName')
 *
 * — and onAuthStateChanged only required an account in this Firebase project,
 * which the signup page hands to anybody. Sign up as yourself, point
 * localStorage.shopName at someone else's shop, reload, and you had their
 * customers, phone numbers and amounts.
 *
 * Phase 1 records rather than denies, exactly as cashbook's did: it builds the
 * uid -> shop mapping the security rules will need, and reports from real
 * logins which shops are already mapped. ENFORCE_SHOP_ACCESS is false.
 *
 * The rule these tests pin hardest: only a definite `mismatch` is ever a
 * denial. Offline, unreadable, unknown — all stay allowed. This runs against
 * live shops, and a wrong guess locks a real person out of their own work.
 *
 *   node scripts/test-shop-access.mjs
 */
import { readFileSync } from 'node:fs';

const src = readFileSync('main.js', 'utf8');

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

// ---- extract the real code -------------------------------------------------
const start = src.indexOf('const ENFORCE_SHOP_ACCESS');
const cbAt  = src.indexOf('onAuthStateChanged(auth, async (user)');
const endAt = src.indexOf('/* ########## END SHOP ACCESS ########## */');
if (start < 0 || cbAt < 0 || endAt < 0) throw new Error('could not extract the shop-access block from main.js');
const BLOCK    = src.slice(start, cbAt);
const CALLBACK = src.slice(cbAt, endAt);

for (const n of ['resolveShopAccess', 'writeMember', 'logShopAccess', 'ENFORCE_SHOP_ACCESS'])
  if (!BLOCK.includes(n)) throw new Error('missing ' + n);

/** A fake RTDB over a plain object, so the real function runs unmodified. */
function sandbox(tree, { readThrows = false, writeThrows = false } = {}) {
  const audit = [];
  const writes = [];
  const walk = p => String(p).split('/').filter(Boolean)
    .reduce((o, k) => (o == null ? undefined : o[k]), tree);

  const ref = (_db, path) => ({ _p: path });
  const get = async (r) => {
    if (readThrows) throw new Error('permission denied');
    const v = walk(r._p);
    return { exists: () => v !== undefined && v !== null, val: () => v };
  };
  const update = async (r, v) => {
    if (writeThrows) throw new Error('permission denied');
    writes.push({ path: r._p, value: v });
    const parts = String(r._p).split('/').filter(Boolean);
    let o = tree;
    for (const k of parts.slice(0, -1)) { o[k] = o[k] || {}; o = o[k]; }
    o[parts[parts.length - 1]] = Object.assign({}, o[parts[parts.length - 1]] || {}, v);
  };
  const push = (r, v) => { audit.push({ path: r._p, value: v }); return { catch: () => {} }; };

  const api = new Function('ref', 'get', 'update', 'push', 'db', 'console',
    `${BLOCK}\nreturn { resolveShopAccess, writeMember, logShopAccess, ENFORCE_SHOP_ACCESS };`)(
      ref, get, update, push, {}, { log: () => {} });

  return { api, audit, writes, tree };
}

const OWNER_UID = 'uid-owner-111';
const OTHER_UID = 'uid-other-222';

const shopWith = (extra) => ({ shops: { demoshop: Object.assign({
  shop: 'demoshop', lastServiceSn: 7, service: { 1: { name: 'Anjali' } }, staff: {}
}, extra) } });

const run = (tree, user, opts) => {
  const s = sandbox(tree, opts);
  return s.api.resolveShopAccess('demoshop', user).then(outcome => ({ ...s, outcome }));
};

console.log('\nA uid we already know');
{
  const t = shopWith({ members: { [OWNER_UID]: { claimedVia: 'signup' } } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('a recorded member is a member', r.outcome === 'member', r.outcome);
  ck('and nothing is rewritten', r.writes.length === 0);
}
{
  const t = shopWith({ owner: { uid: OWNER_UID, email: 'a@b.test', name: 'Anil' } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('owner.uid counts as a member', r.outcome === 'member', r.outcome);
  ck('and is backfilled into the members map', r.writes.length === 1 &&
     r.writes[0].path === `shops/demoshop/members/${OWNER_UID}`);
  ck('recorded as coming from owner.uid', r.writes[0]?.value.claimedVia === 'owner-uid');
}
{
  // Shops migrated off a plaintext password got a top-level uid, not owner.uid.
  const t = shopWith({ uid: OWNER_UID, email: 'a@b.test' });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('the legacy top-level uid shape is recognised too', r.outcome === 'member', r.outcome);
}

console.log('\nSomebody else');
{
  const t = shopWith({ owner: { uid: OWNER_UID, email: 'a@b.test' } });
  const r = await run(t, { uid: OTHER_UID, email: 'thief@evil.test' });
  ck('a stranger against a mapped shop is a mismatch', r.outcome === 'mismatch', r.outcome);
  ck('and nothing is written for them', r.writes.length === 0);
}
{
  const t = shopWith({ members: { [OWNER_UID]: { claimedVia: 'signup' } } });
  const r = await run(t, { uid: OTHER_UID, email: 'thief@evil.test' });
  ck('a stranger against a shop with a members map is a mismatch', r.outcome === 'mismatch', r.outcome);
}
{
  // Deliberate change of behaviour. This used to return 'mismatch': uid was the
  // only anchor. The live database has a shop carrying two different uids, and
  // nobody here can log into eight of the nine shops to find out which one is
  // live - so a stale uid had to stop being a lockout.
  //
  // The email is not a weaker anchor. Login signs in AS the address on the shop
  // record, Firebase Auth refuses a second account for an address already
  // taken, and once the rules are on only the owner can change that address.
  // Before the rules are on, nothing about the shop is protected anyway.
  const t = shopWith({ owner: { uid: OWNER_UID, email: 'a@b.test', name: 'Anil' } });
  const r = await run(t, { uid: OTHER_UID, email: 'a@b.test' });
  ck('the right email is accepted even when the recorded uid is stale',
     r.outcome === 'member', r.outcome);
  ck('and the stale record is repaired', r.writes[0]?.path === `shops/demoshop/members/${OTHER_UID}`);
  ck('recorded as matched on email, not on uid', r.writes[0]?.value.claimedVia === 'owner-email');
}
{
  // The attack this has to stop: sign in as your own shop, then point
  // localStorage.shopName at somebody else's.
  const t = shopWith({ owner: { uid: OWNER_UID, email: 'a@b.test' } });
  const r = await run(t, { uid: OTHER_UID, email: 'myownshop@b.test' });
  ck('a different email with an unknown uid is still a mismatch', r.outcome === 'mismatch', r.outcome);
  ck('and nothing is written', r.writes.length === 0);
}

console.log('\nA shop carrying two different uids');
{
  // mobifixer in the live export: owner.uid from signup, plus a top-level uid
  // written later by the migration branch. Reading `owner.uid || uid` took the
  // first and never looked at the second, which would have locked that shop's
  // owner out of 1248 jobs.
  const t = shopWith({ owner: { uid: 'uid-from-signup', email: 'a@b.test' }, uid: 'uid-from-migration' });
  const a = await run(t, { uid: 'uid-from-signup', email: 'x@x' });
  const b = await run(shopWith({ owner: { uid: 'uid-from-signup', email: 'a@b.test' }, uid: 'uid-from-migration' }),
                      { uid: 'uid-from-migration', email: 'x@x' });
  ck('the signup uid is accepted', a.outcome === 'member', a.outcome);
  ck('the migration uid is accepted too', b.outcome === 'member', b.outcome);
  ck('this matches what the rules accept',
     JSON.parse(readFileSync('firebase/service-app.rules.json','utf8'))
       .rules.shops.$shop['.read'].includes("data.child('uid')"));
  const c = await run(shopWith({ owner: { uid: 'uid-from-signup', email: 'a@b.test' }, uid: 'uid-from-migration' }),
                      { uid: 'uid-neither', email: 'thief@evil.test' });
  ck('a third, unknown uid with a wrong email is still denied', c.outcome === 'mismatch', c.outcome);
}

console.log('\nWhen we cannot tell, we do not deny');

console.log('\nLegacy shop with no uid anywhere');
{
  const t = shopWith({ owner: { email: 'a@b.test', name: 'Anil' } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('claims for the account whose email is on the shop', r.outcome === 'claimed', r.outcome);
  ck('written with client-claim provenance', r.writes[0]?.value.claimedVia === 'client-claim');
  ck('no role is invented', !('role' in (r.writes[0]?.value || {})));
  ck('the shop data itself is untouched', r.tree.shops.demoshop.service[1].name === 'Anjali' &&
     r.tree.shops.demoshop.lastServiceSn === 7);
}
{
  const t = shopWith({ email: 'a@b.test' });   // older records kept email at the top level
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('the older top-level email shape can claim too', r.outcome === 'claimed', r.outcome);
}
{
  const t = shopWith({ owner: { email: '  A@B.TEST ', name: 'Anil' } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('email matching ignores case and stray spaces', r.outcome === 'claimed', r.outcome);
}
{
  const t = shopWith({ owner: { email: 'a@b.test', name: 'Anil' } });
  const r = await run(t, { uid: OTHER_UID, email: 'thief@evil.test' });
  ck('a wrong email cannot claim an unmapped shop', r.outcome === 'no-record', r.outcome);
  ck('and writes nothing', r.writes.length === 0);
}
{
  const t = shopWith({ owner: { name: 'Anil' } });   // no email at all
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('a shop with no email anchor is not claimable', r.outcome === 'no-record', r.outcome);
}
{
  const t = shopWith({ owner: { name: 'Anil' } });
  const r = await run(t, { uid: OWNER_UID, email: '' });
  ck('a blank email never matches a blank anchor', r.outcome === 'no-record', r.outcome);
}

console.log('\nThe shape left behind by the removed Google sign-in');
{
  // It wrote owner as a bare display-name STRING plus a top-level uid/email.
  // Reading through owner.uid on that record would throw or silently misread.
  const t = shopWith({ owner: 'Saheer Babu', email: 'a@b.test', uid: OWNER_UID });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' });
  ck('owner-as-a-string does not break the check', r.outcome === 'member', r.outcome);
  const r2 = await run(shopWith({ owner: 'Saheer Babu', email: 'a@b.test' }),
                       { uid: OWNER_UID, email: 'a@b.test' });
  ck('and such a shop can still claim on its email', r2.outcome === 'claimed', r2.outcome);
}

console.log('\nOnly the small nodes are read');
{
  // get(`shops/${shop}`) would pull every service record down on every auth
  // state change, on a phone, on mobile data.
  ck('the whole shop node is never fetched', !/get\(ref\(db, `shops\/\$\{shop\}`\)\)/.test(BLOCK));
  for (const leaf of ['owner', 'members', 'uid', 'email'])
    ck(`reads shops/{shop}/${leaf}`, BLOCK.includes('`shops/${shop}/' + leaf + '`'));
}

{
  const r = await run({ shops: {} }, { uid: OWNER_UID, email: 'a@b.test' });
  ck('a shop that does not exist is no-record, not mismatch', r.outcome === 'no-record', r.outcome);
}
{
  const t = shopWith({ owner: { uid: OWNER_UID } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' }, { readThrows: true });
  ck('an unreadable shop (offline, or rules) is no-record, not mismatch',
     r.outcome === 'no-record', r.outcome);
}
{
  const t = shopWith({ owner: { email: 'a@b.test' } });
  const r = await run(t, { uid: OWNER_UID, email: 'a@b.test' }, { writeThrows: true });
  ck('a claim that cannot be written falls back to no-record', r.outcome === 'no-record', r.outcome);
}
{
  const t = shopWith({ owner: { uid: OWNER_UID } });
  const r = await run(t, null);
  ck('no signed-in user is no-record', r.outcome === 'no-record', r.outcome);
  const r2 = await run(t, { email: 'a@b.test' });
  ck('a user with no uid is no-record', r2.outcome === 'no-record', r2.outcome);
}

console.log('\nThe audit trail');
{
  const s = sandbox(shopWith({ owner: { uid: OWNER_UID } }));
  s.api.logShopAccess('demoshop', OWNER_UID, 'member');
  const entry = s.audit[0];
  ck('writes to the shop\'s own authAudit node', entry?.path === 'shops/demoshop/authAudit');
  ck('records the uid and the outcome', entry?.value.uid === OWNER_UID && entry?.value.outcome === 'member');
  ck('records whether enforcement was on', entry?.value.enforced === false);
  const keys = Object.keys(entry?.value || {}).sort().join(',');
  ck('and records nothing else', keys === 'at,enforced,outcome,uid', keys);

  // Production brief item 7: no credentials in logs, ever.
  for (const bad of ['email', 'password', 'token', 'idToken', 'accessToken', 'refreshToken'])
    ck(`never logs ${bad}`, !(bad in (entry?.value || {})));
}
{
  const s = sandbox(shopWith({}), { writeThrows: true });
  let threw = false;
  try { s.api.logShopAccess('demoshop', OWNER_UID, 'member'); } catch (_) { threw = true; }
  ck('a failing audit never throws into the login path', !threw);
}

console.log('\nPhase 1 denies nobody');
{
  ck('ENFORCE_SHOP_ACCESS ships false', /const ENFORCE_SHOP_ACCESS = false;/.test(src));
  ck('the only denial is a definite mismatch',
     /outcome === 'mismatch' && ENFORCE_SHOP_ACCESS/.test(CALLBACK));
  ck('no other outcome signs anybody out',
     (CALLBACK.match(/signOut/g) || []).length === 1);
  ck('the signed-in email is not written to the console', !/console\.log\([^)]*user\.email/.test(CALLBACK));
  ck('the access check runs on every auth state change', /resolveShopAccess\(shopName, user\)/.test(CALLBACK));
  ck('and its outcome is always recorded', /logShopAccess\(shopName, user\.uid, outcome\)/.test(CALLBACK));
}

console.log('\nSignup can no longer overwrite a shop');
{
  const authSrc = readFileSync('auth/main.js', 'utf8');
  const signup = authSrc.slice(authSrc.indexOf("$('#signup').onclick"), authSrc.indexOf('// Google sign-in removed'));
  ck('the shop is created with a transaction, not set()',
     /runTransaction\(child\(shopRef, businessName\)/.test(signup));
  ck('the transaction aborts when the node already exists',
     /if \(current !== null\) return;/.test(signup));
  ck('an aborted transaction is reported, not ignored', /!result\.committed/.test(signup));
  ck('set() is no longer used to write a shop', !/\bset\(child\(shopRef/.test(authSrc));
  ck('the name is checked before the Auth account is created',
     signup.indexOf('get(child(shopRef') < signup.indexOf('createUserWithEmailAndPassword'));
  ck('an account created for a shop that was not created is rolled back',
     (signup.match(/deleteUser\(createdUser\)/g) || []).length === 2);
  ck('Google sign-in is gone from the code', !/GoogleAuthProvider|signInWithPopup/.test(authSrc));
  ck('and its buttons are gone from the page',
     !/google-login/.test(readFileSync('auth/index.html', 'utf8')));
}

console.log('\nThe pre-auth lookup');
{
  const authSrc = readFileSync('auth/main.js', 'utf8');
  const helper = authSrc.slice(authSrc.indexOf('const lookupShopEmail'), authSrc.indexOf("$('#login').onclick"));

  ck('reads owner/email', helper.includes('${identifier}/owner/email'));
  ck('and falls back to the top-level email', helper.includes('${identifier}/email'));

  // The whole point: once the rules require auth on shops/$shop, reading that
  // node unauthenticated is denied and a public child does not save it.
  const login = authSrc.slice(authSrc.indexOf("$('#login').onclick"), authSrc.indexOf('// \u{1F510} Forgot password'));
  const reset = authSrc.slice(authSrc.indexOf('// \u{1F510} Forgot password'), authSrc.indexOf("// Creating a shop"));
  for (const [what, body] of [['login', login], ['reset', reset]]) {
    ck(`${what} never reads the whole shop node`, !/get\(child\(shopRef, identifier\)\)/.test(body));
    ck(`${what} goes through lookupShopEmail`, body.includes('lookupShopEmail(identifier)'));
  }

  // Run it against the three record shapes the export actually contains.
  const shapes = {
    'owner object':            { owner: { name: 'A', email: 'a@x.test', uid: 'u1' } },
    'owner string + top email':{ owner: 'B', email: 'b@x.test', uid: 'u2' },
    'both':                    { owner: { name: 'C', email: 'c@x.test', uid: 'u3' }, email: 'c@x.test', uid: 'u3' },
    'no email at all':         { owner: { name: 'D', uid: 'u4' } }
  };
  const expected = { 'owner object': 'a@x.test', 'owner string + top email': 'b@x.test', 'both': 'c@x.test', 'no email at all': '' };
  for (const [label, rec] of Object.entries(shapes)) {
    const tree = { shops: { s: rec } };
    const read = [];
    const walk = p => String(p).split('/').filter(Boolean).reduce((o, k) => (o == null ? undefined : o[k]), tree);
    const child = (r, p) => ({ _p: r._p.replace(/\/$/, '') + '/' + p });
    const get = async (r) => { read.push(r._p); const v = walk(r._p); return { exists: () => v != null, val: () => v }; };
    const fn = new Function('get', 'child', 'shopRef', `${helper}\nreturn lookupShopEmail;`)(get, child, { _p: 'shops/' });
    const got = await fn('s');
    ck(`resolves the email for: ${label}`, got === expected[label], JSON.stringify(got));
    ck(`  and reads only the two email paths (${label})`,
       read.every(p => p === 'shops/s/owner/email' || p === 'shops/s/email'), read.join(', '));
  }
}

console.log('\nThe plaintext-password branch is gone');
{
  const authSrc = readFileSync('auth/main.js', 'utf8');
  ck('no shop password is ever read', !/shopData[?.]*\.password|\.child\([\'"`]password/.test(authSrc));
  // Strip comments first: the block above explains what was removed, and
  // naming the function in prose is not the same as calling it.
  const code = (t) => t.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');
  ck('login no longer creates accounts',
     !/createUserWithEmailAndPassword\s*\(/.test(
       code(authSrc.slice(authSrc.indexOf("$('#login').onclick"), authSrc.indexOf('// \u{1F510} Forgot password')))));
  ck('signup is the only place an account is created',
     (authSrc.match(/await createUserWithEmailAndPassword/g) || []).length === 1);
}

console.log('\nThe proposed rules match the shapes that exist');
{
  const rules = JSON.parse(readFileSync('firebase/service-app.rules.json', 'utf8')).rules;
  const shop = rules.shops.$shop;
  ck('read checks both uid locations',
     shop['.read'].includes("data.child('uid')") && shop['.read'].includes("data.child('owner/uid')"));
  ck('write allows creating a shop that does not exist yet', shop['.write'].includes('!data.exists()'));
  ck('owner/email is publicly readable', shop.owner?.email?.['.read'] === true);
  ck('the top-level email is publicly readable too', shop.email?.['.read'] === true);
  ck('no password carve-out is left', !('password' in shop));
  ck('the root is denied', rules['.read'] === false && rules['.write'] === false);
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
