// Offline support: serve the app from cache, refresh the cache in the background.
// Bump CACHE when files are added or removed.
const CACHE = 'tunes-v13';
const FILES = [
    './',
    'index.html',
    'manifest.webmanifest',
    'abcjs-basic-min.js',
    'icons/icon.svg',
    'icons/icon-180.png',
    'icons/icon-192.png',
    'icons/icon-512.png',
    'fonts/TAYRugPull.otf',
    'fonts/LumiosTypewriter-Old.ttf'
];

self.addEventListener('install', event => {
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES)));
    self.skipWaiting();
});

self.addEventListener('activate', event => {
    event.waitUntil(
        // All the apps share one origin (mgilvryallen.github.io), so only clear this app's old caches
        caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('tune') && key !== CACHE).map(key => caches.delete(key))))
    );
    self.clients.claim();
});

self.addEventListener('fetch', event => {
    if (event.request.method !== 'GET' || !event.request.url.startsWith(self.location.origin)) return;

    event.respondWith(
        caches.open(CACHE).then(cache =>
            cache.match(event.request, { ignoreSearch: true }).then(cached => {
                const fresh = fetch(event.request).then(response => {
                    if (response.ok) cache.put(event.request, response.clone());
                    return response;
                }).catch(() => cached);
                return cached || fresh;
            })
        )
    );
});
