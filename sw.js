// Offline support: the page from the network when it can, everything else from cache.
// Bump CACHE when files are added or removed.
const CACHE = 'tunes-v15';
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
    // Straight from the server, not the browser's short-term cache, so a new version never
    // saves an old copy of a file (GitHub lets browsers keep files for ten minutes)
    event.waitUntil(caches.open(CACHE).then(cache => cache.addAll(FILES.map(file => new Request(file, { cache: 'reload' })))));
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

    // The page itself comes from the network first, so a new version shows on the next open
    // (not the one after). Offline, on wifi that goes nowhere, or on a signal too slow to answer
    // in 3s, the cached copy opens. Anything but a straight answer (an error, or a wifi login page
    // redirecting) counts as no answer, so it never replaces the cached copy.
    if (event.request.mode === 'navigate') {
        event.respondWith(
            caches.open(CACHE).then(cache => {
                const fresh = fetch(event.request).then(response => {
                    if (!response.ok || response.redirected) throw new Error('not the page');
                    cache.put(event.request, response.clone());
                    return response;
                });
                const cached = () => cache.match(event.request, { ignoreSearch: true }).then(hit => hit || fetch(event.request));
                const slow = new Promise(resolve => setTimeout(resolve, 3000)).then(cached);
                return Promise.race([fresh.catch(cached), slow]);
            })
        );
        return;
    }

    // Everything else (fonts, icons, scripts) from the cache, refreshed in the background
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
