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
import { BRIDE_RADIUS, assignBrideKind, moveBrides } from "./brides";
import { TUNING } from "./config";
import { Flashlight } from "./flashlight";
import type { Mission } from "./missions";
import type { Mucus } from "./types";
import {
  MQ_DEFS,
  MQ_KINDS_SP,
  planMiniQuest,
  type MQDef,
  type MQPlan,
} from "./miniquests";
import { ScareDirector, type ScareKind } from "./scares";

// --- Sabitler ---
export const PLAYER_SPEED = TUNING.playerSpeed; // hücre/saniye (config'ten)
export const PLAYER_RADIUS = 0.3;
export const ZOMBIE_RADIUS = BRIDE_RADIUS;
export const BULLET_SPEED = 12;
export const BULLET_LIFE = 1.2;
export const FIRE_COOLDOWN = 0.22;
export const PLAYER_MAX_HP = 100;
export const CONTACT_DPS = TUNING.contactDps; // temas başına saniyelik hasar (config: 20)
export const LOSE_AGGRO_TIME = 4; // saniye görüş dışı kalınca sakinleş
export const HEAL_AMOUNT = 45; // can paketi doldurma miktarı
export const AMMO_RESPAWN_SEC = 10; // toplanan mermi kaç saniye sonra geri doğar
export const BRIDE_RESPAWN_SEC = 20; // ölen gelin kaç saniye sonra yeniden doğar
export const COIN_PER_KILL = 1; // gelin başına temel para (risk çarpanıyla ölçeklenir)

// Faz A / Madde 18: risk = ödül. Zor oynadıkça para VE puan çarpanı artar.
const RISK_MUL: Record<Diff, number> = { kolay: 1.0, orta: 1.3, zor: 1.7 };

