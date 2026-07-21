// Hikaye metinleri — giriş anlatısı + bölüm arası tekinsiz notlar.
// Tamamı özgün (telif yok). Atmosfer/korku tonu.
//
// ÇOK DİLLİ: bu dosya React değil, useT() kullanamaz. Bu yüzden burada METİN değil
// ÇEVİRİ ANAHTARI tutulur (bkz. lib/i18n/dict/parts/lore.ts). Ekrana basan taraf t() ile çevirir.
import type { DictKey } from "@/lib/i18n/dict";

export const INTRO_TITLE: DictKey = "story.intro.title";

// KISA tutulur: brifing mobilde tek ekrana sığmalı — uzun metin sayfayı taşırıyordu.
// Atmosfer + tek kritik kural (çıkış nasıl açılır) korunur. ~390 → ~190 karakter.
export const INTRO_LINES: DictKey[] = ["story.intro.1", "story.intro.2", "story.intro.3"];

// Bölüm arası kısa notlar (levelclear ekranında gösterilir)
const LEVEL_NOTES: DictKey[] = [
  "story.note.1",
  "story.note.2",
  "story.note.3",
  "story.note.4",
  "story.note.5",
  "story.note.6",
  "story.note.7",
  "story.note.8",
  "story.note.9",
  "story.note.10",
];

// Bölüme göre deterministik not (ilerleme hissi için)
export function flavorForLevel(level: number): DictKey {
  const i = ((level - 1) % LEVEL_NOTES.length + LEVEL_NOTES.length) % LEVEL_NOTES.length;
  return LEVEL_NOTES[i];
}
