// Ortak fizik yardımcıları (tek kişilik ve online paylaşır).
import type { Vec } from "./types";
import { isWall, type Maze } from "./maze";

// Çarpışma: daire (merkez p, yarıçap rad) herhangi bir duvar hücresiyle çakışıyor mu?
export function collides(maze: Maze, p: Vec, rad: number): boolean {
  const minX = Math.floor(p.x - rad);
  const maxX = Math.floor(p.x + rad);
  const minY = Math.floor(p.y - rad);
  const maxY = Math.floor(p.y + rad);
  for (let cy = minY; cy <= maxY; cy++) {
    for (let cx = minX; cx <= maxX; cx++) {
      if (!isWall(maze, cx, cy)) continue;
      const closestX = Math.max(cx, Math.min(p.x, cx + 1));
      const closestY = Math.max(cy, Math.min(p.y, cy + 1));
      const ddx = p.x - closestX;
      const ddy = p.y - closestY;
      if (ddx * ddx + ddy * ddy < rad * rad) return true;
    }
  }
  return false;
}

// Eksen ayrı hareket (duvar boyunca kayma hissi)
export function tryMove(
  maze: Maze,
  pos: Vec,
  rad: number,
  dx: number,
  dy: number
) {
  if (dx !== 0) {
    const nx = pos.x + dx;
    if (!collides(maze, { x: nx, y: pos.y }, rad)) pos.x = nx;
  }
  if (dy !== 0) {
    const ny = pos.y + dy;
    if (!collides(maze, { x: pos.x, y: ny }, rad)) pos.y = ny;
  }
}

export function cellOf(p: Vec): Vec {
  return { x: Math.floor(p.x), y: Math.floor(p.y) };
}

export function dist(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}
