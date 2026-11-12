#!/usr/bin/env node
/**
 * Presence: who is connected to each shop, and from what.
 *
 * The parts worth testing are the ones that would quietly lie to the admin
 * dashboard: a device that reconnects and is never marked offline again, a
 * "last seen" read off a phone's wrong clock, or a shop with no devices at
 * all reported the same as one that left an hour ago.
 */
import { readFileSync } from 'node:fs';
import {
  platformOf, deviceId, presenceRecord, startPresence,
  summarise, sinceText, STALE_AFTER_MS, DEVICE_KEY,
} from '../presence.js';

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

console.log('\nTelling the APK from the website');
{
  ck('inside the app is apk',
     platformOf({ Capacitor: { isNativePlatform: () => true } }) === 'apk');
  ck('a browser is web', platformOf({}) === 'web');
  ck('  and so is a page with no window at all', platformOf(undefined) === 'web');
  // Capacitor injects its bridge into the website build too; only the
  // function's answer separates them.
  ck('the bridge being present is not enough',
     platformOf({ Capacitor: { isNativePlatform: () => false } }) === 'web');
}

console.log('\nOne id per device');
{
  const store = { _d: {}, getItem(k) { return k in this._d ? this._d[k] : null; },
                  setItem(k, v) { this._d[k] = String(v); } };
  const a = deviceId(store);
  const b = deviceId(store);
  ck('a reload reuses the id', a === b);
  ck('  it is the key push already uses, so one device is not counted twice',
     DEVICE_KEY === 'MF_DEVICE_ID' && store._d[DEVICE_KEY] === a);

  const blocked = { getItem() { throw new Error('blocked'); }, setItem() {} };
  const c = deviceId(blocked);
  ck('a private window still reports', typeof c === 'string' && c.length > 4);
}

console.log('\nWhat a connected device writes');
{
  const r = presenceRecord({ platform: 'apk', author: 'Shahin', ua: 'x'.repeat(300), at: 'SERVER_TS' });
  ck('it says it is online', r.online === true);
  ck('  with its platform and who is on it', r.platform === 'apk' && r.author === 'Shahin');
  ck('  the user agent is trimmed, not stored whole', r.ua.length === 120);
  ck('  and both times are the server\'s, never the phone\'s',
     r.since === 'SERVER_TS' && r.lastSeen === 'SERVER_TS');
  ck('an unnamed device is still attributable', presenceRecord({ platform: 'web' }).author === 'Unknown');
}

console.log('\nReconnecting re-arms the departure');
{
  // An onDisconnect is consumed when it fires. A device that drops and comes
  // back without registering a new one would stay "online" for ever after it
  // finally left - the single worst thing a presence dashboard can do.
  let connectedCb = null;
  const armed = [];
  const writes = [];
  const fakeDisconnect = () => ({ update: async (v) => { armed.push(v); } });

  const handle = startPresence({
    db: {},
    ref: (_db, path) => ({ path }),
    onValue: (_r, cb) => { connectedCb = cb; return () => { connectedCb = null; }; },
    onDisconnect: fakeDisconnect,
    update: async (r, v) => { writes.push({ path: r.path, v }); },
    serverTimestamp: () => 'SERVER_TS',
    shopName: 'mobifixer',
    author: 'Shahin',
    win: { Capacitor: { isNativePlatform: () => true }, navigator: { userAgent: 'Android' } },
  });

  ck('it writes under the shop, keyed by device',
     /^shops\/mobifixer\/presence\/d/.test(handle.path));

  await connectedCb({ val: () => true });
  await new Promise(r => setTimeout(r, 0));
  ck('connecting arms the offline write', armed.length === 1);
  ck('  which uses the server clock', armed[0].lastSeen === 'SERVER_TS' && armed[0].online === false);
  ck('  and then reports as online', writes.length === 1 && writes[0].v.online === true);

  // A drop: .info/connected goes false. Nothing to do - the server already
  // holds the instruction.
  await connectedCb({ val: () => false });
  ck('a drop arms nothing new', armed.length === 1);

  await connectedCb({ val: () => true });
  await new Promise(r => setTimeout(r, 0));
  ck('but reconnecting arms it again', armed.length === 2, `armed ${armed.length}`);

  handle.stop();
  ck('signing out says so rather than waiting for a timeout',
     writes.length === 3 && writes[2].v.online === false);
}

console.log('\nWhat the dashboard makes of a shop');
{
  const now = 1_000_000_000_000;
  const s = summarise({
    d1: { online: true,  platform: 'apk', lastSeen: now - 1000 },
    d2: { online: true,  platform: 'web', lastSeen: now - 2000 },
    d3: { online: false, platform: 'apk', lastSeen: now - 60_000 },
  }, now);
  ck('online devices are counted', s.online === 2 && s.devices === 3);
  ck('  split by apk and web', s.onlineApk === 1 && s.onlineWeb === 1);
  ck('  and counted over all time too', s.everApk === 2 && s.everWeb === 1);
  ck('  last seen is the most recent of them', s.lastSeen === now - 1000);
  ck('  the shop reads as online', s.status === 'online' && s.isOnline === true);

  const off = summarise({ d1: { online: false, platform: 'web', lastSeen: now - 60_000 } }, now);
  ck('a shop with nobody on it is offline', off.status === 'offline' && off.isOnline === false);

  // Offline for an hour and gone for a month are different problems.
  const old = summarise({ d1: { online: false, platform: 'web', lastSeen: now - STALE_AFTER_MS - 1 } }, now);
  ck('  gone a fortnight reads as inactive', old.status === 'inactive');

  ck('a shop that never connected is not the same as one that left',
     summarise({}, now).status === 'never' && summarise({}, now).lastSeen === null);
}

console.log('\nHow long ago, in words');
{
  const now = 1_000_000_000_000;
  const ago = (ms) => sinceText(now - ms, now);
  ck('seconds', ago(5_000) === 'just now');
  ck('minutes', ago(3 * 60_000) === '3 minutes ago');
  ck('  singular', ago(60_000) === '1 minute ago');
  ck('hours', ago(5 * 3_600_000) === '5 hours ago');
  ck('days', ago(3 * 86_400_000) === '3 days ago');
  ck('months', ago(60 * 86_400_000) === '2 months ago');
  ck('never', sinceText(null, now) === 'never');
  // A phone whose clock is ahead would otherwise show "-3 minutes ago".
  ck('a clock running fast does not go negative', sinceText(now + 60_000, now) === 'just now');
}

console.log('\nIt is wired in, and it ships');
{
  const main = readFileSync('main.js', 'utf8');
  ck('main.js starts it', /startPresence\(\{/.test(main));
  ck('  importing it from the module', /import \{ startPresence \} from '\.\/presence\.js'/.test(main));
  ck('  with onDisconnect and the server clock',
     /onDisconnect, serverTimestamp\}/.test(main));
  // A refused sign-in must not leave a presence row on someone else's shop.
  ck('  only after the shop is known to belong to this account',
     main.indexOf('startPresence({') > main.indexOf("outcome === 'mismatch'"));
  ck('  and the mismatch branch returns before reaching it',
     /location='\.\/auth\/index\.html';\s*\n\s*return;\s*\n\s*\}/.test(main));

  const build = readFileSync('scripts/build-www.mjs', 'utf8');
  ck('it ships in the payload', /'presence\.js'/.test(build));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
