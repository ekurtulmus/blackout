// Online yarış seviyesi: aynı labirent + çıkışa yeterince uzak, birbirinden
// AYRIK N doğuş (2-6 oyuncu). Host üretir, serileştirip herkese yollar.
import type { Vec } from "./types";
import { levelConfig } from "./levels";
import { bfsDistances, floorCells, generateArena, generateMaze, type Maze } from "./maze";
import type { BrideConfig } from "./brides";
import type { NetRole } from "./net";
import { themeIndexFor } from "./themes";
import { TUNING } from "./config";

export const MAX_PLAYERS = 6;
export const ROOM_COST = 200; // oda kurma maliyeti (altın)

// Ölüm Koşusu SONSUZ olduğundan zorluğu UZUN ZAMANA yay: efektif seviye yavaş artar
// (10. tura kadar değil, ~17. tura kadar tırmanır) → oyuncu bıktırmaz.
function raceEffLevel(level: number): number {
  return Math.min(10, 1 + (Math.max(1, level) - 1) * 0.55);
}

export type RaceDiff = "kolay" | "orta" | "zor";

// Lobiden oyuna geçerken taşınan bilgi (koltuk/sıra/isimler/zorluk/ilk seviye)
export type StartInfo = {
  role: NetRole;
  seat: number;
  order: string[]; // id sırası (seat = index)
  names: string[]; // seat sırasına göre oyuncu isimleri
  diff: RaceDiff;
  themeSeed: number; // rastgele tema başlangıcı (herkes aynı)
  initialLevel: RaceLevel;
  pvp: boolean; // PvP: oyuncular birbirini vurabilir (mermi %10 hasar)
  arena: boolean; // Arena: açık alan dalga hayatta kalma (çıkış yok)
};

// Zorluk modifikatörleri — değerler TUNING.diff'ten gelir (tek kişilikle ORTAK tek
// kaynak; eskiden burada AYRI sabitler vardı ve tek kişiliktekinden kayabiliyordu).
// dmgMul = gelin gücü (temas hasarı) — eskiden online'da hiç yoktu.
export function diffParams(diff: RaceDiff): {
  countMul: number;
  speedMul: number;
  intelAdd: number;
  dmgMul: number;
} {
  const d = TUNING.diff[diff] ?? TUNING.diff.orta;
  return { countMul: d.count, speedMul: d.speed, intelAdd: d.intel, dmgMul: d.dmg };
}

