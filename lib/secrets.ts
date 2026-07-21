// Gizli Son / Sırlar — GÖREV MODUNA bağlı. Her görev tamamlanınca KARIŞIK
// eşlemeyle 1 sır açılır (Görev 1 → Sır 3 gibi). 12 görev = 12 sır. Hepsi
// açılınca gizli son "Gerçek" görünür. Metinler birbirine bağlı; sonunda TERS
// KÖŞE: kaçan damat = OYUNCU. Görseller: kendi kendine yeten sepya SVG (telif yok).

// ÇOK DİLLİ: bu dosya React değil, useT() kullanamaz. title/text alanları METİN değil
// ÇEVİRİ ANAHTARI tutar (bkz. lib/i18n/dict/parts/lore.ts). Ekrana basan taraf t() ile çevirir.
import type { DictKey } from "@/lib/i18n/dict";

export type Secret = {
  id: number; // 1..12 (hikaye sırası)
  title: DictKey;
  text: DictKey; // gövde metni anahtarı (çeviride 120-200 harf)
  svg: string; // sepya illüstrasyon (tam <svg> dizesi)
};

const FR = `<rect width="240" height="180" fill="#e8dcc0"/><rect x="7" y="7" width="226" height="166" fill="none" stroke="#b7a683" stroke-width="3"/>`;
const wrap = (inner: string) =>
  `<svg viewBox="0 0 240 180" xmlns="http://www.w3.org/2000/svg">${FR}${inner}</svg>`;

