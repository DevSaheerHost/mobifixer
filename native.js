// The Android wrapper's half of the app.
//
// Loaded by every build, web and native. On the website every function here
// returns immediately and nothing changes: the whole module is behind one
// check of whether Capacitor is present. That matters because index.html is
// the same file on GitHub Pages and inside the APK, and a shop on the website
// must not pay for plugins it does not have.
//
// There is no bundler in this project, so nothing here is imported from
// node_modules. Capacitor injects its bridge into the WebView and every
// installed plugin appears on window.Capacitor.Plugins; the npm packages exist
// only so `cap sync` can copy the native code into android/. The one local
// import is nativeLogic.js, which holds the arithmetic and has no dependencies
// of its own.

import {
  compareVersions, updateDecision, pendingDigests, dueReminders,
  reminderId, digestId, apkUpdateId, JOB_ACTIONS, actionStatus,
  DIGEST_DEFAULT_DAYS,
  notifyAskDecision, NOTIFY_ASK_KEY, NOTIFY_ASKED_KEY,
} from './nativeLogic.js';

/**
 * Hand a URL to the phone's browser.
 *
 * Used for the APK download. The browser downloads it with a real progress
 * notification and the shop taps that to install, which means ANDROID'S
 * BROWSER is the installer and this app is not - so this app does not need
 * REQUEST_INSTALL_PACKAGES, and no longer asks for it. That permission lets an
 * app install other apps, and on a sideloaded APK signed by a key with no
 * history behind it, it is the kind of thing Play Protect blocks on.
 */
/** Apply a web bundle that has already been downloaded and set. */
export const applyWebUpdate = () => safe('reload', async () => {
  const U = plugin('CapacitorUpdater');
  if (U && U.reload) await U.reload();
  return true;
}, false);

const openUrl = (url) => {
  try { window.open(url, '_blank'); return true; }
  catch (_) { return false; }
};

// ---------------------------------------------------------------------------
// Is there a device under us?

const cap = () => (typeof window !== 'undefined' && window.Capacitor) || null;
export const isNative = () => {
  const c = cap();
  return !!(c && typeof c.isNativePlatform === 'function' && c.isNativePlatform());
};
const plugin = (name) => {
  const c = cap();
  return (c && c.Plugins && c.Plugins[name]) || null;
};

// Every plugin call goes through this. A plugin that is missing, or throws,
// must never take the app down with it: a shop whose notifications fail still
// needs to book in the phone on the counter.
const safe = async (label, fn, fallback = null) => {
  try { return await fn(); }
  catch (err) {
    console.warn(`native: ${label} failed:`, (err && err.message) || err);
    return fallback;
  }
};

// ---------------------------------------------------------------------------
// Settings. Stored in localStorage beside the web app's own, so the same
// Settings page drives both and nothing new has to be synced.

export const DIGEST_KEY = 'MF_PENDING_DIGEST';        // 'off' or a number of days
export const AUTO_UPDATE_KEY = 'MF_AUTO_UPDATE';      // 'off' to stop checking

export const digestDays = () => {
  const raw = localStorage.getItem(DIGEST_KEY);
  if (raw === 'off') return null;                     // switched off
  const n = parseInt(raw, 10);
  if (Number.isFinite(n) && n >= 1 && n <= 90) return n;
  return DIGEST_DEFAULT_DAYS;                         // unset: the card's own threshold
};
export const setDigestDays = (v) =>
  localStorage.setItem(DIGEST_KEY, v === null || v === 'off' ? 'off' : String(v));

export const autoUpdateOn = () => localStorage.getItem(AUTO_UPDATE_KEY) !== 'off';

// ---------------------------------------------------------------------------
// What main.js hands us

let host = {
  getJobs: () => [],
  getReminders: () => ({}),
  setStatus: async () => false,
  openJob: () => {},
  showNotice: () => {},
  showUpdateSheet: () => {},     // the website has no sheet; calling it is a no-op
  shopName: '',
};

// ---------------------------------------------------------------------------
// Notifications

const CHANNEL_JOBS = 'mobifixer-jobs';

const ensureChannel = () => safe('createChannel', async () => {
  const LN = plugin('LocalNotifications');
  if (!LN || !LN.createChannel) return;
  // Android 8+ ignores importance set on the notification; it comes from the
  // channel, and a channel's importance cannot be raised after it is created.
  // HIGH so a reminder that the shop asked for actually makes a sound.
  await LN.createChannel({
    id: CHANNEL_JOBS,
    name: 'Jobs and reminders',
    description: 'Reminders you set, and phones that have been waiting a while',
    importance: 4,
    visibility: 1,
  });
});

