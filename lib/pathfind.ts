// Zombi yol bulma: BFS ile hedef hücreye giden en kısa yol.
import type { Vec } from "./types";
import { isWall, type Maze } from "./maze";

const DIRS = [
  { x: 0, y: -1 },
  { x: 1, y: 0 },
  { x: 0, y: 1 },
  { x: -1, y: 0 },
];

// start -> goal arası hücre listesi (start hariç, goal dahil). Yol yoksa null.
export function findPath(maze: Maze, start: Vec, goal: Vec): Vec[] | null {
  if (isWall(maze, goal.x, goal.y)) return null;
  if (start.x === goal.x && start.y === goal.y) return [];

  const key = (x: number, y: number) => y * maze.cols + x;
  const prev = new Map<number, number>();
  const visited = new Set<number>();
  const q: Vec[] = [start];
  visited.add(key(start.x, start.y));

  let head = 0;
  let found = false;
  while (head < q.length) {
    const c = q[head++];
    if (c.x === goal.x && c.y === goal.y) {
      found = true;
      break;
    }
    for (const d of DIRS) {
      const nx = c.x + d.x;
      const ny = c.y + d.y;
      if (isWall(maze, nx, ny)) continue;
      const k = key(nx, ny);
      if (visited.has(k)) continue;
      visited.add(k);
      prev.set(k, key(c.x, c.y));
      q.push({ x: nx, y: ny });
    }
  }

  if (!found) return null;

  // yolu geri sar
  const path: Vec[] = [];
  let cur = key(goal.x, goal.y);
  const startKey = key(start.x, start.y);
  while (cur !== startKey) {
    const x = cur % maze.cols;
    const y = Math.floor(cur / maze.cols);
    path.push({ x, y });
    const p = prev.get(cur);
    if (p === undefined) break;
    cur = p;
  }
  path.reverse();
  return path;
}
