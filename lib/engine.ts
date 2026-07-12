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
import { computeVisible, type VisibleCell } from "./vision";
import { cellOf, dist, tryMove } from "./physics";
import { BRIDE_RADIUS, moveBrides } from "./brides";
import type { Mission } from "./missions";

// --- Sabitler ---
export const PLAYER_SPEED = 3.4; // hücre/saniye
export const PLAYER_RADIUS = 0.3;
export const ZOMBIE_RADIUS = BRIDE_RADIUS;
export const BULLET_SPEED = 12;
export const BULLET_LIFE = 1.2;
export const FIRE_COOLDOWN = 0.22;
export const PLAYER_MAX_HP = 100;
export const CONTACT_DPS = 35; // temas başına saniyelik hasar
export const LOSE_AGGRO_TIME = 4; // saniye görüş dışı kalınca sakinleş
export const HEAL_AMOUNT = 45; // can paketi doldurma miktarı
export const AMMO_RESPAWN_SEC = 10; // toplanan mermi kaç saniye sonra geri doğar
export const BRIDE_RESPAWN_SEC = 20; // ölen gelin kaç saniye sonra yeniden doğar

export type Input = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  ax?: number; // analog joystick yatay (-1..1), mobil
  ay?: number; // analog joystick dikey (-1..1), mobil
};

// Tek kişilik zorluk seviyesi (gelin sayısı / hız / görüş çarpanları)
export type Diff = "kolay" | "orta" | "zor";
const DIFF_MULT: Record<Diff, { count: number; speed: number; vision: number }> = {
  kolay: { count: 0.6, speed: 0.82, vision: 1.15 },
  orta: { count: 1.0, speed: 1.0, vision: 1.0 },
  zor: { count: 1.4, speed: 1.12, vision: 0.85 },
};

// Ses için ayrık olaylar. Motor bunları biriktirir, Game katmanı her kare boşaltıp çalar.
export type SoundEvent =
  | "shot"
  | "kill"
  | "pickup"
  | "heal"
  | "secret"
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

export class GameEngine {
  config: LevelConfig;
  maze: Maze;
  player: Player;
  zombies: Zombie[] = [];
  ammoItems: Ammo[] = [];
  healthItems: Ammo[] = []; // yerdeki can paketleri (Ammo şeklini paylaşır)
  collectItems: Ammo[] = []; // görev: toplanacak parçalar (Ammo şeklini paylaşır)
  photoItem: Ammo | null = null; // gizli: düğün fotoğrafı parçası (tek kişilik)
  photoTaken = false; // bu bölümün parçası toplandı mı
  bullets: Bullet[] = [];

  // Ölen gelinlerin yeniden doğma zamanları (saniye) + zemin hücreleri
  private respawnQueue: number[] = [];
  private floors: Vec[] = [];
  private nextEscalate = Infinity; // endless: sıradaki ekstra gelin zamanı

  // --- Görev modu ---
  mission: Mission | null = null;
  collected = 0; // toplanan parça sayısı
  noFire = false; // ateş yasak mı (sessiz görev)
  missionFailReason: "" | "time" | "death" = ""; // başarısızlık nedeni (HUD/ekran)
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