export type Input = {
  up: boolean;
  down: boolean;
  left: boolean;
  right: boolean;
  fire: boolean;
  sprint?: boolean; // Faz C: koşma (stamina tükenir)
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
  | "flicker"
  | "veil"
  | "hurt"
  | "dooropen"
  | "whisper" // Madde 10: rastgele korku — ani fısıltı
  | "doorslam" // Madde 10: uzak kapı çarpması
  | "heartbeat" // Madde 10: kısa kalp atışı yükselişi
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
  mucus: Mucus[] = []; // Madde 7: ölen mukus gelinlerinin bıraktığı hasar lekeleri
  veilItems: Ammo[] = []; // Madde 8: gelin duvağı (görünmezlik) eşyası
  veilUntil = 0; // (saniye) bu ana kadar görünmez
  invulnUntil = 0; // (saniye) kalkan: bu ana kadar dokunulmaz (Faz B envanter)
  // Faz C: koşma (stamina) + tuzaklar
  stamina = TUNING.staminaMax;
  sprinting = false;
  private staminaLocked = false; // 0'a inince nefeslenene kadar kilitli
  traps: { x: number; y: number; until: number }[] = []; // yerdeki tuzaklar
  photoItem: Ammo | null = null; // gizli: düğün fotoğrafı parçası (tek kişilik)
  photoTaken = false; // bu bölümün parçası toplandı mı
  bullets: Bullet[] = [];

  // Ölen gelinlerin yeniden doğma zamanları (saniye) + zemin hücreleri
  private respawnQueue: number[] = [];
  private floors: Vec[] = [];
  private nextEscalate = Infinity; // endless: sıradaki ekstra gelin zamanı
  flashlight!: Flashlight; // dinamik görüş + kararma (Madde 4,5)
  scares = new ScareDirector(0); // Madde 10: rastgele korku olayları (atmosfer, hasarsız)

  // --- Mini-görev (Faz 4): normal bölümlere serpiştirilen opsiyonel hedef ---
  miniQuest: MQPlan | null = null;
  mqDef: MQDef | null = null;
  mqDone = false;
  mqRewardMsg = ""; // tamamlanınca gösterilecek toast (Game okuyup temizler)
  private mqMirrorNear = 0; // ayna: yanında kesintisiz geçirilen süre (sn)
  mqHintDir = ""; // ayna kehaneti: çıkışa giden yön ("Sağ/Sol/Yukarı/Aşağı")
  private mqHintUntil = 0; // yön ipucunun HUD'da kalacağı ana kadar (sn)

  // --- Görev modu ---
  mission: Mission | null = null;
  collected = 0; // toplanan parça sayısı
  noFire = false; // ateş yasak mı (sessiz görev)
  missionFailReason: "" | "time" | "death" = ""; // başarısızlık nedeni (HUD/ekran)
  exit: Vec;
  exitOpen = false;
  ammoCount = 0;
  zombiesKilled = 0;
  coinsEarned = 0; // bu bölümde kazanılan para (Game kalıcı cüzdana işler)
  levelClearBonus = 0; // bölüm bitince verilen para bonusu (ekranda göster)
  private riskMul = 1; // Madde 18: zorluğa göre para/puan çarpanı
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
    this.riskMul = RISK_MUL[diff] ?? 1; // Madde 18: risk = ödül

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
      // Zor'da bile gelin hızı tavanı (oyuncunun %8 altı) asla aşılmaz
      cfg.zombieSpeed = Math.min(TUNING.brideSpeedCap, cfg.zombieSpeed * dm.speed);
      cfg.visionRadius = Math.max(3, Math.round(cfg.visionRadius * dm.vision));
    }
    this.config = cfg;
    // Dinamik fener/görüş (Madde 4,5) — dip anında ses ipucu
    this.flashlight = new Flashlight(this.config.visionRadius);
    this.flashlight.onDip = () => this.events.push("flicker");
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
        kind: assignBrideKind(i, this.config.zombies), // Madde 6/7 arketip
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

    // Madde 8: gelin duvağı (seyrek — bölüm başına 1), diğer her şeyden uzak
    if (!mission) {
      const hSet = new Set(this.healthItems.map((a) => a.cell.y * this.maze.cols + a.cell.x));
      const veilCells = this.shuffle(
        floors.filter(
          (c) =>
            !(c.x === spawnCell.x && c.y === spawnCell.y) &&
            !(c.x === exit.x && c.y === exit.y) &&
            !ammoSet.has(c.y * this.maze.cols + c.x) &&
            !hSet.has(c.y * this.maze.cols + c.x)
        )
      );
      if (veilCells[0]) {
        this.veilItems.push({ id: this.nextId++, cell: { x: veilCells[0].x, y: veilCells[0].y }, taken: false });
      }
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

    // Mini-görev (Faz 4): yalnız NORMAL tek kişilik bölümlerde (görev modu değil).
    // Bölüm başına 1 opsiyonel hedef; çıkışı geciktirmez, tamamlanınca küçük ödül.
    if (!mission) {
      const plan = planMiniQuest(Math.random, floors, spawnCell, this.exit, MQ_KINDS_SP);
      if (plan) {
        this.miniQuest = plan;
        this.mqDef = MQ_DEFS[plan.kind];
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
    this.updateScares();
    // Dinamik görüş: menzilde gelin var mı? (Madde 4,5)
    const brideInRange = this.zombies.some(
      (z) => dist(z.pos, this.player.pos) <= this.flashlight.base
    );
    this.flashlight.update(dt, brideInRange);
    this.pickupAmmo();
    this.pickupHealth();
    this.pickupCollect();
    this.pickupPhoto();
    this.pickupVeil();
    this.updateMucus(dt);
    this.updateMiniQuest(dt);
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

    // Faz C: koşma (sprint) — stamina tükenir/dolar, 0'a inince nefeslenmen gerekir
    const wantSprint = !!input.sprint && this.playerMoving;
    if (this.staminaLocked && this.stamina >= TUNING.staminaMinToStart) this.staminaLocked = false;
    this.sprinting = wantSprint && !this.staminaLocked && this.stamina > 0;
    if (this.sprinting) {
      this.stamina = Math.max(0, this.stamina - TUNING.staminaDrain * dt);
      if (this.stamina <= 0) this.staminaLocked = true; // bitti → kilitlen
    } else {
      this.stamina = Math.min(TUNING.staminaMax, this.stamina + TUNING.staminaRegen * dt);
    }
    const moveMul = this.sprinting ? TUNING.sprintMul : 1;

    if (mx !== 0 || my !== 0) {
      const len = Math.hypot(mx, my);
      mx /= len;
      my /= len;
      this.player.dir = { x: mx, y: my };
      tryMove(
        this.maze,
        this.player.pos,
        PLAYER_RADIUS,
        mx * PLAYER_SPEED * speedScale * moveMul * dt,
        my * PLAYER_SPEED * speedScale * moveMul * dt
      );
    }

    if (input.fire && !this.noFire && this.fireCd <= 0 && this.ammoCount > 0) {
      this.ammoCount--;
      this.fireCd = FIRE_COOLDOWN;
      if (this.veilUntil > this.time) this.veilUntil = 0; // Madde 8: ateş = duvak bozulur
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

  // Madde 10: rastgele korku olayları. HASAR VERMEZ. Ses olayları events'e,
  // görsel efekt (gölge/flashjump) scares.fx'te (render okur).
  private updateScares() {
    const sk: ScareKind | null = this.scares.update(this.time, 1 + this.tension * 0.5);
    if (!sk) return;
    if (sk === "whisper" || sk === "doorslam" || sk === "heartbeat") this.events.push(sk);
    else if (sk === "flashjump") this.events.push("flicker"); // hafif elektrik cızırtısı
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
    this.score += Math.round(100 * this.riskMul); // Madde 18: puan çarpanı
    this.coinsEarned += Math.max(1, Math.round(COIN_PER_KILL * this.riskMul)); // gelin başına para
    this.events.push("kill");
    // Mini-görev "çember" (markedkill): AKTİFKEN çıkış SADECE çemberde infazla açılır.
    const mq = this.miniQuest;
    const mkGate = mq?.kind === "markedkill" && !!mq.zone && !this.mqDone;
    if (mkGate && mq!.zone) {
      const zn = mq!.zone;
      const inZone = Math.hypot(zn.x + 0.5 - z.pos.x, zn.y + 0.5 - z.pos.y) <= zn.r + 0.5;
      if (inZone) {
        this.grantMQReward();
        this.exitOpen = true; // çemberde infaz → çıkış açılır
      }
    }
    // Madde 7: mukus gelini öldüğü hücreye 10 sn kalan hasar lekesi bırakır
    if (z.kind === "mucus") {
      this.mucus.push({ x: Math.floor(z.pos.x), y: Math.floor(z.pos.y), until: this.time + TUNING.mucusSec });
    }
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
    // Çıkış açılma kuralı: görevde killTarget kadar, normalde 1.
    // "Çember" görevi aktifken (mkGate) normal kural DEVRE DIŞI — çıkış yalnız
    // çemberde infazla açılır (yukarıda).
    const killNeed = this.mission?.killTarget ?? 1;
    if (!this.mission?.collectTarget && !mkGate && this.zombiesKilled >= killNeed) {
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
    // Faz C: süresi geçen tuzakları temizle; aktiflerin hücrelerini yavaşlatma kümesine al
    if (this.traps.length) this.traps = this.traps.filter((t) => t.until > this.time);
    const slowCells =
      this.traps.length > 0
        ? new Set(this.traps.map((t) => t.y * this.maze.cols + t.x))
        : undefined;
    // Gelin hareketi — ortak AI (en yakın oyuncuyu hedefler; tek kişilikte tek oyuncu)
    // Madde 8: duvak açıkken oyuncu AI'ya görünmez · Faz C: tuzak hücrelerinde yavaşlar
    moveBrides(this.zombies, this.maze, this.config, [this.player.pos], dt, Infinity, [this.veiled], slowCells);

    // Oyuncuya temas: hasar + geri itme (duvak/kalkan açıkken temas hasarı yok)
    for (const z of this.zombies) {
      if (!this.veiled && !this.invuln && dist(z.pos, this.player.pos) < PLAYER_RADIUS + ZOMBIE_RADIUS) {
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

  get veiled(): boolean {
    return this.veilUntil > this.time;
  }

  get invuln(): boolean {
    return this.invulnUntil > this.time;
  }

  // Envanter: kalkanı aktive et — 3 sn dokunulmazlık (Game tüketimi yönetir)
  activateShield(seconds = 3) {
    this.invulnUntil = this.time + seconds;
    this.events.push("veil"); // hayaletimsi kalkan sesi
  }

  // Envanter: radarı aktive et — çıkış yönünü 1 kez göster (ayna kehanetiyle aynı HUD)
  activateRadar() {
    this.mqHintDir = this.computeExitDir();
    this.mqHintUntil = this.time + 20;
    this.events.push("secret");
  }

  // Faz C: bulunduğun hücreye tuzak koy (Game envanter sayımını yönetir). Aynı
  // hücrede zaten aktif tuzak varsa koymaz. Başarılıysa true.
  placeTrap(): boolean {
    const c = cellOf(this.player.pos);
    if (this.traps.some((t) => t.x === c.x && t.y === c.y && t.until > this.time)) return false;
    this.traps.push({ x: c.x, y: c.y, until: this.time + TUNING.trapSec });
    this.events.push("pickup");
    return true;
  }

  private pickupVeil() {
    const pc = cellOf(this.player.pos);
    for (const v of this.veilItems) {
      if (v.taken) continue;
      if (v.cell.x === pc.x && v.cell.y === pc.y) {
        v.taken = true;
        this.veilUntil = this.time + TUNING.veilSec; // görünmez ol
        this.events.push("veil");
      }
    }
  }

  private updateMucus(dt: number) {
    if (this.mucus.length === 0) return;
    this.mucus = this.mucus.filter((m) => this.time < m.until);
    if (this.invuln) return; // kalkan mukus hasarını da engeller
    const pc = cellOf(this.player.pos);
    for (const m of this.mucus) {
      if (m.x === pc.x && m.y === pc.y) {
        this.player.hp -= TUNING.mucusDps * dt;
        this.hurtFlash = Math.max(this.hurtFlash, 0.18);
        break;
      }
    }
  }

  // Mini-görev ilerlemesi (Faz 4, revize). Tamamlanınca küçük ödül. Yalnız "çember"
  // (markedkill) çıkışı gerçekten kapatır (killZombie'de); diğerleri geciktirmez.
  private updateMiniQuest(dt: number) {
    const q = this.miniQuest;
    const d = this.mqDef;
    if (!q || !d || this.mqDone) return;
    const pc = cellOf(this.player.pos);
    switch (q.kind) {
      case "candles": {
        // Mumlar sönük başlar; üstünden geçince 10 sn yanar. HEPSİ AYNI ANDA
        // yanıkken tamamlanır (yananlar sönmeden hepsini yakmalısın → rota bulmacası).
        for (const m of q.markers) {
          if (m.x === pc.x && m.y === pc.y && !(m.litUntil && m.litUntil > this.time)) {
            m.litUntil = this.time + 10;
            this.events.push("pickup");
          }
        }
        const allLit = q.markers.every((m) => m.litUntil && m.litUntil > this.time);
        if (allLit && q.markers.length > 0) this.grantMQReward();
        break;
      }
      case "bloodtrail": {
        let all = true;
        for (const m of q.markers) {
          if (!m.done && m.x === pc.x && m.y === pc.y) {
            m.done = true;
            this.events.push("pickup");
          }
          if (!m.done) all = false;
        }
        if (all && q.markers.length > 0) this.grantMQReward();
        break;
      }
      case "ring": {
        const m = q.markers[0];
        if (m && !m.done && m.x === pc.x && m.y === pc.y) {
          m.done = true;
          // Yüzük laneti: bir gelin delirir ve hızlanır (risk/ödül)
          const target = this.zombies.find((z) => (z.speedMul ?? 1) === 1) ?? this.zombies[0];
          if (target) {
            target.speedMul = 1.15;
            target.aware = true;
            target.lastSeen = { x: pc.x, y: pc.y };
            target.seenTimer = 0;
          }
          this.grantMQReward(); // ödül: +2 para
        }
        break;
      }
      case "bell": {
        const m = q.markers[0];
        if (m && !m.done && m.x === pc.x && m.y === pc.y) {
          m.done = true;
          // Çanı çal → gelinler sesin geldiği yere (ÇANA) koşar, seni bırakır.
          // 6 sn dikkat dağılır → sen kaçarsın (mantıklı bir tuzak).
          for (const z of this.zombies) {
            z.distractTimer = 6;
            z.distractTarget = { x: m.x, y: m.y };
            z.aware = false;
            z.path = null;
            z.repathTimer = 0;
          }
          this.grantMQReward();
        }
        break;
      }
      case "darkhall": {
        const m = q.markers[0];
        if (m && !m.done && m.x === pc.x && m.y === pc.y) {
          m.done = true;
          this.grantMQReward();
        }
        break;
      }
      case "mirror": {
        const m = q.markers[0];
        if (!m) break;
        const dp = Math.hypot(m.x + 0.5 - this.player.pos.x, m.y + 0.5 - this.player.pos.y);
        // Aynanın yanında KESİNTİSİZ 5 sn bekle → kehanet: çıkış yönü belirir.
        if (dp <= 1.7) {
          this.mqMirrorNear += dt;
          if (this.mqMirrorNear >= 5) {
            this.mqHintDir = this.computeExitDir();
            this.mqHintUntil = this.time + 20; // yön 20 sn HUD'da kalır
            this.grantMQReward();
          }
        } else {
          this.mqMirrorNear = 0; // uzaklaşınca sayaç sıfırlanır (kesintisiz beklemeli)
        }
        break;
      }
    }
  }

  // Ayna kehaneti: oyuncunun bulunduğu hücreden çıkışa giden İLK adımın yönü
  // (labirenti hesaba katar; en kısa yol yönü). "Sağ/Sol/Yukarı/Aşağı".
  private computeExitDir(): string {
    const distToExit = bfsDistances(this.maze, this.exit);
    const pc = cellOf(this.player.pos);
    const here = distToExit[pc.y]?.[pc.x] ?? -1;
    const opts: { dx: number; dy: number; label: string }[] = [
      { dx: 1, dy: 0, label: "Sağ" },
      { dx: -1, dy: 0, label: "Sol" },
      { dx: 0, dy: -1, label: "Yukarı" },
      { dx: 0, dy: 1, label: "Aşağı" },
    ];
    let best = "";
    let bestD = here >= 0 ? here : Infinity;
    for (const o of opts) {
      const nx = pc.x + o.dx;
      const ny = pc.y + o.dy;
      const d = distToExit[ny]?.[nx];
      if (d !== undefined && d >= 0 && d < bestD) {
        bestD = d;
        best = o.label;
      }
    }
    return best || "?";
  }

  private grantMQReward() {
    const d = this.mqDef;
    if (!d || this.mqDone) return;
    this.mqDone = true;
    if (d.reward.ammo) this.ammoCount += d.reward.ammo;
    if (d.reward.health) this.player.hp = Math.min(PLAYER_MAX_HP, this.player.hp + d.reward.health);
    if (d.reward.score) this.score += Math.round(d.reward.score * this.riskMul);
    // para ödülü coinsEarned'e eklenir (Game kalıcı cüzdana işler)
    if (d.reward.coins) this.coinsEarned += Math.round(d.reward.coins * this.riskMul);
    this.mqRewardMsg = d.title;
    this.events.push("secret");
  }

  // HUD için mini-görev metni (aktifken)
  miniQuestText(): string {
    const q = this.miniQuest;
    const d = this.mqDef;
    if (!q || !d || this.mqDone) return "";
    switch (q.kind) {
      case "candles": {
        const lit = q.markers.filter((m) => m.litUntil && m.litUntil > this.time).length;
        return `${d.icon} ${d.hud} ${lit}/${q.markers.length}`;
      }
      case "mirror":
        return this.mqMirrorNear > 0.2
          ? `${d.icon} Bekle... ${Math.max(0, Math.ceil(5 - this.mqMirrorNear))}s`
          : `${d.icon} ${d.hud}`;
      default:
        return `${d.icon} ${d.hud}`;
    }
  }

  // Ayna kehaneti aktifse HUD'da gösterilecek yön metni ("" = yok)
  exitHintText(): string {
    if (this.mqHintDir && this.time < this.mqHintUntil) {
      return `🪞 Çıkış: ${this.mqHintDir}`;
    }
    return "";
  }

  // Çıkış neden kilitli? (HUD'da çıkış yazısına tıklayınca gösterilir)
  exitLockReason(): string {
    if (this.exitOpen) return "";
    if (this.miniQuest?.kind === "markedkill" && !this.mqDone && this.miniQuest.zone) {
      return "Çıkış kilitli: işaretli ÇEMBERİN içinde bir gelin öldürmelisin.";
    }
    if (this.mission?.collectTarget) return `Çıkış kilitli: ${this.mission.collectTarget} parça topla.`;
    const need = this.mission?.killTarget ?? 1;
    return `Çıkış kilitli: önce ${need} gelini yok et.`;
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
    // Dinamik efektif yarıçap (lastik-bant + kararma)
    this.visible = computeVisible(this.maze, origin, this.flashlight.eff);
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
          // Bölüm geçince para bonusu (Madde: yeni para kazanma + risk çarpanı)
          this.levelClearBonus = Math.round((8 + this.level * 2) * this.riskMul);
          this.coinsEarned += this.levelClearBonus;
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
