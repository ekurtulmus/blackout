// Gelin (düşman) yapay zekâsı — tek kişilik ve online paylaşır.
// ÇOKLU OYUNCU: her gelin EN YAKIN oyuncuyu hedefler. Asla vazgeçmez;
// seviyeyle zekileşir (güncel konumu bilir, daha sık yol hesaplar).
import type { Vec, Zombie } from "./types";
import type { Maze } from "./maze";
import { findPath } from "./pathfind";
import { hasLineOfSight } from "./vision";
import { cellOf, dist, tryMove } from "./physics";

export const BRIDE_RADIUS = 0.34;

export type BrideConfig = {
  intelligence: number;
  visionRadius: number;
  zombieSpeed: number;
};

const DIRS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
function randomDir(): Vec {
  return DIRS[Math.floor(Math.random() * DIRS.length)];
}

// Tüm gelinleri güncelle (en yakın oyuncuyu hedefleyerek)
export function moveBrides(
  brides: Zombie[],
  maze: Maze,
  config: BrideConfig,
  players: Vec[],
  dt: number
) {
  if (players.length === 0) return;
  const smart = config.intelligence;
  for (const z of brides) {
    // en yakın oyuncu
    let nearest = players[0];
    let nd = dist(z.pos, players[0]);
    for (let i = 1; i < players.length; i++) {
      const d = dist(z.pos, players[i]);
      if (d < nd) {
        nd = d;
        nearest = players[i];
      }
    }
    const pcell = cellOf(nearest);
    const zcell = cellOf(z.pos);
    const detect = config.visionRadius + 0.5 + smart * 2.5;
    const canSee = nd <= detect && hasLineOfSight(maze, zcell, pcell);

    if (canSee) {
      z.aware = true;
      z.lastSeen = { x: pcell.x, y: pcell.y };
      z.seenTimer = 0;
    } else {
      z.seenTimer += dt;
    }

    if (z.aware) {
      const target = canSee || smart > 0.45 ? pcell : z.lastSeen ?? pcell;
      chase(z, maze, zcell, dt, target, canSee, smart, pcell, config.zombieSpeed);
    } else {
      wander(z, maze, dt, config.zombieSpeed);
    }
  }
  separate(brides, maze);
}

function chase(
  z: Zombie,
  maze: Maze,
  zcell: Vec,
  dt: number,
  target: Vec,
  canSee: boolean,
  smart: number,
  pcell: Vec,
  speed: number
) {
  z.repathTimer -= dt;
  if (!z.path || z.path.length === 0 || z.repathTimer <= 0) {
    z.path = findPath(maze, zcell, target);
    z.repathTimer = 0.6 - smart * 0.45; // zeki = daha sık
  }
  if (z.path && z.path.length > 0) {
    const next = z.path[0];
    const tp = { x: next.x + 0.5, y: next.y + 0.5 };
    step(z, maze, tp, speed * dt);
    if (dist(z.pos, tp) < 0.12) z.path.shift();
  } else if (!canSee) {
    // hedefe vardı ama göremiyor — asla vazgeçme, güncel konuma yönel
    z.lastSeen = { x: pcell.x, y: pcell.y };
    z.path = null;
    z.repathTimer = 0;
  }
}

function wander(z: Zombie, maze: Maze, dt: number, speed: number) {
  z.wanderTimer -= dt;
  if (z.wanderTimer <= 0) {
    z.wanderDir = randomDir();
    z.wanderTimer = 0.8 + Math.random() * 1.2;
  }
  const s = speed * 0.4;
  const before = { x: z.pos.x, y: z.pos.y };
  tryMove(maze, z.pos, BRIDE_RADIUS, z.wanderDir.x * s * dt, z.wanderDir.y * s * dt);
  if (dist(before, z.pos) < 0.0005) z.wanderTimer = 0;
}

function step(z: Zombie, maze: Maze, tp: Vec, dst: number) {
  const dx = tp.x - z.pos.x;
  const dy = tp.y - z.pos.y;
  const len = Math.hypot(dx, dy) || 1;
  tryMove(maze, z.pos, BRIDE_RADIUS, (dx / len) * dst, (dy / len) * dst);
}

function separate(brides: Zombie[], maze: Maze) {
  const minDist = BRIDE_RADIUS * 2;
  for (let i = 0; i < brides.length; i++) {
    for (let j = i + 1; j < brides.length; j++) {
      const a = brides[i];
      const b = brides[j];
      const dx = b.pos.x - a.pos.x;
      const dy = b.pos.y - a.pos.y;
      const d = Math.hypot(dx, dy);
      if (d > 0 && d < minDist) {
        const push = (minDist - d) / 2;
        const ux = dx / d;
        const uy = dy / d;
        tryMove(maze, a.pos, BRIDE_RADIUS, -ux * push, -uy * push);
        tryMove(maze, b.pos, BRIDE_RADIUS, ux * push, uy * push);
      }
    }
  }
}

// Bir gelin, verilen noktaya (oyuncuya) değiyor mu? İlk değeni döndürür.
export function brideTouching(
  brides: Zombie[],
  pos: Vec,
  playerRadius: number
): Zombie | null {
  for (const z of brides) {
    if (dist(z.pos, pos) < playerRadius + BRIDE_RADIUS) return z;
  }
  return null;
}

export { randomDir };
