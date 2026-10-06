/* Kaier : garde le cahier en cache pour qu'il marche en cuisine, même sans réseau.
   La page est demandée au réseau d'abord (mise à jour dès qu'on est connecté), le reste vient du cache. */
const CACHE = 'kaier-c41fc158';
const BASE = ["./", "manifest.webmanifest", "fonts/gloock.woff2", "fonts/figtree.woff2", "fonts/figtree-ext.woff2", "icons/icon-192.png", "icons/apple-touch-icon.png", "img/aubergine-rotie-miel-harissa-s-af4e49.webp", "img/bagel-poulet-bacon-avocat-s-484b1e.webp", "img/chou-farci-s-c823ff.webp", "img/croque-au-bleu-et-tomate-confite-s-13d666.webp", "img/curry-japonais-s-bbf81e.webp", "img/donburi-asperge-s-bedac6.webp", "img/flan-vanille-s-70dff1.webp", "img/focaccia-s-978aa5.webp", "img/karaage-s-e59898.webp", "img/krapao-s-7df3f0.webp", "img/lasagnes-a-la-bolognaise-s-b8ac1d.webp", "img/lasagnes-vegetariennes-s-23f994.webp", "img/matcha-latte-maison-s-731f77.webp", "img/nouilles-sautees-pak-choi-poulet-s-6c7397.webp", "img/parmigiana-d-aubergines-s-25c8d2.webp", "img/porc-braise-au-soja-s-1557b2.webp", "img/poulet-roti-s-0658fb.webp", "img/quiche-brocoli-jambon-gorgonzola-s-0d22a9.webp", "img/raviolis-wonton-s-14c6ec.webp", "img/risotto-aux-asperges-s-d2bb30.webp", "img/salade-grecque-s-a2f392.webp", "img/sandwich-focaccia-s-3df693.webp", "img/saucisse-et-lentilles-s-4105d4.webp", "img/tartare-de-thon-s-366fa8.webp", "img/tarte-a-la-tomate-s-b740e6.webp", "img/tarte-aux-champignons-s-0bba44.webp", "img/tartiflette-s-4a96a3.webp", "img/tatin-d-aubergine-s-01575b.webp", "img/veloute-de-butternut-s-58dc6c.webp", "img/veloute-de-potimarron-s-87c01f.webp"];
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
