const CACHE_NAME = "ektheto-v3-zip-design-v3-radar-map";
const APP_SHELL = [
  "/",
  "/styles.css",
  "/app.js",
  "/manifest.json",
  "/assets/zip-cover-art.jpg",
  "/assets/zip-slide-verify.jpg",
  "/assets/zip-slide-investigate.jpg",
  "/assets/zip-slide-session.jpg",
  "/assets/zip-wordmark.png",
  "/assets/world-map.svg",
  "/assets/icon-192.png",
  "/assets/icon-512.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)));
  self.skipWaiting();
});
self.addEventListener("activate", (event) => {
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))));
  self.clients.claim();
});
self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET" || new URL(request.url).origin !== self.location.origin) return;
  if (new URL(request.url).pathname.startsWith("/api/")) return;
  event.respondWith(caches.match(request).then((cached) => cached || fetch(request)));
});
