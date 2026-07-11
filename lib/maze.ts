// Labirent üretimi — recursive backtracker + hafif "braid" (çıkmazları azaltma)
import type { Vec } from "./types";

export type Maze = {
  cols: number;
  rows: number;
  walls: boolean[][]; // walls[y][x] === true => duvar
};

function inBounds(x: number, y: number, cols: number, rows: number) {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

// Perfect maze üretir (recursive backtracker). cols/rows tek sayı olmalı.
export function generateMaze(cols: number, rows: number, braid = 0): Maze {
  // tek sayıya yuvarla
  if (cols % 2 === 0) cols += 1;
  if (rows % 2 === 0) rows += 1;

  const walls: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => true)
  );

  const stack: Vec[] = [];
  const start = { x: 1, y: 1 };
  walls[start.y][start.x] = false;
  stack.push(start);

  const dirs = [
    { x: 0, y: -2 },
    { x: 2, y: 0 },
    { x: 0, y: 2 },
    { x: -2, y: 0 },
  ];

  while (stack.length > 0) {
    const cur = stack[stack.length - 1];
    // ziyaret edilmemiş komşuları topla
    const neighbors: { nx: number; ny: number; wx: number; wy: number }[] = [];
    for (const d of dirs) {
      const nx = cur.x + d.x;
      const ny = cur.y + d.y;
      if (inBounds(nx, ny, cols, rows) && walls[ny][nx]) {
        neighbors.push({ nx, ny, wx: cur.x + d.x / 2, wy: cur.y + d.y / 2 });
      }
    }
    if (neighbors.length === 0) {
      stack.pop();
      continue;
    }
    const pick = neighbors[Math.floor(Math.random() * neighbors.length)];
    walls[pick.wy][pick.wx] = false;
    walls[pick.ny][pick.nx] = false;
    stack.push({ x: pick.nx, y: pick.ny });
  }

  // Braid: çıkmazların bir kısmını açarak döngü oluştur (kaçış hissini iyileştirir)
  if (braid > 0) {
    for (let y = 1; y < rows - 1; y += 2) {
      for (let x = 1; x < cols - 1; x += 2) {
        if (walls[y][x]) continue;
        // çıkmaz = sadece 1 açık komşusu olan hücre
        const open: { wx: number; wy: number }[] = [];
        const closed: { wx: number; wy: number }[] = [];
        for (const d of dirs) {
          const wx = x + d.x / 2;
          const wy = y + d.y / 2;
          const nx = x + d.x;
          const ny = y + d.y;
          if (!inBounds(nx, ny, cols, rows)) continue;
          if (walls[wy][wx]) closed.push({ wx, wy });
          else open.push({ wx, wy });
        }
        if (open.length === 1 && closed.length > 0 && Math.random() < braid) {
          const c = closed[Math.floor(Math.random() * closed.length)];
          walls[c.wy][c.wx] = false;
        }
      }
    }
  }

  return { cols, rows, walls };
}

export function isWall(maze: Maze, x: number, y: number) {
  if (x < 0 || y < 0 || x >= maze.cols || y >= maze.rows) return true;
  return maze.walls[y][x];
}

// Tüm zemin (yürünebilir) hücreleri
export function floorCells(maze: Maze): Vec[] {
  const cells: Vec[] = [];
  for (let y = 0; y < maze.rows; y++) {
    for (let x = 0; x < maze.cols; x++) {
      if (!maze.walls[y][x]) cells.push({ x, y });
    }
  }
  return cells;
}

// BFS ile bir hücreden diğer tüm hücrelere mesafe haritası
export function bfsDistances(maze: Maze, from: Vec): number[][] {
  const dist: number[][] = Array.from({ length: maze.rows }, () =>
    Array.from({ length: maze.cols }, () => -1)
  );
  const q: Vec[] = [from];
  dist[from.y][from.x] = 0;
  const dirs = [
    { x: 0, y: -1 },
    { x: 1, y: 0 },
    { x: 0, y: 1 },
    { x: -1, y: 0 },
  ];
  let head = 0;
  while (head < q.length) {
    const c = q[head++];
    for (const d of dirs) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      if (isWall(maze, nx, ny)) continue;
      if (dist[ny][nx] !== -1) continue;
      dist[ny][nx] = dist[c.y][c.x] + 1;
      q.push({ x: nx, y: ny });
    }
  }
  return dist;
}
