// Görüş sistemi — oyunun kalbi.
// El feneri hissi: oyuncunun etrafı net aydınlık, görülen yerler soluk hafıza,
// gidilmeyen yerler tamamen karanlık.
import type { Vec } from "./types";
import { isWall, type Maze } from "./maze";

// Bresenham ile görüş hattı: a'dan b'ye giderken aradaki hücrelerden biri
// duvarsa görüş engellenir. Hedef hücrenin kendisi duvar olabilir (duvarlar da aydınlanır).
export function hasLineOfSight(maze: Maze, a: Vec, b: Vec): boolean {
  let x0 = a.x;
  let y0 = a.y;
  const x1 = b.x;
  const y1 = b.y;

  const dx = Math.abs(x1 - x0);
  const dy = Math.abs(y1 - y0);
  const sx = x0 < x1 ? 1 : -1;
  const sy = y0 < y1 ? 1 : -1;
  let err = dx - dy;

  while (true) {
    if (x0 === x1 && y0 === y1) return true; // hedefe ulaştık
    // bir sonraki adıma geç
    const e2 = 2 * err;
    if (e2 > -dy) {
      err -= dy;
      x0 += sx;
    }
    if (e2 < dx) {
      err += dx;
      y0 += sy;
    }
    // hedefe vardıysak duvar olsa bile görünür
    if (x0 === x1 && y0 === y1) return true;
    // aradaki hücre duvarsa görüş kesilir
    if (isWall(maze, x0, y0)) return false;
  }
}

export type VisibleCell = { x: number; y: number; intensity: number };

// Oyuncunun bulunduğu hücreden yarıçap içindeki görünür hücreleri döndürür.
export function computeVisible(
  maze: Maze,
  origin: Vec,
  radius: number
): VisibleCell[] {
  const out: VisibleCell[] = [];
  const r = radius;
  const minX = Math.max(0, Math.floor(origin.x - r));
  const maxX = Math.min(maze.cols - 1, Math.ceil(origin.x + r));
  const minY = Math.max(0, Math.floor(origin.y - r));
  const maxY = Math.min(maze.rows - 1, Math.ceil(origin.y + r));

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const dx = x - origin.x;
      const dy = y - origin.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > r) continue;
      if (!hasLineOfSight(maze, origin, { x, y })) continue;
      // merkeze yakın = parlak, kenarda = soluk (el feneri düşüşü)
      const intensity = Math.max(0, 1 - dist / r);
      out.push({ x, y, intensity });
    }
  }
  return out;
}
