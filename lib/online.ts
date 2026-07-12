// Online yarış seviyesi: aynı labirent + çıkışa yeterince uzak, birbirinden
// AYRIK N doğuş (2-6 oyuncu). Host üretir, serileştirip herkese yollar.
import type { Vec } from "./types";
import { levelConfig } from "./levels";
import { bfsDistances, floorCells, generateMaze, type Maze } from "./maze";
import type { BrideConfig } from "./brides";
import type { NetRole } from "./net";

export const MAX_PLAYERS = 6;

export type RaceDiff = "kolay" | "orta" | "zor";

// Lobiden oyuna geçerken taşınan bilgi (koltuk/sıra/isimler/zorluk/ilk seviye)
export type StartInfo = {
  role: NetRole;
  seat: number;
  order: string[]; // id sırası (seat = index)
  names: string[]; // seat sırasına göre oyuncu isimleri
  diff: RaceDiff;
  initialLevel: RaceLevel;
};

// Zorluk modifikatörleri (gelin sayısı / hız / zekâ)
export function diffParams(diff: RaceDiff): {
  countMul: number;
  speedMul: number;
  intelAdd: number;
} {
  switch (diff) {
    case "kolay":
      return { countMul: 0.6, speedMul: 0.82, intelAdd: -0.15 };
    case "zor":
      return { countMul: 1.4, speedMul: 1.12, intelAdd: 0.2 };
    default:
      return { countMul: 1.0, speedMul: 1.0, intelAdd: 0 };
  }
}

// Host'un gelin simülasyonu için zorluğa göre ayarlı config
export function raceBrideConfig(level: number, diff: RaceDiff): BrideConfig {
  const cfg = levelConfig(level);
  const p = diffParams(diff);
  return {
    intelligence: Math.max(0, Math.min(1, cfg.intelligence + p.intelAdd)),
    visionRadius: cfg.visionRadius,
    zombieSpeed: Math.min(3.15, cfg.zombieSpeed * p.speedMul),
  };
}

export type RaceLevel = {
  level: number;
  cols: number;
  rows: number;
  walls: boolean[][];
  exit: Vec;
  spawns: Vec[]; // seat sırasına göre N doğuş (0..MAX_PLAYERS-1)
  visionRadius: number;
  ammo: Vec[]; // her oyuncu için (yerel/kişisel), aynı düzen
  brideSpawns: Vec[]; // gelin başlangıçları — SADECE host kullanır (üretir/simüle eder)
};

export function generateRaceLevel(level: number, diff: RaceDiff = "orta"): RaceLevel {
  const cfg = levelConfig(level);
  const maze = generateMaze(cfg.cols, cfg.rows, cfg.braid, cfg.openness);
  const p = diffParams(diff);

  // Çıkış: sol-üstten en uzak ulaşılabilir hücre
  const dTL = bfsDistances(maze, { x: 1, y: 1 });
  const floors = floorCells(maze).filter((c) => dTL[c.y][c.x] >= 0);
  let exit: Vec = { x: 1, y: 1 };
  let best = -1;
  for (const c of floors) {
    if (dTL[c.y][c.x] > best) {
      best = dTL[c.y][c.x];
      exit = c;
    }
  }

  // Çıkışa mesafe (adil doğuş için)
  const dE = bfsDistances(maze, exit);
  const reach = floors.filter((c) => dE[c.y][c.x] >= 0);
  let maxD = 0;
  for (const c of reach) maxD = Math.max(maxD, dE[c.y][c.x]);

  // Çıkışa yeterince uzak aday hücreler (hepsi kabaca adil mesafede)
  const minD = Math.floor(maxD * 0.4);
  let cand = reach.filter((c) => dE[c.y][c.x] >= minD);
  if (cand.length < MAX_PLAYERS) {
    // yeterli aday yoksa bandı gevşet
    cand = reach.filter((c) => dE[c.y][c.x] >= Math.floor(maxD * 0.25));
  }
  if (cand.length < MAX_PLAYERS) cand = reach.slice();

  // Farthest-point sampling: çıkıştan en uzağı başlangıç, sonra hep en ayrık olanı seç
  const spawns = pickSpread(cand, dE, MAX_PLAYERS);

  // Gelin doğuşları: tüm oyuncu doğuşlarından yeterince uzak, çıkışta değil
  const farFromPlayers = (c: Vec) =>
    !(c.x === exit.x && c.y === exit.y) &&
    spawns.every((s) => Math.hypot(c.x - s.x, c.y - s.y) >= 4);
  let brideCand = reach.filter(farFromPlayers);
  if (brideCand.length === 0) brideCand = reach.filter((c) => !(c.x === exit.x && c.y === exit.y));
  const brideCount = Math.max(2, Math.round(cfg.zombies * p.countMul));
  const brideSpawns = shuffle(brideCand).slice(0, brideCount);

  // Mermiler: doğuş/çıkış dışı hücreler (gelin sayısı + bol tampon; ayrıca respawn var)
  const onSpawn = (c: Vec) =>
    (c.x === exit.x && c.y === exit.y) ||
    spawns.some((s) => s.x === c.x && s.y === c.y);
  const ammoCells = shuffle(reach.filter((c) => !onSpawn(c)));
  const ammo = ammoCells.slice(0, brideCount + cfg.ammoBuffer + MAX_PLAYERS);

  return {
    level,
    cols: maze.cols,
    rows: maze.rows,
    walls: maze.walls,
    exit,
    spawns,
    visionRadius: cfg.visionRadius,
    ammo,
    brideSpawns,
  };
}

