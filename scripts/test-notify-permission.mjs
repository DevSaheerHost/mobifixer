#!/usr/bin/env node
/**
 * Tests for the notification permission ask.
 *
 * Android 13 made POST_NOTIFICATIONS a runtime permission, denied until the
 * user is asked, and nothing in this app asked. Every reminder and every
 * digest was scheduled and then silently dropped: syncNotifications returned
 * reason 'not-granted' and no one found out until a phone sat uncollected.
 *
 * Two things have to hold, and they pull against each other:
 *
 *   - the shop IS asked, at a moment where the question makes sense; and
 *   - the shop is NOT asked again and again, because Android stops showing
 *     the dialog after the second refusal and resolves straight to denied,
 *     which would make every later ask invisible and useless.
 *
 * These run the real notifyAskDecision rather than matching source text, and
 * they check both ends of the wiring that feeds it: the login screen sets the
 * flag, and native.js reads it, clears it, and asks.
 *
 *   node scripts/test-notify-permission.mjs
 */
import { readFileSync } from 'node:fs';
import {
  notifyAskDecision, NOTIFY_ASK_KEY, NOTIFY_ASKED_KEY, NOTIFY_ASK_LIMIT,
} from '../nativeLogic.js';

let pass = 0, fail = 0;
const ck = (label, cond, got) => {
  if (cond) { pass++; console.log('  ok   ', label); }
  else { fail++; console.log('  FAIL ', label, got === undefined ? '' : `(got ${JSON.stringify(got)})`); }
};

// ---------------------------------------------------------------------------
console.log('\nIt asks, at the sign-in');
{
  const d = notifyAskDecision({ justSignedIn: true, permission: 'prompt' });
  ck('a fresh sign-in with no answer yet asks', d.ask === true, d);
  ck('  and says why', d.reason === 'sign-in', d.reason);

  const r = notifyAskDecision({ justSignedIn: true, permission: 'prompt-with-rationale' });
  ck('prompt-with-rationale also asks', r.ask === true, r);

  const second = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: 1 });
  ck('a second sign-in still asks, Android allows two', second.ask === true, second);
}

// ---------------------------------------------------------------------------
console.log('\nIt does not nag');
{
  const granted = notifyAskDecision({ justSignedIn: true, permission: 'granted' });
  ck('never asks when already granted', granted.ask === false, granted);
  ck('  and granted beats a fresh sign-in', granted.reason === 'already-granted', granted.reason);

  const denied = notifyAskDecision({ justSignedIn: true, permission: 'denied' });
  ck('does not re-ask after a refusal', denied.ask === false, denied);
  ck('  and says why', denied.reason === 'already-denied', denied.reason);

  const launch = notifyAskDecision({ justSignedIn: false, permission: 'prompt' });
  ck('an ordinary launch does not ask', launch.ask === false, launch);
  ck('  and says why', launch.reason === 'not-a-sign-in', launch.reason);

  const enough = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: NOTIFY_ASK_LIMIT });
  ck('stops at the limit Android honours', enough.ask === false, enough);
  ck('  and says why', enough.reason === 'asked-enough', enough.reason);

  const over = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: 99 });
  ck('stays stopped past the limit', over.ask === false, over);
}

// ---------------------------------------------------------------------------
console.log('\nRubbish input cannot cause a prompt loop');
{
  ck('no arguments at all does not ask', notifyAskDecision().ask === false);
  ck('empty object does not ask', notifyAskDecision({}).ask === false);

  const nan = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: NaN });
  ck('a NaN count reads as 0 and asks once', nan.ask === true, nan);

  const junk = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: 'three' });
  ck('an unparseable count reads as 0 rather than skipping', junk.ask === true, junk);

  const neg = notifyAskDecision({ justSignedIn: true, permission: 'prompt', timesAsked: -5 });
  ck('a negative count reads as 0', neg.ask === true, neg);

  const unknown = notifyAskDecision({ justSignedIn: true, permission: 'something-new' });
  ck('an unrecognised permission is treated as askable', unknown.ask === true, unknown);
}

// ---------------------------------------------------------------------------
// The decision is only useful if both halves of the wiring exist. These read
// the shipped sources, because a correct decision nobody calls is the bug
// this file was written about.
console.log('\nThe wiring is actually connected');
{
  const auth = readFileSync('auth/main.js', 'utf8');
  ck('the login screen imports the key', /import\s*\{[^}]*NOTIFY_ASK_KEY[^}]*\}\s*from\s*["']\.\.\/nativeLogic\.js["']/.test(auth));
  ck('the login screen sets it on success', auth.includes(`localStorage.setItem(NOTIFY_ASK_KEY, '1')`));
  ck('  before navigating to the app', auth.indexOf('setItem(NOTIFY_ASK_KEY') < auth.indexOf('location = "/"'));

  const native = readFileSync('native.js', 'utf8');
  ck('native.js imports the decision', native.includes('notifyAskDecision'));
  ck('native.js has an ask flow', native.includes('export const maybeAskNotificationPermission'));
  ck('  it calls the real request', native.includes('await askNotificationPermission()'));
  ck('  it clears the flag so a reload does not re-ask', native.includes(`removeItem(NOTIFY_ASK_KEY)`));
  ck('  it records that it asked', native.includes(`setItem(NOTIFY_ASKED_KEY`));
  ck('  it reschedules once granted', /outcome === 'granted'[\s\S]{0,200}syncNotifications\(\)/.test(native));
  ck('  it tells the shop when blocked', /denied[\s\S]{0,300}Reminders are off/.test(native));
  ck('initNative calls it', /initNative[\s\S]*maybeAskNotificationPermission\(\)/.test(native));

  ck('the two keys are distinct', NOTIFY_ASK_KEY !== NOTIFY_ASKED_KEY);
  ck('the keys are namespaced', NOTIFY_ASK_KEY.startsWith('MF_') && NOTIFY_ASKED_KEY.startsWith('MF_'));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
