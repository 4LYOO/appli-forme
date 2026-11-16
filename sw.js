// Service worker : l'appli fonctionne entièrement hors ligne. Incrémenter VERSION à chaque déploiement
// (fait automatiquement par le workflow GitHub Actions avec le numéro de commit).
const VERSION = 'dev';
const CACHE = `forme-${VERSION}`;
const ASSETS = [
  './',
  './index.html',
  './manifest.webmanifest',
  './css/app.css',
  './data/foods.json',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/apple-touch-icon.png',
  './js/main.js',
  './js/db.js',
  './js/ui.js',
  './js/state.js',
  './js/lib/dates.js',
  './js/lib/nutrition.js',
  './js/lib/weight.js',
  './js/lib/score.js',
  './js/lib/streak.js',
  './js/lib/training.js',
  './js/lib/adaptive.js',
  './js/data/exercises.js',
  './js/data/plates.js',
  './js/data/sources.js',
  './js/views/today.js',
  './js/views/meals.js',
  './js/views/weight.js',
  './js/views/training.js',
  './js/views/more.js',
  './js/views/setup.js',
];

self.addEventListener('install', (e) => {
  e.waitUntil(caches.open(CACHE).then((c) => c.addAll(ASSETS.map((u) => new Request(u, { cache: 'reload' })))));
});

self.addEventListener('activate', (e) => {
  e.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((k) => k.startsWith('forme-') && k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('message', (e) => { if (e.data === 'skipWaiting') self.skipWaiting(); });

// Cache d'abord (hors ligne garanti) ; les pages avec ?page=… sont servies par index.html.
self.addEventListener('fetch', (e) => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  if (e.request.mode === 'navigate') {
    e.respondWith(caches.match('./index.html').then((r) => r || fetch(e.request)));
    return;
  }
  e.respondWith(caches.match(e.request, { ignoreSearch: true }).then((r) => r || fetch(e.request)));
});