export const notificationsAllowed = async () => {
  const LN = plugin('LocalNotifications');
  if (!LN) return false;
  const r = await safe('checkPermissions', () => LN.checkPermissions(), null);
  return !!(r && r.display === 'granted');
};

export const askNotificationPermission = async () => {
  const LN = plugin('LocalNotifications');
  if (!LN) return 'unsupported';
  const r = await safe('requestPermissions', () => LN.requestPermissions(), null);
  if (!r) return 'error';
  if (r.display === 'granted') { await ensureChannel(); return 'granted'; }
  return r.display === 'denied' ? 'denied' : 'dismissed';
};

/** The login screen sets this on its way to the app. See nativeLogic.js. */
export const markSignedIn = () => {
  try { localStorage.setItem(NOTIFY_ASK_KEY, '1'); } catch (_) {}
};

/**
 * Ask for notification permission, once, just after signing in.
 *
 * The flag is cleared whatever the answer, so a sign-in asks at most once and
 * a reload of the app does not ask at all. On a refusal the shop is told
 * plainly that reminders are off and where to turn them on, rather than being
 * left to wonder why a reminder they set never arrived.
 */
export const maybeAskNotificationPermission = async () => {
  if (!isNative()) return { asked: false, reason: 'not-native' };

  let justSignedIn = false;
  let timesAsked = 0;
  try {
    justSignedIn = localStorage.getItem(NOTIFY_ASK_KEY) === '1';
    timesAsked = parseInt(localStorage.getItem(NOTIFY_ASKED_KEY) || '0', 10) || 0;
  } catch (_) {}

  const LN = plugin('LocalNotifications');
  if (!LN) return { asked: false, reason: 'no-plugin' };

  const current = await safe('checkPermissions', () => LN.checkPermissions(), null);
  const permission = (current && current.display) || 'prompt';

  const { ask, reason } = notifyAskDecision({ justSignedIn, permission, timesAsked });

  // Consume the flag either way: this sign-in has had its turn.
  if (justSignedIn) { try { localStorage.removeItem(NOTIFY_ASK_KEY); } catch (_) {} }

  if (!ask) {
    // Granted is the happy path and needs no channel work here - the channel
    // is created when permission is granted, and again before scheduling.
    if (permission === 'granted') await ensureChannel();
    return { asked: false, reason };
  }

  try { localStorage.setItem(NOTIFY_ASKED_KEY, String(timesAsked + 1)); } catch (_) {}

  const outcome = await askNotificationPermission();

  if (outcome === 'granted') {
    // Permission arrived after the launch sync already ran and found none, so
    // schedule now rather than leaving the shop until the next list refresh.
    await syncNotifications();
    host.showNotice({
      title: 'Reminders on',
      body: 'This phone will now remind you about jobs still waiting.',
      type: 'info', delay: 5,
    });
  } else if (outcome === 'denied' || outcome === 'dismissed') {
    host.showNotice({
      title: 'Reminders are off',
      body: 'Android is blocking notifications, so reminders you set will not arrive. '
          + 'You can turn them on in Settings \u203a Apps \u203a Mobifixer \u203a Notifications.',
      type: 'warn', delay: 10,
    });
  }

  return { asked: true, reason, outcome };
};

const registerActions = () => safe('registerActionTypes', async () => {
  const LN = plugin('LocalNotifications');
  if (!LN || !LN.registerActionTypes) return;
  await LN.registerActionTypes({
    types: [{
      id: 'JOB',
      actions: JOB_ACTIONS.map(a => ({ id: a.id, title: a.title })),
    }],
  });
});

/**
 * Put the device's scheduled notifications back in step with the data.
 *
 * Called on launch, on resume, and whenever the job list changes. It cancels
 * everything it owns and reschedules, rather than trying to work out a diff:
 * the set is small, Android replaces by id anyway, and a diff that gets it
 * wrong leaves a notification about a phone the customer collected last week.
 */
