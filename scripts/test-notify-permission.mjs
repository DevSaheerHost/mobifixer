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
import { readFileSync, existsSync } from 'node:fs';
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

// ---------------------------------------------------------------------------
// The second permission screen. The plugin defaults isExactNotification to
// true, and one true in a batch makes schedule() push Android's "Alarms &
// reminders" settings screen in front of the user before scheduling anything.
// This app does not need the minute, so it opts out - and the manifest drops
// the permission to match. The two have to move together: opting out while
// still declaring it leaves a sensitive permission Play will ask about, and
// declaring nothing while still asking for exact alarms silently downgrades.
console.log('\nIt does not ask for exact alarms');
{
  const native = readFileSync('native.js', 'utf8');
  const schedules = native.match(/schedule:\s*\{[^}]*\}/g) || [];
  ck('there are two schedules, reminder and digest', schedules.length === 2, schedules.length);
  ck('allowWhileIdle is kept, so Doze still wakes the phone',
    schedules.every(s => /allowWhileIdle:\s*true/.test(s)), schedules);

  // WHERE the flag goes is the whole bug 5.1.1 shipped. It was inside
  // schedule:{}, which the plugin's schedule parser never reads, so it stayed
  // at its default of true and every schedule() reopened Android's "Alarms &
  // reminders" screen. syncNotifications runs again on resume, so returning
  // from that screen opened it again - and with the permission dropped from
  // the manifest the toggle was dead, so there was no way out of the loop.
  ck('the flag is NOT inside schedule, where it is ignored',
    schedules.every(s => !/isExactNotification/.test(s)), schedules);
  const onNotification = native.match(/^\s*isExactNotification:\s*false,/gm) || [];
  ck('  it is on the notification itself, once per notification',
    onNotification.length === 2, onNotification.length);

  // Pin the plugin contract the two assertions above rest on, so a plugin
  // upgrade that moves the flag fails here and not on a shop's phone.
  //
  // Skipped rather than fatal when the plugin is not installed: the rest of
  // this suite reads only files in the repo and has to keep running on a bare
  // checkout. CI installs dependencies, so there it is checked for real.
  const lnDir = 'node_modules/@capacitor/local-notifications/android/src/main'
    + '/kotlin/com/capacitorjs/plugins/localnotifications';
  if (!existsSync(`${lnDir}/LocalNotification.kt`)) {
    console.log('  skip   plugin contract (run npm ci to check it)');
  } else {
    const notif = readFileSync(`${lnDir}/LocalNotification.kt`, 'utf8');
    const sched = readFileSync(`${lnDir}/LocalNotificationSchedule.kt`, 'utf8');
    ck('the plugin reads the flag off the notification',
      /getBoolean\("isExactNotification",\s*true\)/.test(notif));
    ck('  the schedule parser does not read it at all',
      !/isExactNotification/.test(sched));
    ck('  but it does read allowWhileIdle, which is why that one works',
      /getBoolean\("allowWhileIdle"/.test(sched));
  }

  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  ck('the manifest removes SCHEDULE_EXACT_ALARM',
    /SCHEDULE_EXACT_ALARM[\s\S]{0,80}tools:node="remove"/.test(manifest));
  ck('  with the tools namespace it needs', manifest.includes('xmlns:tools="http://schemas.android.com/tools"'));
  ck('USE_EXACT_ALARM is still never declared', !/<uses-permission[^>]*USE_EXACT_ALARM/.test(manifest));
  ck('POST_NOTIFICATIONS is still not blocked', !/POST_NOTIFICATIONS[\s\S]{0,80}tools:node="remove"/.test(manifest));
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
