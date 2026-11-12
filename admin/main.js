/**
 * The admin dashboard.
 *
 * Website only - this page is not in the APK payload, so the app carries
 * none of it. Sign-in is the same Firebase account as the app; the rules
 * decide whether that account may see anything, which is the whole point:
 * there is no client-side "if admin" here that a reader of this file could
 * imitate. An account that is not in /admins simply gets 401s.
 */
import { initializeApp } from "https://www.gstatic.com/firebasejs/12.2.1/firebase-app.js";
import { getAuth, signInWithEmailAndPassword, signOut, onAuthStateChanged }
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-auth.js";
import { getDatabase, ref, onValue, get, child }
  from "https://www.gstatic.com/firebasejs/12.2.1/firebase-database.js";

import { shopRow, sortRows, filterRows, totals, deviceList, FILTERS } from './dashboard.js';

const firebaseConfig = {
  apiKey: "AIzaSyAWQP1HENutTN4cPyMM86norOGMSXDnc2g",
  authDomain: "c24o-c038b.firebaseapp.com",
  databaseURL: "https://c24o-c038b-default-rtdb.firebaseio.com",
  projectId: "c24o-c038b",
  storageBucket: "c24o-c038b.firebasestorage.app",
  messagingSenderId: "418015450687",
  appId: "1:418015450687:web:3d0a9632558f242aad4a8a",
  measurementId: "G-X98S86SEV2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getDatabase(app);

const $ = (s) => document.querySelector(s);
const DB_URL = firebaseConfig.databaseURL;

let state = { rows: new Map(), filter: 'all', search: '', now: Date.now() };
let presenceUnsubs = [];

// ---------------------------------------------------------------------------
// Sign in

const say = (text, ok = false) => {
  const el = $('#gateMsg');
  el.textContent = text;
  el.classList.toggle('ok', ok);
  el.classList.remove('hidden');
};

$('#gateForm').onsubmit = async (e) => {
  e.preventDefault();
  const btn = $('#signin');
  btn.disabled = true;
  btn.textContent = 'Signing in…';
  try {
    await signInWithEmailAndPassword(auth, $('#email').value.trim(), $('#password').value);
  } catch (err) {
    // Firebase's own message names the field; anything else is a wrong password.
    say(/invalid-email|missing-email/.test(err.code || '')
      ? 'That does not look like an email address.'
      : 'Wrong email or password.');
  } finally {
    btn.disabled = false;
    btn.textContent = 'Sign in';
  }
};

$('#signout').onclick = () => signOut(auth);

onAuthStateChanged(auth, async (user) => {
  stopWatching();
  if (!user) {
    $('#board').classList.add('hidden');
    $('#gate').classList.remove('hidden');
    return;
  }

  // Ask the database, not this file. An account may read its own /admins
  // entry and nobody else's, so this is a real answer rather than a hint.
  let isAdmin = false;
  try {
    const snap = await get(child(ref(db), `admins/${user.uid}`));
    isAdmin = snap.val() === true;
  } catch (_) { /* denied reads mean no */ }

  if (!isAdmin) {
    await signOut(auth);
    say('That account is signed in, but it is not an admin. '
      + 'Add its uid under /admins in the Firebase console to allow it.');
    return;
  }

  $('#gate').classList.add('hidden');
  $('#board').classList.remove('hidden');
  startWatching(user);
});

// ---------------------------------------------------------------------------
// Reading the shops
//
// Deliberately not one read of /shops. That would pull every job of every
// shop - over a thousand for the busiest one - to draw a line of text each,
// and it would get worse with every job booked in. Instead: one shallow REST
// call for the names, then only the small nodes per shop, and a live listener
// on presence alone.

const shallow = async (path, token) => {
  const res = await fetch(`${DB_URL}/${path}.json?shallow=true&auth=${encodeURIComponent(token)}`);
  if (!res.ok) throw new Error(`${path}: HTTP ${res.status}`);
  return res.json();
};

const stopWatching = () => {
  presenceUnsubs.forEach(fn => { try { fn(); } catch (_) {} });
  presenceUnsubs = [];
  state.rows = new Map();
};

async function startWatching(user) {
  const token = await user.getIdToken();

  let names = [];
  try {
    names = Object.keys(await shallow('shops', token) || {});
  } catch (err) {
    $('#footNote').textContent = 'Could not read the shop list: ' + err.message;
    return;
  }

  $('#footNote').textContent = `${names.length} shop${names.length === 1 ? '' : 's'}`;

  for (const shop of names) {
    // Small, one-off reads. A failure here is one shop's detail missing, not
    // a blank dashboard, so each is caught on its own.
    const base = {};
    try {
      const [owner, email, uid, members, jobs] = await Promise.all([
        get(child(ref(db), `shops/${shop}/owner`)).then(s => s.val()).catch(() => null),
        get(child(ref(db), `shops/${shop}/email`)).then(s => s.val()).catch(() => null),
        get(child(ref(db), `shops/${shop}/uid`)).then(s => s.val()).catch(() => null),
        get(child(ref(db), `shops/${shop}/members`)).then(s => s.val()).catch(() => null),
        shallow(`shops/${shop}/service`, token).then(o => Object.keys(o || {}).length).catch(() => 0),
      ]);
      Object.assign(base, { owner, email, uid, members, jobs });
    } catch (_) { /* draw what we have */ }

    state.rows.set(shop, { shop, presence: {}, ...base });
    render();

    // Presence is the only live part, and the only part that changes often.
    const un = onValue(ref(db, `shops/${shop}/presence`), (snap) => {
      const row = state.rows.get(shop) || { shop };
      row.presence = snap.val() || {};
      state.rows.set(shop, row);
      render();
    }, () => { /* denied or dropped: the row stays as it is */ });
    presenceUnsubs.push(un);
  }

  // Firebase's own view of the socket, so a dead connection is visible
  // instead of looking like every shop went offline at once.
  const un = onValue(ref(db, '.info/connected'), (s) => {
    $('#liveDot').classList.toggle('live', s.val() === true);
  });
  presenceUnsubs.push(un);
}

// ---------------------------------------------------------------------------
// Drawing

// Labels take the count, because "1 app devices" reads like a bug even when
// the number is right.
const plural = (n, one, many) => (n === 1 ? one : many);
const STAT_LABELS = [
  ['shops',      (n) => plural(n, 'shop', 'shops')],
  ['online',     () => 'online now'],
  ['apkDevices', (n) => plural(n, 'app device', 'app devices')],
  ['webDevices', (n) => plural(n, 'web device', 'web devices')],
  ['inactive',   () => 'inactive'],
  ['jobs',       (n) => plural(n, 'job', 'jobs')],
];

const el = (tag, cls, text) => {
  const n = document.createElement(tag);
  if (cls) n.className = cls;
  // textContent everywhere: shop names, owner names and user agents are all
  // values somebody else wrote, and none of them may become markup here.
  if (text !== undefined) n.textContent = text;
  return n;
};

const expanded = new Set();

function render() {
  state.now = Date.now();
  const all = sortRows([...state.rows.values()].map(r => shopRow(r, state.now)));
  const t = totals(all);

  const stats = $('#stats');
  stats.textContent = '';
  for (const [key, label] of STAT_LABELS) {
    const card = el('div', 'stat');
    card.appendChild(el('div', 'n', String(t[key])));
    card.appendChild(el('div', 'k', label(t[key])));
    stats.appendChild(card);
  }

  const chips = $('#filters');
  if (chips.children.length !== FILTERS.length) {
    chips.textContent = '';
    for (const f of FILTERS) {
      const b = el('button', 'chip', f);
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.onclick = () => { state.filter = f; render(); };
      chips.appendChild(b);
    }
  }
  [...chips.children].forEach((b, i) =>
    b.setAttribute('aria-selected', String(FILTERS[i] === state.filter)));

  const shown = filterRows(all, state.filter, state.search);
  const list = $('#rows');
  list.textContent = '';

  for (const r of shown) {
    const row = el('div', 'row');

    const head = el('button', 'row-head');
    head.type = 'button';
    head.setAttribute('aria-expanded', String(expanded.has(r.shop)));
    head.appendChild(el('span', `dot ${r.status}`));

    const who = el('div', 'who');
    who.appendChild(el('div', 'name', r.shop));
    const bits = [
      r.ownerName || r.ownerEmail || 'no owner recorded',
      r.status === 'online' ? `${r.online} device${r.online === 1 ? '' : 's'} on now`
        : r.status === 'never' ? 'never connected'
        : `seen ${r.lastSeenText}`,
      `${r.jobs} job${r.jobs === 1 ? '' : 's'}`,
    ];
    who.appendChild(el('div', 'sub', bits.join('  ·  ')));
    head.appendChild(who);

    const right = el('div', 'right');
    if (r.onlineApk) right.appendChild(el('span', 'pill apk', `${r.onlineApk} app`));
    if (r.onlineWeb) right.appendChild(el('span', 'pill web', `${r.onlineWeb} web`));
    if (!r.isOnline) right.appendChild(el('span', 'pill', r.status));
    head.appendChild(right);

    head.onclick = () => {
      expanded.has(r.shop) ? expanded.delete(r.shop) : expanded.add(r.shop);
      render();
    };
    row.appendChild(head);

    if (expanded.has(r.shop)) {
      const box = el('div', 'devices');
      const devices = deviceList(state.rows.get(r.shop)?.presence, state.now);
      if (!devices.length) {
        box.appendChild(el('div', 'no-devices', 'No device has ever connected to this shop.'));
      } else {
        for (const d of devices) {
          const line = el('div', 'device');
          line.appendChild(el('span', `dot ${d.online ? 'online' : 'offline'}`));
          line.appendChild(el('span', 'who2', `${d.author} · ${d.platform === 'apk' ? 'app' : 'web'}`));
          line.appendChild(el('span', 'when', d.online ? 'online now' : d.lastSeenText));
          box.appendChild(line);
        }
      }
      row.appendChild(box);
    }

    list.appendChild(row);
  }

  $('#empty').classList.toggle('hidden', shown.length > 0);
}

$('#search').oninput = (e) => { state.search = e.target.value; render(); };

// "2 minutes ago" is only true for a minute. Re-drawing on a timer keeps the
// relative times honest without touching the database.
setInterval(() => { if (!$('#board').classList.contains('hidden')) render(); }, 30_000);
