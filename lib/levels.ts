// 10 bölümlük kademeli zorluk eğrisi.
// Labirent büyür, zombi sayısı/hızı hafifçe artar — hepsi aynı anda değil, adım adım.
import type { LevelConfig } from "./types";
import { TUNING } from "./config";

export const TOTAL_LEVELS = 10;

export function levelConfig(level: number): LevelConfig {
  // 1..10 aralığında güvenli tut
  const L = Math.max(1, Math.min(TOTAL_LEVELS, level));
  const t = (L - 1) / (TOTAL_LEVELS - 1); // 0..1

  // Labirent adım adım büyür (tek sayı olacak) — daha büyük = daha dolambaçlı
  const base = 13;
  const size = base + Math.round(t * 18); // 13 -> 31
  const cols = size % 2 === 0 ? size + 1 : size;
  const rows = cols;

  // Zombi sayısı 2× (4 -> 20)
  const zombies = Math.round(2 + t * 8) * 2;

  // Hız: YUMUŞAK ease-in artış (sıçramalı değil). Tavan = oyuncunun %8 altı,
  // asla geçilmez → kaçış her zaman mümkün ama gitgide zor.
  const sT = Math.pow(t, TUNING.brideSpeedEase); // ease-in (erken bölümler daha yumuşak)
  const rawSpeed = 2.2 + sT * 1.4; // 2.2 -> 3.6 (ease-in)
  const zombieSpeed = Math.min(TUNING.brideSpeedCap, rawSpeed);

  // Görüş bölüm ilerledikçe hafifçe daralır (gerilim artar)
  const visionRadius = Math.round(6.5 - t * 1.5); // 6 -> 5

  // Braid: döngü/kısa yol açma oranı. DÜŞÜK = daha çok çıkmaz = daha çetrefilli.
  const braid = 0.08 - t * 0.06; // 0.08 -> 0.02

  // Açıklık: labirente serpiştirilen açık oda/boşluklar (koridorlar arası nefes)
  const openness = 0.18 + t * 0.14; // 0.18 -> 0.32

  // Zekâ: seviye atladıkça zombiler daha iyi iz sürer / güncel konumu bilir
  const intelligence = t; // 0 (bölüm 1) -> 1 (bölüm 10)

  return {
    level: L,
    cols,
    rows,
    zombies,
    zombieSpeed,
    ammoBuffer: 3, // zombi sayısı + 3 tampon mermi
    visionRadius,
    braid,
    openness,
    intelligence,
  };
}
