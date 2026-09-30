/* Bawss : garde l'appli en cache pour qu'elle marche sans réseau.
   La page est toujours redemandée au réseau d'abord : une mise à jour arrive dès qu'on est connecté. */
const CACHE = '__CACHE__';
const BASE = __BASE__;
self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(BASE)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => { e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim())); });
self.addEventListener('fetch', e => {
  const r = e.request;
  if (r.method !== 'GET') return;
  const u = new URL(r.url);
  if (u.hostname.endsWith('supabase.co') || u.hostname.endsWith('goatcounter.com')) return;
  if (r.mode === 'navigate') {
    e.respondWith((async () => {
      const c = await caches.open(CACHE);
      try {
        const res = await Promise.race([fetch(r), new Promise((_, no) => setTimeout(() => no(new Error('lent')), 6000))]);
        const racine = new URL('./', self.registration.scope).pathname;
        if (res.ok && (u.pathname === racine || u.pathname === racine + 'index.html')) c.put('./', res.clone());
        return res;
      } catch (err) {
        return (await c.match('./')) || (await c.match(r)) || Response.error();
      }
    })());
    return;
  }
  e.respondWith((async () => {
    const c = await caches.open(CACHE);
    const hit = await c.match(r);
    const net = fetch(r).then(res => { if (res.status === 200 || res.type === 'opaque') c.put(r, res.clone()).catch(() => {}); return res; }).catch(() => hit);
    return hit || net;
  })());
});
