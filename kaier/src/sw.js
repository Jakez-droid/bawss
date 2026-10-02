/* Kaier : garde le cahier en cache pour qu'il marche en cuisine, même sans réseau.
   La page est demandée au réseau d'abord (mise à jour dès qu'on est connecté), le reste vient du cache. */
const CACHE = 'kaier-__VERSION__';
const BASE = __BASE__;
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith('kaier-') && k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.origin !== location.origin) return;
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(new Error('lent')), 5000))]);
        if (res.ok && /\/kaier\/(index\.html)?$/.test(u.pathname)) c.put('./', res.clone());
        return res;
      } catch (err) {
        return (await c.match('./')) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r);
    if (hit) return hit;
    try {
      const res = await fetch(r);
      if (res.ok) c.put(r, res.clone()).catch(() => {});
      return res;
    } catch (err) { return Response.error(); }
  })());
});
