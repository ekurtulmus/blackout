// 10 bölümlük kademeli zorluk eğrisi.
// Labirent büyür, zombi sayısı/hızı hafifçe artar — hepsi aynı anda değil, adım adım.
import type { LevelConfig } from "./types";

export const TOTAL_LEVELS = 10;

export function levelConfig(level: number): LevelConfig {
  // 1..10 aralığında güvenli tut
  const L = Math.max(1, Math.min(TOTAL_LEVELS, level));
  const t = (L - 1) / (TOTAL_LEVELS - 1); // 0..1

  // Labirent adım adım büyür (tek sayı olacak)
  const base = 11;
  const size = base + Math.round(t * 16); // 11 -> 27
  const cols = size % 2 === 0 ? size + 1 : size;
  const rows = cols;

  // Zombi sayısı 2 -> 10
  const zombies = Math.round(2 + t * 8);

  // Hız yavaş yavaş artar (oyuncu hızı 3.4)
  const zombieSpeed = 1.5 + t * 0.9; // 1.5 -> 2.4

  // Görüş bölüm ilerledikçe hafifçe daralır (gerilim artar)
  const visionRadius = Math.round(6.5 - t * 1.5); // 6 -> 5

  // Braid: ilk bölümlerde daha çok döngü (kolay kaçış), sonra azalır
  const braid = 0.35 - t * 0.2; // 0.35 -> 0.15

  return {
    level: L,
    cols,
    rows,
    zombies,
    zombieSpeed,
    ammoBuffer: 3, // zombi sayısı + 3 tampon mermi
    visionRadius,
    braid,
  };
}
