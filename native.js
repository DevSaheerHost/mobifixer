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
  reminderId, digestId, JOB_ACTIONS, actionStatus,
  DIGEST_DEFAULT_DAYS,
  notifyAskDecision, NOTIFY_ASK_KEY, NOTIFY_ASKED_KEY,
} from './nativeLogic.js';

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
      // isExactNotification:false deliberately. The plugin defaults it to
      // true, and a true in the batch makes schedule() throw up Android's
      // "Alarms & reminders" settings screen before it will schedule
      // anything. This app does not need the minute: allowWhileIdle still
      // wakes the phone out of Doze, and the reminder lands in a window
      // around the time, which is the trade the manifest describes.
      schedule: { at: new Date(Number(r.dueAt)), allowWhileIdle: true, isExactNotification: false },
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
        schedule: { at: d.at, allowWhileIdle: true, isExactNotification: false },
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
  const sn = event && event.notification && event.notification.extra
    && event.notification.extra.sn;
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

export const WEB_MANIFEST = './updates/web.json';

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
    ? { update: true, reason: 'ready-next-launch', from: current, to: manifest.version }
    : { update: false, reason: 'set-failed', offered: manifest.version };
};

// ---------------------------------------------------------------------------
// Updating the APK itself
//
// Only needed when the native side changes. The app downloads the new APK and
// hands it to Android's package installer, which asks the user to confirm -
// nothing installs silently.
//
// This is for the APK that shops download directly. Google Play forbids an app
// updating itself, so a Play build sets SELF_INSTALL to false and this whole
// path goes quiet; the web updater above keeps working either way.

export const SELF_INSTALL = true;
export const APK_MANIFEST = './updates/apk.json';

const apkVersion = async () => {
  const App = plugin('App');
  const info = await safe('getInfo', () => App && App.getInfo(), null);
  return (info && info.version) || '0.0.0';
};

export const checkApkUpdate = async ({ apply = false } = {}) => {
  if (!isNative()) return { update: false, reason: 'not-native' };
  if (!SELF_INSTALL) return { update: false, reason: 'self-install-disabled' };

  const manifest = await safe('apk manifest', async () => {
    const res = await fetch(APK_MANIFEST + '?t=' + Date.now(), { cache: 'no-store' });
    return res.ok ? res.json() : null;
  });
  if (!manifest) return { update: false, reason: 'manifest-unreachable' };

  const current = await apkVersion();
  const decision = updateDecision(current, manifest.version, { minimum: manifest.minimum });
  if (!decision.update || !apply) {
    return { ...decision, current, offered: manifest.version, notes: manifest.notes || '' };
  }
  if (!manifest.url) return { update: false, reason: 'manifest-has-no-url' };

  const Filesystem = plugin('Filesystem');
  const FileOpener = plugin('FileOpener');
  if (!Filesystem || !FileOpener) return { update: false, reason: 'no-plugin' };

  const name = `mobifixer-${manifest.version}.apk`;
  const saved = await safe('downloadFile', () => Filesystem.downloadFile({
    url: manifest.url,
    path: name,
    directory: 'CACHE',
  }), null);
  if (!saved || !saved.path) return { update: false, reason: 'download-failed' };

  // Opening an .apk hands it to Android's installer, which shows its own
  // confirmation. If the user has not allowed this app to install packages,
  // Android takes them to that setting first - we neither bypass nor pre-empt
  // it.
  const opened = await safe('fileOpener', async () => {
    await FileOpener.open({
      filePath: saved.path,
      contentType: 'application/vnd.android.package-archive',
    });
    return true;
  }, false);

  return opened
    ? { update: true, reason: 'installer-opened', from: current, to: manifest.version }
    : { update: false, reason: 'installer-refused', offered: manifest.version };
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

  if (autoUpdateOn()) {
    // Deliberately not awaited. A slow or unreachable update server must not
    // hold up the list of today's jobs.
    checkWebUpdate().then(r => {
      if (r.update) host.showNotice({
        title: 'Update ready',
        body: 'Close and reopen the app to use the new version.',
        type: 'info', delay: 8,
      });
    });
  }

  return { native: true, started: true };
};

export { compareVersions, updateDecision, pendingDigests, JOB_ACTIONS };
