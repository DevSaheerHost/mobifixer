#!/usr/bin/env node
/**
 * Regression tests for cashbook shop authorization.
 *
 * Covers the seven cases required before deploying the authorization fix,
 * in BOTH phases (ENFORCE_MEMBERSHIP false and true).
 *
 * It extracts the real auth block out of cashbook/main.js and runs it against
 * an in-memory fake Realtime Database, so these assertions are made against
 * the shipped source rather than a copy that could drift from it.
 *
 *   node scripts/test-auth.mjs
 */
import { readFileSync } from 'node:fs';

const SRC = 'cashbook/main.js';
const lines = readFileSync(SRC, 'utf8').split('\n');

// Slice from `const getUser` through the end of `loginUser`, located by
// content so the test fails loudly instead of silently testing the wrong
// lines if the file is reordered.
const start = lines.findIndex(l => l.includes('const getUser = async'));
const loginAt = lines.findIndex(l => l.includes('const loginUser='));
if (start < 0 || loginAt < 0) throw new Error(`${SRC}: could not locate getUser / loginUser`);
let end = -1;
for (let i = loginAt; i < lines.length; i++) {
  if (lines[i] === '}') { end = i; break; }          // closing brace of loginUser
}
if (end < 0) throw new Error(`${SRC}: could not find the end of loginUser`);
const BLOCK = lines.slice(start, end + 1).join('\n');
for (const needed of ['resolveMembership', 'detectRole', 'ENFORCE_MEMBERSHIP', 'logAuthAttempt']) {
  if (!BLOCK.includes(needed)) throw new Error(`extracted block is missing ${needed}`);
}

const OWNER_A = { uid: 'uidA', email: 'a@shop.test', password: 'pw-a-123' };
const OWNER_B = { uid: 'uidB', email: 'b@shop.test', password: 'pw-b-123' };
const ACCOUNTS = [OWNER_A, OWNER_B];

const baseDb = () => ({
  users: {
    alpha:  { username: 'alpha',  fullname: 'Anita Rao',
              signupInfo: { fullname: 'Anita Rao', email: 'a@shop.test' },
              members: { uidA: { claimedVia: 'signup' } } },
    beta:   { username: 'beta',   fullname: 'Bilal Khan',
              signupInfo: { fullname: 'Bilal Khan', email: 'b@shop.test' },
              members: { uidB: { claimedVia: 'signup' } } },
    legacy: { username: 'legacy', fullname: 'Anita Rao',
              signupInfo: { fullname: 'Anita Rao', email: 'a@shop.test' } },  // no members yet
    orphan: { username: 'orphan', fullname: 'Anita Rao',
              signupInfo: { fullname: 'Anita Rao' } },                        // no email either
  },
});

/** Build an isolated sandbox around the extracted auth block. */
function sandbox({ enforce = false } = {}) {
  const block = enforce
    ? BLOCK.replace('const ENFORCE_MEMBERSHIP = false;', 'const ENFORCE_MEMBERSHIP = true;')
    : BLOCK;
  if (enforce && block === BLOCK) throw new Error('could not flip ENFORCE_MEMBERSHIP');

  const store = structuredClone(baseDb());
  const session = {};
  let signedIn = null;

  const seg = p => p.split('/').filter(Boolean);
  const read = p => seg(p).reduce((o, k) => (o == null ? undefined : o[k]), store);
  const write = (p, v) => {
    const parts = seg(p); let o = store;
    for (const k of parts.slice(0, -1)) { o[k] ??= {}; o = o[k]; }
    o[parts[parts.length - 1]] = v;
  };

  const db = { ref: p => ({
    get:    async ()  => { const v = read(p); return { exists: () => v !== undefined, val: () => v }; },
    set:    async v   => write(p, v),
    update: async v   => write(p, { ...(read(p) || {}), ...v }),
    push:   v         => { const cur = read(p) || {}; cur['k' + Object.keys(cur).length] = v; write(p, cur); },
  })};

  const auth = {
    get currentUser() { return signedIn; },
    signInWithEmailAndPassword: async (email, password) => {
      const a = ACCOUNTS.find(x => x.email === email && x.password === password);
      if (!a) { const e = new Error('bad credentials'); e.code = 'auth/invalid-credential'; throw e; }
      signedIn = { uid: a.uid, email: a.email };
      return { user: signedIn };
    },
    signOut: async () => { signedIn = null; },
  };

  const localStorage = {
    setItem:    (k, v) => { session[k] = v; },
    removeItem: k      => { delete session[k]; },
    getItem:    k      => session[k] ?? null,
  };

  const api = new Function(
    'db', 'auth', 'localStorage', 'showTopToast', 'getDeviceInfo', 'getTime',
    'persistSession', 'location',
    `${block}\nreturn { loginUser, detectRole, resolveMembership };`
  )(
    db, auth, localStorage,
    () => {}, () => ({ ua: 'test' }), () => '12:00',
    (u, f, r) => { localStorage.setItem('CASHBOOK_USER_NAME', u);
                   localStorage.setItem('CASHBOOK_FULLNAME', f);
                   localStorage.setItem('CASHBOOK_ROLL', r); },
    { reload: () => {} }
  );

  return { api, store, session, signedIn: () => signedIn };
}

const outcomeFor = (store, shop) => {
  const ev = Object.values((store.authAudit || {})[shop] || {});
  return ev.length ? ev[ev.length - 1].outcome : null;
};