  constructor(
    level: number,
    score: number,
    lives: number,
    mission: Mission | null = null,
    withPhoto = false,
    diff: Diff = "orta"
  ) {
    this.level = level;
    this.score = score;
    this.lives = lives;
    this.mission = mission;

    // Görev varsa temel seviyeyi ve kuralları ona göre ayarla
    const baseLevel = mission ? mission.levelBase : level;
    let cfg = levelConfig(baseLevel);
    if (mission) {
      cfg = { ...cfg };
      if (mission.visionMul) {
        cfg.visionRadius = Math.max(3, Math.round(cfg.visionRadius * mission.visionMul));
      }
      if (mission.zombies != null) cfg.zombies = mission.zombies;
      this.lives = mission.lives;
      this.noFire = !!mission.noFire;
      this.exitOpen = !!mission.exitOpenAtStart;
      if (mission.endless && mission.escalateEvery) this.nextEscalate = mission.escalateEvery;
    } else if (diff !== "orta") {
      // Tek kişilik zorluk: gelin sayısı/hız/görüş ölçekle
      const dm = DIFF_MULT[diff];
      cfg = { ...cfg };
      cfg.zombies = Math.max(1, Math.round(cfg.zombies * dm.count));
      cfg.zombieSpeed = Math.min(3.3, cfg.zombieSpeed * dm.speed);
      cfg.visionRadius = Math.max(3, Math.round(cfg.visionRadius * dm.vision));
    }
    this.config = cfg;
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
    this.floors = floors; // yeniden doğma için sakla

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

    // Can paketleri (nadir): başlangıç/çıkış dışı, mermilerle çakışmasın
    const ammoSet = new Set(this.ammoItems.map((a) => a.cell.y * this.maze.cols + a.cell.x));
    const healthCells = this.shuffle(
      floors.filter(
        (c) =>
          !(c.x === spawnCell.x && c.y === spawnCell.y) &&
          !(c.x === exit.x && c.y === exit.y) &&
          !ammoSet.has(c.y * this.maze.cols + c.x)
      )
    );
    const healthTotal = 2;
    for (let i = 0; i < healthTotal && i < healthCells.length; i++) {
      const c = healthCells[i];
      this.healthItems.push({
        id: this.nextId++,
        cell: { x: c.x, y: c.y },
        taken: false,
      });
    }

    // Görev: toplanacak parçalar (başlangıç/çıkış ve diğer eşyalardan uzak)
    if (mission?.collectTarget) {
      const usedSet = new Set([
        ...this.ammoItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
        ...this.healthItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
      ]);
      const collectCells = this.shuffle(
        floors.filter(
          (c) =>
            !(c.x === spawnCell.x && c.y === spawnCell.y) &&
            !(c.x === exit.x && c.y === exit.y) &&
            !usedSet.has(c.y * this.maze.cols + c.x)
        )
      );
      for (let i = 0; i < mission.collectTarget && i < collectCells.length; i++) {
        const c = collectCells[i];
        this.collectItems.push({ id: this.nextId++, cell: { x: c.x, y: c.y }, taken: false });
      }
    }

    // Gizli: düğün fotoğrafı parçası (yalnız tek kişilik istenirse), diğer eşyalardan uzak
    if (withPhoto) {
      const used = new Set([
        ...this.ammoItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
        ...this.healthItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
      ]);
      const cells = this.shuffle(
        floors.filter(
          (c) =>
            !(c.x === spawnCell.x && c.y === spawnCell.y) &&
            !(c.x === exit.x && c.y === exit.y) &&
            !used.has(c.y * this.maze.cols + c.x)
        )
      );
      if (cells[0]) {
        this.photoItem = { id: this.nextId++, cell: { x: cells[0].x, y: cells[0].y }, taken: false };
      }
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
    this.processRespawns();
    this.computeTension();
    this.pickupAmmo();
    this.pickupHealth();
    this.pickupCollect();
    this.pickupPhoto();
    this.computeVision();
    this.checkExit();
    this.checkMission();
    this.checkDeath();
  }

  private pickupCollect() {
    if (!this.mission?.collectTarget) return;
    const pcell = cellOf(this.player.pos);
    for (const c of this.collectItems) {
      if (c.taken) continue;
      if (c.cell.x === pcell.x && c.cell.y === pcell.y) {
        c.taken = true;
        this.collected++;
        this.events.push("pickup");
        if (this.collected >= this.mission.collectTarget && !this.exitOpen) {
          this.exitOpen = true;
          this.events.push("dooropen");
        }
      }
    }
  }

  // Görev zamanlayıcıları: hayatta kalma (başarı) + süre limiti (başarısızlık)
  private checkMission() {
    const m = this.mission;
    if (!m || this.status !== "playing") return;
    // Sonsuz mod: kazanma yok, zamanla ekstra gelin doğar
    if (m.endless) {
      if (this.time >= this.nextEscalate) {
        this.spawnBrideFar();
        this.nextEscalate += m.escalateEvery ?? 20;
      }
      return;
    }
    if (m.surviveTime && this.time >= m.surviveTime) {
      this.status = "levelclear"; // görev başarısı
      this.events.push("levelclear");
      return;
    }
    if (m.timeLimit && this.time > m.timeLimit) {
      this.missionFailReason = "time";
      this.status = "gameover"; // süre doldu → başarısız
      this.events.push("gameover");
    }
  }

  private updatePlayer(dt: number, input: Input) {
    let mx = 0;
    let my = 0;
    if (input.up) my -= 1;
    if (input.down) my += 1;
    if (input.left) mx -= 1;
    if (input.right) mx += 1;

    // Analog joystick (mobil): itme miktarı kadar hız (ölü bölge 0.18)
    let speedScale = 1;
    const ax = input.ax ?? 0;
    const ay = input.ay ?? 0;
    const amag = Math.hypot(ax, ay);
    if (amag > 0.18) {
      mx = ax;
      my = ay;
      speedScale = Math.min(1, amag);
    }

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
        mx * PLAYER_SPEED * speedScale * dt,
        my * PLAYER_SPEED * speedScale * dt
      );
    }

    if (input.fire && !this.noFire && this.fireCd <= 0 && this.ammoCount > 0) {
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
    // 20 sn sonra yeniden doğsun (tüm modlarda)
    this.respawnQueue.push(this.time + BRIDE_RESPAWN_SEC);
    // kan izi bırak (kalıcı, hafızada kalır)
    this.bloodStains.push({
      x: z.pos.x,
      y: z.pos.y,
      r: 0.5 + Math.random() * 0.35,
      seed: Math.floor(Math.random() * 1000),
    });
    const wasOpen = this.exitOpen;
    // Çıkış açılma kuralı: görevde killTarget kadar, normalde 1
    const killNeed = this.mission?.killTarget ?? 1;
    // Toplama göreviyse öldürme çıkışı açmaz (parça toplamak gerekir)
    if (!this.mission?.collectTarget && this.zombiesKilled >= killNeed) {
      this.exitOpen = true;
    }
    if (!wasOpen && this.exitOpen) this.events.push("dooropen");
  }

