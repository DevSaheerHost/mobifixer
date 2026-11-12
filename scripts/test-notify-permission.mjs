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
    onNotification.length === 3, onNotification.length);   // reminder, digest, apk-update
  // The update notice is posted by a different code path and would reopen the
  // same settings screen on its own if it were left exact.
  ck('  including the update notice',
    /kind: 'apk-update'[\s\S]{0,200}|isExactNotification: false,[\s\S]{0,300}kind: 'apk-update'/.test(native)
    && /isExactNotification: false,[\s\S]{0,200}extra: \{ kind: 'apk-update'/.test(native));

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

console.log('\nVibration');
{
  // The failure this pins down was invisible: main.js called
  // navigator.vibrate() in four places for months, and with no VIBRATE
  // permission the WebView took the call, returned normally and did nothing.
  // No error, no log. Only a device told you.
  const manifest = readFileSync('android/app/src/main/AndroidManifest.xml', 'utf8');
  ck('the manifest declares VIBRATE',
    /<uses-permission[^>]*android\.permission\.VIBRATE/.test(manifest));
  ck('  and does not then remove it',
    !/VIBRATE[\s\S]{0,80}tools:node="remove"/.test(manifest));

  const src = readFileSync('main.js', 'utf8');
  const code = src.replace(/\/\/[^\n]*/g, '').replace(/\/\*[\s\S]*?\*\//g, '');

  ck('there is one vibrate helper', /const vibrate = \(pattern\) =>/.test(src));
  ck('  it feature-detects, because iOS Safari has no vibrate at all',
    /typeof navigator\.vibrate === 'function'/.test(src));
  ck('  and it swallows a refusal rather than failing the caller',
    /const vibrate[\s\S]{0,400}try \{[\s\S]{0,300}catch/.test(src));

  // Three of the four original calls had no guard, so a notice on a browser
  // without the API threw halfway through building the toast. Every call goes
  // through the helper now; a bare one anywhere is that bug coming back.
  const bare = (code.match(/navigator\.vibrate\(/g) || []).length;
  ck('no call site uses navigator.vibrate directly', bare === 1,
     `${bare} occurrences; only the one inside the helper is allowed`);
  ck('every buzz goes through the helper',
     (code.match(/(?<!navigator\.)\bvibrate\(\[/g) || []).length === 4);
}

console.log('\nThe exit dialog in main.js');
{
  const src  = readFileSync('main.js', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  ck('the dialog exists in the markup', html.includes('id="exitOverlay"'));
  ck('  with both answers', html.includes('id="exitConfirm"') && html.includes('id="exitCancel"'));
  ck('  and is announced as a dialog',
     /id="exitOverlay"[\s\S]{0,200}role="dialog"[\s\S]{0,120}aria-modal="true"/.test(html));

  ck('showExitConfirm is handed to the native layer', /showExitConfirm,/.test(src));
  // Back pressed twice would otherwise open a second dialog over the first,
  // and the first would still be there behind it.
  ck('it refuses to stack a second dialog',
     /function showExitConfirm[\s\S]{0,400}classList\.contains\('active'\)\) return;/.test(src));
  // So that a back press while the question is up answers "stay".
  ck('the dialog is the first layer back closes',
     /const layers = \[[\s\S]{0,160}'#exitOverlay\.active'/.test(src));
  ck('  and Stay is what gets focus, not Close',
     /showExitConfirm[\s\S]{0,500}#exitCancel'\)\?\.focus\(\)/.test(src));
}

console.log('\nSharing the app');
{
  const src  = readFileSync('native.js', 'utf8');
  const main = readFileSync('main.js', 'utf8');
  const html = readFileSync('index.html', 'utf8');

  ck('Settings has a share row', /id="shareApp"/.test(html));
  ck('  it is a button, not a dead link',
     /<button[^>]*class="row"[^>]*id="shareApp"/.test(html));

  // Android's WebView has no navigator.share at all, so the plugin is the
  // only thing that reaches the system sheet from the APK.
  ck('the share plugin is a dependency',
     Boolean(JSON.parse(readFileSync('package.json', 'utf8')).dependencies['@capacitor/share']));
  ck('shareApp asks the native plugin first', /plugin\('Share'\)/.test(src));
  ck('  falls back to navigator.share for the phone browser',
     /navigator\.share === 'function'/.test(src));
  ck('  and to the clipboard where there is neither',
     /clipboard\.writeText/.test(src));
  ck('  it reports which path it took, so the button is never silent',
     /how: 'native'/.test(src) && /how: 'clipboard'/.test(src) && /how: 'unavailable'/.test(src));

  // A raw .apk landing in a chat is what makes Android shout about unknown
  // sources. The link is the site, which offers the download itself.
  ck('it shares the site, not the apk file',
     /export const SHARE_URL = UPDATE_HOST;/.test(src) && !/SHARE_URL[\s\S]{0,80}\.apk/.test(src));
  ck('main.js tells them when it only managed the clipboard',
     /how === 'clipboard'[\s\S]{0,200}Link copied/.test(main));
}

console.log('\nWhat the update pop-up says');
{
  const src  = readFileSync('native.js', 'utf8');
  const main = readFileSync('main.js', 'utf8');

  // The two are not the same event and must not read as if they were: one is
  // a download plus Android's installer, the other is already on the device.
  ck('the APK sheet says it is an install',
     /title: 'New version ready to install'/.test(src));
  ck('  names the download and the tap that follows',
     /Downloads in your browser, then tap the file to install/.test(src));
  ck('  and promises the jobs survive it',
     /jobs, staff and settings stay exactly as they are/.test(src));
  ck('the web sheet says there is nothing to install',
     /title: 'Update ready'/.test(src) && /Already downloaded/.test(src));
  ck('  and its button says what it does', /confirmLabel: 'Restart now'/.test(src));

  ck('the sheet takes a title at all', /function showUpdateSheet\(\{ title = /.test(main));
  ck('  and sets it rather than leaving the markup default',
     /#updateTitle'\)\.textContent = title/.test(main));

  // On mobile data, 8 MB is worth knowing before tapping Download.
  ck('the APK size is shown when known', /size: Number\(manifest\.size\) \|\| 0/.test(src));
  ck('  rendered as MB beside the version', /1048576\)\.toFixed\(1\) \+ ' MB'/.test(main));
  ck('  and absent rather than "0 MB" when unknown',
     /Number\(size\) > 0 \?/.test(main));
}

console.log('\nThe back button, run rather than read');
{
  // 5.1.6 shipped with `const App = plugin('App')` declared BELOW a block that
  // used App, putting that use in its temporal dead zone. initNative threw
  // ReferenceError there, so the back listener, the resume listener,
  // syncNotifications, the permission prompt and both update checks never ran.
  //
  // Nothing static would have caught it: the file parses, and node --check
  // passes. A TDZ error only exists when the function runs. So this runs it,
  // against a fake Capacitor, and asserts what got wired up.
  const listeners = {};
  const calls = [];
  const shareArgs = [];
  const noop = async () => ({});

  globalThis.window = {
    Capacitor: {
      isNativePlatform: () => true,
      Plugins: {
        App: {
          addListener: (ev, fn) => { listeners[ev] = fn; return { remove: noop }; },
          exitApp: async () => { calls.push('exitApp'); },
          minimizeApp: async () => { calls.push('minimizeApp'); },
        },
        Share: {
          share: async (opts) => { calls.push('share'); shareArgs.push(opts); },
        },
        LocalNotifications: {
          addListener: (ev, fn) => { listeners[ev] = fn; return { remove: noop }; },
          createChannel: noop, schedule: noop, getPending: async () => ({ notifications: [] }),
          cancel: noop, registerActionTypes: noop,
          checkPermissions: async () => ({ display: 'granted' }),
          requestPermissions: async () => ({ display: 'granted' }),
        },
      },
    },
    addEventListener: () => {},
    location: { href: '' },
    history: { back: () => calls.push('history.back') },
    matchMedia: () => ({ matches: false }),
  };
  globalThis.localStorage = {
    _d: {},
    getItem(k) { return k in this._d ? this._d[k] : null; },
    setItem(k, v) { this._d[k] = String(v); },
    removeItem(k) { delete this._d[k]; },
  };
  globalThis.fetch = async () => ({ ok: false, status: 503, json: async () => ({}) });

  let threw = null;
  const shown = [];
  let native;
  try {
    native = await import('../native.js');
    await native.initNative({
      shopName: 'testshop',
      getJobs: () => [],
      getReminders: () => ({}),
      closeTopLayer: () => false,
      showNotice: () => {},
      showUpdateSheet: () => {},
      showExitConfirm: (o) => shown.push(o),
    });
  } catch (err) {
    threw = err;
  }

  ck('initNative does not throw', !threw, threw && `${threw.constructor.name}: ${threw.message}`);
  ck('the back button listener is registered', typeof listeners.backButton === 'function');
  ck('  so is the resume listener, which sat after it',
     typeof listeners.appStateChange === 'function');

  if (typeof listeners.backButton === 'function') {
    // Home screen, nothing open: it must ask, not leave.
    listeners.backButton({ canGoBack: false });
    ck('back on the home screen asks before leaving', shown.length === 1);
    ck('  and does not leave on its own', !calls.includes('exitApp'));
    ck('  it no longer minimises silently', !calls.includes('minimizeApp'));

    if (shown[0] && typeof shown[0].onConfirm === 'function') {
      await shown[0].onConfirm();
      ck('  confirming is what exits', calls.includes('exitApp'));
    } else {
      ck('  confirming is what exits', false, 'no onConfirm was handed over');
    }

    // An open sheet is one step back and must not raise the exit question.
    // Re-registering with a host whose closeTopLayer reports it handled the
    // press is the only way to reach that branch from here.
    const beforeSheet = shown.length;
    await native.initNative({ closeTopLayer: () => true });
    listeners.backButton({ canGoBack: false });
    ck('back with a sheet open closes the sheet instead of asking to exit',
       shown.length === beforeSheet);

    // And a page reached by hash is a step back, not an exit either.
    await native.initNative({ closeTopLayer: () => false });
    const beforeHash = shown.length;
    listeners.backButton({ canGoBack: true });
    ck('back inside the app goes back, rather than asking to exit',
       shown.length === beforeHash && calls.includes('history.back'));
  }

  // Sharing, run rather than matched. navigator.share does not exist in the
  // WebView, so if the plugin were not reached the button would do nothing at
  // all on the one platform that matters.
  if (native && native.shareApp) {
    const r = await native.shareApp();
    ck('shareApp reaches the native share sheet', r.shared === true && r.how === 'native');
    const a = shareArgs[0] || {};
    ck('  and hands it the site link', a.url === native.SHARE_URL);
    ck('  with a title and a line of text',
       Boolean(a.title) && Boolean(a.text) && a.text.length > 40);
  } else {
    ck('shareApp reaches the native share sheet', false, 'shareApp was not exported');
  }

  delete globalThis.window;
  delete globalThis.localStorage;
  delete globalThis.fetch;
}

console.log(`\n${pass} passed, ${fail} failed\n`);
process.exit(fail ? 1 : 0);
