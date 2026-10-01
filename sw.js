/* Bawss : garde l'appli en cache pour qu'elle marche sans réseau.
   La page est toujours redemandée au réseau d'abord : une mise à jour arrive dès qu'on est connecté. */
const CACHE = 'bawss-1aa4a277';
const BASE = ["./", "supabase.js", "manifest.webmanifest", "icons/icon-192.png", "icons/icon-512.png", "icons/apple-touch-icon.png", "img/aubergine-rotie-miel-harissa-af4e49.jpg", "img/bagel-poulet-bacon-avocat-484b1e.jpg", "img/chou-farci-c823ff.jpg", "img/croque-au-bleu-et-tomate-confite-13d666.jpg", "img/curry-japonais-bbf81e.jpg", "img/donburi-asperge-bedac6.jpg", "img/flan-vanille-70dff1.jpg", "img/focaccia-978aa5.jpg", "img/karaage-e59898.jpg", "img/krapao-7df3f0.jpg", "img/lasagnes-a-la-bolognaise-b8ac1d.jpg", "img/lasagnes-vegetariennes-23f994.jpg", "img/matcha-latte-maison-731f77.jpg", "img/nouilles-sautees-pak-choi-poulet-6c7397.jpg", "img/parmigiana-d-aubergines-25c8d2.jpg", "img/porc-braise-au-soja-1557b2.jpg", "img/poulet-roti-0658fb.jpg", "img/quiche-brocoli-jambon-gorgonzola-0d22a9.jpg", "img/raviolis-wonton-14c6ec.jpg", "img/risotto-aux-asperges-d2bb30.jpg", "img/salade-grecque-a2f392.jpg", "img/sandwich-focaccia-3df693.jpg", "img/saucisse-et-lentilles-4105d4.jpg", "img/tartare-de-thon-366fa8.jpg", "img/tarte-a-la-tomate-b740e6.jpg", "img/tarte-aux-champignons-0bba44.jpg", "img/tartiflette-4a96a3.jpg", "img/tatin-d-aubergine-01575b.jpg", "img/veloute-de-butternut-58dc6c.jpg", "img/veloute-de-potimarron-87c01f.jpg"];
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
