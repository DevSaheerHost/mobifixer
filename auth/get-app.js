// The install offer on the login page.
//
// Its own module, and not part of auth/main.js, for two reasons. That file
// imports Firebase from a CDN, so an offer tacked onto the end of it would
// not appear at all if the CDN were slow or blocked - and this has nothing to
// do with signing in. Nothing here is imported from anywhere.
//
// Why the login page needs it: main.js (the app's) sends anyone with no shop
// in localStorage straight here. A visitor arriving from a shared link only
// ever saw the login screen, and the code that offers the APK lives in
// native.js, which this page does not load. The offer was never shown to the
// one person it is for.
//
// Narrow on purpose:
//   - Android only; an .apk is no use to a desktop or an iPhone.
//   - Never inside the app, which already is the app.
//   - A quiet card that is there if wanted, not a dialog over a login form.
//   - Hidden unless the manifest answers, so it never offers a download it
//     cannot name.

export const APK_MANIFEST_PATH = '/updates/apk.json';

export const isAndroidBrowser = (ua) => /Android/i.test(ua || '');

export const insideApp = (w) =>
  Boolean(w && w.Capacitor && typeof w.Capacitor.isNativePlatform === 'function'
          && w.Capacitor.isNativePlatform());

/** The one line of text under the heading. Pure, so it can be checked. */
export const offerLine = ({ version, size }) => {
  const mb = Number(size) > 0 ? (Number(size) / 1048576).toFixed(1) + ' MB' : '';
  return [version ? 'Version ' + version : '', mb, 'reminders and offline use']
    .filter(Boolean).join('  ·  ');
};

export const showOffer = async ({ doc = document, win = window } = {}) => {
  const card = doc.querySelector('#getApp');
  if (!card) return { shown: false, reason: 'no-card' };
  if (insideApp(win)) return { shown: false, reason: 'already-installed' };
  if (!isAndroidBrowser(win.navigator && win.navigator.userAgent)) {
    return { shown: false, reason: 'not-android' };
  }

  let m = null;
  try {
    const res = await win.fetch(APK_MANIFEST_PATH + '?t=' + Date.now(), { cache: 'no-store' });
    if (!res.ok) return { shown: false, reason: 'manifest-unreachable' };
    m = await res.json();
  } catch (_) {
    // Offline, or the manifest is unreachable. The login form is what matters
    // on this page; an offer that cannot be completed stays hidden.
    return { shown: false, reason: 'manifest-unreachable' };
  }
  if (!m || !m.url || !m.version) return { shown: false, reason: 'manifest-incomplete' };

  doc.querySelector('#getAppMeta').textContent = offerLine(m);
  const link = doc.querySelector('#getAppLink');
  link.href = m.url;
  link.setAttribute('target', '_blank');
  card.classList.remove('hidden');
  return { shown: true, version: m.version };
};

// Only when loaded as a page script, so importing it in a test does nothing.
if (typeof document !== 'undefined' && document.querySelector('#getApp')) {
  showOffer().catch(() => {});
}
