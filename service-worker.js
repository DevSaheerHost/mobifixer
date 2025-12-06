// Service Worker Version for cache busting
const CACHE_NAME = 'mobifixer-cache-v5';

// List all files to cache (app shell)
const urlsToCache = [
    '/',
    '/index.html',
    '/style.css',
    '/script.js',
    '/manifest.json',
    '/assets/images/logo_s_no_bg.png',
    // Add Firebase SDK URLs if you want them cached:
    // 'https://www.gstatic.com/firebasejs/8.10.0/firebase-app.js',
    // 'https://www.gstatic.com/firebasejs/8.10.0/firebase-firestore.js'
];

// Installation: Cache files
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => {
                console.log('Opened cache and cached files');
                return cache.addAll(urlsToCache);
            })
    );
});

// Activation: Clean up old caches
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((cacheNames) => {
            return Promise.all(
                cacheNames.map((cacheName) => {
                    if (cacheName !== CACHE_NAME) {
                        console.log('Deleting old cache:', cacheName);
                        return caches.delete(cacheName);
                    }
                })
            );
        })
    );
});

// Fetch: Serve from cache first, then network (Cache-First strategy)
self.addEventListener('fetch', (event) => {
    event.respondWith(
        caches.match(event.request)
            .then((response) => {
                // Return cached response if found
                if (response) {
                    return response;
                }
                // Fallback to network fetch
                return fetch(event.request);
            })
    );
});
