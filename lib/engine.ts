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
  generateArena,
  isWall,
  type Maze,
} from "./maze";
import { computeVisible, hasLineOfSight, type VisibleCell } from "./vision";
import { cellOf, dist, tryMove } from "./physics";
import { findPath } from "./pathfind";
import { BRIDE_RADIUS, assignBrideKind, moveBrides, swordHits } from "./brides";
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
import { JOURNAL, getCollected } from "./journal";
import { buildTutorialCorridor, tutorialBeatIndices, TUTORIAL_BEATS, type TutItemKind } from "./tutorial";
import type { DictKey } from "./i18n/dict";

// EKRANA BASILAN METİN. Motor React değil → çeviremez; bu yüzden metin yerine
// ANAHTAR (+ varsa değişkenler) döndürür. Game.tsx bunu `t(k, v)` ile çevirir.
export type Txt = { k: DictKey; v?: Record<string, string | number> };

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
export const HEALTH_RESPAWN_SEC = 30; // toplanan can paketi kaç saniye sonra geri doğar
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
  sword?: boolean; // KILIÇ savurma (mermi tüketmez, kısa menzil)
  sprint?: boolean; // Faz C: koşma (stamina tükenir)
  ax?: number; // analog joystick yatay (-1..1), mobil
  ay?: number; // analog joystick dikey (-1..1), mobil
};

// Tek kişilik zorluk seviyesi — değerler TUNING.diff'te (online ile ORTAK tek kaynak;
// eskiden burada ayrı bir tablo vardı ve online'dakiyle kayabiliyordu).
export type Diff = "kolay" | "orta" | "zor";
const DIFF_MULT = TUNING.diff;

