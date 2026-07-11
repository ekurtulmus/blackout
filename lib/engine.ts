// BLACKOUT — oyun motoru. Durum + her karede güncelleme mantığı.
import type {
  Ammo,
  Bullet,
  GameStatus,
  LevelConfig,
  Vec,
  Zombie,
} from "./types";
import { levelConfig } from "./levels";
import {
  bfsDistances,
  floorCells,
  generateMaze,
  isWall,
  type Maze,
} from "./maze";
import { findPath } from "./pathfind";
import { computeVisible, hasLineOfSight, type VisibleCell } from "./vision";

// --- Sabitler ---
export const PLAYER_SPEED = 3.4; // hücre/saniye
export const PLAYER_RADIUS = 0.3;
export const ZOMBIE_RADIUS = 0.34;
export const BULLET_SPEED = 12;
export const BULLET_LIFE = 1.2;
export const FIRE_COOLDOWN = 0.22;
export const PLAYER_MAX_HP = 100;
export const CONTACT_DPS = 35; // temas başına saniyelik hasar
export const LOSE_AGGRO_TIME = 4; // saniye görüş dışı kalınca sakinleş

export type Input = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
};

// Ses için ayrık olaylar. Motor bunları biriktirir, Game katmanı her kare boşaltıp çalar.
export type SoundEvent =
  | "shot"
  | "kill"
  | "pickup"
  | "hurt"
  | "dooropen"
  | "warn"
  | "levelclear"
  | "gameover"
  | "win";

export type Player = {
  pos: Vec;
  dir: Vec; // birim yön (ateş için)
  hp: number;
};

