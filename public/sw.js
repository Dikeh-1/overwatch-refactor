const CACHE_NAME = "overwatch-app-v2";
const PRECACHE_URLS = [
  "/en",
  "/logo.png",
  "/hero_dark.webp",
  "/monitoring.webp",
  "/guard-sleeping.webp",
  "/weapon-detection.webp",
  "/surveillance-control-room.webp",
  "/business-bg.webp",
  "/business-bg-minimal.webp",
  "/homes-bg.webp",
  "/app-icon-192.png",
];

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => cache.addAll(PRECACHE_URLS))
      .catch(() => undefined),
  );
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(
          keys
            .filter((key) => key !== CACHE_NAME)
            .map((key) => caches.delete(key)),
        ),
      )
      .then(() => self.clients.claim()),
  );
});

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return;

  const requestUrl = new URL(event.request.url);
  if (requestUrl.origin !== self.location.origin) return;

  if (event.request.mode === "navigate") {
    event.respondWith(
      fetch(event.request).catch(() =>
        caches.match("/en").then((cached) => cached || caches.match("/")),
      ),
    );
    return;
  }

  if (!["image", "font", "style", "script"].includes(event.request.destination)) {
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;

      return fetch(event.request).then((response) => {
        if (response.ok) {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }

        return response;
      });
    }),
  );
});
