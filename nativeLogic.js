// Decisions the Android wrapper has to make, with no plugins and no DOM, so
// scripts/test-native.mjs imports and runs the real functions rather than
// matching source text. native.js holds the parts that actually touch the
// device; everything that can be decided by arithmetic is decided here.

// ---------------------------------------------------------------------------
// Versions
//
// Three things carry a version and they must be compared the same way: the web
// payload inside the APK, the payload offered over the air, and the APK itself.

// "5.2.10" -> [5, 2, 10]. Anything non-numeric in a part reads as 0 rather
// than NaN, because a version that will not parse must not win a comparison.
const parts = (v) => String(v == null ? '' : v).trim().replace(/^v/i, '')
  .split('.').map(n => {
    const x = parseInt(n, 10);
    return Number.isFinite(x) && x >= 0 ? x : 0;
  });

/** -1 if a < b, 0 if equal, 1 if a > b. Missing parts count as 0, so 5.2 === 5.2.0. */
export const compareVersions = (a, b) => {
  const A = parts(a), B = parts(b);
  const n = Math.max(A.length, B.length);
  for (let i = 0; i < n; i++) {
    const x = A[i] || 0, y = B[i] || 0;
    if (x !== y) return x < y ? -1 : 1;
  }
  return 0;
};

// A version string we are willing to act on. Refusing a malformed one matters:
// this decides whether to download and install something.
export const isUsableVersion = (v) =>
  /^v?\d+(\.\d+){0,3}$/.test(String(v == null ? '' : v).trim());

/**
 * Should this device take the offered build?
 *
 * Returns a reason either way, so the Settings screen can say what happened
 * rather than silently doing nothing - which is how the push registration bug
 * stayed invisible for as long as it did.
 */
export const updateDecision = (current, offered, { minimum = null } = {}) => {
  if (!isUsableVersion(current)) return { update: false, reason: 'current-unreadable' };
  if (!offered) return { update: false, reason: 'none-offered' };
  if (!isUsableVersion(offered)) return { update: false, reason: 'offered-unreadable' };
  // A build can declare the oldest version that may jump straight to it. Used
  // when a release changes something a very old build cannot read.
  if (minimum && isUsableVersion(minimum) && compareVersions(current, minimum) < 0) {
    return { update: false, reason: 'too-old-to-jump', minimum };
  }
  const cmp = compareVersions(current, offered);
  if (cmp === 0) return { update: false, reason: 'already-current' };
  // Never go backwards on its own. A rollback is a deliberate act: the server
  // publishes a HIGHER version number containing the older code.
  if (cmp > 0) return { update: false, reason: 'offered-is-older' };
  return { update: true, reason: 'newer', from: current, to: offered };
};

// ---------------------------------------------------------------------------
// The phones that have been sitting too long
//
// A local notification's text is fixed when it is scheduled, not when it fires.
// Scheduling one for next Tuesday means deciding today what it will say.
//
// That is fine here, because ageing is arithmetic: a job taken in on the 3rd is
// eight days old on the 11th whatever anyone does. The only way the projection
// is wrong is if the shop FINISHES a job, which makes the number an
// over-estimate - and opening the app reschedules from the real data. An
// over-estimate that corrects itself is the right way round: it nags about a
// phone that has been dealt with, rather than staying quiet about one that has
// not.

export const DIGEST_DEFAULT_DAYS = 7;
export const DIGEST_HORIZON = 7;        // how many days ahead to schedule
export const DIGEST_HOUR = 9;           // 9:40am local; see the comment below
export const DIGEST_MINUTE = 40;

// Same statuses that age on the card: work not finished, plus `done`, because
// repaired-and-uncollected is how a phone gets forgotten on a shelf. Kept here
// rather than imported so this module stays free of dependencies; the test
// asserts it still matches AGEING_STATUSES in jobMeta.js.
export const DIGEST_STATUSES = ['pending', 'progress', 'spare', 'done'];

const dayNumber = (d) =>
  Math.floor(new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime() / 86400000);

const MONTHS = ['JAN', 'FEB', 'MAR', 'APR', 'MAY', 'JUN',
                'JUL', 'AUG', 'SEP', 'OCT', 'NOV', 'DEC'];

// The record shape, repeated from jobMeta.js for the same reason as above.
const takenOn = (job) => {
  const m = String(job && job.date != null ? job.date : '').toUpperCase().trim()
    .match(/^(\d{1,2})-([A-Z]{3,})-(\d{4})$/);
  if (!m) return null;
  const month = MONTHS.indexOf(m[2].slice(0, 3));
  if (month < 0) return null;
  const day = Number(m[1]);
  const d = new Date(Number(m[3]), month, day);
  return d.getMonth() === month && d.getDate() === day ? d : null;
};

/**
 * One entry per day for the next `horizon` days, for the days on which at
 * least one job will be over the threshold. Days with nothing to say produce
 * no notification at all, rather than a cheerful empty one every morning -
 * which is how a shop learns to swipe the notification away without reading it.
 */