// Çarpışma: daire (merkez p, yarıçap rad) herhangi bir duvar hücresiyle çakışıyor mu?
function collides(maze: Maze, p: Vec, rad: number): boolean {
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
function tryMove(maze: Maze, pos: Vec, rad: number, dx: number, dy: number) {
  if (dx !== 0) {
    const nx = pos.x + dx;
    if (!collides(maze, { x: nx, y: pos.y }, rad)) pos.x = nx;
  }
  if (dy !== 0) {
    const ny = pos.y + dy;
    if (!collides(maze, { x: pos.x, y: ny }, rad)) pos.y = ny;
  }
}

function cellOf(p: Vec): Vec {
  return { x: Math.floor(p.x), y: Math.floor(p.y) };
}

function dist(a: Vec, b: Vec) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

export class GameEngine {
  config: LevelConfig;
  maze: Maze;
  player: Player;
  zombies: Zombie[] = [];
  ammoItems: Ammo[] = [];
  bullets: Bullet[] = [];
  exit: Vec;
  exitOpen = false;
  ammoCount = 0;
  zombiesKilled = 0;
  score: number;
  lives: number;
  level: number;
  time = 0;
  status: GameStatus = "playing";

  // kalıcı "görülen" ızgarası (hafıza sisi)
  seen: boolean[][];
  visible: VisibleCell[] = [];

  warnTimer = 0; // "önce bir zombi öldür" uyarısı
  hurtFlash = 0; // hasar alınca kırmızı flaş
  playerMoving = false; // yürüme animasyonu için
  events: SoundEvent[] = []; // bu kare oluşan ses olayları
  tension = 0; // 0..1 en yakın farkında zombiye göre gerilim (kalp atışı/ambiyans)
  bloodStains: { x: number; y: number; r: number; seed: number }[] = []; // kalıcı kan izleri

  private fireCd = 0;
  private nextId = 1;

  constructor(level: number, score: number, lives: number) {
    this.level = level;
    this.score = score;
    this.lives = lives;
    this.config = levelConfig(level);
    this.maze = generateMaze(
      this.config.cols,
      this.config.rows,
      this.config.braid,
      this.config.openness
    );

    this.player = {
      pos: { x: 1.5, y: 1.5 },
      dir: { x: 0, y: -1 },
      hp: PLAYER_MAX_HP,
    };

    this.seen = Array.from({ length: this.maze.rows }, () =>
      Array.from({ length: this.maze.cols }, () => false)
    );

    const spawnCell = { x: 1, y: 1 };
    const distMap = bfsDistances(this.maze, spawnCell);
    const floors = floorCells(this.maze).filter(
      (c) => distMap[c.y][c.x] >= 0 // ulaşılabilir
    );

    // Çıkış: başlangıçtan en uzak ulaşılabilir hücre
    let exit = spawnCell;
    let best = -1;
    for (const c of floors) {
      const d = distMap[c.y][c.x];
      if (d > best) {
        best = d;
        exit = c;
      }
    }
    this.exit = exit;

    // Zombiler: başlangıçtan yeterince uzak rastgele hücreler
    const candidates = this.shuffle(
      floors.filter(
        (c) =>
          distMap[c.y][c.x] >= 5 &&
          !(c.x === exit.x && c.y === exit.y)
      )
    );
    for (let i = 0; i < this.config.zombies && i < candidates.length; i++) {
      const c = candidates[i];
      this.zombies.push({
        id: this.nextId++,
        pos: { x: c.x + 0.5, y: c.y + 0.5 },
        hp: 1,
        aware: false,
        lastSeen: null,
        seenTimer: LOSE_AGGRO_TIME,
        wanderDir: this.randomDir(),
        wanderTimer: 0,
        path: null,
        repathTimer: 0,
      });
    }

    // Mermiler: zombi sayısı + tampon
    const ammoCells = this.shuffle(
      floors.filter(
        (c) =>
          !(c.x === spawnCell.x && c.y === spawnCell.y) &&
          !(c.x === exit.x && c.y === exit.y)
      )
    );
    const ammoTotal = this.config.zombies + this.config.ammoBuffer;
    for (let i = 0; i < ammoTotal && i < ammoCells.length; i++) {
      const c = ammoCells[i];
      this.ammoItems.push({
        id: this.nextId++,
        cell: { x: c.x, y: c.y },
        taken: false,
      });
    }
  }

  get zombiesRemaining() {
    return this.zombies.length;
  }

  private shuffle<T>(arr: T[]): T[] {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  }

  private randomDir(): Vec {
    const dirs = [
      { x: 0, y: -1 },
      { x: 1, y: 0 },
      { x: 0, y: 1 },
      { x: -1, y: 0 },
    ];
    return dirs[Math.floor(Math.random() * dirs.length)];
  }

  update(dt: number, input: Input) {
    if (this.status !== "playing") return;
    // çok büyük dt'leri sınırla (sekme arka planda kalınca)
    dt = Math.min(dt, 0.05);
    this.time += dt;
    if (this.fireCd > 0) this.fireCd -= dt;
    if (this.warnTimer > 0) this.warnTimer -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    this.updatePlayer(dt, input);
    this.updateBullets(dt);
    this.updateZombies(dt);
    this.computeTension();
    this.pickupAmmo();
    this.computeVision();
    this.checkExit();
    this.checkDeath();
  }

  private updatePlayer(dt: number, input: Input) {
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;

    this.playerMoving = mx !== 0 || my !== 0;
    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.player.dir = { x: mx, y: my };
      tryMove(
        this.maze,
        this.player.pos,
        PLAYER_RADIUS,
        mx * PLAYER_SPEED * dt,
        my * PLAYER_SPEED * dt
      );
    }

    if (input.fire && this.fireCd <= 0 && this.ammoCount > 0) {
      this.ammoCount--;
      this.fireCd = FIRE_COOLDOWN;
      this.events.push("shot");
      this.bullets.push({
        id: this.nextId++,
        pos: { x: this.player.pos.x, y: this.player.pos.y },
        vel: {
          x: this.player.dir.x * BULLET_SPEED,
          y: this.player.dir.y * BULLET_SPEED,
        },
        life: BULLET_LIFE,
      });
    }
  }

  private updateBullets(dt: number) {
    for (const b of this.bullets) {
      b.life -= dt;
      // küçük adımlarla ilerlet (duvar/zombi kaçırma olmasın)
      const steps = 3;
      const sx = (b.vel.x * dt) / steps;
      const sy = (b.vel.y * dt) / steps;
      for (let s = 0; s < steps; s++) {
        b.pos.x += sx;
        b.pos.y += sy;
        if (isWall(this.maze, Math.floor(b.pos.x), Math.floor(b.pos.y))) {
          b.life = 0;
          break;
        }
        let hit = false;
        for (const z of this.zombies) {
          if (dist(b.pos, z.pos) < ZOMBIE_RADIUS + 0.08) {
            z.hp -= 1;
            b.life = 0;
            hit = true;
            if (z.hp <= 0) this.killZombie(z);
            break;
          }
        }
        if (hit) break;
      }
    }
    this.bullets = this.bullets.filter((b) => b.life > 0);
  }

  private computeTension() {
    let tn = 0;
    for (const z of this.zombies) {
      if (!z.aware) continue;
      const d = Math.hypot(
        z.pos.x - this.player.pos.x,
        z.pos.y - this.player.pos.y
      );
      const tv = Math.max(0, 1 - d / 9);
      if (tv > tn) tn = tv;
    }
    this.tension = tn;
  }

  private killZombie(z: Zombie) {
    this.zombies = this.zombies.filter((o) => o.id !== z.id);
    this.zombiesKilled++;
    this.score += 100;
    this.events.push("kill");
    // kan izi bırak (kalıcı, hafızada kalır)
    this.bloodStains.push({
      x: z.pos.x,
      y: z.pos.y,
      r: 0.5 + Math.random() * 0.35,
      seed: Math.floor(Math.random() * 1000),
    });
    const wasOpen = this.exitOpen;
    if (this.zombiesKilled >= 1) this.exitOpen = true;
    if (!wasOpen && this.exitOpen) this.events.push("dooropen");
  }

  private updateZombies(dt: number) {
    const pcell = cellOf(this.player.pos);
    const smart = this.config.intelligence; // 0..1
    for (const z of this.zombies) {
      const zcell = cellOf(z.pos);
      const d = dist(z.pos, this.player.pos);

      // Oyuncuyu görüyor mu? (görüş yarıçapı + zekâ ile artan algı + görüş hattı)
      const detect = this.config.visionRadius + 0.5 + smart * 2.5;
      const canSee =
        d <= detect && hasLineOfSight(this.maze, zcell, pcell);

      if (canSee) {
        z.aware = true;
        z.lastSeen = { x: pcell.x, y: pcell.y };
        z.seenTimer = 0;
      } else {
        z.seenTimer += dt;
        // ASLA vazgeçmez: bir kez fark ettiyse aware kalır (peşini bırakmaz)
      }

      if (z.aware) {
        // Zeki zombiler (üst seviye) oyuncunun GÜNCEL yerini bilir;
        // aptal zombiler (alt seviye) son görülen noktaya gider.
        const target =
          canSee || smart > 0.45 ? pcell : z.lastSeen ?? pcell;
        this.moveZombieChase(z, zcell, dt, target, canSee, smart, pcell);
      } else {
        this.moveZombieWander(z, dt);
      }

      // Oyuncuya temas: hasar + geri itme
      if (dist(z.pos, this.player.pos) < PLAYER_RADIUS + ZOMBIE_RADIUS) {
        if (this.hurtFlash <= 0) this.events.push("hurt");
        this.player.hp -= CONTACT_DPS * dt;
        this.hurtFlash = 0.25;
        const nx = this.player.pos.x - z.pos.x;
        const ny = this.player.pos.y - z.pos.y;
        const nl = Math.hypot(nx, ny) || 1;
        tryMove(
          this.maze,
          this.player.pos,
          PLAYER_RADIUS,
          (nx / nl) * 1.5 * dt,
          (ny / nl) * 1.5 * dt
        );
      }
    }

    this.separateZombies();
  }

  private moveZombieChase(
    z: Zombie,
    zcell: Vec,
    dt: number,
    target: Vec,
    canSee: boolean,
    smart: number,
    pcell: Vec
  ) {
    z.repathTimer -= dt;
    if (!z.path || z.path.length === 0 || z.repathTimer <= 0) {
      z.path = findPath(this.maze, zcell, target);
      // zeki zombiler daha sık yol hesaplar (daha iyi takip): 0.6s -> 0.15s
      z.repathTimer = 0.6 - smart * 0.45;
    }
    if (z.path && z.path.length > 0) {
      const next = z.path[0];
      const tp = { x: next.x + 0.5, y: next.y + 0.5 };
      this.stepToward(z, tp, this.config.zombieSpeed * dt);
      if (dist(z.pos, tp) < 0.12) z.path.shift();
    } else if (!canSee) {
      // Son bilinen noktaya vardı ama oyuncuyu göremiyor.
      // ASLA vazgeçme: yeni hedef olarak oyuncunun güncel yerini al (av devam eder).
      z.lastSeen = { x: pcell.x, y: pcell.y };
      z.path = null;
      z.repathTimer = 0;
    }
  }

  private moveZombieWander(z: Zombie, dt: number) {
    z.wanderTimer -= dt;
    if (z.wanderTimer <= 0) {
      z.wanderDir = this.randomDir();
      z.wanderTimer = 0.8 + Math.random() * 1.2;
    }
    const speed = this.config.zombieSpeed * 0.4;
    const before = { x: z.pos.x, y: z.pos.y };
    tryMove(
      this.maze,
      z.pos,
      ZOMBIE_RADIUS,
      z.wanderDir.x * speed * dt,
      z.wanderDir.y * speed * dt
    );
    // duvara takıldıysa yön değiştir
    if (dist(before, z.pos) < 0.0005) z.wanderTimer = 0;
  }

  private stepToward(z: Zombie, tp: Vec, step: number) {
    const dx = tp.x - z.pos.x;
    const dy = tp.y - z.pos.y;
    const len = Math.hypot(dx, dy) || 1;
    tryMove(this.maze, z.pos, ZOMBIE_RADIUS, (dx / len) * step, (dy / len) * step);
  }

  private separateZombies() {
    const minDist = ZOMBIE_RADIUS * 2;
    for (let i = 0; i < this.zombies.length; i++) {
      for (let j = i + 1; j < this.zombies.length; j++) {
        const a = this.zombies[i];
        const b = this.zombies[j];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d = Math.hypot(dx, dy);
        if (d > 0 && d < minDist) {
          const push = (minDist - d) / 2;
          const ux = dx / d;
          const uy = dy / d;
          tryMove(this.maze, a.pos, ZOMBIE_RADIUS, -ux * push, -uy * push);
          tryMove(this.maze, b.pos, ZOMBIE_RADIUS, ux * push, uy * push);
        }
      }
    }
  }

  private pickupAmmo() {
    const pcell = cellOf(this.player.pos);
    for (const a of this.ammoItems) {
      if (a.taken) continue;
      if (a.cell.x === pcell.x && a.cell.y === pcell.y) {
        a.taken = true;
        this.ammoCount++;
        this.score += 5;
        this.events.push("pickup");
      }
    }
  }

  private computeVision() {
    const origin = cellOf(this.player.pos);
    this.visible = computeVisible(this.maze, origin, this.config.visionRadius);
    for (const c of this.visible) {
      this.seen[c.y][c.x] = true;
    }
  }

  private checkExit() {
    const pcell = cellOf(this.player.pos);
    if (pcell.x === this.exit.x && pcell.y === this.exit.y) {
      if (this.exitOpen) {
        this.status = this.level >= 10 ? "win" : "levelclear";
        this.events.push(this.status === "win" ? "win" : "levelclear");
      } else {
        if (this.warnTimer <= 0) this.events.push("warn");
        this.warnTimer = 2; // "önce bir zombi öldür"
      }
    }
  }

  private checkDeath() {
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      this.lives -= 1;
      this.status = this.lives > 0 ? "dead" : "gameover";
      this.events.push("gameover"); // ölüm sesi (dead ve gameover için)
    }
  }
}
