// Service worker de MESA: la app funciona sin conexión una vez abierta.
// Estrategia: responde con la copia guardada y la actualiza en segundo plano.
const CACHE = "mesa-v1";

self.addEventListener("install", () => self.skipWaiting());
self.addEventListener("activate", (e) =>
  e.waitUntil(
    caches.keys().then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k)))).then(() => self.clients.claim()),
  ),
);

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET" || new URL(req.url).origin !== self.location.origin) return;
  const isPage = req.mode === "navigate";
  e.respondWith(
    caches.open(CACHE).then(async (cache) => {
      // Las páginas con parámetros (?r=receta) comparten el mismo HTML.
      const cached = await cache.match(req, { ignoreSearch: isPage });
      const network = fetch(req)
        .then((res) => {
          if (res.ok) cache.put(req, res.clone());
          return res;
        })
        .catch(() => cached);
      return cached || network;
    }),
  );
});
