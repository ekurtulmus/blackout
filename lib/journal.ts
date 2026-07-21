// BLACKOUT — günlük/not parçaları (Faz F / Madde 16). Bölümlere serpiştirilen sayfalar;
// toplandıkça hikâye açılır. Menüde "Günlük" ekranından okunur. localStorage'da saklanır.

// ÇOK DİLLİ: bu dosya React değil, useT() kullanamaz. title/text alanları METİN değil
// ÇEVİRİ ANAHTARI tutar (bkz. lib/i18n/dict/parts/lore.ts). Ekrana basan taraf t() ile çevirir.
import type { DictKey } from "@/lib/i18n/dict";

export type JournalEntry = { id: number; title: DictKey; text: DictKey };

// 14 sayfa — hepsi OYUNCUNUN ağzından, dağınık bulunur. Sıra numarası hikâye
// akışıdır: baştaki hafıza kaybından, sonundaki "kaçan damat benim" kabullenişine.
export const JOURNAL: JournalEntry[] = [
  { id: 0, title: "journal.0.title", text: "journal.0.body" },
  { id: 1, title: "journal.1.title", text: "journal.1.body" },
  { id: 2, title: "journal.2.title", text: "journal.2.body" },
  { id: 3, title: "journal.3.title", text: "journal.3.body" },
  { id: 4, title: "journal.4.title", text: "journal.4.body" },
  { id: 5, title: "journal.5.title", text: "journal.5.body" },
  { id: 6, title: "journal.6.title", text: "journal.6.body" },
  { id: 7, title: "journal.7.title", text: "journal.7.body" },
  { id: 8, title: "journal.8.title", text: "journal.8.body" },
  { id: 9, title: "journal.9.title", text: "journal.9.body" },
  { id: 10, title: "journal.10.title", text: "journal.10.body" },
  { id: 11, title: "journal.11.title", text: "journal.11.body" },
  { id: 12, title: "journal.12.title", text: "journal.12.body" },
  { id: 13, title: "journal.13.title", text: "journal.13.body" },
];

const KEY = "blackout_journal";
let mem: number[] = [];

export function getCollected(): number[] {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return mem.slice();
}

// Topla; yeni sayfaysa true döner.
export function collectNote(id: number): boolean {
  const cur = getCollected();
  if (cur.includes(id)) return false;
  const next = [...cur, id];
  mem = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* geç */
  }
  return true;
}

export function journalById(id: number): JournalEntry | undefined {
  return JOURNAL.find((e) => e.id === id);
}
