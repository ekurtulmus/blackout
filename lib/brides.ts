// Gelin (düşman) yapay zekâsı — tek kişilik ve online paylaşır.
// ÇOKLU OYUNCU: her gelin EN YAKIN oyuncuyu hedefler. Asla vazgeçmez;
// seviyeyle zekileşir (güncel konumu bilir, daha sık yol hesaplar).
import type { BrideKind, Vec, Zombie } from "./types";
import type { Maze } from "./maze";
import { findPath } from "./pathfind";
import { hasLineOfSight } from "./vision";
import { cellOf, dist, tryMove } from "./physics";
import { TUNING } from "./config";

export const BRIDE_RADIUS = 0.34;

export type BrideConfig = {
  intelligence: number;
  visionRadius: number;
  zombieSpeed: number;
};

// Bölümdeki gelin index'ine göre arketip: az sayıda dark/mucus, gerisi normal.
export function assignBrideKind(index: number, total: number): BrideKind {
  const darkN = Math.min(TUNING.darkBrideMax, total >= 5 ? 2 : 1);
  const mucusN = Math.min(TUNING.mucusBrideMax, total >= 5 ? 2 : 1);
  if (index < darkN) return "dark";
  if (index < darkN + mucusN) return "mucus";
  return "normal";
}

const DIRS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];
function randomDir(): Vec {
  return DIRS[Math.floor(Math.random() * DIRS.length)];
}

// Hız çarpanı uygula (mini-görev delirme); gelin hız tavanı asla aşılmaz.
function applyMul(spd: number, mul?: number): number {
  if (!mul || mul === 1) return spd;
  return Math.min(TUNING.brideSpeedCap, spd * mul);
}

// Tüm gelinleri güncelle (en yakın oyuncuyu hedefleyerek).
// maxHunters: bir oyuncunun peşinde AYNI ANDA kaç gelin olabileceği (Madde 0).
// Online'da host bunu 4 verir; tek kişilikte Infinity (etkisiz).
export function moveBrides(
  brides: Zombie[],
  maze: Maze,
  config: BrideConfig,
  players: Vec[],
  dt: number,
  maxHunters = Infinity,
  veiled?: boolean[] // Madde 8: bu oyuncular görünmez (duvak) → hiç hedeflenmez
) {
  if (players.length === 0) return;
  const smart = config.intelligence;
  const hunterCount = new Array(players.length).fill(0); // oyuncu başına aktif avcı
  const targetable = (i: number) => !veiled || !veiled[i];
  for (const z of brides) {
    // Mini-görev "çan": oyuncuyu bırakıp çanın çaldığı yere gider (dikkat dağıldı).
    if (z.distractTimer && z.distractTimer > 0 && z.distractTarget) {
      z.distractTimer -= dt;
      z.aware = false;
      const zc0 = cellOf(z.pos);
      chase(z, maze, zc0, dt, z.distractTarget, false, smart, z.distractTarget, config.zombieSpeed);
      continue;
    }
    // en yakın HEDEFLENEBİLİR (görünmez olmayan) oyuncu
    let nIdx = -1;
    let nd = Infinity;
    for (let i = 0; i < players.length; i++) {
      if (!targetable(i)) continue;
      const d = dist(z.pos, players[i]);
      if (d < nd) {
        nd = d;
        nIdx = i;
      }
    }
    const zcell = cellOf(z.pos);
    // Hedeflenebilir kimse yoksa (herkes görünmez) → aylak dolaş
    if (nIdx === -1) {
      z.aware = false;
      const spd0 =
        z.kind === "dark"
          ? Math.min(TUNING.brideSpeedCap, config.zombieSpeed * TUNING.darkBrideDarkMul)
          : config.zombieSpeed;
      wander(z, maze, dt, applyMul(spd0, z.speedMul));
      continue;
    }
    const nearestCell = cellOf(players[nIdx]);
    const detect = config.visionRadius + 0.5 + smart * 2.5;
    const canSee = nd <= detect && hasLineOfSight(maze, zcell, nearestCell);

    if (canSee) {
      z.aware = true;
      z.lastSeen = { x: nearestCell.x, y: nearestCell.y };
      z.seenTimer = 0;
    } else {
      z.seenTimer += dt;
    }

    // Madde 6 (revize): karanlık gelini — SENİ GÖRMÜYORKEN karanlıkta hızlıdır
    // (kırmızı gözlerle yaklaşır); SENİ GÖRÜNCE normal hızda üstüne koşar (artık
    // ışıkta komik derecede yavaşlamaz). Yine %92 tavanla sınırlı.
    let spd = config.zombieSpeed;
    if (z.kind === "dark") {
      spd = canSee
        ? config.zombieSpeed // bizi görünce normal hızda gelir
        : Math.min(TUNING.brideSpeedCap, config.zombieSpeed * TUNING.darkBrideDarkMul); // karanlıkta hızlı
    }
    // Mini-görev "yüzük": delirmiş gelin hızlanır (tavan yine geçerli)
    spd = applyMul(spd, z.speedMul);

    if (z.aware) {
      // Hedef oyuncu: en yakın; doluysa (avcı sayısı >= cap) cap altı en yakın;
      // hiçbiri uygun değilse aylak dolaş (baskı tek oyuncuda yığılmaz).
      let ti = nIdx;
      if (hunterCount[ti] >= maxHunters) {
        ti = -1;
        let bd = Infinity;
        for (let i = 0; i < players.length; i++) {
          if (!targetable(i) || hunterCount[i] >= maxHunters) continue;
          const d = dist(z.pos, players[i]);
          if (d < bd) {
            bd = d;
            ti = i;
          }
        }
      }
      if (ti === -1) {
        wander(z, maze, dt, spd);
        continue;
      }
      hunterCount[ti]++;
      const pcell = cellOf(players[ti]);
      const seeTarget = ti === nIdx && canSee;
      const target = seeTarget || smart > 0.45 ? pcell : z.lastSeen ?? pcell;
      chase(z, maze, zcell, dt, target, seeTarget, smart, pcell, spd);
    } else {
      wander(z, maze, dt, spd);
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
