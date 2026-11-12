/**
 * Who is using this shop, right now, and from what.
 *
 * The admin dashboard needs two things nothing in the app recorded: whether a
 * shop is connected, and whether that connection is the APK or the website.
 *
 * WHY onDisconnect AND NOT A HEARTBEAT
 * A heartbeat ("write the time every 30s") cannot tell you when someone left -
 * only when they last managed to write. A phone that loses signal, a tab that
 * is killed, a battery that dies: all of them simply stop, and the dashboard
 * is left guessing from a timestamp that drifts by however long the interval
 * is. Firebase's onDisconnect is registered ON THE SERVER when the connection
 * opens, and the server applies it the moment the socket drops. That is the
 * accurate timing, and it costs one write per session instead of one every
 * thirty seconds from every device.
 *
 * Every time is serverTimestamp(), never Date.now(). A shop phone's clock can
 * be days out, and "last seen" read off a wrong clock is worse than nothing
 * because it looks authoritative.
 */

/** 'apk' inside the Android app, 'web' in a browser. */
export const platformOf = (win = globalThis.window) => {
  const cap = win && win.Capacitor;
  const native = !!(cap && typeof cap.isNativePlatform === 'function' && cap.isNativePlatform());
  return native ? 'apk' : 'web';
};

/**
 * One id per device, so a reload updates a row instead of adding one.
 * Deliberately the same key the push registration already uses: two ids for
 * one device would make the dashboard count it twice.
 */
export const DEVICE_KEY = 'MF_DEVICE_ID';
export const deviceId = (store = globalThis.localStorage) => {
  try {
    let id = store.getItem(DEVICE_KEY);
    if (!id) {
      id = 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
      store.setItem(DEVICE_KEY, id);
    }
    return id;
  } catch (_) {
    // Private window, or storage blocked. A per-session id still reports
    // correctly; it just cannot be recognised as the same device next time.
    return 'd' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  }
};

/** What a connected device writes about itself. Pure, so it can be checked. */
export const presenceRecord = ({ platform, author, ua, at }) => ({
  online: true,
  platform,
  author: author || 'Unknown',
  // Trimmed: the dashboard wants "which device", not a fingerprint, and a
  // full UA string is 200+ characters of noise per row.
  ua: String(ua || '').slice(0, 120),
  since: at,
  lastSeen: at,
});

/**
 * Start reporting. Returns a stop() for tests and for signing out.
 *
 * The firebase functions are passed in rather than imported, so this module
 * stays dependency-free and the whole thing can be exercised without a
 * browser or a network.
 */
export const startPresence = ({
  db, ref, onValue, onDisconnect, update, set, serverTimestamp,
  shopName, author, win = globalThis.window,
}) => {
  if (!db || !shopName) return { stop: () => {}, reason: 'no-shop' };

  const id = deviceId();
  const path = `shops/${shopName}/presence/${id}`;
  const me = ref(db, path);

  // .info/connected is Firebase's own view of the socket, and it goes false
  // on a drop and true again on a reconnect. Re-arming on every true matters:
  // an onDisconnect is consumed when it fires, so a reconnected device with
  // no fresh registration would stay "online" for ever once it finally left.
  const connected = ref(db, '.info/connected');
  const unsubscribe = onValue(connected, (snap) => {
    if (snap.val() !== true) return;

    onDisconnect(me)
      .update({ online: false, lastSeen: serverTimestamp() })
      .then(() => update(me, presenceRecord({
        platform: platformOf(win),
        author,
        ua: (win && win.navigator && win.navigator.userAgent) || '',
        at: serverTimestamp(),
      })))
      .catch(() => { /* presence is reporting, never the app's job */ });
  });

  const stop = () => {
    try { unsubscribe && unsubscribe(); } catch (_) {}
    // A deliberate sign-out is a known departure, so record it rather than
    // waiting for the socket to time out.
    try { update(me, { online: false, lastSeen: serverTimestamp() }); } catch (_) {}
  };

  return { stop, path, id };
};

// ---------------------------------------------------------------------------
// What the dashboard makes of it

/** A shop is "stale" if nothing has connected for this long. */
export const STALE_AFTER_MS = 14 * 24 * 60 * 60 * 1000;   // a fortnight

/**
 * Fold one shop's presence map into the row the dashboard draws.
 *
 * Counts DEVICES, not people: two staff on one phone share a device id, and
 * one person with a phone and a laptop is two. That is the honest reading of
 * what is being measured, and the dashboard says "devices" for that reason.
 */
export const summarise = (presence = {}, now = Date.now()) => {
  const rows = Object.values(presence || {}).filter(Boolean);
  const online = rows.filter(r => r.online === true);
  const seen = rows.map(r => Number(r.lastSeen) || 0).filter(Boolean);
  const lastSeen = seen.length ? Math.max(...seen) : null;

  const count = (list, p) => list.filter(r => r.platform === p).length;

  return {
    devices: rows.length,
    online: online.length,
    onlineApk: count(online, 'apk'),
    onlineWeb: count(online, 'web'),
    everApk: count(rows, 'apk'),
    everWeb: count(rows, 'web'),
    lastSeen,
    isOnline: online.length > 0,
    // Never connected at all is not the same as connected long ago; the
    // dashboard shows them differently and so must this.
    status: online.length > 0 ? 'online'
          : lastSeen === null ? 'never'
          : (now - lastSeen) > STALE_AFTER_MS ? 'inactive' : 'offline',
  };
};

/** "3 minutes ago". Short, because it sits in a table cell. */
export const sinceText = (ts, now = Date.now()) => {
  if (!ts) return 'never';
  const s = Math.max(0, Math.round((now - Number(ts)) / 1000));
  if (s < 60) return 'just now';
  const m = Math.round(s / 60);
  if (m < 60) return `${m} minute${m === 1 ? '' : 's'} ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hour${h === 1 ? '' : 's'} ago`;
  const d = Math.round(h / 24);
  if (d < 30) return `${d} day${d === 1 ? '' : 's'} ago`;
  const mo = Math.round(d / 30);
  return `${mo} month${mo === 1 ? '' : 's'} ago`;
};