export const pendingDigests = (jobs, {
  thresholdDays = DIGEST_DEFAULT_DAYS,
  now = new Date(),
  horizon = DIGEST_HORIZON,
  hour = DIGEST_HOUR,
  minute = DIGEST_MINUTE,
} = {}) => {
  if (!Number.isFinite(thresholdDays) || thresholdDays < 1) return [];

  const open = (jobs || []).filter(j =>
    j && j.isDeleted !== true && DIGEST_STATUSES.includes(j.status) && takenOn(j));

  const out = [];
  for (let i = 0; i <= horizon; i++) {
    const at = new Date(now.getFullYear(), now.getMonth(), now.getDate() + i, hour, minute, 0, 0);
    if (at <= now) continue;                       // today's slot has gone by

    const over = open.filter(j => dayNumber(at) - dayNumber(takenOn(j)) >= thresholdDays);
    if (!over.length) continue;

    const oldest = over.reduce((a, j) =>
      takenOn(j) < takenOn(a) ? j : a, over[0]);
    const oldestDays = dayNumber(at) - dayNumber(takenOn(oldest));

    out.push({
      at,
      count: over.length,
      oldestDays,
      sns: over.map(j => j.sn),
      title: over.length === 1
        ? `1 phone waiting ${oldestDays} days`
        : `${over.length} phones waiting`,
      body: over.length === 1
        ? `#${oldest.sn} ${oldest.name ? '- ' + oldest.name : ''}`.trim()
        : `The oldest is #${oldest.sn}, ${oldestDays} days in.`,
    });
  }
  return out;
};

// ---------------------------------------------------------------------------
// Reminders
//
// The shop sets these per job and they already live in the database, so the
// Cloudflare worker can send them to any device. On this device they are also
// scheduled locally, which is what makes them arrive when the phone has been
// in a drawer all afternoon: no server, no FCM, no service account.

/** Reminders that have not fired and are still in the future. */
export const dueReminders = (reminders, { now = Date.now(), limit = 60 } = {}) =>
  Object.values(reminders || {})
    .filter(r => r && r.fired !== true && Number(r.dueAt) > now)
    .sort((a, b) => Number(a.dueAt) - Number(b.dueAt))
    .slice(0, limit);                 // Android caps pending alarms; take the soonest

// ---------------------------------------------------------------------------
// Notification identities
//
// Android replaces a notification with the same id. Reminders, digests and the
// update prompt must never collide, or setting a reminder would silently
// cancel tomorrow's digest. Ids are derived, not allocated, so rescheduling
// replaces rather than duplicates.

export const ID_BASE = { reminder: 100000, digest: 200000, update: 300000 };

export const reminderId = (sn) => ID_BASE.reminder + (Math.abs(Number(sn) || 0) % 99999);
/**
 * The one id the APK-update notice uses. Fixed, so a second check replaces the
 * notice rather than stacking another one beside it.
 */
export const apkUpdateId = () => ID_BASE.update;

export const digestId = (at) => ID_BASE.digest
  + (Math.floor(new Date(at).getTime() / 86400000) % 99999);

// ---------------------------------------------------------------------------
// Acting on a notification
//
// The buttons on a job notification set a status. The mapping is here so the
// test can prove that every button maps to a status the app actually has, and
// that nothing else does.

// ---------------------------------------------------------------------------
// Notification permission
//
// Android 13 made POST_NOTIFICATIONS a runtime permission, denied until the
// user is asked. Nothing in this app asked, so on a modern phone every
// reminder and every digest was scheduled and then silently dropped:
// syncNotifications would return reason 'not-granted' and no one saw a thing.
//
// WHEN TO ASK. Not on first launch: the shop has not seen the app yet and has
// nothing to say yes to, and a refusal is close to permanent. Signing in is
// the first moment the app has a shop, a job list and a reason - so that is
// the trigger. Signup funnels through the login screen, so one hook covers
// both.
//
// AND WHEN TO STOP. Android stops showing the dialog after the second refusal
// and resolves straight to denied, so asking on every sign-in would be
// invisible to the user and useless to us. Two asks, then never again; the
// shop can still turn it on in Android settings.

export const NOTIFY_ASK_KEY = 'MF_NOTIFY_ASK';        // '1' set by the login screen
export const NOTIFY_ASKED_KEY = 'MF_NOTIFY_ASKED';    // how many times we have asked
export const NOTIFY_ASK_LIMIT = 2;

/**
 * Ask for notification permission now?
 *
 * @param justSignedIn  the login screen set the flag on the way here
 * @param permission    'granted' | 'denied' | 'prompt' | 'prompt-with-rationale'
 * @param timesAsked    how many dialogs this install has already shown
 * @returns { ask, reason } - reason is for the log, and for the tests
 */
export const notifyAskDecision = ({
  justSignedIn = false,
  permission = 'prompt',
  timesAsked = 0,
} = {}) => {
  // Granted wins over everything: never show a dialog we do not need, even on
  // a fresh sign-in.
  if (permission === 'granted') return { ask: false, reason: 'already-granted' };
  if (!justSignedIn) return { ask: false, reason: 'not-a-sign-in' };
  if (permission === 'denied') return { ask: false, reason: 'already-denied' };

  const n = Number(timesAsked);
  const asked = Number.isFinite(n) && n > 0 ? n : 0;
  if (asked >= NOTIFY_ASK_LIMIT) return { ask: false, reason: 'asked-enough' };

  return { ask: true, reason: 'sign-in' };
};

export const JOB_ACTIONS = [
  { id: 'status-progress',  title: 'Start',     status: 'progress' },
  { id: 'status-done',      title: 'Done',      status: 'done' },
  { id: 'status-collected', title: 'Collected', status: 'collected' },
];

export const actionStatus = (actionId) => {
  const a = JOB_ACTIONS.find(x => x.id === actionId);
  return a ? a.status : null;
};