// Adaylardan N tanesini birbirinden en ayrık olacak şekilde seç.
// İlk seçim: çıkıştan en uzak hücre. Sonra her adımda seçilenlere en uzak olanı ekle.
function pickSpread(cand: Vec[], dE: number[][], n: number): Vec[] {
  if (cand.length === 0) return [];
  const chosen: Vec[] = [];
  // başlangıç: çıkıştan en uzak
  let first = cand[0];
  let bd = -1;
  for (const c of cand) {
    if (dE[c.y][c.x] > bd) {
      bd = dE[c.y][c.x];
      first = c;
    }
  }
  chosen.push(first);
  while (chosen.length < n && chosen.length < cand.length) {
    let bestC: Vec | null = null;
    let bestMin = -1;
    for (const c of cand) {
      if (chosen.some((s) => s.x === c.x && s.y === c.y)) continue;
      let mn = Infinity;
      for (const s of chosen) {
        const d = (c.x - s.x) ** 2 + (c.y - s.y) ** 2;
        if (d < mn) mn = d;
      }
      if (mn > bestMin) {
        bestMin = mn;
        bestC = c;
      }
    }
    if (!bestC) break;
    chosen.push(bestC);
  }
  // n'den az aday varsa döngüsel doldur (küçük haritalarda güvenlik)
  let i = 0;
  while (chosen.length < n && cand.length > 0) {
    chosen.push(chosen[i % chosen.length]);
    i++;
  }
  return chosen;
}

function shuffle<T>(arr: T[]): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// RaceLevel'dan fizik/görüş için Maze nesnesi
export function levelMaze(l: RaceLevel): Maze {
  return { cols: l.cols, rows: l.rows, walls: l.walls };
}

// --- Ağ üzerinden serileştirme (duvarları kompakt '0/1' satırları olarak) ---
export type SerializedLevel = {
  lvl: number;
  cols: number;
  rows: number;
  walls: string[];
  exit: [number, number];
  spawns: [number, number][]; // N doğuş
  vr: number;
  ammo: [number, number][];
};

export function serializeLevel(l: RaceLevel): SerializedLevel {
  return {
    lvl: l.level,
    cols: l.cols,
    rows: l.rows,
    walls: l.walls.map((row) => row.map((w) => (w ? "1" : "0")).join("")),
    exit: [l.exit.x, l.exit.y],
    spawns: l.spawns.map((s) => [s.x, s.y]),
    vr: l.visionRadius,
    ammo: l.ammo.map((a) => [a.x, a.y]),
  };
}

export function deserializeLevel(m: SerializedLevel): RaceLevel {
  return {
    level: m.lvl,
    cols: m.cols,
    rows: m.rows,
    walls: m.walls.map((s) => Array.from(s).map((c) => c === "1")),
    exit: { x: m.exit[0], y: m.exit[1] },
    spawns: m.spawns.map(([x, y]) => ({ x, y })),
    visionRadius: m.vr,
    ammo: m.ammo.map(([x, y]) => ({ x, y })),
    brideSpawns: [], // misafir gelin üretmez (host'tan akışla gelir)
  };
}
