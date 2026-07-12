// Online yarış seviyesi: aynı labirent + çıkışa EŞİT BFS mesafeli iki doğuş.
// Host üretir, serileştirip misafire yollar (ikisi de aynı haritayı görür).
import type { Vec } from "./types";
import { levelConfig } from "./levels";
import { bfsDistances, floorCells, generateMaze, type Maze } from "./maze";

export type RaceLevel = {
  level: number;
  cols: number;
  rows: number;
  walls: boolean[][];
  exit: Vec;
  spawns: [Vec, Vec]; // [0]=host, [1]=misafir
  visionRadius: number;
  ammo: Vec[]; // her iki oyuncu için (yerel/kişisel), aynı düzen
  brideSpawns: Vec[]; // gelin başlangıçları — SADECE host kullanır (üretir/simüle eder)
};

export function generateRaceLevel(level: number): RaceLevel {
  const cfg = levelConfig(level);
  const maze = generateMaze(cfg.cols, cfg.rows, cfg.braid, cfg.openness);

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

  // Çıkışa eşit mesafeli iki doğuş (aynı BFS mesafesi = adil)
  const dE = bfsDistances(maze, exit);
  const reach = floors.filter((c) => dE[c.y][c.x] >= 0);
  let maxD = 0;
  for (const c of reach) maxD = Math.max(maxD, dE[c.y][c.x]);

  const minD = Math.floor(maxD * 0.35); // çıkışa yeterince uzak doğuşlar
  // Mesafeye göre grupla, çıkışa yeterince uzak olanları al
  const byDist = new Map<number, Vec[]>();
  for (const c of reach) {
    const d = dE[c.y][c.x];
    if (d < minD) continue;
    const arr = byDist.get(d);
    if (arr) arr.push(c);
    else byDist.set(d, [c]);
  }
  // AYNI mesafedeki (adil) tüm çiftler arasından birbirine EN UZAK olanı seç
  let spawns: [Vec, Vec] | null = null;
  let bestSep = -1;
  for (const g of byDist.values()) {
    if (g.length < 2) continue;
    for (let i = 0; i < g.length; i++) {
      for (let j = i + 1; j < g.length; j++) {
        const sep = (g[i].x - g[j].x) ** 2 + (g[i].y - g[j].y) ** 2;
        if (sep > bestSep) {
          bestSep = sep;
          spawns = [g[i], g[j]];
        }
      }
    }
  }

  if (!spawns) {
    // yedek: çıkıştan uzak iki farklı hücre
    const far = reach
      .filter((c) => dE[c.y][c.x] > maxD * 0.5)
      .sort((a, b) => dE[b.y][b.x] - dE[a.y][a.x]);
    spawns = [far[0] ?? floors[0], far[far.length - 1] ?? floors[1]];
  }

  // Gelin doğuşları: her iki oyuncudan yeterince uzak, çıkışta değil
  const [sa, sb] = spawns;
  const farFromPlayers = (c: Vec) =>
    Math.hypot(c.x - sa.x, c.y - sa.y) >= 5 &&
    Math.hypot(c.x - sb.x, c.y - sb.y) >= 5 &&
    !(c.x === exit.x && c.y === exit.y);
  const brideCells = shuffle(reach.filter(farFromPlayers));
  const brideSpawns = brideCells.slice(0, cfg.zombies);

  // Mermiler: doğuş/çıkış dışı hücreler (zombi sayısı + tampon)
  const onSpawn = (c: Vec) =>
    (c.x === sa.x && c.y === sa.y) ||
    (c.x === sb.x && c.y === sb.y) ||
    (c.x === exit.x && c.y === exit.y);
  const ammoCells = shuffle(reach.filter((c) => !onSpawn(c)));
  const ammo = ammoCells.slice(0, cfg.zombies + cfg.ammoBuffer);

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
  spawns: [[number, number], [number, number]];
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
    spawns: [
      [l.spawns[0].x, l.spawns[0].y],
      [l.spawns[1].x, l.spawns[1].y],
    ],
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
    spawns: [
      { x: m.spawns[0][0], y: m.spawns[0][1] },
      { x: m.spawns[1][0], y: m.spawns[1][1] },
    ],
    visionRadius: m.vr,
    ammo: m.ammo.map(([x, y]) => ({ x, y })),
    brideSpawns: [], // misafir gelin üretmez (host'tan akışla gelir)
  };
}