// Ses için ayrık olaylar. Motor bunları biriktirir, Game katmanı her kare boşaltıp çalar.
export type SoundEvent =
  | "shot"
  | "sword" // kılıç savurma
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
  maze!: Maze;
  player!: Player;
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
  killedQueen = false; // Faz F: bu bölümde kraliçe öldürüldü mü (başarım)
  noteItem: Ammo | null = null; // Faz F: günlük/not sayfası eşyası
  noteId = -1; // toplanınca açılacak günlük girişi
  noteTaken = false; // bu bölümün notu toplandı mı
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
  mqRewardMsg: DictKey | "" = ""; // tamamlanınca gösterilecek toast ANAHTARI (Game çevirip temizler)
  private mqMirrorNear = 0; // ayna: yanında kesintisiz geçirilen süre (sn)
  mqHintDir: DictKey | "" = ""; // ayna kehaneti: çıkış yönü ANAHTARI (game.dir.*)
  private mqHintUntil = 0; // yön ipucunun HUD'da kalacağı ana kadar (sn)
  radarUntil = 0; // radar oku: bu ana kadar ekranda ok gösterilir (sn)
  radarAngle = 0; // radar oku yönü (radyan)

  // --- Görev modu ---
  mission: Mission | null = null;
  collected = 0; // toplanan parça sayısı
  noFire = false; // ateş yasak mı (sessiz görev)
  missionFailReason: "" | "time" | "death" = ""; // başarısızlık nedeni (HUD/ekran)
  exit!: Vec;
  exitOpen = false;
  // Faz E: kaçış bölümü (çıkış çöküyor — geri sayımla kaç)
  escape = false;
  escapeTime = 0; // bu ana kadar çıkışa ulaşmalısın (sn)
  crushed = false; // süre dolup çıkış çöktüğü için mi öldün (mesaj ayrımı)
  // Asker (kurtarılabilir müttefik): zincirini çöz → seni takip eder + 3 sn'de bir
  // gelinlere ateş eder. Harita boyutuna göre 1-2 asker; AYNI ANDA tek asker kurtarabilirsin,
  // o ölünce başka yerde doğar ve bir başkasını (varsa) kurtarabilirsin.
  soldiers: {
    pos: Vec;
    state: "locked" | "escort" | "dead";
    hp: number;
    fireCd: number;
    respawnAt: number;
    path?: Vec[] | null;
    repath?: number;
    hired?: boolean; // dükkandan kiralanan müttefik (senin renk/isminle; yanında dirilir)
  }[] = [];
  soldierRescued = false; // bu bölümde en az bir asker kurtarıldı mı (başarım/bonus)
  get hasEscort(): boolean {
    return this.soldiers.some((s) => s.state === "escort");
  }
  ammoCount = 0;
  zombiesKilled = 0;
  wave = 1; // Arena: geçilen dalga (skor)
  coinsEarned = 0; // bu bölümde kazanılan para (Game kalıcı cüzdana işler)
  levelClearBonus = 0; // bölüm bitince verilen para bonusu (ekranda göster)
  private riskMul = 1; // Madde 18: zorluğa göre para/puan çarpanı
  score: number;
  lives: number;
  level: number;
  time = 0;
  status: GameStatus = "playing";

  // kalıcı "görülen" ızgarası (hafıza sisi)
  seen!: boolean[][];
  visible: VisibleCell[] = [];

  warnTimer = 0; // "önce bir zombi öldür" uyarısı
  hurtFlash = 0; // hasar alınca kırmızı flaş
  diffDmgMul = 1; // zorluğa göre gelin GÜCÜ (temas hasarı çarpanı)
  swordCd = 0; // kılıç bekleme
  swordSwing = 0; // >0 → savurma animasyonu sürüyor (çizim okur)
  playerMoving = false; // yürüme animasyonu için
  events: SoundEvent[] = []; // bu kare oluşan ses olayları
  tension = 0; // 0..1 en yakın farkında zombiye göre gerilim (kalp atışı/ambiyans)
  bloodStains: { x: number; y: number; r: number; seed: number }[] = []; // kalıcı kan izleri

  // --- Rehberli 1. Bölüm (tutorial): kampanya level 1 && !mission ---
  tutorial = false;
  tutHint: DictKey | "" = ""; // ekranda gösterilen rehber ipucunun ANAHTARI (Game çevirir)
  tutHealthShown = false; // can barı görünür mü (tutorial'da baştan true)
  tutPointShop = false; // dükkânı işaret et
  tutEquip: "" | "sword" | "gun" = ""; // senaryo silahı ELE kuşandırır (Game okur+uygular)
  tutItems: { kind: TutItemKind; cell: Vec; taken: boolean }[] = []; // yerde çizilen eşyalar
  private tutSwordLocked = false; // kılıç bulunana kadar savurulamaz
  private tutPath: Vec[] = [];
  private tutBeatIdx: number[] = [];
  private tutNextBeat = 0;
  private tutMaxProgress = -1;

  private fireCd = 0;
  private nextId = 1;

  constructor(
    level: number,
    score: number,
    lives: number,
    mission: Mission | null = null,
    withPhoto = false,
    diff: Diff = "orta",
    hiredSoldier = false // dükkandan asker kiralandıysa yanında escort olarak başla
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
      if ((mission.endless || mission.arena) && mission.escalateEvery) this.nextEscalate = mission.escalateEvery;
      // ARENA: gepgeniş AÇIK alan + gelinler YARIM hız + geniş görüş (labirent yok)
      if (mission.arena) {
        cfg.cols = 25;
        cfg.rows = 25;
        cfg.zombieSpeed = cfg.zombieSpeed * 0.5;
        cfg.visionRadius = Math.min(10, cfg.visionRadius + 3);
      }
      // Faz E: kaçış görevi — çıkış baştan açık + çökme geri sayımı (%10 daha bol süre)
      if (mission.escape) {
        this.escape = true;
        this.exitOpen = true;
        this.escapeTime = (mission.escapeSeconds ?? mission.timeLimit ?? 60) * 1.1;
      }
    }
    // ZORLUK: TÜM oyun türlerinde uygulanır (normal, arena, bitmeyen gece...).
    // Eskiden `else if` idi → görev/arena/endless modları zorluğu HİÇ görmüyordu; ayrıca
    // zekâ ve gelin GÜCÜ (hasar) hiç ölçeklenmiyordu.
    {
      const dm = DIFF_MULT[diff];
      this.diffDmgMul = dm.dmg; // temas hasarı çarpanı (gelin gücü)
      if (diff !== "orta") {
        cfg = { ...cfg };
        cfg.zombies = Math.max(1, Math.round(cfg.zombies * dm.count));
        // Zor'da bile gelin hızı tavanı (oyuncunun %8 altı) asla aşılmaz
        cfg.zombieSpeed = Math.min(TUNING.brideSpeedCap, cfg.zombieSpeed * dm.speed);
        cfg.visionRadius = Math.max(3, Math.round(cfg.visionRadius * dm.vision));
        cfg.intelligence = Math.max(0, Math.min(1, cfg.intelligence + dm.intel));
      }
    }
    this.config = cfg;
    // Dinamik fener/görüş (Madde 4,5) — dip anında ses ipucu
    this.flashlight = new Flashlight(this.config.visionRadius);
    this.flashlight.onDip = () => this.events.push("flicker");
    // REHBERLİ 1. BÖLÜM: kampanya level 1 (görev değil) → labirent yerine düz koridor +
    // senaryo. Normal harita/çıkış/gelin/eşya üretimi ATLANIR (setupTutorial her şeyi kurar).
    if (level === 1 && !mission) {
      this.setupTutorial();
      return;
    }
    this.maze = mission?.arena
      ? generateArena(this.config.cols, this.config.rows)
      : generateMaze(
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
    // Arena: geniş alana BOL mermi serpiştir (sık sık bulunsun); normalde zombi+tampon
    const ammoTotal = mission?.arena
      ? Math.round(floors.length * 0.05)
      : this.config.zombies + this.config.ammoBuffer;
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
    const healthTotal = mission?.arena ? Math.round(floors.length * 0.025) : 2;
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
      // Faz E: bölüm başına EN FAZLA bir özel durum — kaçış > rehin > mini-görev.
      if (this.level >= 3 && Math.random() < 0.22) {
        // Kaçış bölümü: çıkış baştan açık, çökme geri sayımı (%10 daha bol süre)
        this.escape = true;
        this.exitOpen = true;
        this.escapeTime = ((best / PLAYER_SPEED) * 1.7 + 5) * 1.1;
      } else if (this.level >= 2 && Math.random() < 0.28) {
        // Askerler: harita büyükse 2, değilse 1 — çıkışa/başlangıca uzak hücrelerde kilitli
        const count = this.maze.cols >= 21 ? 2 : 1;
        const sCells = this.shuffle(
          floors.filter(
            (c) =>
              distMap[c.y][c.x] >= 6 &&
              !(c.x === spawnCell.x && c.y === spawnCell.y) &&
              !(c.x === exit.x && c.y === exit.y)
          )
        );
        for (let i = 0; i < count && sCells[i]; i++) {
          this.soldiers.push({
            pos: { x: sCells[i].x + 0.5, y: sCells[i].y + 0.5 },
            state: "locked",
            hp: TUNING.soldierMaxHp,
            fireCd: 0,
            respawnAt: 0,
          });
        }
      } else {
        const plan = planMiniQuest(Math.random, floors, spawnCell, this.exit, MQ_KINDS_SP);
        if (plan) {
          this.miniQuest = plan;
          this.mqDef = MQ_DEFS[plan.kind];
        }
      }
      // Faz F: günlük/not sayfası — kaçış dışı bölümlerde seyrek (bölüme göre giriş)
      if (!this.escape && Math.random() < 0.4) {
        const used = new Set([
          ...this.ammoItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
          ...this.healthItems.map((a) => a.cell.y * this.maze.cols + a.cell.x),
        ]);
        const nCells = this.shuffle(
          floors.filter(
            (c) =>
              !(c.x === spawnCell.x && c.y === spawnCell.y) &&
              !(c.x === exit.x && c.y === exit.y) &&
              !used.has(c.y * this.maze.cols + c.x)
          )
        );
        if (nCells[0]) {
          this.noteItem = { id: this.nextId++, cell: { x: nCells[0].x, y: nCells[0].y }, taken: false };
          // Henüz TOPLANMAMIŞ bir günlük sayfası seç (10 bölümde 14 sayfa tamamlanabilsin;
          // seviye-tabanlı sabit indeks 10-13'ü hiç göstermezdi). Hepsi toplanınca sıradan seç.
          const collected = getCollected();
          const remaining = JOURNAL.map((e) => e.id).filter((id) => !collected.includes(id));
          this.noteId = remaining.length
            ? remaining[(this.level - 1) % remaining.length]
            : (this.level - 1) % JOURNAL.length;
        }
      }
    }
    // Faz D: özel gelin türleri (çağıran/bölünen/tırmanan/kraliçe).
    // Normal tek kişiliğe EK OLARAK hayatta kalma modlarında da (Arena / Bitmeyen Gece /
    // Kör Gece / Sürü Gecesi) çıkar — eskiden `if (!mission)` içindeydi, yani o modlarda
    // hiç görünmüyordu. Hikâye görevleri (Karanlık Görevler) kendi tasarımıyla kalır.
    if (!mission || mission.arena || mission.endless) {
      this.assignSpecialKinds();
    }

    // Görev: "askeri bulup çıkışa götür" — 1 asker yerleştir (çıkışa uzak)
    if (mission?.escort) {
      const sCells = this.shuffle(
        floors.filter(
          (c) =>
            distMap[c.y][c.x] >= 6 &&
            !(c.x === spawnCell.x && c.y === spawnCell.y) &&
            !(c.x === exit.x && c.y === exit.y)
        )
      );
      if (sCells[0]) {
        this.soldiers.push({
          pos: { x: sCells[0].x + 0.5, y: sCells[0].y + 0.5 },
          state: "locked",
          hp: TUNING.soldierMaxHp,
          fireCd: 0,
          respawnAt: 0,
        });
      }
    }

    // Dükkan askeri (kiralık müttefik): oyuncunun hemen yanında ESCORT olarak başlar,
    // seni takip eder + gelinlere ateş eder. Ölürse yanında yeniden doğar (sen ölene dek).
    if (hiredSoldier) {
      const near = this.shuffle(
        floors.filter((c) => {
          const d = Math.abs(c.x - spawnCell.x) + Math.abs(c.y - spawnCell.y);
          return d >= 1 && d <= 3 && !(c.x === exit.x && c.y === exit.y);
        })
      );
      const cell = near[0] ?? spawnCell;
      this.soldiers.push({
        pos: { x: cell.x + 0.5, y: cell.y + 0.5 },
        state: "escort",
        hp: TUNING.soldierMaxHp,
        fireCd: 1,
        respawnAt: 0,
        hired: true,
      });
    }
  }

  // Faz D: bazı normal gelinleri özel türlere çevir + boss bölümlerinde kraliçe ekle.
  private assignSpecialKinds() {
    // Hayatta kalma modlarında (arena/endless) this.level HEP 1'dir — tür eşikleri
    // (>=2, >=3, >=4) bu yüzden hiç tutmazdı. Zorlukta da kullanılan levelBase'e bak.
    const L = this.mission ? this.mission.levelBase : this.level;
    const normals = this.shuffle(this.zombies.filter((z) => z.kind === "normal"));
    let idx = 0;
    const take = () => normals[idx++];
    if (L >= 2) {
      const s = take();
      if (s) s.kind = "splitter";
    }
    if (L >= 3) {
      const s2 = take();
      if (s2) s2.kind = "splitter";
      const c = take();
      if (c) {
        c.kind = "caller";
        c.callTimer = TUNING.callerCooldown;
      }
    }
    if (L >= 4) {
      const cl = take();
      if (cl) cl.kind = "climber";
    }
    // Kraliçe (mini-boss): her queenEveryLevels bölümde bir EKSTRA
    if (L % TUNING.queenEveryLevels === 0) this.spawnQueen();
  }

  private spawnQueen() {
    const far = this.floors.filter(
      (c) =>
        !(c.x === this.exit.x && c.y === this.exit.y) &&
        Math.hypot(c.x + 0.5 - 1.5, c.y + 0.5 - 1.5) >= 6
    );
    const pool = far.length ? far : this.floors;
    const cell = this.shuffle(pool)[0];
    if (!cell) return;
    this.zombies.push({
      id: this.nextId++,
      pos: { x: cell.x + 0.5, y: cell.y + 0.5 },
      hp: TUNING.queenHp,
      maxHp: TUNING.queenHp,
      aware: false,
      lastSeen: null,
      seenTimer: LOSE_AGGRO_TIME,
      wanderDir: this.randomDir(),
      wanderTimer: 0,
      path: null,
      repathTimer: 0,
      kind: "queen",
      speedMul: TUNING.queenSpeedMul, // yavaş ama asla durmaz
      dmgMul: TUNING.queenDmgMul, // 1.5 kat hasar
      scale: TUNING.queenScale, // büyük (uzaktan fark edilir)
    });
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
    if (this.swordCd > 0) this.swordCd -= dt;
    if (this.swordSwing > 0) this.swordSwing -= dt;
    if (this.warnTimer > 0) this.warnTimer -= dt;
    if (this.hurtFlash > 0) this.hurtFlash -= dt;

    this.updatePlayer(dt, input);
    if (this.tutorial) this.updateTutorial(); // rehberli bölüm: beat'leri ilerlemeye göre tetikle
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
    this.pickupNote();
    this.pickupVeil();
    this.updateMucus(dt);
    this.updateMiniQuest(dt);
    this.updateSoldiers(dt);
    this.computeVision();
    this.checkExit();
    this.checkMission();
    this.checkEscape();
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
    // Arena: dalga hayatta kalma — her 6 öldürmede bir dalga geçilir (burst + para bonusu)
    if (m.arena) {
      const KILLS_PER_WAVE = 6;
      const targetWave = Math.floor(this.zombiesKilled / KILLS_PER_WAVE) + 1;
      if (targetWave > this.wave) {
        this.wave = targetWave;
        const burst = 1 + Math.floor(this.wave / 2); // dalga büyüdükçe daha çok gelin
        for (let i = 0; i < burst; i++) this.spawnBrideFar();
        this.coinsEarned += 3 + this.wave; // dalga bonusu (para)
        this.events.push("levelclear"); // dalga geçiş sesi
      }
      this.score = this.wave; // skor = geçilen dalga
      // tıkanmayı önlemek için zamanla da hafif ekstra doğuş
      if (this.time >= this.nextEscalate) {
        this.spawnBrideFar();
        this.nextEscalate += m.escalateEvery ?? 15;
      }
      return;
    }
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

    // KILIÇ: mermi tüketmez, menzil kısa. Baktığın yöndeki koni içinde EN YAKIN
    // gelinleri biçer — tek darbede en fazla TUNING.swordMaxTargets (2).
    if (input.sword && !this.tutSwordLocked && this.swordCd <= 0) {
      this.swordCd = TUNING.swordCd;
      this.swordSwing = TUNING.swordSwingSec;
      if (this.veilUntil > this.time) this.veilUntil = 0; // saldırı = duvak bozulur
      this.events.push("sword");
      const hits = this.swordTargets();
      for (const z of hits) {
        // Kraliçe çok canlı: kılıç ona swordQueenDmg kadar hasar verir, diğerleri tek darbe.
        z.hp -= z.kind === "queen" ? TUNING.swordQueenDmg : 1;
        if (z.hp <= 0) this.killZombie(z);
      }
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

  // Kılıç menzilindeki (baktığın yöndeki koni) gelinler — en yakından başlayarak,
  // en fazla swordMaxTargets tane. Online host da AYNI mantığı kullanır (swordHits).
  swordTargets(): Zombie[] {
    return swordHits(this.zombies, this.player.pos, this.player.dir);
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
    // Faz D "splitter": ölünce iki küçük, hızlı yavruya bölünür (tekrar bölünmez).
    // Yavrular gelinin TAM konumunda doğar, duvara girmeden hafifçe ayrılır (yoksa
    // duvara saplanıp hareket edemiyorlardı).
    if (z.kind === "splitter" && !z.noSplit) {
      const pc = { x: Math.floor(this.player.pos.x), y: Math.floor(this.player.pos.y) };
      for (let k = 0; k < 2; k++) {
        const child: Zombie = {
          id: this.nextId++,
          pos: { x: z.pos.x, y: z.pos.y },
          hp: 1,
          aware: true,
          lastSeen: { x: pc.x, y: pc.y },
          seenTimer: 0,
          wanderDir: this.randomDir(),
          wanderTimer: 0,
          path: null,
          repathTimer: 0,
          kind: "normal",
          noSplit: true,
          speedMul: TUNING.splitChildSpeedMul,
          scale: TUNING.splitChildScale, // daha küçük
          dmgMul: TUNING.splitChildDmgMul, // %40 az hasar
        };
        tryMove(this.maze, child.pos, ZOMBIE_RADIUS, k === 0 ? -0.28 : 0.28, 0); // duvara girmeden ayır
        this.zombies.push(child);
      }
    }
    // Faz D "queen": ekstra para + puan ödülü + başarım bayrağı
    if (z.kind === "queen") {
      this.coinsEarned += Math.round(TUNING.queenReward * this.riskMul);
      this.score += Math.round(300 * this.riskMul);
      this.killedQueen = true;
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
        // kraliçe 1.5x, yavru 0.6x · diffDmgMul = zorluk (Kolay 0.7 / Zor 1.4)
        this.player.hp -= CONTACT_DPS * (z.dmgMul ?? 1) * this.diffDmgMul * dt;
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
    this.updateCallers(dt);
  }

  // Faz D "caller": oyuncuyu fark eden çağıran gelin, cooldown'la yakındaki uyumayan
  // gelinleri uyandırır (çığlık). Baskıyı artırır ama art arda spam yapmaz.
  private updateCallers(dt: number) {
    for (const z of this.zombies) {
      if (z.kind !== "caller") continue;
      if (z.screamT && z.screamT > 0) z.screamT -= dt;
      if (z.callTimer == null) z.callTimer = TUNING.callerCooldown;
      z.callTimer -= dt;
      if (z.aware && z.callTimer <= 0) {
        z.callTimer = TUNING.callerCooldown;
        z.screamT = 0.7;
        this.events.push("whisper"); // çığlık ipucu
        const pc = { x: Math.floor(this.player.pos.x), y: Math.floor(this.player.pos.y) };
        for (const o of this.zombies) {
          if (o === z || o.aware) continue;
          if (dist(o.pos, z.pos) <= TUNING.callerRadius) {
            o.aware = true;
            o.lastSeen = { x: pc.x, y: pc.y };
            o.seenTimer = 0;
            o.path = null;
            o.repathTimer = 0;
          }
        }
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
    const pcell = cellOf(this.player.pos);
    const full = this.player.hp >= PLAYER_MAX_HP;
    for (const h of this.healthItems) {
      if (h.taken) {
        // toplanan can paketi bir süre sonra haritada geri doğar (mermi gibi)
        if (this.time - (h.takenAt ?? 0) >= HEALTH_RESPAWN_SEC) h.taken = false;
        continue;
      }
      if (full) continue; // canın tamsa alma (israf etme); respawn yukarıda işlendi
      if (h.cell.x === pcell.x && h.cell.y === pcell.y) {
        h.taken = true;
        h.takenAt = this.time;
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

  // Envanter: duvağı aktive et — birkaç sn görünmez ol (gelinler göremez; ateş bozar)
  activateVeil(seconds = TUNING.veilSec) {
    this.veilUntil = this.time + seconds;
    this.events.push("veil");
  }

  // --- REHBERLİ 1. BÖLÜM ---
  // Koridor + senaryo kurulumu (constructor'dan çağrılır; normal üretim atlanır).
  private setupTutorial() {
    this.tutorial = true;
    const { maze, path } = buildTutorialCorridor();
    this.maze = maze;
    this.tutPath = path;
    this.floors = path.slice();
    const s = path[0];
    this.player = { pos: { x: s.x + 0.5, y: s.y + 0.5 }, dir: { x: 1, y: 0 }, hp: PLAYER_MAX_HP };
    this.seen = Array.from({ length: maze.rows }, () =>
      Array.from({ length: maze.cols }, () => false)
    );
    this.exit = path[path.length - 1];
    this.exitOpen = false; // "openexit" beat açar
    this.zombies = []; // yalnız senaryo doğurur
    this.ammoItems = [];
    this.healthItems = [];
    this.veilItems = [];
    this.ammoCount = 0;
    this.tutSwordLocked = true; // kılıç bulunana kadar
    this.tutHealthShown = true; // gelinler saldırır → can barı BAŞTAN görünür
    this.invulnUntil = this.time + 1.5; // yalnız kısa doğuş dokunulmazlığı (normal)
    this.tutBeatIdx = tutorialBeatIndices(path.length);
    this.tutNextBeat = 0;
    this.tutMaxProgress = -1;
    // Yerde çizilecek eşyalar (kılıç/tabanca/duvak) ilgili beat hücrelerine
    const cellFor = (action: string): Vec | null => {
      const bi = TUTORIAL_BEATS.findIndex((b) => b.action === action);
      return bi >= 0 ? path[this.tutBeatIdx[bi]] : null;
    };
    for (const kind of ["sword", "gun", "veil"] as TutItemKind[]) {
      const c = cellFor(kind);
      if (c) this.tutItems.push({ kind, cell: { x: c.x, y: c.y }, taken: false });
    }
    this.tutHint = TUTORIAL_BEATS[0].hint;
  }

  // Her karede: oyuncunun yol ilerlemesini ölç, geçilen beat'leri tetikle.
  private updateTutorial() {
    const p = this.player.pos;
    let nearest = Math.max(0, this.tutMaxProgress);
    let bestD = Infinity;
    for (let i = 0; i < this.tutPath.length; i++) {
      const c = this.tutPath[i];
      const d = Math.hypot(c.x + 0.5 - p.x, c.y + 0.5 - p.y);
      if (d < bestD) {
        bestD = d;
        nearest = i;
      }
    }
    if (nearest > this.tutMaxProgress) this.tutMaxProgress = nearest;
    while (
      this.tutNextBeat < this.tutBeatIdx.length &&
      this.tutMaxProgress >= this.tutBeatIdx[this.tutNextBeat]
    ) {
      this.fireTutBeat(this.tutNextBeat);
      this.tutNextBeat++;
    }
  }

  private fireTutBeat(i: number) {
    const beat = TUTORIAL_BEATS[i];
    this.tutHint = beat.hint;
    const spawnAhead = (offset: number) => {
      const idx = Math.min(this.tutPath.length - 1, this.tutBeatIdx[i] + offset);
      const c = this.tutPath[idx];
      this.zombies.push({
        id: this.nextId++,
        pos: { x: c.x + 0.5, y: c.y + 0.5 },
        hp: 1,
        aware: true,
        lastSeen: null,
        seenTimer: LOSE_AGGRO_TIME,
        wanderDir: this.randomDir(),
        wanderTimer: 0,
        path: null,
        repathTimer: 0,
      });
    };
    const takeItem = (kind: TutItemKind) => {
      const it = this.tutItems.find((t) => t.kind === kind);
      if (it) it.taken = true;
    };
    switch (beat.action) {
      case "start":
        break;
      case "sword":
        this.tutSwordLocked = false;
        this.tutEquip = "sword"; // kılıç ELE kuşanılır (kullanıma hazır)
        takeItem("sword");
        this.events.push("pickup");
        break;
      case "gun":
        this.ammoCount += 8;
        this.tutEquip = "gun"; // tabanca ELE kuşanılır (kullanıma hazır)
        takeItem("gun");
        this.events.push("pickup");
        break;
      case "bride":
        spawnAhead(4);
        break;
      case "sprint":
        break; // yalnız bilgi ipucu
      case "veil":
        takeItem("veil");
        this.activateVeil(); // otomatik görünmez ol
        this.events.push("pickup");
        break;
      case "brideVeil":
        spawnAhead(3); // duvaklıyken doğar; etkisi geçince saldırır
        break;
      case "shop":
        this.tutPointShop = true;
        break;
      case "openexit":
        this.exitOpen = true;
        this.events.push("dooropen");
        break;
    }
  }

  // Envanter: radarı aktive et — 1.5 sn ekranda çıkışa dönük OK göster (metin yok)
  activateRadar() {
    // Radar da çıkışın GERÇEK yönünü (mutlak açı) gösterir — 1.5 sn ok.
    this.radarAngle = this.exitBearing();
    this.radarUntil = this.time + 1.5;
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
          if (this.mqMirrorNear >= 5 && !this.mqDone) {
            // Kehanet: çıkışın GERÇEK yönü (oyuncudan çıkışa doğru mutlak açı). Ok + yön
            // metni 1.5 sn görünür. (Labirent ilk-adımı değil; "çıkış şu yönde".)
            const a = this.exitBearing();
            this.radarAngle = a;
            this.radarUntil = this.time + 1.5;
            this.mqHintDir = this.dirLabelFromAngle(a);
            this.mqHintUntil = this.time + 1.5;
            this.grantMQReward();
          }
        } else {
          this.mqMirrorNear = 0; // uzaklaşınca sayaç sıfırlanır (kesintisiz beklemeli)
        }
        break;
      }
    }
  }

  // Oyuncudan çıkışa doğru MUTLAK açı (ekran koordinatı: +x sağ, +y aşağı).
  private exitBearing(): number {
    return Math.atan2(
      this.exit.y + 0.5 - this.player.pos.y,
      this.exit.x + 0.5 - this.player.pos.x
    );
  }

  // Mutlak açı → en yakın 4 yön ANAHTARI (Sağ/Aşağı/Sol/Yukarı).
  private dirLabelFromAngle(a: number): DictKey {
    const deg = (a * 180) / Math.PI;
    if (deg >= -45 && deg < 45) return "game.dir.right";
    if (deg >= 45 && deg < 135) return "game.dir.down";
    if (deg >= -135 && deg < -45) return "game.dir.up";
    return "game.dir.left";
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

  // HUD için mini-görev metni (aktifken). Emoji YOK — HUD çipi kendi line-icon'unu çizer.
  // null = gösterilecek bir şey yok.
  miniQuestText(): Txt | null {
    const q = this.miniQuest;
    const d = this.mqDef;
    if (!q || !d || this.mqDone) return null;
    switch (q.kind) {
      case "candles": {
        const lit = q.markers.filter((m) => m.litUntil && m.litUntil > this.time).length;
        return { k: "game.mq.candles.prog", v: { a: lit, b: q.markers.length } };
      }
      case "mirror":
        return this.mqMirrorNear > 0.2
          ? { k: "game.mq.mirror.wait", v: { n: Math.max(0, Math.ceil(5 - this.mqMirrorNear)) } }
          : { k: d.hud };
      default:
        return { k: d.hud };
    }
  }

  // Ayna kehaneti aktifse gösterilecek YÖN anahtarı ("" = kehanet yok).
  // Çerçeve metnini ("Çıkış: {d}") Game.tsx kurar.
  exitHintText(): DictKey | "" {
    if (this.mqHintDir && this.time < this.mqHintUntil) return this.mqHintDir;
    return "";
  }

  // Çıkış neden kilitli? (HUD'da çıkış ikonuna tıklayınca gösterilir; null = kilitli değil)
  exitLockReason(): Txt | null {
    if (this.exitOpen) return null;
    if (this.miniQuest?.kind === "markedkill" && !this.mqDone && this.miniQuest.zone) {
      return { k: "game.exit.circle" };
    }
    if (this.mission?.collectTarget) {
      return { k: "game.exit.pieces", v: { n: this.mission.collectTarget } };
    }
    return { k: "game.exit.kills", v: { n: this.mission?.killTarget ?? 1 } };
  }

  // Asker: kilitliyken yakınına gelip (başka escort yoksa) kurtar → seni takip eder
  // + 3 sn'de bir menzildeki gelinlere ateş eder. Gelin değerse ölür, sonra başka
  // yerde yeniden kilitli doğar (yalnız o zaman başka birini kurtarabilirsin).
  private updateSoldiers(dt: number) {
    if (this.soldiers.length === 0) return;
    let escortTaken = this.soldiers.some((s) => s.state === "escort"); // aynı karede 2 kurtarılmasın
    for (const s of this.soldiers) {
      if (s.state === "dead") {
        if (this.time >= s.respawnAt) {
          if (s.hired) {
            // Kiralık asker: oyuncunun yakınında ESCORT olarak yeniden doğar (kilitli değil)
            const cell = this.farCellFromPlayer(2) ?? cellOf(this.player.pos);
            s.pos = { x: cell.x + 0.5, y: cell.y + 0.5 };
            s.state = "escort";
            s.hp = TUNING.soldierMaxHp;
            s.fireCd = 1;
            s.path = null;
          } else {
            const cell = this.farCellFromPlayer(6);
            if (cell) {
              s.pos = { x: cell.x + 0.5, y: cell.y + 0.5 };
              s.state = "locked";
              s.hp = TUNING.soldierMaxHp; // yeniden doğunca tam can
              s.path = null;
            }
          }
        }
        continue;
      }
      if (s.state === "locked") {
        if (!escortTaken && dist(s.pos, this.player.pos) < 0.9) {
          s.state = "escort";
          s.fireCd = 1;
          escortTaken = true;
          this.soldierRescued = true;
          this.events.push("secret");
        }
        continue;
      }
      // escort: gelin teması canını azaltır (tek temasta ölmez — 1.5x dayanıklılık)
      let touching = false;
      for (const z of this.zombies) {
        if (dist(z.pos, s.pos) < ZOMBIE_RADIUS + PLAYER_RADIUS) {
          touching = true;
          break;
        }
      }
      if (touching) {
        s.hp -= CONTACT_DPS * dt;
        if (this.hurtFlash <= 0) this.events.push("hurt");
        if (s.hp <= 0) {
          s.state = "dead";
          s.respawnAt = this.time + TUNING.soldierRespawnSec;
          continue;
        }
      }
      // takip (labirentte yol bularak, oyuncunun biraz gerisinde)
      const d = dist(s.pos, this.player.pos);
      if (d > 1.2) {
        s.repath = (s.repath ?? 0) - dt;
        if (!s.path || s.path.length === 0 || (s.repath ?? 0) <= 0) {
          s.path = findPath(this.maze, cellOf(s.pos), cellOf(this.player.pos));
          s.repath = 0.4;
        }
        if (s.path && s.path.length > 0) {
          const next = s.path[0];
          const tp = { x: next.x + 0.5, y: next.y + 0.5 };
          const dx = tp.x - s.pos.x;
          const dy = tp.y - s.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          tryMove(this.maze, s.pos, PLAYER_RADIUS, (dx / len) * PLAYER_SPEED * 0.98 * dt, (dy / len) * PLAYER_SPEED * 0.98 * dt);
          if (dist(s.pos, tp) < 0.15) s.path.shift();
        }
      }
      // ateş (3 sn'de bir): menzilde + görüş hattı açık en yakın gelin
      s.fireCd -= dt;
      if (s.fireCd <= 0) {
        const scell = cellOf(s.pos);
        let target: Zombie | null = null;
        let td = Infinity;
        for (const z of this.zombies) {
          const dz = dist(z.pos, s.pos);
          if (dz <= TUNING.soldierRange && dz < td && hasLineOfSight(this.maze, scell, cellOf(z.pos))) {
            td = dz;
            target = z;
          }
        }
        if (target) {
          s.fireCd = TUNING.soldierFireCd;
          const dx = target.pos.x - s.pos.x;
          const dy = target.pos.y - s.pos.y;
          const len = Math.hypot(dx, dy) || 1;
          this.bullets.push({
            id: this.nextId++,
            pos: { x: s.pos.x, y: s.pos.y },
            vel: { x: (dx / len) * BULLET_SPEED, y: (dy / len) * BULLET_SPEED },
            life: BULLET_LIFE,
          });
          this.events.push("shot");
        }
      }
    }
  }

  // Oyuncudan en az minD uzak rastgele bir zemin hücresi (asker yeniden doğuşu için)
  private farCellFromPlayer(minD: number): Vec | null {
    for (let i = 0; i < 40; i++) {
      const c = this.floors[Math.floor(Math.random() * this.floors.length)];
      if (!c) continue;
      if (c.x === this.exit.x && c.y === this.exit.y) continue;
      if (Math.hypot(c.x + 0.5 - this.player.pos.x, c.y + 0.5 - this.player.pos.y) >= minD) return c;
    }
    return null;
  }

  // Faz E: kaçış bölümü — süre dolunca çıkış çöker (bir can gider).
  private checkEscape() {
    if (!this.escape || this.status !== "playing") return;
    if (this.time > this.escapeTime) {
      this.player.hp = 0; // çıkış çöktü → ezildin (checkDeath can düşürür)
      this.escape = false; // tekrar tetiklenmesin
      this.crushed = true; // ölüm sebebi: çıkış çöktü ("seni buldular" değil)
    }
  }

  // HUD: kaçış geri sayımı ("" = kaçış bölümü değil)
  escapeText(): string {
    if (!this.escape) return "";
    return `${Math.max(0, Math.ceil(this.escapeTime - this.time))}s`;
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

  // Faz F: günlük sayfası topla
  private pickupNote() {
    const n = this.noteItem;
    if (!n || n.taken) return;
    const pc = cellOf(this.player.pos);
    if (n.cell.x === pc.x && n.cell.y === pc.y) {
      n.taken = true;
      this.noteTaken = true;
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
    // Hayatta kalma / sonsuz / arena modunda çıkış yok — sadece dayanılır
    if (this.mission?.surviveTime || this.mission?.endless || this.mission?.arena) return;
    const pcell = cellOf(this.player.pos);
    if (pcell.x === this.exit.x && pcell.y === this.exit.y) {
      if (this.exitOpen) {
        if (this.mission) {
          // Escort görevi: askeri yanında getirmediysen çıkış sayılmaz
          if (this.mission.escort && !this.hasEscort) {
            if (this.warnTimer <= 0) this.events.push("warn");
            this.warnTimer = 2;
            return;
          }
          this.status = "levelclear"; // görev başarısı
          this.events.push("levelclear");
        } else {
          // Bölüm geçince para bonusu (Madde: yeni para kazanma + risk çarpanı)
          this.levelClearBonus = Math.round((8 + this.level * 2) * this.riskMul);
          // Asker kurtarıp birlikte çıktıysan ekstra ödül
          if (this.soldierRescued) this.levelClearBonus += Math.round(12 * this.riskMul);
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

  // HUD için görev hedefi: parça parça ANAHTAR listesi (Game çevirip " · " ile birleştirir)
  objectiveText(): Txt[] {
    const m = this.mission;
    if (!m) return [];
    if (m.arena) {
      return [{ k: "game.obj.wave", v: { n: this.wave, k: this.zombiesKilled % 6 } }];
    }
    if (m.endless) {
      return [{ k: "game.obj.time", v: { n: Math.floor(this.time) } }];
    }
    if (m.surviveTime) {
      return [{ k: "game.obj.survive", v: { n: Math.max(0, Math.ceil(m.surviveTime - this.time)) } }];
    }
    const parts: Txt[] = [];
    if (m.escort) {
      parts.push({ k: this.hasEscort ? "game.obj.escort.take" : "game.obj.escort.find" });
    } else if (m.killTarget) {
      parts.push(
        this.exitOpen
          ? { k: "game.obj.goexit" }
          : { k: "game.obj.brides", v: { a: this.zombiesKilled, b: m.killTarget } }
      );
    } else if (m.collectTarget) {
      parts.push(
        this.exitOpen
          ? { k: "game.obj.goexit" }
          : { k: "game.obj.pieces", v: { a: this.collected, b: m.collectTarget } }
      );
    } else {
      parts.push({ k: "game.obj.reachexit" });
    }
    if (m.timeLimit) {
      parts.push({ k: "game.obj.secs", v: { n: Math.max(0, Math.ceil(m.timeLimit - this.time)) } });
    }
    return parts;
  }
}
