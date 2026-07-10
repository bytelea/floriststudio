const CACHE_NAME = 'florist-studio-v2.0.0';
const ASSETS = [
  './',
  './index.html',
  './assets/css/style.css?v=1.3.5',
  './assets/js/app.js?v=1.3.5',
  './manifest.json'

];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(ASSETS)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  event.respondWith(caches.match(event.request).then(cached => cached || fetch(event.request)));
});

// v1.3.2 mobile nav cache bump

// v1.3.5 launch-ready mobile nav and cache bump
