// Notification handling for the Mobifixer service app.
//
// This worker deliberately does NOT cache anything. It exists so the page can
// call registration.showNotification(), which is the only way to raise a
// notification on Android Chrome (`new Notification()` throws there).

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

self.addEventListener("install", () => {
  // Nothing to precache; take over as soon as possible.
  self.skipWaiting();
});

self.addEventListener("activate", event => {
  event.waitUntil(self.clients.claim());
});

// A no-op fetch handler. It does not call respondWith, so every request goes
// to the network exactly as it would without a worker. It is kept because
// some browsers still want a fetch handler present for installability; the
// console.log that used to be here ran for every single request in the app.
self.addEventListener("fetch", () => {});
