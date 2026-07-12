// Görsel temalar — zemin/duvar renk paletleri. Otomatik + rastgele:
// her oyunun kendi "seed"i olur (baştan başlayınca aynı temadan başlamamak için),
// ilerledikçe birkaç bölümde bir tema değişir.

export type Theme = {
  key: string;
  name: string;
  floor: [number, number, number];
  wall: [number, number, number];
};

export const THEMES: Theme[] = [
  { key: "zindan", name: "Zindan", floor: [58, 48, 42], wall: [104, 84, 70] }, // sıcak kahve taş
  { key: "hastane", name: "Hastane", floor: [44, 54, 56], wall: [118, 130, 122] }, // soğuk klinik yeşil-gri
  { key: "kilise", name: "Kilise", floor: [50, 50, 64], wall: [112, 108, 126] }, // soğuk mor-gri taş
  { key: "orman", name: "Orman", floor: [40, 52, 38], wall: [76, 98, 64] }, // yosunlu koyu yeşil
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
