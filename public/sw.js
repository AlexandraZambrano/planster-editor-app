const CACHE_NAME = "planster-shell-v1"
const APP_SHELL = ["/"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
  )
  self.clients.claim()
})

// Network-first for page navigations only — falls back to the last cached
// version (or the cached home page) when offline. Everything else (API
// routes, auth, the notifications SSE stream, non-GET requests) passes
// straight through untouched so data always stays live.
self.addEventListener("fetch", (event) => {
  const { request } = event
  if (request.method !== "GET") return
  if (new URL(request.url).origin !== self.location.origin) return
  if (request.mode !== "navigate") return

  event.respondWith(
    fetch(request)
      .then((response) => {
        const copy = response.clone()
        caches.open(CACHE_NAME).then((cache) => cache.put(request, copy))
        return response
      })
      .catch(() => caches.match(request).then((cached) => cached || caches.match("/")))
  )
})
