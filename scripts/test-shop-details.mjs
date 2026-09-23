#!/usr/bin/env node
/**
 * Regression tests for the Shop Details page.
 *
 * Three separate bugs sat on this page, and all three showed a shop data that
 * was not its own:
 *
 *   1. Nothing prompted a new shop to fill the page in. The only way into the
 *      form was a button ~2200px down, past six sections, so shops simply
 *      never filled it in and every field read "Not set".
 *   2. The opening hours were hardcoded HTML. The edit form collected them and
 *      saveShopDetails() stored them, but nothing ever painted them, so a shop
 *      that entered its real hours was still shown 9-6 Mon-Fri.
 *   3. The customer rating was the literal 4.8. No rating is collected
 *      anywhere in this app.
 *
 * loadShopDetails() is extracted out of main.js and run for real, so these
 * assertions track the shipped source rather than a copy of it.
 *
 *   node scripts/test-shop-details.mjs
 */
import { readFileSync } from 'node:fs';

const src  = readFileSync('main.js', 'utf8');
const html = readFileSync('index.html', 'utf8');
const css  = readFileSync('style.css', 'utf8');

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

// ---- extract the real loadShopDetails() ------------------------------------
const start = src.indexOf('function loadShopDetails() {');
const end   = src.indexOf('\n// Calculate statistics from stored data');
if (start < 0 || end < 0 || end < start) throw new Error('could not extract loadShopDetails from main.js');
const BLOCK = src.slice(start, end);

/** Minimal DOM: every id is an element with textContent and a classList. */
function makeDom() {
  const els = {};
  const el = (id) => {
    const set = new Set();
    return {
      id, textContent: '',
      classList: {
        add: c => set.add(c),
        remove: c => set.delete(c),
        contains: c => set.has(c),
        toggle: (c, on) => { if (on === undefined) { set.has(c) ? set.delete(c) : set.add(c); } else if (on) set.add(c); else set.delete(c); return set.has(c); }
      },
      _has: c => set.has(c)
    };
  };
  for (const id of ['shopName','shopTagline','ownerName','ownerPhone','shopEmail','shopLocation',
                    'shopGST','shopEstablished','shopDescription','hoursMF','hoursSat','hoursSun',
                    'sundayClosedBadge','shopSetupCard','editShop_details','shopEditLocked']) {
    els[id] = el(id);
  }
  els['.shop_details_page'] = { id: 'page' };
  return els;
}

// The owner check lives just above loadShopDetails(); extract it too, so the
// tests exercise the real rule rather than a reimplementation of it.
const GUARD = src.slice(src.indexOf('function canEditShopDetails() {'),
                        src.indexOf('async function fetchShopDetails'));
if (!GUARD) throw new Error('could not extract canEditShopDetails from main.js');

function makeGuard({ role = 'Shop Owner', author = '', ownerName = '' } = {}) {
  const store = { role, author };
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: () => {} };
  return new Function('localStorage', 'isOwner', 'shopOwnerName',
    `${GUARD}\nreturn canEditShopDetails;`)(
      localStorage,
      () => String(role).toLowerCase() === 'shop owner',
      String(ownerName).trim().toLowerCase());
}

function run({ details = {}, role = 'Shop Owner', author = '', ownerName = '' } = {}) {
  const els = makeDom();
  const $ = (sel) => (sel.startsWith('#') ? els[sel.slice(1)] : els[sel]) || null;
  const store = { shopName: 'demoshop' };
  const localStorage = { getItem: k => (k in store ? store[k] : null), setItem: (k, v) => { store[k] = String(v); } };
  const fn = new Function('$', 'shopDetailsCache', 'localStorage', 'canEditShopDetails',
                          'calculateAndUpdateShopStats', 'console',
    `${BLOCK}\nreturn loadShopDetails;`)(
      $, details, localStorage,
      makeGuard({ role, author, ownerName }),
      () => {}, console);
  fn();
  return { els, txt: id => els[id].textContent, hidden: id => els[id]._has('hidden') };
}

const FULL = {
  shopDisplayName: 'Kondotty Mobiles', shopTagline: 'Fast repairs', shopDescription: 'Family run.',
  ownerName: 'Anil Kumar', ownerPhone: '9876500011', shopEmail: 'a@b.test',
  shopLocation: 'Kondotty, Kerala', shopGST: '32ABCDE1234F1Z5', shopEstablished: 'March 2019',
  hoursMF: '10:00 AM - 8:00 PM', hoursSat: '10:00 AM - 9:00 PM', hoursSun: 'Closed'
};

console.log('\nEmpty shop, owner');
{
  const r = run({ details: {} });
  ck('setup prompt is shown', !r.hidden('shopSetupCard'));
  ck('edit button is shown to the owner', !r.hidden('editShop_details'));
  ck('the staff note is hidden', r.hidden('shopEditLocked'));
  ck('hours read "Not set" rather than a hardcoded time', r.txt('hoursMF') === 'Not set' && r.txt('hoursSat') === 'Not set' && r.txt('hoursSun') === 'Not set');
  ck('Sunday "Closed" chip is hidden', r.hidden('sundayClosedBadge'));
  ck('owner reads "Not set"', r.txt('ownerName') === 'Not set');
}