let pass = 0, fail = 0;
const check = (name, cond, detail = '') => {
  if (cond) { pass++; console.log(`  ok    ${name}`); }
  else      { fail++; console.log(`  FAIL  ${name}${detail ? '  -> ' + detail : ''}`); }
};

const login = async (env, shop, who, name) => {
  try { await env.api.loginUser({ ...who, username: shop, fullname: name }); return null; }
  catch (e) { return e; }
};

console.log('\nPhase 1 - ENFORCE_MEMBERSHIP = false (record and log, deny nobody)');
{
  let e = sandbox();
  await login(e, 'alpha', OWNER_A, 'Anita Rao');
  check('owner -> own shop is allowed and recorded as member',
    e.session.CASHBOOK_USER_NAME === 'alpha' && outcomeFor(e.store, 'alpha') === 'member', outcomeFor(e.store, 'alpha'));
  check('owner -> own shop gets the owner role', e.session.CASHBOOK_ROLL === 'owner', e.session.CASHBOOK_ROLL);

  e = sandbox();
  await login(e, 'beta', OWNER_A, 'Anita Rao');
  check('cross-shop is allowed in phase 1 but logged as mismatch',
    outcomeFor(e.store, 'beta') === 'mismatch' && e.session.CASHBOOK_USER_NAME === 'beta', outcomeFor(e.store, 'beta'));

  e = sandbox();
  await login(e, 'alpha', OWNER_A, 'Rahul S');
  check('staff -> their shop is allowed with the staff role',
    e.session.CASHBOOK_ROLL === 'staff' && outcomeFor(e.store, 'alpha') === 'member', e.session.CASHBOOK_ROLL);
  check('staff record is still written', Boolean(e.store.users.alpha.staff?.['Rahul S']));

  e = sandbox();
  const err = await login(e, 'alpha', { ...OWNER_A, password: 'wrong' }, 'Anita Rao');
  check('invalid password is rejected and leaves no session',
    err?.code === 'auth/invalid-credential' && !e.session.CASHBOOK_USER_NAME);

  e = sandbox();
  await login(e, 'legacy', OWNER_A, 'Anita Rao');
  check('legacy shop self-claims for the account matching the signup email',
    outcomeFor(e.store, 'legacy') === 'claimed' && e.store.users.legacy.members?.uidA?.claimedVia === 'client-claim',
    outcomeFor(e.store, 'legacy'));

  e = sandbox();
  await login(e, 'legacy', OWNER_B, 'Anita Rao');
  check('a different account cannot claim a legacy shop',
    outcomeFor(e.store, 'legacy') === 'no-record' && !e.store.users.legacy.members, outcomeFor(e.store, 'legacy'));

  e = sandbox();
  await login(e, 'orphan', OWNER_A, 'Anita Rao');
  check('shop with no signup email is flagged no-record but still allowed',
    outcomeFor(e.store, 'orphan') === 'no-record' && e.session.CASHBOOK_USER_NAME === 'orphan');

  e = sandbox();
  await login(e, 'legacy', OWNER_A, 'Anita Rao');
  check('claiming one shop leaves other shops untouched',
    JSON.stringify(e.store.users.beta.members) === '{"uidB":{"claimedVia":"signup"}}');

  e = sandbox();
  await login(e, 'legacy', OWNER_A, 'Anita Rao');
  check('claimed record carries no uid-level role (staff share the uid)',
    !('role' in (e.store.users.legacy.members?.uidA || {})),
    JSON.stringify(e.store.users.legacy.members?.uidA));

  e = sandbox();
  const alpha = baseDb().users.alpha;
  check('detectRole("a") is no longer owner (the old .includes bug)', e.api.detectRole(alpha, 'a') === 'staff', e.api.detectRole(alpha, 'a'));
  check('detectRole matches the exact signup name', e.api.detectRole(alpha, 'anita rao') === 'owner');
  check('detectRole also accepts an edited profile name',
    e.api.detectRole({ fullname: 'Anita R', signupInfo: { fullname: 'Anita Rao' } }, 'Anita R') === 'owner');
  check('detectRole treats an empty name as staff', e.api.detectRole(alpha, '') === 'staff');
}

console.log('\nPhase 2 - ENFORCE_MEMBERSHIP = true (deny cross-shop)');
{
  let e = sandbox({ enforce: true });
  await login(e, 'alpha', OWNER_A, 'Anita Rao');
  check('owner -> own shop is still allowed', e.session.CASHBOOK_USER_NAME === 'alpha');

  e = sandbox({ enforce: true });
  await login(e, 'beta', OWNER_A, 'Anita Rao');
  check('owner -> a different shop is denied and signed out',
    !e.session.CASHBOOK_USER_NAME && e.signedIn() === null, JSON.stringify(e.session));

  e = sandbox({ enforce: true });
  await login(e, 'alpha', OWNER_A, 'Rahul S');
  check('staff -> their shop is still allowed', e.session.CASHBOOK_ROLL === 'staff');

  e = sandbox({ enforce: true });
  await login(e, 'beta', OWNER_A, 'Rahul S');
  check('staff -> another shop is denied', !e.session.CASHBOOK_USER_NAME);

  e = sandbox({ enforce: true });
  await login(e, 'legacy', OWNER_A, 'Anita Rao');
  check('legacy shop is claimed, not locked out',
    e.session.CASHBOOK_USER_NAME === 'legacy' && Boolean(e.store.users.legacy.members?.uidA));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
