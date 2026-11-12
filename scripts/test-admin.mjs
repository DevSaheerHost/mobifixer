#!/usr/bin/env node
/**
 * The shops dashboard.
 *
 * The arithmetic, not the pixels: a row drawn from the three record shapes
 * this database actually holds, a sort that puts the shops you care about at
 * the top, and totals that do not quietly count a thing twice.
 */
import { readFileSync } from 'node:fs';
import {
  shopRow, sortRows, filterRows, totals, deviceList, FILTERS, STATUS_ORDER,
} from '../admin/dashboard.js';

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

const now = 1_700_000_000_000;
const mins = (n) => now - n * 60_000;
const days = (n) => now - n * 86_400_000;

console.log('\nA row, from the shapes this database really holds');
{
  // owner as an object - 7 shops in the 2026-09 export.
  const a = shopRow({ shop: 'ownershop', owner: { name: 'Shahin', email: 'a@b.test', uid: 'u1' },
                      presence: { d1: { online: true, platform: 'apk', lastSeen: mins(1) } },
                      jobs: 1248 }, now);
  ck('the owner object is read', a.ownerName === 'Shahin' && a.ownerEmail === 'a@b.test');
  ck('  it has an identity', a.hasIdentity === true);
  ck('  jobs are counted', a.jobs === 1248);
  ck('  and it reads as online', a.status === 'online' && a.onlineApk === 1);

  // owner as a bare name plus a top-level uid - the removed Google sign-in.
  const b = shopRow({ shop: 'legacyshop', owner: 'Just A Name', email: 'l@b.test',
                      uid: 'u2', presence: {} }, now);
  ck('a bare owner name does not become an object', b.ownerName === 'Just A Name');
  ck('  the top-level email is used', b.ownerEmail === 'l@b.test');
  ck('  and the top-level uid still counts as an identity', b.hasIdentity === true);

  // No uid anywhere: the shape the published rules lock out.
  const c = shopRow({ shop: 'emailonly', owner: { name: 'X', email: 'x@b.test' }, presence: {} }, now);
  ck('a shop with no uid anywhere is flagged', c.hasIdentity === false);

  const d = shopRow({ shop: 'bare', presence: {} }, now);
  ck('a shop with nothing recorded still draws', d.ownerName === '' && d.jobs === 0);
  ck('  and reads as never connected', d.status === 'never' && d.lastSeenText === 'never');
}

console.log('\nOnline first, then most recently seen');
{
  const rows = [
    shopRow({ shop: 'quiet',  presence: { a: { online: false, platform: 'web', lastSeen: days(1) } } }, now),
    shopRow({ shop: 'live',   presence: { a: { online: true,  platform: 'apk', lastSeen: mins(1) } } }, now),
    shopRow({ shop: 'gone',   presence: { a: { online: false, platform: 'web', lastSeen: days(40) } } }, now),
    shopRow({ shop: 'unused', presence: {} }, now),
    shopRow({ shop: 'recent', presence: { a: { online: false, platform: 'apk', lastSeen: mins(5) } } }, now),
  ];
  const order = sortRows(rows).map(r => r.shop);
  ck('online is first', order[0] === 'live');
  ck('  then offline, most recent first', order[1] === 'recent' && order[2] === 'quiet');
  ck('  then long gone', order[3] === 'gone');
  ck('  and never-connected last', order[4] === 'unused', order.join(' '));
  ck('the order is a property of status, not of chance',
     STATUS_ORDER.online < STATUS_ORDER.offline
     && STATUS_ORDER.offline < STATUS_ORDER.inactive
     && STATUS_ORDER.inactive < STATUS_ORDER.never);

  // Sorting must not mutate what it was handed; the live listener re-renders
  // from the same array many times a minute.
  const before = rows.map(r => r.shop).join(',');
  sortRows(rows);
  ck('sorting leaves the original alone', rows.map(r => r.shop).join(',') === before);
}

console.log('\nFiltering and search');
{
  const rows = [
    shopRow({ shop: 'mobifixer', owner: { name: 'Shahin', email: 'shop@a.test' },
              presence: { a: { online: true, platform: 'apk', lastSeen: mins(1) } } }, now),
    shopRow({ shop: 'redotech', owner: { name: 'Anil', email: 'anil@b.test' },
              presence: { a: { online: false, platform: 'web', lastSeen: mins(90) } } }, now),
    shopRow({ shop: 'oldshop', presence: { a: { online: false, platform: 'web', lastSeen: days(40) } } }, now),
    shopRow({ shop: 'newshop', presence: {} }, now),
  ];
  ck('every status is a filter', FILTERS.join() === 'all,online,offline,inactive,never');
  ck('all shows everything', filterRows(rows, 'all').length === 4);
  ck('online shows one', filterRows(rows, 'online').map(r => r.shop).join() === 'mobifixer');
  ck('inactive shows the long-gone one', filterRows(rows, 'inactive').map(r => r.shop).join() === 'oldshop');
  ck('never shows the unused one', filterRows(rows, 'never').map(r => r.shop).join() === 'newshop');

  ck('search finds a shop by name', filterRows(rows, 'all', 'redo').map(r => r.shop).join() === 'redotech');
  ck('  by owner', filterRows(rows, 'all', 'shahin').map(r => r.shop).join() === 'mobifixer');
  ck('  by email', filterRows(rows, 'all', 'anil@').map(r => r.shop).join() === 'redotech');
  ck('  ignoring case', filterRows(rows, 'all', 'SHAHIN').length === 1);
  ck('  and search narrows within a filter',
     filterRows(rows, 'online', 'redo').length === 0);
}