console.log('\nDetails saved, owner');
{
  const r = run({ details: FULL });
  ck('setup prompt disappears', r.hidden('shopSetupCard'));
  ck('Mon-Fri hours are the saved ones', r.txt('hoursMF') === '10:00 AM - 8:00 PM', r.txt('hoursMF'));
  ck('Saturday hours are the saved ones', r.txt('hoursSat') === '10:00 AM - 9:00 PM', r.txt('hoursSat'));
  ck('Sunday is the saved value', r.txt('hoursSun') === 'Closed', r.txt('hoursSun'));
  ck('Sunday "Closed" chip appears', !r.hidden('sundayClosedBadge'));
  ck('display name comes from shopDetails, not the tenant key', r.txt('shopName') === 'Kondotty Mobiles', r.txt('shopName'));
}

console.log('\nOnly one field saved');
{
  const r = run({ details: { ownerName: 'Anil Kumar' } });
  ck('prompt goes away as soon as anything is saved', r.hidden('shopSetupCard'));
  ck('the rest still reads "Not set"', r.txt('shopLocation') === 'Not set' && r.txt('hoursMF') === 'Not set');
}
{
  // The tenant key is not a detail the shop entered. If it counted, the prompt
  // would be hidden for every shop for ever, since it is never empty.
  const r = run({ details: {} });
  ck('the tenant key alone does not count as "details filled in"', !r.hidden('shopSetupCard'));
  ck('but it is still used as a fallback heading', r.txt('shopName') === 'demoshop', r.txt('shopName'));
}

console.log('\nStaff');
{
  const r = run({ details: FULL, role: 'Technician' });
  ck('setup prompt hidden for staff', r.hidden('shopSetupCard'));
  ck('edit button hidden for staff', r.hidden('editShop_details'));
  ck('staff are told why the button is gone', !r.hidden('shopEditLocked'));
  ck('staff can still read the details', r.txt('ownerName') === 'Anil Kumar');

  const empty = run({ details: {}, role: 'Technician' });
  ck('staff at an unfilled shop are not prompted either', empty.hidden('shopSetupCard'));

  const strandedOwner = run({ details: {}, role: 'Technician', author: 'Anil Kumar', ownerName: 'Anil Kumar' });
  ck('an owner whose stored role says staff is still prompted and can edit',
     !strandedOwner.hidden('shopSetupCard') && !strandedOwner.hidden('editShop_details'));
}

console.log('\nThe guard rail');
{
  const edit = src.slice(src.indexOf('function editShopDetails() {'), src.indexOf('function saveShopDetails'));
  ck('editShopDetails() itself refuses a non-owner', /if \(!canEditShopDetails\(\)\)/.test(edit));
  ck('and refuses before it touches the modal', edit.indexOf('canEditShopDetails()') < edit.indexOf('#editShopModal'));
  ck('the refusal is documented as a guard rail, not security',
     /not a security boundary|guard rail/i.test(edit));

  // `role` is chosen from a radio button at login, so a genuine owner who once
  // signed in as staff has it set to something else. Locking them out of their
  // own shop with no way back would be worse than the accident this prevents.
  ck('owner by role', makeGuard({ role: 'Shop Owner' })());
  ck('owner by name, even with a staff role',
     makeGuard({ role: 'Technician', author: 'Anil Kumar', ownerName: 'Anil Kumar' })());
  ck('name match ignores case and spacing',
     makeGuard({ role: 'Trainee Technician', author: '  anil kumar ', ownerName: 'Anil Kumar' })());
  ck('a different staff member is still refused',
     !makeGuard({ role: 'Technician', author: 'Fathima K', ownerName: 'Anil Kumar' })());
  ck('a shop with no owner record falls back to the role check',
     !makeGuard({ role: 'Technician', author: 'Fathima K', ownerName: '' })());
  ck('a blank author never matches a blank owner name',
     !makeGuard({ role: 'Technician', author: '', ownerName: '' })());
}

console.log('\nNothing invented in the shipped HTML');
{
  const page = html.slice(html.indexOf('SHOP_DETAILS_PAGE'), html.indexOf('EDIT SHOP DETAILS MODAL'));
  ck('no hardcoded opening hours', !/9:00 AM - 6:00 PM|10:00 AM - 5:00 PM/.test(page), 'static hours still in index.html');
  ck('no boilerplate "About Shop" story', !/one-stop solution|5\+ years of experience/i.test(page));
  ck('no invented 4.8 customer rating', !/id="shopRating">\s*4\.8/.test(page));
  ck('no invented rating in main.js either', !/shopRating\s*=\s*4\.8/.test(src));
  ck('the setup card ships hidden, so it never flashes before the JS runs',
     /id="shopSetupCard"/.test(page) && /class="shop-setup-card hidden"/.test(page));
  ck('the edit button has no inline onclick (editShopDetails is module-scoped)',
     !/id="editShop_details"[^>]*onclick/.test(page));
}

console.log('\nThe .hidden source-order trap');
{
  // `.hidden { display: none }` is declared early in style.css. Any later rule
  // that sets `display` on the same element wins on source order, and the
  // element can never be hidden. This has bitten three times now.
  const hiddenAt = css.indexOf('.hidden{');
  for (const sel of ['.shop-setup-card', '.btn-edit-shop', '.shop-actions-note']) {
    const at = css.indexOf(sel + ' {');
    const sets = at > -1 && /display:/.test(css.slice(at, css.indexOf('}', at)));
    const guarded = css.includes(sel + '.hidden {');
    ck(`${sel} can still be hidden by .hidden`, !sets || at < hiddenAt || guarded,
       'sets display after .hidden without a ' + sel + '.hidden guard');
  }
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
