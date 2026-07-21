// JILTED — desteklenen diller (tek kaynak).
//
// ŞU AN: Türkçe + İngilizce. (Rusça/İspanyolca/Hintçe/Çince başlanmıştı, kullanıcı
// isteğiyle KALDIRILDI — önce oyunun TAMAMI İngilizceye çevrilecek, diğer diller sonra.)
//
// Dil eklemek: (1) LANGS + LANG_META'ya ekle, (2) gerekiyorsa LANG_FONTS'a font ekle,
// (3) lib/i18n/dict/parts/*.ts dosyalarının HEPSİNE o dilin metinlerini ekle.
// TypeScript eksik çeviriyi DERLEME HATASI yapar (bkz. parts/_part.ts) — yani bir dilde
// metin unutulması imkânsızdır; hangi parçada eksik olduğunu tsc yüzüne söyler.

export const LANGS = ["tr", "en"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "tr";

// native: dil seçicide KENDİ dilinde görünür (kullanıcı kendi dilini tanısın diye).
export const LANG_META: Record<Lang, { native: string; en: string; flag: string }> = {
  tr: { native: "Türkçe", en: "Turkish", flag: "🇹🇷" },
  en: { native: "English", en: "English", flag: "🇬🇧" },
};

// DİLE GÖRE YAZI TİPİ — mekanizma DURUYOR ama şu an boş.
// Cinzel (başlıklar) YALNIZ Latin alfabesini kapsar; Archivo'da da Kiril/Devanagari/CJK yok.
// Türkçe ve İngilizce Latin olduğu için mevcut fontlar yeterli → EK İNDİRME YOK.
// Rusça/Hintçe/Çince geri gelirse buraya font eklemek yeter (globals.css --font-title /
// --font-body değişkenleri zaten hazır), yoksa o diller sistem fontuna düşer.
export const LANG_FONTS: Partial<Record<Lang, { href: string; title: string; body: string }>> = {};

// Tarayıcı dilinden en yakın desteklenen dili bul ("en-US" → "en").
// Desteklenmeyen bir dil (ör. "de") gelirse Türkçeye düşer.
export function detectLang(candidates: readonly string[]): Lang {
  for (const c of candidates) {
    const base = c.toLowerCase().split("-")[0];
    const hit = LANGS.find((l) => l === base);
    if (hit) return hit;
  }
  return DEFAULT_LANG;
}
