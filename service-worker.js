const CACHE_NAME = "florist-studio-v3.7";
const APP_SHELL = [
  "./",
  "./index.html",
  "./manifest.json",
  "./assets/css/style.css?v=3.6.0",
  "./assets/js/app.js?v=2.7.0",
  "./assets/js/studio-features.js?v=3.6.0",
  "./assets/js/install-manager.js?v=3.6.0",
  "./assets/js/v3-features.js?v=3.6.0",
  "./assets/js/cloud-sync.js?v=3.6.0",
  "./assets/images/icon-192.png",
  "./assets/images/icon-512.png",
  "./assets/images/icon-maskable-512.png",
  "./assets/images/eternal-blooms-logo.png",
  "./assets/images/eternal-blooms-logo-alt.png"
];
self.addEventListener("install", event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(APP_SHELL)).then(() => self.skipWaiting())));
self.addEventListener("activate", event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));
self.addEventListener("message", event => { if (event.data === "SKIP_WAITING") self.skipWaiting(); });
self.addEventListener("fetch", event => {
  if (event.request.method !== "GET") return;
  const url = new URL(event.request.url);
  if (url.origin !== self.location.origin) return;
  if (event.request.mode === "navigate") {
    event.respondWith(fetch(event.request).then(response => { const copy=response.clone(); caches.open(CACHE_NAME).then(cache => cache.put("./index.html",copy)); return response; }).catch(() => caches.match("./index.html", {ignoreSearch:true})));
    return;
  }
  event.respondWith(caches.match(event.request,{ignoreSearch:true}).then(cached => {
    const refresh=fetch(event.request).then(response => { if(response.ok)caches.open(CACHE_NAME).then(cache => cache.put(event.request,response.clone())); return response; }).catch(() => cached);
    return cached || refresh;
  }));
});