console.log('\nThe numbers along the top');
{
  const rows = [
    shopRow({ shop: 'a', jobs: 10, presence: {
      d1: { online: true,  platform: 'apk', lastSeen: mins(1) },
      d2: { online: true,  platform: 'web', lastSeen: mins(1) },
      d3: { online: false, platform: 'apk', lastSeen: mins(90) } } }, now),
    shopRow({ shop: 'b', jobs: 5, presence: {
      d1: { online: true,  platform: 'apk', lastSeen: mins(2) } } }, now),
    shopRow({ shop: 'c', jobs: 0, presence: {
      d1: { online: false, platform: 'web', lastSeen: days(40) } } }, now),
    shopRow({ shop: 'd', jobs: 0, presence: {} }, now),
  ];
  const t = totals(rows);
  ck('shops are counted', t.shops === 4);
  // A shop with two devices on it is one shop online, not two.
  ck('a shop online twice is still one shop online', t.online === 2);
  ck('  but both its devices are counted', t.apkDevices === 2 && t.webDevices === 1);
  ck('  and an offline device is not counted as on', t.apkDevices === 2);
  ck('inactive and never are separate', t.inactive === 1 && t.never === 1);
  ck('jobs add up', t.jobs === 15);
  ck('nothing at all still totals', totals([]).shops === 0 && totals([]).online === 0);
}

console.log('\nThe devices behind a row');
{
  const list = deviceList({
    d1: { online: false, platform: 'web', author: 'Anil', lastSeen: mins(10) },
    d2: { online: true,  platform: 'apk', author: 'Shahin', lastSeen: mins(1) },
    d3: { online: false, platform: 'apk', author: 'Rashid', lastSeen: mins(2) },
  }, now);
  ck('online devices come first', list[0].author === 'Shahin' && list[0].online === true);
  ck('  then the most recent', list[1].author === 'Rashid' && list[2].author === 'Anil');
  ck('  each says how long ago', list[2].lastSeenText === '10 minutes ago');
  ck('an unknown platform is not reported as the app',
     deviceList({ x: { online: true, lastSeen: now } }, now)[0].platform === 'web');
  ck('no devices is an empty list, not a crash', deviceList(undefined, now).length === 0);
}

console.log('\nThe page itself');
{
  const html = readFileSync('admin/index.html', 'utf8');
  const js   = readFileSync('admin/main.js', 'utf8');
  const app  = readFileSync('main.js', 'utf8');

  const cfg = (t) => t.slice(t.indexOf('const firebaseConfig'), t.indexOf('};', t.indexOf('const firebaseConfig')) + 2);
  ck('it talks to the same project as the app', cfg(js) === cfg(app));

  // The admin check is the database's answer, not this file's opinion.
  ck('admin is decided by reading /admins', /admins\/\$\{user\.uid\}/.test(js));
  ck('  and a non-admin is signed straight back out', /if \(!isAdmin\)[\s\S]{0,120}signOut/.test(js));

  // One read of /shops would pull every job of every shop.
  ck('the shop list is fetched shallow', /shallow=true/.test(js));
  ck('  and job counts too, so no job bodies are downloaded',
     /shallow\(`shops\/\$\{shop\}\/service`/.test(js));
  ck('presence is the only live listener', (js.match(/onValue\(/g) || []).length === 2);

  // Shop names, owner names and user agents are all written by somebody else.
  ck('nothing user-written becomes markup', !/innerHTML/.test(js));
  ck('  it is textContent throughout', /n\.textContent = text/.test(js));

  ck('the page is not indexed', /noindex/.test(html));
  ck('inputs are 16px so iOS does not zoom',
     /font-size: 16px/.test(readFileSync('admin/style.css', 'utf8')));

  // It reads across every shop, so no shop's phone should carry it.
  const build = readFileSync('scripts/build-www.mjs', 'utf8');
  ck('it is kept out of the APK payload', /'admin': 'the shops dashboard/.test(build));
  ck('  deliberately, not by omission', /website only, and no shop should carry it/.test(build));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
