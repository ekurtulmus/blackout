// JILTED — desteklenen diller (tek kaynak).
//
// Dil eklemek: (1) buraya kod + meta ekle, (2) lib/i18n/dict/<kod>.ts oluştur,
// (3) lib/i18n/dict/index.ts'e bağla. TypeScript eksik çeviriyi DERLEME HATASI yapar
// (bkz. dict/index.ts) — yani "bir dilde metin unutuldu" durumu imkânsızdır.

export const LANGS = ["tr", "en", "ru", "es", "hi", "zh"] as const;
export type Lang = (typeof LANGS)[number];

export const DEFAULT_LANG: Lang = "tr";

// native: dil seçicide KENDİ dilinde görünür (kullanıcı kendi dilini tanısın diye —
// "Rusça" yazarsak Rus oyuncu okuyamaz).
export const LANG_META: Record<Lang, { native: string; en: string; flag: string }> = {
  tr: { native: "Türkçe", en: "Turkish", flag: "🇹🇷" },
  en: { native: "English", en: "English", flag: "🇬🇧" },
  ru: { native: "Русский", en: "Russian", flag: "🇷🇺" },
  es: { native: "Español", en: "Spanish", flag: "🇪🇸" },
  hi: { native: "हिन्दी", en: "Hindi", flag: "🇮🇳" },
  zh: { native: "中文", en: "Chinese", flag: "🇨🇳" },
};

// YAZI TİPİ SORUNU: Cinzel (başlıklar) YALNIZ Latin; Archivo'da da Kiril/Devanagari/CJK yok.
// Bu diller için ayrı font ailesi gerekir, yoksa metin sistem fontuna düşer ve
// oyunun tipografi kimliği bozulur.
// Latin diller (tr/en/es) mevcut fontları kullanır → EK İNDİRME YOK.
// Diğerleri yalnız O DİL SEÇİLİYSE yüklenir (Çince font ~10 MB, herkese indirtilemez).
export const LANG_FONTS: Partial<Record<Lang, { href: string; title: string; body: string }>> = {
  ru: {
    href: "https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800&family=Noto+Sans:wght@400;500;600;700;800&display=swap",
    title: '"Playfair Display", serif', // Kiril destekli serif (Cinzel'in yerine)
    body: '"Noto Sans", sans-serif',
  },
  hi: {
    href: "https://fonts.googleapis.com/css2?family=Tiro+Devanagari+Hindi&family=Noto+Sans+Devanagari:wght@400;500;600;700;800&display=swap",
    title: '"Tiro Devanagari Hindi", serif',
    body: '"Noto Sans Devanagari", sans-serif',
  },
  zh: {
    href: "https://fonts.googleapis.com/css2?family=Noto+Serif+SC:wght@700;900&family=Noto+Sans+SC:wght@400;500;700&display=swap",
    title: '"Noto Serif SC", serif',
    body: '"Noto Sans SC", sans-serif',
  },
};

// Tarayıcı dilinden en yakın desteklenen dili bul ("en-US" → "en", "zh-Hans-CN" → "zh").
export function detectLang(candidates: readonly string[]): Lang {
  for (const c of candidates) {
    const base = c.toLowerCase().split("-")[0];
    const hit = LANGS.find((l) => l === base);
    if (hit) return hit;
  }
  return DEFAULT_LANG;
}