// Host'un gelin simülasyonu için zorluğa göre ayarlı config
export function raceBrideConfig(level: number, diff: RaceDiff): BrideConfig {
  const cfg = levelConfig(raceEffLevel(level));
  const p = diffParams(diff);
  return {
    intelligence: Math.max(0, Math.min(1, cfg.intelligence + p.intelAdd)),
    visionRadius: cfg.visionRadius,
    // Zor'da bile tavan = oyuncunun %8 altı (Madde 3)
    zombieSpeed: Math.min(TUNING.brideSpeedCap, cfg.zombieSpeed * p.speedMul),
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
  health: Vec[]; // yerdeki can paketleri (yerel/kişisel)
  veils: Vec[]; // Madde 8: gelin duvağı (görünmezlik) eşyaları
  theme: number; // görsel tema indeksi (host seed'inden, herkes aynı)
  brideSpawns: Vec[]; // gelin başlangıçları — SADECE host kullanır (üretir/simüle eder)
};

export function generateRaceLevel(
  level: number,
  diff: RaceDiff = "orta",
  themeSeed = 0,
  playerCount = 2
): RaceLevel {
  const cfg = levelConfig(raceEffLevel(level));
  const p = diffParams(diff);
  // Madde 1: kişi sayısına oranlı harita boyutu (tek sayı tut)
  const pc = Math.max(1, playerCount);
  const extra = Math.floor((pc - 1) * TUNING.mapSizePerPlayer);
  let cols = cfg.cols + extra;
  let rows = cfg.rows + extra;
  if (cols % 2 === 0) cols++;
  if (rows % 2 === 0) rows++;
  const maze = generateMaze(cols, rows, cfg.braid, cfg.openness);
  // Yoğunluk çarpanı (gelin/mermi/can kişi sayısıyla ölçeklenir)
  const density = TUNING.densityBase + TUNING.densityPer * pc;

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
  // Gelin sayısı: zorluk × kişi-yoğunluğu (Madde 1). Kişi başı max 4 kuralı
  // (Madde 0) simülasyonda üstte tutulur; buradaki artış haritaya yayılır.
  const brideCount = Math.max(2, Math.ceil(cfg.zombies * p.countMul * density));
  const brideSpawns = shuffle(brideCand).slice(0, brideCount);

  // Mermiler: doğuş/çıkış dışı hücreler (gelin sayısı + bol tampon; ayrıca respawn var)
  const onSpawn = (c: Vec) =>
    (c.x === exit.x && c.y === exit.y) ||
    spawns.some((s) => s.x === c.x && s.y === c.y);
  const ammoCells = shuffle(reach.filter((c) => !onSpawn(c)));
  const ammo = ammoCells.slice(0, brideCount + cfg.ammoBuffer + MAX_PLAYERS);

  // Can paketleri: doğuş/çıkış ve mermi dışı hücreler (nadir)
  const ammoSet = new Set(ammo.map((a) => a.y * maze.cols + a.x));
  const healthCells = shuffle(reach.filter((c) => !onSpawn(c) && !ammoSet.has(c.y * maze.cols + c.x)));
  const healthCount = Math.min(TUNING.healthMax, Math.max(2, Math.round(TUNING.healthBase * density)));
  const health = healthCells.slice(0, healthCount);

  // Madde 8: gelin duvağı (seyrek) — diğer eşyalardan uzak
  const healthSet = new Set(health.map((h) => h.y * maze.cols + h.x));
  const veilCells = shuffle(
    reach.filter((c) => !onSpawn(c) && !ammoSet.has(c.y * maze.cols + c.x) && !healthSet.has(c.y * maze.cols + c.x))
  );
  const veils = veilCells.slice(0, Math.max(1, Math.floor(pc / 3)));

  return {
    level,
    cols: maze.cols,
    rows: maze.rows,
    walls: maze.walls,
    exit,
    spawns,
    visionRadius: cfg.visionRadius,
    ammo,
    health,
    veils,
    theme: themeIndexFor(level, themeSeed),
    brideSpawns,
  };
}

// ARENA (çok oyunculu): açık alan, ÇIKIŞ YOK — dalga hayatta kalma (host dalga ekler).
// exit alanı doldurulur ama OnlineGame arena modunda çıkış açmaz/kullanmaz.
// ZORLUK: `diff` eskiden bu fonksiyona HİÇ verilmiyordu → online arena zorluğu
// tamamen yok sayıyor, gelin sayısı yalnız oyuncu sayısına bağlı kalıyordu
// (Kolay'da da Zor'da da aynı). Artık başlangıç dalgası zorlukla ölçekleniyor.
export function generateArenaLevel(
  themeSeed = 0,
  playerCount = 2,
  diff: RaceDiff = "orta"
): RaceLevel {
  const pc = Math.max(1, playerCount);
  const size = 21 + Math.floor((pc - 1) * 2); // kişi sayısıyla biraz büyür
  const maze = generateArena(size, size, 0.05);
  const cols = maze.cols, rows = maze.rows;
  const floors = floorCells(maze);
  const center: Vec = { x: (cols / 2) | 0, y: (rows / 2) | 0 };
  const dCenter = bfsDistances(maze, center);
  const reach = floors.filter((c) => dCenter[c.y][c.x] >= 0);
  // Doğuşlar: birbirinden en ayrık (açık alanda köşelere yayılır)
  const spawns = pickSpread(reach, dCenter, MAX_PLAYERS);
  // Gelinler oyunculardan uzakta başlasın
  const farFromPlayers = (c: Vec) => spawns.every((s) => Math.hypot(c.x - s.x, c.y - s.y) >= 4);
  let brideCand = reach.filter(farFromPlayers);
  if (brideCand.length === 0) brideCand = reach.slice();
  // Başlangıç dalgası: kişi sayısı × ZORLUK (Kolay ~yarısı, Zor ~2 katı)
  const brideCount = Math.max(2, Math.round((3 + pc * 1.5) * diffParams(diff).countMul));
  const brideSpawns = shuffle(brideCand).slice(0, brideCount);
  // Bol mermi + can (arena açık ve yoğun)
  const onSpawn = (c: Vec) => spawns.some((s) => s.x === c.x && s.y === c.y);
  const cells = shuffle(reach.filter((c) => !onSpawn(c)));
  const ammoN = Math.floor(floors.length * 0.08) + MAX_PLAYERS;
  // Arena'da can SEYREK olsun (çok sık bulunmasın)
  const healthN = Math.max(1, Math.floor(floors.length * 0.012));
  const veilN = Math.max(1, Math.floor(pc / 3));
  const ammo = cells.slice(0, ammoN);
  const health = cells.slice(ammoN, ammoN + healthN);
  const veils = cells.slice(ammoN + healthN, ammoN + healthN + veilN);
  return {
    level: 1,
    cols, rows,
    walls: maze.walls,
    exit: center, // arena'da kullanılmaz
    spawns,
    visionRadius: 9, // açık alan → geniş görüş
    ammo, health, veils,
    theme: themeIndexFor(1, themeSeed),
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
  health: [number, number][];
  veils: [number, number][];
  theme: number;
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
    health: l.health.map((h) => [h.x, h.y]),
    veils: l.veils.map((v) => [v.x, v.y]),
    theme: l.theme,
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
    health: (m.health ?? []).map(([x, y]) => ({ x, y })),
    veils: (m.veils ?? []).map(([x, y]) => ({ x, y })),
    theme: m.theme ?? 0,
    brideSpawns: [], // misafir gelin üretmez (host'tan akışla gelir)
  };
}
