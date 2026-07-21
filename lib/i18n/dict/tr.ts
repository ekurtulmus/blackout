// TÜRKÇE — ÇEVİRİNİN KAYNAĞIDIR. Yeni metin ÖNCE buraya eklenir, sonra diğer dillere.
// Diğer diller bu anahtarların TAMAMINI içermek zorundadır (dict/index.ts tip kısıtı),
// eksik olursa `npx tsc` hata verir → bir dilde metin unutulması imkânsız.
//
// ANAHTAR DÜZENİ: <ekran>.<öğe>   ör. "settings.title", "menu.single.sub"
// DEĞİŞKEN: metne {ad} yaz, çağırırken t("key", { ad: değer })
export const tr = {
  // — Dil seçici —
  "lang.title": "Dil",
  "lang.desc": "Oyunun dili. Seçimin bu cihazda saklanır.",

  // — Ana menü —
  "menu.single": "TEK KİŞİLİK",
  "menu.single.sub": "Yalnız kaçış · 10 bölüm",
  "menu.multi": "ÇOK OYUNCULU",
  "menu.multi.sub": "Ölüm koşusu · 2–6 kişi",

  // — Çok oyunculu ekranı —
  "multi.eyebrow": "Çok Oyunculu",
  "multi.title": "ÖLÜM KOŞUSU",
  "multi.sub": "2–6 kişi, ilk kaçan kazanır.",
  "multi.friends": "ARKADAŞLARINLA OYNA",
  "multi.friends.sub": "Oda kur, kodu paylaş · özel oda",
  "multi.rooms": "ONLINE ODALAR",
  "multi.soon.badge": "Yakında",
  "multi.soon.note": "Online odalar çok yakında oyunda olacak",

  // — Ayarlar —
  "settings.eyebrow": "Tercihlerin",
  "settings.title": "AYARLAR",
  "settings.name": "Oyuncu Adın",
  "settings.name.saved": "✓ Kaydedildi",
  "settings.name.desc": "Boş bırakırsan arkadaş kodun ({code}) görünür. Çok oyunculuda ve arkadaş listende bu isim görünür.",
  "settings.volume": "Ses Seviyesi",
  "settings.sound": "Ses",
  "settings.on": "Açık",
  "settings.off": "Kapalı",
  "settings.hint": "Oyun içinde Esc / P ile duraklat. Ayarların bu cihazda saklanır.",
  "settings.reset.title": "Tüm İlerlemeyi Sıfırla",
  "settings.reset.desc": "Tüm ilerlemen silinir: altın, envanter ve satın almalar, tamamlanan görevler, açılan sırlar, günlük sayfaları, başarımlar, en iyi skorlar ve kaldığın bölüm. Geri alınamaz. Adın, arkadaşların ve ses tercihlerin korunur.",
  "settings.reset.btn": "Sıfırla",
  "settings.reset.confirm": "Emin misin? Tüm ilerlemen ve satın almaların kalıcı olarak silinecek.",
  "settings.reset.yes": "Evet, hepsini sil",
  "settings.reset.cancel": "Vazgeç",

  // — Ortak —
  "common.back": "Geri",
} as const;
