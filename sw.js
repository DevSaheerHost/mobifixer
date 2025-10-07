self.addEventListener("notificationclick", event => {
  event.notification.close();

  if (event.action === "view") {
    console.log("User clicked Reply");
    
    event.waitUntil(clients.openWindow("https://example.com/chat"));
  } else if (event.action === "dismiss") {
    console.log("User dismissed the notification");
  } else {
    // Default click (outside buttons)
    event.waitUntil(clients.openWindow("https://mobifixer.vercel.app/"));
  }
});


self.addEventListener('install', (e) => {
  console.log('Service Worker installed');
});

self.addEventListener('fetch', (e) => {
  // Optional: cache handling
  console.log(e)
});