export const syncNotifications = async () => {
  if (!isNative()) return { scheduled: 0, reason: 'not-native' };
  const LN = plugin('LocalNotifications');
  if (!LN) return { scheduled: 0, reason: 'no-plugin' };
  if (!(await notificationsAllowed())) return { scheduled: 0, reason: 'not-granted' };

  await ensureChannel();

  const jobs = host.getJobs() || [];
  const byId = new Map(jobs.map(j => [String(j.sn), j]));
  const notifications = [];

  // Reminders the shop set on a job.
  for (const r of dueReminders(host.getReminders())) {
    const job = byId.get(String(r.sn));
    const who = (job && job.name) || `#${r.sn}`;
    const device = (job && Array.isArray(job.devices) && job.devices[0]
                    && job.devices[0].model) || (job && job.model) || '';
    notifications.push({
      id: reminderId(r.sn),
      channelId: CHANNEL_JOBS,
      title: `Reminder - ${who}`,
      body: `#${r.sn}${device ? ' - ' + device : ''}`,
      // On the notification, NOT inside schedule. The plugin reads this one
      // off the notification object (LocalNotification.kt) and defaults it to
      // true; LocalNotificationSchedule parses only every/count/repeats/at/on
      // and allowWhileIdle, so a flag put in there is silently dropped and
      // the default stands. One true in the batch makes schedule() open
      // Android's "Alarms & reminders" screen before it will schedule
      // anything - and since syncNotifications runs again on every resume,
      // coming back from that screen opens it again, forever.
      //
      // This app does not need the minute: allowWhileIdle still wakes the
      // phone out of Doze, and the reminder lands in a window around the
      // time, which is the trade the manifest describes.
      isExactNotification: false,
      schedule: { at: new Date(Number(r.dueAt)), allowWhileIdle: true },
      actionTypeId: 'JOB',
      extra: { sn: String(r.sn), kind: 'reminder' },
    });
  }

  // The phones that have been sitting. Off when the shop has switched it off.
  const days = digestDays();
  if (days !== null) {
    for (const d of pendingDigests(jobs, { thresholdDays: days })) {
      notifications.push({
        id: digestId(d.at),
        channelId: CHANNEL_JOBS,
        title: d.title,
        body: d.body,
        isExactNotification: false,          // on the notification; see above
        schedule: { at: d.at, allowWhileIdle: true },
        extra: { kind: 'digest', sns: d.sns.slice(0, 20) },
      });
    }
  }

  // Cancel what we previously scheduled, then put the new set in. Only ours:
  // getPending is filtered to the id ranges nativeLogic owns, so this cannot
  // cancel a notification some other part of the app made.
  await safe('cancel', async () => {
    const pending = await LN.getPending();
    const mine = (pending && pending.notifications || [])
      .filter(n => Number(n.id) >= 100000 && Number(n.id) < 400000)
      .map(n => ({ id: n.id }));
    if (mine.length) await LN.cancel({ notifications: mine });
  });

  if (!notifications.length) return { scheduled: 0, reason: 'nothing-due' };
  const ok = await safe('schedule', async () => {
    await LN.schedule({ notifications });
    return true;
  }, false);

  return ok
    ? { scheduled: notifications.length, reason: 'ok' }
    : { scheduled: 0, reason: 'schedule-failed' };
};

// Tapping a button on a job notification.
//
// Honest about what this is: Capacitor delivers the action to the WebView, so
// the app comes to the front to handle it. It is about a second, and the
// status is already changed by the time the list is on screen. A button that
// works with the app still closed needs a native BroadcastReceiver, which is
// Kotlin in android/ rather than anything here.
const handleAction = async (event) => {
  const extra = (event && event.notification && event.notification.extra) || {};

  // The update notice. Tapping it opens the download in the browser; it never
  // installs anything by itself.
  if (extra.kind === 'apk-update' && extra.url) { openUrl(extra.url); return; }

  const sn = extra.sn;
  const status = actionStatus(event && event.actionId);

  if (!sn) return;
  if (!status) { host.openJob(sn); return; }     // the body was tapped, not a button

  const done = await host.setStatus(sn, status);
  host.showNotice(done
    ? { title: `#${sn} is now ${status}`, type: 'success', delay: 4 }
    : { title: `Could not update #${sn}`, body: 'Check your connection and try again.',
        type: 'error', delay: 8 });
  if (done) syncNotifications();
};

// ---------------------------------------------------------------------------
// Updating the web layer, without reinstalling anything
//
// Almost every change to this app is HTML, CSS and JavaScript. Those do not
// need a new APK: the updater downloads a zip of www/ and the next launch runs
// it. The APK itself only has to change when the native side does - a new
// plugin, a new permission - which is rare.

