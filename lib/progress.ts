// BLACKOUT/JILTED — ilerleme sıfırlama (TEK KAYNAK).
//
// İki yerden sıfırlanır ve İKİSİ DE aynı kuralı kullanmalı:
//   1) app/page.tsx  — sürüm damgası (RESET_V) değişince HERKESTE bir kez (toplu sıfırlama)
//   2) components/Settings.tsx — kullanıcının kendi "Tüm İlerlemeyi Sıfırla" butonu
//
// KURAL: "silinecekler" listesi TUTMUYORUZ. Öyleydi ve her yeni özellikte unutuluyordu
// (blackout_sp_progress / blackout_stats / blackout_equipped / blackout_best_<id> silinmiyordu
// → "sıfırladım ama Devam Et duruyor, başarımlar geri geliyor"). TERSİ doğru: `blackout_` ile
// başlayan HER ŞEY silinir, yalnız aşağıdakiler korunur. Yeni anahtar eklenince burayı
// güncellemek GEREKMEZ — yeni anahtar otomatik olarak "silinecek" tarafında olur.

// Sıfırlamada KORUNANLAR: kimlik (arkadaş kodu/isim/arkadaşlar/istekler) + ses tercihleri.
// blackout_reset_v de korunur — yoksa sıfırlama her yüklemede tekrar çalışırdı.
export const PROGRESS_KEEP_KEYS: readonly string[] = [
  "blackout_uid",
  "blackout_name",
  // Dil seçimi İLERLEME DEĞİLDİR: sıfırlayan biri oyunu anlamadığı bir dilde bulmasın.
  "blackout_lang",
  "blackout_friends",
  "blackout_sent",
  "blackout_freq_in",
  "blackout_vol",
  "blackout_music",
  "blackout_muted",
  "blackout_haptics", // titreşim tercihi (ayar, ilerleme değil)
  // SATIN ALIMLAR ilerleme değildir: parayla alınan premium sıfırlamada SİLİNMEMELİ.
  // İşlenmiş jeton listesi de korunur (yoksa yarım kalan paket iki kez altın verebilirdi).
  "blackout_premium",
  "blackout_iap_granted",
  "blackout_reset_v",
  // Puan isteği ÖMÜR BOYU bir kez sorulur: sıfırlamada silinse ikinci kez sorulurdu
  // (bkz. lib/review.ts). Bu bir ilerleme değeri değil, "bu kişiye zaten sorduk" notu.
  "blackout_rated",
];

// Tarayıcıdan "bu verimi kalıcı işaretle" iznini ister — DEPOLAMA BASKISINDA SİLİNMEYİ önler.
//
// Varsayılan olarak site verisi "best-effort"tür: telefon dolunca tarayıcı, az kullanılan
// sitelerin verisini KULLANICIYA SORMADAN silebilir. Bizde her şey localStorage'da
// (arkadaş kodu blackout_uid, arkadaş listesi, ilerleme) ve sunucuda YEDEĞİ YOK —
// yani böyle bir silinme kalıcı kayıp demek. Arkadaş kodu gidince oyuncu, arkadaşlarının
// listesinde sonsuza dek çevrimdışı görünür (kod kendini beyan usulü, bkz. lib/friends.ts).
//
// Chrome bunu SORU SORMADAN karara bağlar: kurulu uygulama / yüksek etkileşim varsa
// sessizce verir, yoksa sessizce reddeder. Kullanıcı hiçbir şey görmez, hiçbir şey yapmaz.
// Kullanıcının kendi elle sildiği veriyi (Chrome > verileri temizle) BU DA kurtaramaz.
export async function requestPersistentStorage(): Promise<boolean> {
  try {
    if (typeof navigator === "undefined" || !navigator.storage?.persist) return false;
    // Zaten kalıcıysa tekrar isteme (her açılışta boşuna çağrı olmasın).
    if (await navigator.storage.persisted()) return true;
    return await navigator.storage.persist();
  } catch {
    return false;
  }
}

// Korunanlar dışındaki tüm `blackout_*` anahtarlarını siler. Silinen anahtar sayısını döndürür.
export function wipeProgress(): number {
  const keep = new Set(PROGRESS_KEEP_KEYS);
  try {
    // ÖNCE topla, SONRA sil: döngü içinde silmek indeksleri kaydırır ve anahtar atlatır.
    const rm: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith("blackout_") && !keep.has(k)) rm.push(k);
    }
    for (const k of rm) localStorage.removeItem(k);
    return rm.length;
  } catch {
    return 0;
  }
}
