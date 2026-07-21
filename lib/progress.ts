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
  "blackout_reset_v",
];

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
