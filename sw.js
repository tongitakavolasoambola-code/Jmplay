const CACHE_NAME = 'fjm-cache-v1'; // build.js manampy ny laharan'ny build ao amin'ny dist/sw.js → mihavao ho azy ny app isaky ny deploy
const APP_FILES = ['./', './index.html', './manifest.json', './config.js', './sync.js', './supabase.js', './bible-app.js', './hira-data.js', './lohahevitra.js', './dikisionera-data.js', './logo-menu.png', './icons/icon-192.png', './icons/icon-512.png', './icons/maskable-512.png'];
const BIBLE_FILES = ['./baiboly.js']; // lehibe (~4.5 Mo): tsy manakana ny fametrahana raha tsy tafiditra

// Rakitra lehibe sy tsy miova: alaina avy hatrany amin'ny cache (tsy asiana tambajotra isaky ny sokafana).
// Tsy mila ovaina intsony ny CACHE_NAME: build.js no manao azy isaky ny build.
const STATIC_RE = /\/(hira-data|baiboly|baiboly-diem|lohahevitra|dikisionera-data)\.js$|\.(png|jpe?g|webp|svg|ico)$/i;

const IMG_CACHE = 'fjm-img-v1'; // sary dikisionera (Supabase Storage): tehirizina mba hiseho offline aorian'ny fijerena voalohany

self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(async cache => {
    await Promise.allSettled([...APP_FILES, ...BIBLE_FILES].map(f => cache.add(f)));
  }));
  self.skipWaiting();
});

self.addEventListener('activate', event => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE_NAME && k !== IMG_CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', event => {
  const req = event.request;
  const url = new URL(req.url);
  if (req.method === 'GET' && url.pathname.indexOf('/storage/v1/object/public/') > -1 && !req.headers.has('range')) {
    event.respondWith(caches.open(IMG_CACHE).then(async c => {
      const hit = await c.match(req);
      if (hit) return hit;
      try { const res = await fetch(req); if (res && (res.ok || res.type === 'opaque')) { try { await c.put(req, res.clone()); } catch (e) {} } return res; }
      catch (e) { return Response.error(); }
    }));
    return;
  }
  if (req.method !== 'GET' || url.origin !== self.location.origin || req.headers.has('range')) return;
  event.respondWith(
    caches.open(CACHE_NAME).then(async cache => {
      const cached = await cache.match(req, { ignoreSearch: true });
      // Rakitra lehibe: cache-first (maivana, tsy mamerina misintona 5 Mo isaky ny fanokafana)
      if (cached && STATIC_RE.test(url.pathname)) return cached;
      // Hafa (index.html, JS kely...): afaka miseho avy hatrany, havaozina any ambadika
      const network = fetch(req).then(res => {
        if (res && res.ok) { try { cache.put(req, res.clone()); } catch (e) {} }
        return res;
      }).catch(() => null);
      if (cached) { event.waitUntil(network); return cached; }
      return (await network) || (await cache.match('./index.html')) || Response.error();
    })
  );
});