  // Süresi gelen ölü gelinleri oyuncudan uzak bir yerde yeniden doğur
  private processRespawns() {
    if (this.respawnQueue.length === 0) return;
    const remain: number[] = [];
    for (const t of this.respawnQueue) {
      if (this.time >= t) this.spawnBrideFar();
      else remain.push(t);
    }
    this.respawnQueue = remain;
  }

  private spawnBrideFar() {
    let cell: Vec | null = null;
    for (let i = 0; i < 40; i++) {
      const c = this.floors[Math.floor(Math.random() * this.floors.length)];
      if (!c) continue;
      if (c.x === this.exit.x && c.y === this.exit.y) continue;
      const d = Math.hypot(c.x + 0.5 - this.player.pos.x, c.y + 0.5 - this.player.pos.y);
      if (d >= 6) {
        cell = c;
        break;
      }
    }
    if (!cell) return; // uygun uzak hücre yoksa bu sefer geç (kuyrukta kalmaz)
    this.zombies.push({
      id: this.nextId++,
      pos: { x: cell.x + 0.5, y: cell.y + 0.5 },
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

  private updateZombies(dt: number) {
    // Gelin hareketi — ortak AI (en yakın oyuncuyu hedefler; tek kişilikte tek oyuncu)
    moveBrides(this.zombies, this.maze, this.config, [this.player.pos], dt);

    // Oyuncuya temas: hasar + geri itme
    for (const z of this.zombies) {
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
  }

  private pickupAmmo() {
    const pcell = cellOf(this.player.pos);
    for (const a of this.ammoItems) {
      if (a.taken) {
        // toplanan mermi 10 sn sonra haritada geri doğar
        if (this.time - (a.takenAt ?? 0) >= AMMO_RESPAWN_SEC) a.taken = false;
        continue;
      }
      if (a.cell.x === pcell.x && a.cell.y === pcell.y) {
        a.taken = true;
        a.takenAt = this.time;
        this.ammoCount++;
        this.score += 5;
        this.events.push("pickup");
      }
    }
  }

  private pickupHealth() {
    if (this.player.hp >= PLAYER_MAX_HP) return; // canın tamsa dokunma (israf etme)
    const pcell = cellOf(this.player.pos);
    for (const h of this.healthItems) {
      if (h.taken) continue;
      if (h.cell.x === pcell.x && h.cell.y === pcell.y) {
        h.taken = true;
        this.player.hp = Math.min(PLAYER_MAX_HP, this.player.hp + HEAL_AMOUNT);
        this.events.push("heal");
      }
    }
  }

  private pickupPhoto() {
    const p = this.photoItem;
    if (!p || p.taken) return;
    const pc = cellOf(this.player.pos);
    if (p.cell.x === pc.x && p.cell.y === pc.y) {
      p.taken = true;
      this.photoTaken = true;
      this.events.push("secret");
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
    // Hayatta kalma / sonsuz modda çıkış yok — sadece dayanılır
    if (this.mission?.surviveTime || this.mission?.endless) return;
    const pcell = cellOf(this.player.pos);
    if (pcell.x === this.exit.x && pcell.y === this.exit.y) {
      if (this.exitOpen) {
        if (this.mission) {
          this.status = "levelclear"; // görev başarısı
          this.events.push("levelclear");
        } else {
          this.status = this.level >= 10 ? "win" : "levelclear";
          this.events.push(this.status === "win" ? "win" : "levelclear");
        }
      } else {
        if (this.warnTimer <= 0) this.events.push("warn");
        this.warnTimer = 2; // "önce bir hedefi tamamla"
      }
    }
  }

  private checkDeath() {
    if (this.player.hp <= 0) {
      this.player.hp = 0;
      if (this.mission) {
        // Sonsuz modda skor = dayanılan süre
        if (this.mission.endless) this.score = Math.floor(this.time);
        // Görev: ölüm = başarısızlık (tek deneme, baştan)
        this.missionFailReason = "death";
        this.status = "gameover";
        this.events.push("gameover");
        return;
      }
      this.lives -= 1;
      this.status = this.lives > 0 ? "dead" : "gameover";
      this.events.push("gameover"); // ölüm sesi (dead ve gameover için)
    }
  }

  // HUD için görev hedefi metni
  objectiveText(): string {
    const m = this.mission;
    if (!m) return "";
    if (m.endless) {
      return `Süre ${Math.floor(this.time)}s`;
    }
    if (m.surviveTime) {
      return `Dayan ${Math.max(0, Math.ceil(m.surviveTime - this.time))}s`;
    }
    const parts: string[] = [];
    if (m.killTarget) {
      parts.push(this.exitOpen ? "Çıkışa git" : `Gelin ${this.zombiesKilled}/${m.killTarget}`);
    } else if (m.collectTarget) {
      parts.push(this.exitOpen ? "Çıkışa git" : `Parça ${this.collected}/${m.collectTarget}`);
    } else {
      parts.push("Çıkışa ulaş");
    }
    if (m.timeLimit) parts.push(`${Math.max(0, Math.ceil(m.timeLimit - this.time))}s`);
    return parts.join(" · ");
  }
}
