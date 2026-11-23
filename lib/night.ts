// İKİNCİ GECE (New Game+) — kampanyayı bitirince açılan, daha sert ve daha ödüllü tur.
//
// Gece 1 = normal kampanya. Gece N'yi bitirmek Gece N+1'i açar. Etkiler NIGHT_CAP'te
// tavan yapar (5. geceden sonrası aynı sertlikte sürer, yalnız sayaç artar).
// Yalnız KAMPANYA (Yalnız Kaçış) etkilenir; görevler/arena/bitmeyen gece etkilenmez.
// Gece 2+ rehberli 1. bölümü ATLAR: 1. bölüm de normal labirenttir.

import type { LevelConfig } from "./types";
import { TUNING } from "./config";

export const NIGHT_CAP = 5;
const UNLOCK_KEY = "blackout_night_unlocked";

export type NightMods = {
  count: number; // gelin sayısı çarpanı
  speed: number; // gelin hızı çarpanı (brideSpeedCap yine geçerli)
  intel: number; // zekâya eklenen
  vision: number; // fener yarıçapından düşülen (hücre)
  dmg: number; // gelin gücü (temas hasarı) çarpanı
  reward: number; // para/puan çarpanı (risk = ödül)
  queenEvery: number; // kaç bölümde bir kraliçe
};

export function nightMods(night: number): NightMods {
  const k = Math.max(0, Math.min(NIGHT_CAP, night) - 1); // 0 = ilk gece
  return {
    count: 1 + 0.3 * k,
    speed: 1 + 0.04 * k,
    intel: 0.15 * k,
    vision: Math.round(0.5 * k),
    dmg: 1 + 0.15 * k,
    reward: 1 + 0.5 * k,
    queenEvery: k > 0 ? 3 : TUNING.queenEveryLevels,
  };
}

// Zorluk uygulanmış bölüm ayarına gecenin etkisini ekler (ilk gecede aynen döner).
export function applyNight(cfg: LevelConfig, night: number): LevelConfig {
  if (night <= 1) return cfg;
  const m = nightMods(night);
  return {
    ...cfg,
    zombies: Math.max(1, Math.round(cfg.zombies * m.count)),
    zombieSpeed: Math.min(TUNING.brideSpeedCap, cfg.zombieSpeed * m.speed),
    visionRadius: Math.max(3, cfg.visionRadius - m.vision),
    intelligence: Math.min(1, cfg.intelligence + m.intel),
  };
}

// Açılmış en yüksek gece (en az 1).
export function getNightUnlocked(): number {
  try {
    const v = parseInt(localStorage.getItem(UNLOCK_KEY) ?? "1", 10);
    return Number.isFinite(v) && v > 1 ? v : 1;
  } catch {
    return 1;
  }
}

// Gece `n` bitirildi → n+1 açılır. Yeni açılan geceyi döndürür.
export function unlockNextNight(n: number): number {
  const next = Math.max(getNightUnlocked(), n + 1);
  try {
    localStorage.setItem(UNLOCK_KEY, String(next));
  } catch {
    /* geç */
  }
  return next;
}

// Gecenin görünen adı: 2 → "İkinci Gece" (özel ad), diğerleri "{n}. Gece".
export function nightLabel(
  t: (k: "night.second" | "night.name", v?: Record<string, string | number>) => string,
  n: number
): string {
  return n === 2 ? t("night.second") : t("night.name", { n });
}