// Absolute, and deliberately so. With androidScheme https and no server.url
// the WebView serves the APK's own files from https://localhost, so a
// relative './updates/web.json' asks the bundle about its own update and is
// answered by a 404 every time. It has to name the website.
export const UPDATE_HOST = 'https://mobifixer.vercel.app';
export const WEB_MANIFEST = `${UPDATE_HOST}/updates/web.json`;

const buildVersion = async () => {
  // What this build of the web layer says it is. Written by
  // scripts/build-www.mjs, so it is the version of the payload actually
  // running, not of the APK that shipped it.
  const r = await safe('build.json', async () => {
    const res = await fetch('./build.json', { cache: 'no-store' });
    return res.ok ? res.json() : null;
  });
  return (r && r.version) || '0.0.0';
};

/**
 * Tell Capgo the app started successfully.
 *
 * If this is never called, the next launch rolls back to the bundle that came
 * with the APK. That is the safety net, and it is the reason an over-the-air
 * update to a live app is defensible at all: a bundle that white-screens
 * undoes itself rather than bricking every shop until someone can be reached.
 */
export const confirmHealthy = () => safe('notifyAppReady', async () => {
  const U = plugin('CapacitorUpdater');
  if (U && U.notifyAppReady) await U.notifyAppReady();
});

export const checkWebUpdate = async ({ apply = true } = {}) => {
  if (!isNative()) return { update: false, reason: 'not-native' };
  const U = plugin('CapacitorUpdater');
  if (!U) return { update: false, reason: 'no-plugin' };

  const manifest = await safe('web manifest', async () => {
    const res = await fetch(WEB_MANIFEST + '?t=' + Date.now(), { cache: 'no-store' });
    return res.ok ? res.json() : null;
  });
  if (!manifest) return { update: false, reason: 'manifest-unreachable' };

  const current = await buildVersion();
  const decision = updateDecision(current, manifest.version, { minimum: manifest.minimum });
  if (!decision.update || !apply) return { ...decision, current, offered: manifest.version };
  if (!manifest.url) return { update: false, reason: 'manifest-has-no-url' };

  const bundle = await safe('download', () =>
    U.download({ url: manifest.url, version: manifest.version }), null);
  if (!bundle) return { update: false, reason: 'download-failed', offered: manifest.version };

  // set() takes effect at the next launch, not now. Reloading the WebView out
  // from under someone who is halfway through booking in a phone would lose
  // what they typed.
  const set = await safe('set', async () => { await U.set(bundle); return true; }, false);
  return set
    ? {
        update: true, reason: 'ready-next-launch',
        from: current, to: manifest.version, notes: manifest.notes || '',
      }
    : { update: false, reason: 'set-failed', offered: manifest.version };
};

// ---------------------------------------------------------------------------
// Updating the APK itself
//
// Only needed when the native side changes - a plugin, a permission, a
// Capacitor upgrade - which no amount of new JavaScript can deliver. Almost
// every change goes out through the web updater above instead.
//
// This app does NOT install the APK. It posts a notification; tapping it opens
// the download in the phone's browser, which shows its own progress and then
// hands the file to Android's installer. The shop confirms there, as they
// would for anything else they downloaded.
//
// That is a deliberate retreat from doing it in-app. Installing from inside
// needs REQUEST_INSTALL_PACKAGES - a permission that lets this app install
// other apps - and on a sideloaded APK whose signing key has no history,
// Play Protect blocks the install outright: "Harmful app blocked". Shops do
// not tap past that, and they should not have to.

export const APK_UPDATES = true;         // a Play build would set this false
export const APK_MANIFEST = `${UPDATE_HOST}/updates/apk.json`;   // absolute, for the same reason

const apkVersion = async () => {
  const App = plugin('App');
  const info = await safe('getInfo', () => App && App.getInfo(), null);
  return (info && info.version) || '0.0.0';
};

/**
 * Is there a newer APK, and if so tell the shop about it.
 *
 * @param notify  post the notification (false just reports, for the tests)
 */
