#!/usr/bin/env node
/**
 * What an admin's controls do inside the shop's own app.
 *
 * None of this is the boundary - the rules refuse a suspended shop's writes
 * on the server whatever happens here - so what is tested is whether the
 * shop is told the truth, and whether a control can lock somebody out for
 * good by accident.
 */
import { readFileSync } from 'node:fs';
import { shouldSignOut, lockState, unseenMessage } from '../shopControls.js';

let pass = 0, fail = 0;
const ck = (name, cond, extra = '') => {
  if (cond) { pass++; console.log('  ok    ' + name); }
  else { fail++; console.log('  FAIL  ' + name + (extra ? '   ' + extra : '')); }
};

const T = 1_700_000_000_000;

console.log('\nForcing a sign-out');
{
  ck('a session that started before the cut-off goes',
     shouldSignOut({ signOutAfter: T, sessionStart: T - 1000 }) === true);
  ck('  one that started exactly on it goes too',
     shouldSignOut({ signOutAfter: T, sessionStart: T }) === true);

  // The whole point of comparing against the session start. If this compared
  // against "now", a cut-off in the past would turn out every future sign-in
  // as well and the shop could never get back in - a permanent lockout from
  // a control meant to be momentary.
  ck('but signing in afterwards is NOT signed out again',
     shouldSignOut({ signOutAfter: T, sessionStart: T + 1 }) === false);
  ck('  even much later', shouldSignOut({ signOutAfter: T, sessionStart: T + 86_400_000 }) === false);

  ck('no cut-off means nobody goes', shouldSignOut({ sessionStart: T }) === false);
  ck('  nor does a junk one', shouldSignOut({ signOutAfter: 'soon', sessionStart: T }) === false);
  ck('  nor zero', shouldSignOut({ signOutAfter: 0, sessionStart: T }) === false);
}

console.log('\nBeing locked');
{
  const off = lockState({ suspended: false });
  ck('an unsuspended shop is not locked', off.locked === false);
  ck('  and is told nothing', off.body === '');

  const on = lockState({ suspended: true });
  ck('a suspended one is locked', on.locked === true);
  ck('  with a reason, not a blank screen', on.body.length > 20);
  ck('  which says the data is safe', /safe/i.test(on.body));

  // The admin's own words beat the default, because they know why.
  const told = lockState({ suspended: true, adminMessage: { body: 'Subscription unpaid since March.' } });
  ck('the admin\'s message is used when there is one', told.body === 'Subscription unpaid since March.');

  ck('anything other than true is not locked',
     lockState({ suspended: 'true' }).locked === false
     && lockState({}).locked === false
     && lockState().locked === false);
}

console.log('\nA message, shown once');
{
  ck('a new message is shown', unseenMessage({ title: 'Hi', body: 'Call us', at: T })?.at === T);
  ck('  one already seen is not', unseenMessage({ body: 'x', at: T, seenAt: T }) === null);
  ck('  nor one seen later still', unseenMessage({ body: 'x', at: T, seenAt: T + 5 }) === null);

  // Keyed on `at`, so a second message is shown even with the same words.
  ck('a newer message is shown again',
     unseenMessage({ body: 'x', at: T + 100, seenAt: T })?.at === T + 100);

  ck('no message is nothing to show', unseenMessage(null) === null && unseenMessage({}) === null);
  ck('  and a message with no time is ignored', unseenMessage({ body: 'x' }) === null);

  const m = unseenMessage({ body: 'y'.repeat(900), at: T });
  ck('an over-long body is cut to what the rules allow', m.body.length === 500);
  ck('  and a missing title still reads as something', unseenMessage({ body: 'x', at: T }).title.length > 0);
}

console.log('\nWired into the app');
{
  const main = readFileSync('main.js', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  ck('all three fields are watched',
     /shops\/\$\{shopName\}\/signOutAfter/.test(main)
     && /shops\/\$\{shopName\}\/suspended/.test(main)
     && /shops\/\$\{shopName\}\/adminMessage/.test(main));
  ck('  live, so a change lands without a reload',
     (main.match(/onValue\(ref\(db, `shops\/\$\{shopName\}\//g) || []).length === 3);
  ck('  and only once the shop is this account\'s',
     main.indexOf('watchAdminControls(user)') > main.indexOf("outcome === 'mismatch'"));

  ck('the session start is captured once, not read per check',
     /const SESSION_START = Date\.now\(\);/.test(main));
  ck('signing out clears the shop from the device',
     /signOut\(auth\)[\s\S]{0,200}removeItem\('shopName'\)/.test(main));

  ck('there is a lock screen', /id="lockOverlay"/.test(html));
  ck('  announced as a dialog that interrupts', /role="alertdialog"/.test(html));
  ck('  and it cannot be dismissed', !/lockOverlay[\s\S]{0,400}close/i.test(html));

  const css = readFileSync('style.css', 'utf8');
  ck('  it covers the exit sheet as well', /\.lock_overlay[\s\S]{0,300}z-index: 200/.test(css));
}

console.log('\nThe dashboard side');
{
  const js = readFileSync('admin/main.js', 'utf8');

  ck('all five controls exist',
     ['suspend', 'signOutEveryone', 'message', 'resetPassword', 'editOwner']
       .every(k => js.includes(`async ${k}(`)));

  // These act on somebody else's business from a list of similar rows.
  ck('each destructive one confirms, naming the shop', /confirmFor = \(shop, what\)/.test(js));
  ck('  lock confirms', /suspend\(shop, on\)[\s\S]{0,200}confirmFor/.test(js));
  ck('  so does signing everyone out', /signOutEveryone\(shop\)[\s\S]{0,200}confirmFor/.test(js));

  // A browser cannot set a password; saying otherwise would be a lie in the UI.
  ck('the reset is an email, not a new password', /sendPasswordResetEmail/.test(js));
  ck('  and the confirmation says so', /They choose the new password from the link/.test(js));
  ck('  a shop with no address is told, not failed at', /has no email address on its record/.test(js));

  // The rules refuse a cut-off in the future.
  ck('the sign-out cut-off is now, never the future',
     /signOutAfter`\), Date\.now\(\)\)/.test(js));

  ck('every control reports what happened', (js.match(/note\(`Could not/g) || []).length >= 4);
  ck('editing the owner warns about the address the login reads',
     /the address the sign-in looks up/.test(js));
  ck('a locked shop is visible in the list, not only inside',
     /pill locked/.test(js));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
