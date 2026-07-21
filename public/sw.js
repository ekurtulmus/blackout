// JILTED — service worker.
//
// NEDEN VAR: (1) site "kurulabilir uygulama" sayılsın (TWA/Play için gerekli),
// (2) internet kesikken tarayıcının çirkin hata sayfası yerine kendi sayfamız çıksın.
// İnceleme sırasında uçak modunda açılıp beyaz/hata ekranı görülmesi RET sebebi olabiliyor.
//
// ⚠️ DİKKAT — service worker KALICIDIR: hatalı bir sürüm yayınlanırsa kullanıcıların
// tarayıcısında takılı kalır. Bu yüzden BİLEREK MİNİMAL:
//   • HTML ASLA önbelleğe alınmaz → her deploy anında herkese ulaşır (bayat sayfa olmaz).
//   • Yalnız /_next/static (içerik-hash'li, asla değişmez) ve /icons önbelleklenir.
//   • Farklı origin'lere (Supabase realtime, Google Fonts) HİÇ dokunulmaz.
// Sürüm değişince eski önbellek silinir → VERSION'ı her ciddi değişiklikte artır.
const VERSION = "jilted-v1";
const OFFLINE_URL = "/offline.html";
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(VERSION);
      await c.addAll(PRECACHE);
      await self.skipWaiting(); // yeni sürüm beklemeden devralsın
    })()
  );
});

self.addEventListener("activate", (e) => {
  e.waitUntil(
    (async () => {
      for (const k of await caches.keys()) {
        if (k !== VERSION) await caches.delete(k);
      }
      await self.clients.claim();
    })()
  );
});

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  // Supabase (online oyun) + Google Fonts → ASLA araya girme
  if (url.origin !== self.location.origin) return;

  // Sayfa açılışları: ÖNCE AĞ. Böylece yeni deploy anında görünür; ağ yoksa çevrimdışı sayfası.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          return await fetch(req);
        } catch {
          const off = await caches.match(OFFLINE_URL);
          return off ?? new Response("Bağlantı yok", { status: 503, headers: { "content-type": "text/plain; charset=utf-8" } });
        }
      })()
    );
    return;
  }

  // İçerik-hash'li statik dosyalar + ikonlar: önbellekten ver, yoksa indir ve sakla.
  // (Bu yollardaki dosyalar aynı isimle DEĞİŞMEZ, o yüzden bayatlama riski yok.)
  if (url.pathname.startsWith("/_next/static/") || url.pathname.startsWith("/icons/")) {
    e.respondWith(
      (async () => {
        const hit = await caches.match(req);
        if (hit) return hit;
        const res = await fetch(req);
        if (res.ok) {
          const c = await caches.open(VERSION);
          c.put(req, res.clone());
        }
        return res;
      })()
    );
  }
});
