// Notification handling for the Mobifixer service app.
//
// Two jobs, in this order: raise notifications, and cache the shell.
//
// Notifications come first because they are the reason this file exists.
// registration.showNotification() is the only way to raise one on Android
// Chrome (`new Notification()` throws there), and a push that arrives while
// the app is closed can only be handled here - the page is not running.
//
// The caching half is further down and was added later; the comment here used
// to say this worker cached nothing, which stopped being true then.

// Reminders pushed while the app is closed. Messages are sent data-only on
// purpose: with a `notification` payload FCM's own service worker draws the
// notification and we lose control of the icon, badge and tag, so a pushed
// reminder would look different from one raised inside the app.
self.addEventListener("push", event => {
  let d = {};
  try {
    const raw = event.data ? event.data.json() : {};
    d = raw.data || raw;          // FCM wraps data-only payloads in `data`
  } catch (_) {
    try { d = { title: "Mobifixer", body: event.data ? event.data.text() : "" }; }
    catch (__) { d = {}; }
  }

  const title = d.title || "Mobifixer";
  const options = {
    body: d.body || "",
    tag: d.tag || "mobifixer-push",   // replaces rather than stacks
    icon: "./assets/images/notification-logo.png",
    badge: "./assets/images/badge-96.png",
    data: { hash: d.hash || "" }
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "dismiss") return;

  // Focus the app if it is already open, otherwise open it. Previously this
  // opened https://example.com/chat for the "view" action and a hardcoded
  // https://mobifixer.vercel.app/ otherwise — which, from GitHub Pages, threw
  // the user onto a different origin with its own localStorage, so the shop
  // name was missing and they landed on the login screen.
  const scope = self.registration.scope;                 // e.g. /mobifixer/
  const hash = (event.notification.data && event.notification.data.hash) || "";

  event.waitUntil((async () => {
    const windows = await clients.matchAll({ type: "window", includeUncontrolled: true });
    for (const client of windows) {
      if (client.url.startsWith(scope)) {
        if (hash && "navigate" in client) {
          try { await client.navigate(client.url.split("#")[0] + hash); } catch (_) {}
        }
        if ("focus" in client) return client.focus();
      }
    }
    return clients.openWindow(scope + hash);
  })());
});

// ---------------------------------------------------------------------------
// Caching.
//
// There used to be a second worker, service-worker.js, registered on this same
// scope. It precached "/index.html", "/style.css" and "/script.js" - absolute
// paths, while the app is served from /mobifixer/ - so every one of them 404ed,
// cache.addAll() rejected, install failed, and the only thing it ever produced
// was an empty cache named mobifixer-cache-v6. It also listed /script.js, which
// has never existed. It is gone; this is the one worker now.
//
// Strategy is stale-while-revalidate, NOT cache-first. Cache-first is how a shop
// ends up pinned to a broken build with no way back, which has happened here
// before. Every request still goes to the network in the background and the
// fresh copy is what the next load gets.
const CACHE = "mobifixer-shell-v1";

// Relative, so they resolve under /mobifixer/ in production and under / locally.
// registration.scope is the base either way.
const SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./main.js",
  "./cardLayout.js",
  "./pattern.js",
  "./searchCard.js",
  "./inventoryCard.js",
  "./searchPouchCard.js",
  "./generateWhatsappLink.js",
  "./manifest.json",
];

self.addEventListener("install", event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE);
    // Individually, not addAll: addAll is all-or-nothing, so one renamed file
    // silently costs you the entire cache - which is exactly what went wrong
    // before. A miss here should cost that one file, not the feature.
    await Promise.all(SHELL.map(async (url) => {
      try {
        const res = await fetch(new Request(url, { cache: "reload" }));
        if (res.ok) await cache.put(url, res);
      } catch (_) {}
    }));
  })());
  // Deliberately no skipWaiting(): swapping the worker mid-session can leave a
  // page running old JS against a new shell. The new one takes over next load.
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    for (const name of await caches.keys()) {
      if (name !== CACHE) await caches.delete(name);   // includes the dead mobifixer-cache-v6
    }
    await self.clients.claim();
  })());
});

// The kill switch. If a bad shell ever gets cached, this empties it without
// waiting for anything to expire:
//   navigator.serviceWorker.controller.postMessage('CLEAR_CACHES')
self.addEventListener("message", event => {
  if (event.data !== "CLEAR_CACHES") return;
  event.waitUntil((async () => {
    for (const name of await caches.keys()) await caches.delete(name);
    for (const c of await self.clients.matchAll()) c.postMessage("CACHES_CLEARED");
  })());
});

self.addEventListener("fetch", event => {
  const req = event.request;

  // Only ever same-origin GETs. Firebase, gstatic, the CDNs and every write go
  // straight to the network, untouched - a cached database response would be a
  // shop looking at yesterday's jobs.
  if (req.method !== "GET") return;
  let url;
  try { url = new URL(req.url); } catch (_) { return; }
  if (url.origin !== self.location.origin) return;
  if (!url.pathname.startsWith(new URL("./", self.registration.scope).pathname)) return;

  event.respondWith((async () => {
    const cache = await caches.open(CACHE);
    const cached = await cache.match(req, { ignoreSearch: false });

    const fromNetwork = fetch(req).then(res => {
      // Opaque and error responses are not worth keeping.
      if (res && res.ok && res.type === "basic") cache.put(req, res.clone()).catch(() => {});
      return res;
    }).catch(() => null);

    // Serve what we have and refresh behind it; with nothing cached, wait for
    // the network. If the network is also gone, say so rather than hanging.
    if (cached) { event.waitUntil(fromNetwork); return cached; }
    const res = await fromNetwork;
    return res || new Response("Offline and not cached.", {
      status: 503, headers: { "Content-Type": "text/plain" } });
  })());
});