export const checkApkUpdate = async ({ notify = true } = {}) => {
  if (!isNative()) return { update: false, reason: 'not-native' };
  if (!APK_UPDATES) return { update: false, reason: 'apk-updates-disabled' };

  const manifest = await safe('apk manifest', async () => {
    const res = await fetch(APK_MANIFEST + '?t=' + Date.now(), { cache: 'no-store' });
    return res.ok ? res.json() : null;
  });
  if (!manifest) return { update: false, reason: 'manifest-unreachable' };

  const current = await apkVersion();
  const decision = updateDecision(current, manifest.version, { minimum: manifest.minimum });
  const notes = manifest.notes || '';
  if (!decision.update) return { ...decision, current, offered: manifest.version, notes };
  if (!manifest.url) return { update: false, reason: 'manifest-has-no-url' };
  if (!notify) return { update: true, reason: 'not-notified', to: manifest.version, url: manifest.url, notes };

  const LN = plugin('LocalNotifications');
  if (!LN) return { update: false, reason: 'no-plugin' };
  if (!(await notificationsAllowed())) {
    // No permission to post a notice, so say it in the app instead rather
    // than leave a new version sitting there unmentioned.
    host.showNotice({
      title: `Update available - ${manifest.version}`,
      body: 'Open mobifixer.vercel.app to download it.',
      type: 'info', delay: 10,
    });
    return { update: true, reason: 'told-in-app', to: manifest.version };
  }

  // The sheet first: it waits to be answered, where a notification can sit
  // unread in the shade for a week. The notification stays as well, for the
  // shop who is not looking at the app when the check runs.
  host.showUpdateSheet({
    version: manifest.version,
    notes,
    confirmLabel: 'Download',
    hint: 'Opens in your browser. You confirm the install.',
    onConfirm: () => openUrl(manifest.url),
  });

  await ensureChannel();
  const first = notes.split('\n').map(s => s.trim()).filter(Boolean)[0] || '';
  const posted = await safe('apk update notice', async () => {
    await LN.schedule({
      notifications: [{
        id: apkUpdateId(),
        channelId: CHANNEL_JOBS,
        title: `Update available - ${manifest.version}`,
        body: (first ? first + ' ' : '') + 'Tap to download.',
        isExactNotification: false,
        extra: { kind: 'apk-update', url: manifest.url },
      }],
    });
    return true;
  }, false);

  return posted
    ? { update: true, reason: 'notified', from: current, to: manifest.version }
    : { update: false, reason: 'notify-failed', offered: manifest.version };
};

// ---------------------------------------------------------------------------
// Start-up

let started = false;

export const initNative = async (hostApi = {}) => {
  host = { ...host, ...hostApi };
  if (!isNative() || started) return { native: isNative(), started };
  started = true;

  // First, and before anything that could throw: the app has started, so do
  // not roll the web bundle back.
  await confirmHealthy();

  await registerActions();

  const LN = plugin('LocalNotifications');
  if (LN && LN.addListener) {
    safe('addListener action', () =>
      LN.addListener('localNotificationActionPerformed', handleAction));
  }

  // Reschedule when the app comes back to the front: the clock has moved, and
  // another device may have finished half the list.
  const App = plugin('App');
  if (App && App.addListener) {
    safe('addListener resume', () => App.addListener('appStateChange', ({ isActive }) => {
      if (isActive) syncNotifications();
    }));
  }

  await syncNotifications();

  // After the first sync, so a shop that already granted permission sees its
  // reminders scheduled before any dialog, and not awaited into the update
  // check below: the dialog is the user's to answer in their own time.
  await maybeAskNotificationPermission();

  // Not awaited: a slow or unreachable update server must not hold up the
  // list of today's jobs.
  checkApkUpdate();

  if (autoUpdateOn()) {
    // Deliberately not awaited. A slow or unreachable update server must not
    // hold up the list of today's jobs.
    checkWebUpdate().then(r => {
      if (!r.update) return;
      // Downloaded and set already; reload() is what swaps the screens over.
      // Asking first, because that throws away anything half-typed.
      host.showUpdateSheet({
        version: r.to,
        notes: r.notes || '',
        confirmLabel: 'Update now',
        hint: 'Takes a second. Or it applies next time you open the app.',
        onConfirm: () => applyWebUpdate(),
      });
      return;
      // Name the version and say what changed. A shop asked to restart in the
      // middle of a working day deserves to know what for, and the notes come
      // from the CHANGELOG entry for that version rather than a second copy
      // that would drift from it.
      const first = (r.notes || '').split('\n').map(s => s.trim())
        .filter(Boolean).slice(0, 3).join(' ');
      host.showNotice({
        title: `Update ready${r.to ? ' - ' + r.to : ''}`,
        body: (first ? first + ' ' : '') + 'Close and reopen the app to use it.',
        type: 'info', delay: 10,
      });
    });
  }

  return { native: true, started: true };
};

export { compareVersions, updateDecision, pendingDigests, JOB_ACTIONS };
