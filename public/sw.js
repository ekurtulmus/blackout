// JILTED — service worker.
//
// NEDEN VAR: (1) site "kurulabilir uygulama" sayılsın (TWA/Play için gerekli),
// (2) İNTERNETSİZ OYNANABİLSİN — tek kişilik mod tamamen cihazda çalışır,
// (3) bağlantı yokken tarayıcının çirkin hata sayfası çıkmasın.
//
// ⚠️ DİKKAT — service worker KALICIDIR: hatalı bir sürüm yayınlanırsa kullanıcıların
// tarayıcısında takılı kalır. Bu yüzden davranış BİLEREK basit ve öngörülebilir:
//   • HTML → ÖNCE AĞ. Yeni deploy anında herkese ulaşır (bayat sayfa olmaz).
//     Başarılı her açılış "kabuk" olarak saklanır ve YALNIZ ağ yokken sunulur.
//   • /_next/static (içerik-hash'li, adı asla değişmez), /icons, /audio → önce önbellek.
//   • Google Fonts → önce önbellek (yoksa çevrimdışında yazı tipleri bozuk görünür).
//   • Supabase (online oyun) → HİÇ DOKUNMA. Çevrimiçi mod ağ ister, önbelleklenemez.
// Sürüm değişince eski önbellek silinir → VERSION'ı her ciddi değişiklikte artır.
const VERSION = "jilted-v2";
const OFFLINE_URL = "/offline.html";
const SHELL_URL = "/"; // çevrimdışı yedek olarak saklanan son başarılı sayfa
const PRECACHE = [OFFLINE_URL, "/icons/icon-192.png", "/icons/icon-512.png"];

// Bu origin'ler dışarıda ama önbelleklenmesi GÜVENLİ: içerikleri sabittir.
const FONT_HOSTS = ["fonts.googleapis.com", "fonts.gstatic.com"];

self.addEventListener("install", (e) => {
  e.waitUntil(
    (async () => {
      const c = await caches.open(VERSION);
      await c.addAll(PRECACHE);
      // Kabuğu şimdiden al: kullanıcı hiç çevrimdışı kalmadan önce hazır olsun.
      try {
        const res = await fetch(SHELL_URL, { cache: "reload" });
        if (res.ok) await c.put(SHELL_URL, res.clone());
      } catch {
        /* ağ yoksa geç — ilk başarılı açılışta yakalanır */
      }
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

// Önce önbellek, yoksa indir ve sakla. (Adı değişmeyen dosyalar için güvenli.)
async function cacheFirst(req) {
  const hit = await caches.match(req);
  if (hit) return hit;
  const res = await fetch(req);
  // opaque (no-cors) yanıtlar da saklanır: yazı tipleri böyle gelir.
  if (res && (res.ok || res.type === "opaque")) {
    const c = await caches.open(VERSION);
    c.put(req, res.clone());
  }
  return res;
}

self.addEventListener("fetch", (e) => {
  const req = e.request;
  if (req.method !== "GET") return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }

  // Dış origin: yalnız yazı tipleri önbelleklenir, gerisine (Supabase) DOKUNULMAZ.
  if (url.origin !== self.location.origin) {
    if (FONT_HOSTS.includes(url.hostname)) {
      e.respondWith(cacheFirst(req).catch(() => fetch(req)));
    }
    return;
  }

  // Sayfa açılışları: ÖNCE AĞ (deploy anında görünür), başarılıysa kabuğu tazele.
  // Ağ yoksa saklanan kabuk → oyun İNTERNETSİZ açılır. O da yoksa çevrimdışı sayfası.
  if (req.mode === "navigate") {
    e.respondWith(
      (async () => {
        try {
          const res = await fetch(req);
          if (res.ok) {
            const c = await caches.open(VERSION);
            c.put(SHELL_URL, res.clone());
          }
          return res;
        } catch {
          const shell = await caches.match(SHELL_URL);
          if (shell) return shell;
          const off = await caches.match(OFFLINE_URL);
          return (
            off ??
            new Response("Bağlantı yok", {
              status: 503,
              headers: { "content-type": "text/plain; charset=utf-8" },
            })
          );
        }
      })()
    );
    return;
  }

  // Uygulama dosyaları + ikonlar + MÜZİK: önce önbellek.
  // /audio olmadan oyun çevrimdışı açılır ama sessiz olurdu.
  if (
    url.pathname.startsWith("/_next/static/") ||
    url.pathname.startsWith("/icons/") ||
    url.pathname.startsWith("/audio/")
  ) {
    e.respondWith(cacheFirst(req));
  }
});
