// Görsel temalar — zemin/duvar renk paletleri. Otomatik + rastgele:
// her oyunun kendi "seed"i olur (baştan başlayınca aynı temadan başlamamak için),
// ilerledikçe birkaç bölümde bir tema değişir.

export type Theme = {
  key: string;
  name: string;
  floor: [number, number, number];
  wall: [number, number, number];
  decor?: "graves" | "forest"; // Madde 11: zemine serpiştirilen deterministik süsler
  wallStyle?: "trees"; // duvarlar özel çizilir (ör. Orman'da duvar = ağaç)
};

export const THEMES: Theme[] = [
  { key: "zindan", name: "Zindan", floor: [58, 48, 42], wall: [104, 84, 70] }, // sıcak kahve taş
  { key: "hastane", name: "Hastane", floor: [44, 54, 56], wall: [118, 130, 122] }, // soğuk klinik yeşil-gri
  { key: "kilise", name: "Kilise", floor: [50, 50, 64], wall: [112, 108, 126] }, // soğuk mor-gri taş
  // Orman: duvarlar AĞAÇ, zeminde alçak ot (koridor ortası boş)
  { key: "orman", name: "Orman", floor: [34, 46, 32], wall: [30, 44, 28], decor: "forest", wallStyle: "trees" },
  { key: "mezarlik", name: "Mezarlık", floor: [42, 44, 46], wall: [92, 96, 100] }, // soğuk toprak (mezar taşı dekoru KALDIRILDI — kafa karıştırıyordu)
  { key: "buz", name: "Buz Mağarası", floor: [40, 54, 62], wall: [120, 150, 172] }, // buzul mavi + soluk buz
  { key: "kanalizasyon", name: "Kanalizasyon", floor: [36, 44, 40], wall: [66, 82, 70] }, // küf yeşili nemli taş
  { key: "cehennem", name: "Cehennem", floor: [46, 28, 26], wall: [116, 56, 42] }, // kor kırmızısı volkanik kaya
];

// Kaç bölümde bir tema değişsin
const SECTION = 2;

// Bölüm + seed'e göre tema indeksi (deterministik → online'da herkes aynı)
export function themeIndexFor(level: number, seed: number): number {
  const section = Math.floor((level - 1) / SECTION);
  const n = THEMES.length;
  return (((section + seed) % n) + n) % n;
}

export function themeFor(level: number, seed: number): Theme {
  return THEMES[themeIndexFor(level, seed)];
}

// Yeni oyun için rastgele başlangıç seed'i
export function randomThemeSeed(): number {
  return Math.floor(Math.random() * THEMES.length);
}
