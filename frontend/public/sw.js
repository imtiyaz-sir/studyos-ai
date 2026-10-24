/* StudyOS AI service worker.
 * Scope: caches ONLY same-origin public static assets (the built JS/CSS/icons)
 * and an offline fallback page. It deliberately never touches cross-origin
 * requests — the API lives on a different origin and carries session cookies,
 * so private data is never written to the Cache Storage.
 * Bump VERSION to force clients to drop old caches.
 */
const VERSION = "v1";
const STATIC_CACHE = `studyos-static-${VERSION}`;
const PRECACHE = ["/offline.html", "/manifest.webmanifest", "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(STATIC_CACHE).then((c) => c.addAll(PRECACHE)));
  // No skipWaiting(): the page asks the user before swapping versions (see lib/pwa.js).
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k.startsWith("studyos-") && k !== STATIC_CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("message", (event) => {
  if (event.data === "SKIP_WAITING") self.skipWaiting();
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);
  if (url.origin !== self.location.origin) return; // never touch API / third-party traffic

  // Page navigations: network first; if the network is down show the offline page.
  if (req.mode === "navigate") {
    event.respondWith(fetch(req).catch(() => caches.match("/offline.html")));
    return;
  }

  // Vite emits content-hashed files under /assets/ — safe to cache forever.
  if (url.pathname.startsWith("/assets/") || url.pathname.startsWith("/icons/")) {
    event.respondWith(
      caches.match(req).then((hit) => hit || fetch(req).then((res) => {
        if (res.ok) { const copy = res.clone(); caches.open(STATIC_CACHE).then((c) => c.put(req, copy)); }
        return res;
      }))
    );
  }
});