export const SECRETS: Secret[] = [
  {
    id: 1,
    title: "secret.1.title",
    text: "secret.1.body",
    svg: wrap(
      `<circle cx="120" cy="52" r="17" fill="#cbb892"/><path d="M120 69 L150 148 L90 148 Z" fill="#d9cbaa"/><path d="M120 69 L120 148" stroke="#b7a683" stroke-width="2"/><circle cx="120" cy="118" r="7" fill="#9c6a6a"/><circle cx="112" cy="124" r="5" fill="#9c6a6a"/><circle cx="128" cy="124" r="5" fill="#9c6a6a"/>`
    ),
  },
  {
    id: 2,
    title: "secret.2.title",
    text: "secret.2.body",
    svg: wrap(
      `<rect x="92" y="72" width="56" height="9" fill="#6f5c43"/><rect x="92" y="72" width="9" height="72" fill="#6f5c43"/><rect x="139" y="72" width="9" height="72" fill="#6f5c43"/><rect x="88" y="40" width="64" height="34" fill="none" stroke="#6f5c43" stroke-width="6"/><path d="M40 40 L40 150" stroke="#b7a683" stroke-width="4"/><path d="M200 40 L200 150" stroke="#b7a683" stroke-width="4"/>`
    ),
  },
  {
    id: 3,
    title: "secret.3.title",
    text: "secret.3.body",
    svg: wrap(
      `<circle cx="80" cy="55" r="14" fill="#cbb892"/><path d="M80 69 L104 150 L56 150 Z" fill="#d9cbaa"/><circle cx="165" cy="80" r="34" fill="none" stroke="#6f5c43" stroke-width="4"/><path d="M165 80 L165 55" stroke="#6f5c43" stroke-width="4"/><path d="M165 80 L185 88" stroke="#6f5c43" stroke-width="3"/>`
    ),
  },
  {
    id: 4,
    title: "secret.4.title",
    text: "secret.4.body",
    svg: wrap(
      `<g stroke="#6f5c43" stroke-width="2" fill="#ddcfae"><rect x="70" y="110" width="100" height="36"/><rect x="78" y="86" width="100" height="36"/><rect x="86" y="62" width="100" height="36"/></g><path d="M86 62 L136 92 L186 62" fill="none" stroke="#6f5c43" stroke-width="2"/>`
    ),
  },
  {
    id: 5,
    title: "secret.5.title",
    text: "secret.5.body",
    svg: wrap(
      `<rect x="80" y="34" width="80" height="112" rx="38" fill="#cdbb95" stroke="#6f5c43" stroke-width="4"/><path d="M120 40 L108 90 L128 96 L112 146" fill="none" stroke="#8a6b6b" stroke-width="2"/><circle cx="106" cy="80" r="5" fill="#7a1f1f"/><circle cx="134" cy="80" r="5" fill="#7a1f1f"/>`
    ),
  },
  {
    id: 6,
    title: "secret.6.title",
    text: "secret.6.body",
    svg: wrap(
      `<g fill="#d9cbaa" stroke="#b7a683" stroke-width="2"><path d="M70 70 L88 150 L52 150 Z"/><path d="M120 58 L142 150 L98 150 Z"/><path d="M170 70 L188 150 L152 150 Z"/></g><circle cx="70" cy="58" r="11" fill="#cbb892"/><circle cx="120" cy="46" r="12" fill="#cbb892"/><circle cx="170" cy="58" r="11" fill="#cbb892"/>`
    ),
  },
  {
    id: 7,
    title: "secret.7.title",
    text: "secret.7.body",
    svg: wrap(
      `<circle cx="90" cy="90" r="16" fill="#cbb892"/><g fill="none" stroke="#8a6b6b" stroke-width="2"><path d="M112 66 A34 34 0 0 1 112 114"/><path d="M124 56 A50 50 0 0 1 124 124"/><path d="M136 46 A66 66 0 0 1 136 134"/></g>`
    ),
  },
  {
    id: 8,
    title: "secret.8.title",
    text: "secret.8.body",
    svg: wrap(
      `<g fill="#6f5c43"><circle cx="150" cy="54" r="13"/><path d="M150 66 Q140 92 156 100 L146 140 M156 100 L172 138" stroke="#6f5c43" stroke-width="7" fill="none" stroke-linecap="round"/><path d="M150 78 L126 96 M150 84 L176 74" stroke="#6f5c43" stroke-width="6" stroke-linecap="round"/></g><rect x="40" y="40" width="42" height="104" fill="none" stroke="#6f5c43" stroke-width="5"/><path d="M78 44 L78 140" stroke="#7a1f1f" stroke-width="3"/>`
    ),
  },
  {
    id: 9,
    title: "secret.9.title",
    text: "secret.9.body",
    svg: wrap(
      `<path d="M120 72 L120 60 M110 60 L130 60" stroke="#6f5c43" stroke-width="3"/><rect x="106" y="72" width="28" height="34" rx="4" fill="#cdbb95" stroke="#6f5c43" stroke-width="3"/><path d="M120 106 L96 152 L144 152 Z" fill="#e8cf90" opacity="0.5"/><circle cx="120" cy="90" r="7" fill="#d9a441"/>`
    ),
  },
  {
    id: 10,
    title: "secret.10.title",
    text: "secret.10.body",
    svg: wrap(
      `<rect x="52" y="74" width="136" height="46" fill="#ddcfae" stroke="#6f5c43" stroke-width="2"/><g stroke="#6f5c43" stroke-width="3" fill="none"><path d="M70 108 L70 86 L82 108 L82 86"/><path d="M94 86 L94 108 M94 86 L106 86 M94 97 L104 97 M94 108 L106 108"/><path d="M118 86 L118 108 M118 86 L130 108 L130 86"/></g><path d="M150 84 L172 110" stroke="#7a1f1f" stroke-width="3"/>`
    ),
  },
  {
    id: 11,
    title: "secret.11.title",
    text: "secret.11.body",
    svg: wrap(
      `<path d="M120 145 C60 100 70 50 120 78 C170 50 180 100 120 145 Z" fill="#9c3a3a" stroke="#6f5c43" stroke-width="2"/><path d="M120 78 L120 145" stroke="#7a2a2a" stroke-width="2" opacity="0.6"/>`
    ),
  },
  {
    id: 12,
    title: "secret.12.title",
    text: "secret.12.body",
    svg: wrap(
      `<rect x="80" y="34" width="80" height="112" rx="38" fill="#cdbb95" stroke="#6f5c43" stroke-width="4"/><g opacity="0.5"><circle cx="120" cy="72" r="13" fill="#6f5c43"/><path d="M120 86 L142 140 L98 140 Z" fill="#6f5c43"/></g><circle cx="110" cy="70" r="4" fill="#7a1f1f"/><circle cx="130" cy="70" r="4" fill="#7a1f1f"/>`
    ),
  },
];

// KARIŞIK eşleme: görev id (1..12) → sır indeksi (0..11). Birebir (bijection).
// Sıralı DEĞİL → görevleri bitirdikçe hikâye dağınık açılır, ancak 12/12'de tamamlanır.
export const MISSION_SECRET: Record<number, number> = {
  1: 2,
  2: 7,
  3: 0,
  4: 9,
  5: 4,
  6: 11,
  7: 3,
  8: 5,
  9: 1,
  10: 8,
  11: 6,
  12: 10,
};

export const SECRET_COUNT = SECRETS.length;

export const SECRET_ENDING_TITLE: DictKey = "secret.ending.title";
export const SECRET_ENDING: DictKey[] = [
  "secret.ending.1",
  "secret.ending.2",
  "secret.ending.3",
  "secret.ending.4",
];
