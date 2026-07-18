"use client";

import { useEffect, useRef, useState } from "react";
import { Joystick } from "@/components/Game";
import Shop from "@/components/Shop";
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  PLAYER_MAX_HP,
  CONTACT_DPS,
  BULLET_SPEED,
  BULLET_LIFE,
  FIRE_COOLDOWN,
  HEAL_AMOUNT,
  COIN_PER_KILL,
} from "@/lib/engine";
import { getCoins, addCoins } from "@/lib/coins";
import { getInventory, saveInventory, SWORD_COLORS } from "@/lib/inventory";
import { BRIDE_RADIUS, assignBrideKind, moveBrides, randomDir, swordHits } from "@/lib/brides";
import { TUNING } from "@/lib/config";
import { Flashlight } from "@/lib/flashlight";
import { cellOf, tryMove } from "@/lib/physics";
import { computeVisible } from "@/lib/vision";
import { sound } from "@/lib/audio";
import { drawBride, drawPlayer, drawSword, grime } from "@/lib/sprites";
import { THEMES } from "@/lib/themes";
import { drawDecor, drawWallDecor } from "@/lib/decor";
import { bfsDistances, type Maze } from "@/lib/maze";
import {
  deserializeLevel,
  diffParams,
  generateRaceLevel,
  levelMaze,
  raceBrideConfig,
  serializeLevel,
  type RaceLevel,
  type SerializedLevel,
  type StartInfo,
} from "@/lib/online";
import type { NetRoom, NetMessage } from "@/lib/net";
import type { Vec, Zombie } from "@/lib/types";
import { MQ_DEFS, MQ_KINDS_ONLINE, mulberry32, planMiniQuest, type MQPlan } from "@/lib/miniquests";
import { ScareDirector, type ScareFx } from "@/lib/scares";
import Icon, { type IconName } from "@/components/Icon";

const RESPAWN_MS = 10000; // toplanan mermi bu sürede haritada geri doğar
const PVP_DMG = PLAYER_MAX_HP * 0.1; // PvP: her isabet canın %10'u (çok az)
const ARENA_WAVE_MS = 18000; // arena: her ~18 sn'de bir yeni dalga (host gelin ekler; yavaş)
const ARENA_WAVE_ADD = 2; // her dalgada eklenen gelin (tur numarasıyla yavaşça artar)
const ARENA_ROUND_MS = 50000; // arena turu 50 saniye
// Oda 2 kişinin altına düştü kararı hemen verilmez (oyuncu geri dönebilir).
const ALONE_GRACE_MS = 15000;
// Sekmesini kapatıp {t:left} yollayamayan oyuncu için EMNİYET süresi. Bu kadar süre
// hiç pos gelmezse yok sayılır. Uzun tutulur: kısa kesintiler (telefon kilidi, sekme
// arka planı, ağ takılması) odayı kapatmasın — yanlış "oda kapandı" alarmının sebebiydi.
const DEAD_MS = 45000;
const ARENA_WIN_POINTS = 5; // 5 tur kazanan maçı alır
const LEVEL_WAIT_MS = 5000; // bölümler arası bekleme (dükkâna uğrama fırsatı) — sonra OTOMATİK başlar
const HEALTH_RESPAWN_MS = 30000; // toplanan can paketi bu sürede geri doğar
const BRIDE_RESPAWN_MS = 20000; // ölen gelin bu sürede yeniden doğar
const BARRIER_ARM_MS = 500; // bariyer koyduktan sonra aktifleşme süresi
const LEAVE_MS = 10000; // bu kadar süre pos gelmezse oyuncu "ayrıldı" sayılır (sekme
// arka plana alındığında rAF durur → pos kesilir; yüksek eşik + geri-getirme yanlış atmayı önler)
const RACE_WIN_COINS = 10; // bir bölümü (turu) kazanınca kişisel para ödülü

// Koltuk (seat) renkleri — 0 host
const SEAT_COLORS = ["#6ee7ff", "#ff9a3c", "#7dffb0", "#c98cff", "#ffd166", "#ff6b9d"];

type Phase = "playing" | "left";
type BKind = "normal" | "dark" | "mucus" | "caller" | "splitter" | "climber" | "queen";
type RBride = { id: number; pos: Vec; target: Vec; aware: boolean; kind: BKind; screamT?: number };
type Bullet = { pos: Vec; vel: Vec; life: number };
const KIND_CODE: Record<BKind, number> = {
  normal: 0, dark: 1, mucus: 2, caller: 3, splitter: 4, climber: 5, queen: 6,
};
const CODE_KIND: BKind[] = ["normal", "dark", "mucus", "caller", "splitter", "climber", "queen"];
// Türe göre temas hasarı çarpanı. Host'tan gelen gelin (RBride) yalnız `kind` taşır,
// dmgMul taşımaz → burada türden türetilir (tek kişilikteki z.dmgMul ile aynı mantık).
const KIND_DMG: Record<BKind, number> = {
  normal: 1, dark: 1, mucus: 1, caller: 1, splitter: 1, climber: 1,
  queen: TUNING.queenDmgMul,
};
type Other = { pos: Vec; target: Vec; dir: Vec; seenAt: number; seat: number; name: string; everSeen: boolean; sPos?: Vec | null; dead?: boolean; rk?: number };

export default function OnlineGame({
  room,
  info,
  onExit,
}: {
  room: NetRoom;
  info: StartInfo;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const input = useRef({ up: false, down: false, left: false, right: false, ax: 0, ay: 0, fire: false, place: false, trap: false });
  const [phase, setPhase] = useState<Phase>("playing");
  // brides: sahadaki gelin sayısı · board: arena öldürme sıralaması (seat, ad, kill)
  const [hud, setHud] = useState({
    level: 1, ammo: 0, exitOpen: false, kills: 0, barriers: 3, hp: PLAYER_MAX_HP,
    scores: [] as number[], themeName: "", veil: 0, wave: 1, surv: 0, rk: 0,
    brides: 0, board: [] as { seat: number; name: string; k: number }[],
  });
  const [toast, setToast] = useState<string | null>(null); // "X ayrıldı" vb.
  const [mqHud, setMqHud] = useState(""); // aktif mini-görev etiketi (Faz 4)
  const [mqToast, setMqToast] = useState(""); // mini-görev ödül bildirimi
  const [alone, setAlone] = useState(false); // diğerleri gitti → tek kaldın
  // Ekonomi + envanter (online): para gelin/tur başına kazanılır (kişisel, kalıcı cüzdan);
  // kalkan/radar kişisel envanterden tüketilir (SP ile aynı depo).
  const [coins, setCoins] = useState(0);
  const [invCounts, setInvCounts] = useState({ shields: 0, radars: 0, veils: 0, traps: 0 });
  const [invOpen, setInvOpen] = useState(false); // oyun-içi envanter paneli açık mı
  const [equipped, setEquipped] = useState<"shield" | "radar" | "veil" | "trap" | null>(null); // kuşanılan eşya (slot)
  const [shopOpen, setShopOpen] = useState(false); // oyun-içi dükkân (market) açık mı
  const uiOpen = useRef(false); // dükkân açıkken oyun tuşlarını kilitle (hareket etmesin)
  const radarUntil = useRef(0); // radar oku bitişi (ms, performance.now)
  const radarAngle = useRef(0); // radar oku yönü (radyan)

  const mySeat = info.seat;
  const arenaMode = info.arena; // açık alan dalga hayatta kalma (çıkış yok)
  const diff = info.diff;
  const order = info.order; // oyuncu id sırası (seat = index)
  const myColor = SEAT_COLORS[mySeat % SEAT_COLORS.length];
  // Görünen ad — TEK etiket: isim varsa İSİM, yoksa arkadaş KODU (lobi kodu isim
  // alanında taşır), o da yoksa "Oyuncu N". İsim ve kod ASLA birlikte yazılmaz.
  const nameOf = (seat: number) =>
    (info.names[seat] || "").trim() || `Oyuncu ${seat + 1}`;

  // Sen ölünce dükkan askeri gider (yeniden satın alınabilir)
  const loseHiredSoldier = () => {
    soldierPos.current = null;
    const inv = getInventory();
    if (inv.hiredSoldier) { inv.hiredSoldier = false; saveInventory(inv); }
  };
  // Arena: oyun başlamadan kuralları 4 sn göster (sonra HUD'daki "?" ile tekrar açılır)
  useEffect(() => {
    if (!arenaMode) return;
    setRulesOpen(true);
    const t = window.setTimeout(() => setRulesOpen(false), 4000);
    return () => window.clearTimeout(t);
  }, [arenaMode]);

  // Öl → 3 sn ölü yerinde don (anında doğma yok). step() donmayı ve doğmayı yönetir.
  const die = (now: number) => {
    if (deadUntil.current > 0) return; // zaten ölü/bekliyor
    deadUntil.current = now + 3000;
    hp.current = 0;
    hurt.current = 0.5;
    bullets.current = [];
    loseHiredSoldier();
    sound.play("gameover");
  };

  // Dünya
  const levelRef = useRef<RaceLevel | null>(null);
  const mazeRef = useRef<Maze | null>(null);
  const selfPos = useRef<Vec>({ x: 1.5, y: 1.5 });
  const selfDir = useRef<Vec>({ x: 0, y: -1 });
  const mySpawn = useRef<Vec>({ x: 1.5, y: 1.5 });
  const others = useRef<Map<string, Other>>(new Map()); // diğer oyuncular (id -> durum)
  const goneIds = useRef<Set<string>>(new Set()); // ayrılmış oyuncular (pos zaman aşımı veya elle)
  const explicitLeftIds = useRef<Set<string>>(new Set()); // yalnız {t:left} yollayanlar — kalıcı çıkar
  const aloneSince = useRef(0); // oda ne zamandan beri boş (0 = boş değil) — ALONE_GRACE_MS için
  const lastSeenById = useRef<Map<string, number>>(new Map()); // id → son pos zamanı (ASLA silinmez)
  const seen = useRef<boolean[][]>([]);
  const ready = useRef(false);
  const flashlight = useRef<Flashlight | null>(null); // dinamik görüş + kararma (Madde 4,5)
  const mucus = useRef<{ x: number; y: number; until: number }[]>([]); // Madde 7: mukus lekeleri
  // Host otoritesi: en küçük koltuk numaralı hayatta-kalan host olur (host göçü)
  const amHost = useRef(info.seat === 0);

  // Gelinler
  const hostBrides = useRef<Zombie[]>([]); // host: tam simülasyon
  const guestBrides = useRef<Map<number, RBride>>(new Map()); // misafir: akıştan
  const deadBrides = useRef<Set<number>>(new Set()); // ölmüş id'ler (ıraksamayı önler)
  const brideRespawnQueue = useRef<number[]>([]); // host: ölen gelinlerin yeniden doğma zamanları (ms)
  const brideIdCounter = useRef(0); // host: yeniden doğan gelinlere benzersiz id
  // Mermi / ateş
  const ammo = useRef<{ x: number; y: number; taken: boolean; takenAt: number }[]>([]);
  const health = useRef<{ x: number; y: number; taken: boolean; takenAt: number }[]>([]); // can paketleri (30sn respawn)
  const veilItems = useRef<{ x: number; y: number; taken: boolean }[]>([]); // Madde 8: duvak eşyaları
  const veilUntil = useRef(0); // kendi görünmezlik bitişi (ms, performance.now)
  const veiledUntil = useRef<Record<number, number>>({}); // seat -> görünmezlik bitişi (host AI için)
  const ammoCount = useRef(0);
  // Mini-görev (Faz 4, online): yalnız güvenli KISA görev (kanı takip et), kişisel
  // mermi ödülü, gelin AI'sına dokunmaz. Deterministik → herkes aynı planı üretir.
  const miniQuest = useRef<MQPlan | null>(null);
  const mqDone = useRef(false);
  // Madde 10: rastgele korku olayları (yerel/atmosfer, hasarsız)
  const scares = useRef(new ScareDirector(0));
  const bullets = useRef<Bullet[]>([]);
  const fireCd = useRef(0);
  const kills = useRef(0);
  const exitOpen = useRef(false);
  // Dükkan askeri (online müttefik): yerel simüle, pos'la yayınlanır (herkes görsün)
  const soldierPos = useRef<Vec | null>(null);
  const soldierFireCd = useRef(0);
  // Arena: dalga sayacı + tur sistemi (2dk tur, en çok gelin öldüren turu kazanır, ilk 5)
  const arenaWave = useRef(1);
  const arenaStartMs = useRef(0);
  const arenaNextWaveAt = useRef(0);
  const roundEndsAt = useRef(0); // bu turun bitiş anı (ms, performance.now)
  const roundKills = useRef(0); // bu turda öldürdüğün gelin (tur sonu tally)
  const roundNum = useRef(1); // kaçıncı tur
  const [arenaOver, setArenaOver] = useState<{ scores: number[]; winner: number } | null>(null);
  const [confirmQuit, setConfirmQuit] = useState(false); // çıkış onayı (yanlış tık koruması)
  // Kuşanılan silah: mermi ↔ kılıç (ref = döngü okur, state = buton görünümü)
  const [weapon, setWeapon] = useState<"gun" | "sword">("gun");
  const weaponRef = useRef<"gun" | "sword">("gun");
  const swordCd = useRef(0);
  const swordSwing = useRef(0);
  const swordColorRef = useRef(SWORD_COLORS.default);
  const toggleWeapon = () => {
    const w = weaponRef.current === "gun" ? "sword" : "gun";
    weaponRef.current = w;
    setWeapon(w);
  };
  const [rulesOpen, setRulesOpen] = useState(false); // arena kuralları (başta 4sn + "?" ile)
  // Tur arası: kazananı HERKES görsün (yeni tur başlamadan önce ~4 sn)
  // standings: turun TAM sıralaması (koltuk + öldürme) — sonuç ekranında herkes görünür
  const [roundInfo, setRoundInfo] = useState<{
    winner: number; kills: number; scores: number[];
    standings?: { seat: number; k: number }[];
  } | null>(null);
  const invulnUntil = useRef(0);
  const deadUntil = useRef(0); // öldüysen bu ana kadar ölü yerinde donarsın (sonra doğarsın)
  const hurt = useRef(0);
  const hp = useRef(PLAYER_MAX_HP);
  const selfMoving = useRef(false);
  const bloodStains = useRef<{ x: number; y: number; r: number; seed: number }[]>([]);
  // Bariyerler (paylaşılan): id -> {x,y,armAt}
  const barriers = useRef<Map<string, { x: number; y: number; armAt: number }>>(new Map());
  const barrierStock = useRef(3);
  const barrierCounter = useRef(0);
  // Faz C online: tuzaklar (paylaşılan) — key -> {x,y,until(ms)}; gelinleri yavaşlatır
  const onlineTraps = useRef<Map<string, { x: number; y: number; until: number }>>(new Map());
  const trapStock = useRef(2);
  const [trapCount, setTrapCount] = useState(2);
  const breakTimer = useRef(0);
  const placeHeld = useRef(false);
  const trapHeld = useRef(false);
  // Yarış sonucu / puan (seat sırasına göre)
  const scores = useRef<number[]>(order.map(() => 0));
  const resultPending = useRef(false);
  const sentReach = useRef(false);
  const lastReachSendAt = useRef(0); // reachexit yeniden-gönderme throttle'ı (kayıp mesaja karşı)
  const [overlay, setOverlay] = useState<{ winnerSeat: number; scores: number[] } | null>(null);
  // #1 self-healing bölüm geçişi: broadcast KAYIPSIZ DEĞİL — tek "result" mesajı düşen
  // oyuncu eski bölümde takılı kalıyordu. Çözüm: host güncel bölüm no'sunu heartbeat'te
  // yayınlar, geride kalan otomatik "needlevel" ister → host "levelsync" ile mevcut bölümü
  // yollar → geride kalan anında yetişir. pendingLevelNum: hâlihazırda geçiş yaptığımız
  // hedef bölüm (idempotent scheduleLoad + çift geçişi önler).
  const pendingLevelNum = useRef(0);
  const lastNeedLevelAt = useRef(0);
  const lastResult = useRef<{ winnerSeat: number; scores: number[]; lvl: SerializedLevel; lvlNum: number } | null>(null);

  function buildWorld(lvl: RaceLevel) {
    levelRef.current = lvl;
    mazeRef.current = levelMaze(lvl);
    const sp = (seat: number): Vec => {
      const c = lvl.spawns[seat] ?? lvl.spawns[0];
      return { x: c.x + 0.5, y: c.y + 0.5 };
    };
    mySpawn.current = sp(mySeat);
    selfPos.current = { ...mySpawn.current };
    selfDir.current = { x: 0, y: -1 };
    // diğer oyuncular (ayrılmış olanları dahil etme). Dünya kurulunca "mevcut"
    // kabul et (seenAt=şimdi) → bölüm geçişinde yanlışlıkla "ayrıldı" tetiklenmez;
    // gerçekten çıkan biri yeni bölümde 4 sn pos yollamayınca yakalanır.
    others.current.clear();
    const nowB = performance.now();
    for (let s = 0; s < order.length; s++) {
      const id = order[s];
      if (id === room.id || goneIds.current.has(id)) continue;
      const p = sp(s);
      others.current.set(id, { pos: { ...p }, target: { ...p }, dir: { x: 0, y: -1 }, seenAt: nowB, seat: s, name: nameOf(s), everSeen: true });
    }
    seen.current = Array.from({ length: lvl.rows }, () => Array.from({ length: lvl.cols }, () => false));
    ammo.current = lvl.ammo.map((c) => ({ x: c.x, y: c.y, taken: false, takenAt: 0 }));
    health.current = lvl.health.map((c) => ({ x: c.x, y: c.y, taken: false, takenAt: 0 }));
    veilItems.current = lvl.veils.map((c) => ({ x: c.x, y: c.y, taken: false }));
    // Mini-görev (online, deterministik): herkes aynı seviyeden aynı planı bağımsızca
    // üretir → adil. Sabit referans (spawn 1,1 + exit) kullanılır; kişi başı yerel ödül.
    {
      const floors: Vec[] = [];
      for (let y = 0; y < lvl.rows; y++)
        for (let x = 0; x < lvl.cols; x++) if (!lvl.walls[y][x]) floors.push({ x, y });
      const rng = mulberry32((lvl.level * 2654435761) >>> 0);
      miniQuest.current = planMiniQuest(rng, floors, { x: 1, y: 1 }, lvl.exit, MQ_KINDS_ONLINE);
      mqDone.current = false;
    }
    scares.current.reset(performance.now() / 1000); // Madde 10: korku zamanlayıcısını sıfırla
    veilUntil.current = 0;
    veiledUntil.current = {};
    ammoCount.current = 0;
    bullets.current = [];
    kills.current = 0;
    exitOpen.current = false;
    barriers.current.clear();
    barrierStock.current = 3;
    breakTimer.current = 0;
    bloodStains.current = [];
    mucus.current = [];
    deadBrides.current.clear();
    guestBrides.current.clear();
    hp.current = PLAYER_MAX_HP;
    invulnUntil.current = performance.now() + 1500;
    onlineTraps.current.clear();
    trapStock.current = 2;
    setTrapCount(2);
    radarUntil.current = 0;
    { const inv = getInventory(); setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps }); }
    if (amHost.current) {
      const total = lvl.brideSpawns.length;
      hostBrides.current = lvl.brideSpawns.map((c, i) => ({
        id: i + 1,
        pos: { x: c.x + 0.5, y: c.y + 0.5 },
        hp: 1,
        aware: false,
        lastSeen: null,
        seenTimer: 4,
        wanderDir: randomDir(),
        wanderTimer: 0,
        path: null,
        repathTimer: 0,
        kind: assignBrideKind(i, total), // Madde 6/7 arketip
      }));
      brideIdCounter.current = total;
      // Faz D online: bazı normalleri özel türlere çevir + boss bölümünde kraliçe (host-otoriter)
      const normals = hostBrides.current.filter((z) => z.kind === "normal");
      for (let i = normals.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [normals[i], normals[j]] = [normals[j], normals[i]];
      }
      let ni = 0;
      const take = () => normals[ni++];
      // Arena'nın seviyesi HEP 1'dir (yarış bölümü değil) → aşağıdaki >=2/>=3/>=4
      // eşikleri hiç tutmuyordu, yani arenada özel gelin türü hiç çıkmıyordu.
      // Arenada tur numarasına göre etkin seviye kullan.
      const kindLevel = arenaMode ? 3 + roundNum.current : lvl.level;
      if (kindLevel >= 2) { const s = take(); if (s) s.kind = "splitter"; }
      if (kindLevel >= 3) {
        const s2 = take(); if (s2) s2.kind = "splitter";
        const c = take(); if (c) { c.kind = "caller"; c.callTimer = TUNING.callerCooldown; }
      }
      if (kindLevel >= 4) { const cl = take(); if (cl) cl.kind = "climber"; }
      if (kindLevel % TUNING.queenEveryLevels === 0) {
        const qc = lvl.brideSpawns[Math.floor(Math.random() * lvl.brideSpawns.length)];
        if (qc) {
          hostBrides.current.push({
            id: ++brideIdCounter.current,
            pos: { x: qc.x + 0.5, y: qc.y + 0.5 },
            hp: 1, aware: false, lastSeen: null, seenTimer: 4,
            wanderDir: randomDir(), wanderTimer: 0, path: null, repathTimer: 0,
            kind: "queen", speedMul: TUNING.queenSpeedMul,
          });
        }
      }
    } else {
      hostBrides.current = [];
    }
    brideRespawnQueue.current = [];
    // Dinamik fener/görüş (yerel; her istemci kendi görüşünü yönetir)
    if (!flashlight.current) {
      flashlight.current = new Flashlight(lvl.visionRadius);
      flashlight.current.onDip = () => sound.play("flicker");
    } else {
      flashlight.current.reset(lvl.visionRadius);
    }
    resultPending.current = false;
    sentReach.current = false;
    deadUntil.current = 0; // yeni bölüm/tur → ölüm donması kalkar (donmuş başlama)
    ready.current = true;
    // Arena: tur sistemi + dalga zamanlayıcısını bir kez başlat (2dk tur, en çok öldüren kazanır)
    if (arenaMode && arenaStartMs.current === 0) {
      const t = performance.now();
      arenaStartMs.current = t;
      arenaNextWaveAt.current = t + ARENA_WAVE_MS;
      roundEndsAt.current = t + ARENA_ROUND_MS;
      arenaWave.current = 1; roundKills.current = 0; roundNum.current = 1;
      scores.current = order.map(() => 0);
    }
    // Dükkan askeri: sahipsen her bölümde yanında doğar (ölene dek)
    soldierPos.current = getInventory().hiredSoldier ? { ...mySpawn.current } : null;
    soldierFireCd.current = 1;
    swordColorRef.current = SWORD_COLORS[getInventory().sword] ?? SWORD_COLORS.default;
    setPhase("playing");
    setHud((h) => ({ ...h, level: lvl.level, ammo: 0, exitOpen: false, kills: 0 }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Ses — online moda bağla. Ölüm Koşusu'nun arka plan müziği (dükkân/envanter.mp3)
    // page.tsx tarafından çalınır; burada yalnız ses motorunu hazır tutarız.
    sound.init();
    sound.resume();
    setCoins(getCoins()); // kalıcı cüzdanı HUD'a yükle

    let toastTimer = 0;
    function flash(msg: string) {
      setToast(msg);
      window.clearTimeout(toastTimer);
      toastTimer = window.setTimeout(() => setToast(null), 4000);
    }

    // En küçük koltuklu hayatta-kalan host olur. Guest→host geçişinde gelinleri devral.
    function updateHost() {
      let minSeat = mySeat;
      for (const o of others.current.values()) if (o.seat < minSeat) minSeat = o.seat;
      const nowHost = mySeat === minSeat;
      if (nowHost && !amHost.current) {
        // devral: mevcut gelin görüntüsünü tam simülasyona çevir. TÜRÜ koru (splitter/caller/
        // climber/queen "normal"e düşmesin) + kraliçe canını geri ver.
        hostBrides.current = Array.from(guestBrides.current.values()).map((z) => ({
          id: z.id,
          pos: { ...z.pos },
          hp: z.kind === "queen" ? TUNING.queenHp : 1,
          aware: z.aware,
          lastSeen: null,
          seenTimer: 4,
          wanderDir: randomDir(),
          wanderTimer: 0,
          path: null,
          repathTimer: 0,
          kind: z.kind ?? "normal",
          speedMul: z.kind === "queen" ? TUNING.queenSpeedMul : undefined,
          callTimer: z.kind === "caller" ? TUNING.callerCooldown : undefined,
        }));
        // Yeni gelin id'leri (respawn/split/dalga) mevcutlarla ÇAKIŞMASIN diye sayaç
        // devralınan en yüksek id'ye çekilir.
        let maxId = brideIdCounter.current;
        for (const z of hostBrides.current) if (z.id > maxId) maxId = z.id;
        brideIdCounter.current = maxId;
        flash("Ev sahibi ayrıldı — kontrolü sen devraldın");
      }
      amHost.current = nowHost;
    }

    // Bir oyuncu ayrıldı. explicit=true → {t:left} yolladı (kalıcı çıkar).
    // explicit=false → yalnız pos zaman aşımı (geçici olabilir; pos gelince geri gelir).
    function onPlayerLeft(id: string, explicit: boolean) {
      if (goneIds.current.has(id)) return;
      const o = others.current.get(id);
      goneIds.current.add(id);
      if (explicit) explicitLeftIds.current.add(id);
      others.current.delete(id);
      flash(`${o ? o.name : "Bir oyuncu"} oyundan ayrıldı`);
      updateHost();
      // Maçı YALNIZ gerçekten çıkıldıysa ({t:left}) anında bitir.
      // Zaman aşımı (explicit=false) geçici olabilir — telefon kilitlenir, sekme arka
      // plana geçer, ağ takılır; oyuncu pos gönderince reviveIfTimedOut geri getirir.
      // Eskiden burada koşulsuz setAlone(true) vardı → hâlâ 2+ kişi varken "oda kapandı"
      // ekranı basılıyordu. Zaman aşımı için aşağıdaki ALONE_GRACE_MS beklemesi var.
      if (explicit && others.current.size === 0) setAlone(true);
    }

    // pos yeniden gelince yanlışlıkla "ayrıldı" sayılan oyuncuyu geri getir
    function reviveIfTimedOut(id: string) {
      if (!goneIds.current.has(id) || explicitLeftIds.current.has(id)) return;
      goneIds.current.delete(id);
      aloneSince.current = 0; // geri döndü → "tek kaldın" sayacı iptal
      setAlone(false);
      const s = order.indexOf(id);
      flash(`${nameOf(s)} yeniden bağlandı`);
      updateHost();
    }

    // Bir oyuncu açık çıkışa ulaştı → host bu bölümün kazananını belirler
    function handleReach(who: string) {
      if (resultPending.current || !levelRef.current) return;
      const seat = Math.max(0, order.indexOf(who));
      resultPending.current = true;
      scores.current = scores.current.slice();
      scores.current[seat] = (scores.current[seat] ?? 0) + 1;
      const next = generateRaceLevel(levelRef.current.level + 1, diff, info.themeSeed, order.length);
      const ser = serializeLevel(next);
      // Sonucu sakla → overlay boyunca periyodik olarak YENİDEN yayınlanır (kayıp mesaj
      // sigortası). Ayrıca host heartbeat'i yeni bölüm no'sunu duyurur (self-healing).
      lastResult.current = { winnerSeat: seat, scores: scores.current.slice(), lvl: ser, lvlNum: next.level };
      room.send({ t: "result", winnerSeat: seat, scores: scores.current, lvl: ser as never });
      showResult(seat);
      scheduleLoad(next);
    }
    function showResult(winnerSeat: number) {
      resultPending.current = true;
      if (winnerSeat === mySeat && pendingLevelNum.current === 0) setCoins(addCoins(RACE_WIN_COINS)); // turu kazandın → bonus para (yalnız İLK kez)
      setOverlay({ winnerSeat, scores: scores.current.slice() });
    }
    function scheduleLoad(next: RaceLevel) {
      // Geç gelen bir yeniden-yayın, zaten geçtiğim (veya bulunduğum) bölümü TEKRAR kurmasın.
      if (levelRef.current && next.level <= levelRef.current.level) return;
      // İDEMPOTENT: aynı hedef bölüm için birden çok kez çağrılırsa (result yeniden
      // yayınlandığında) tek zamanlayıcı kurulur — yoksa üst üste buildWorld çalışırdı.
      if (pendingLevelNum.current === next.level) return;
      pendingLevelNum.current = next.level;
      // LEVEL_WAIT_MS bekleme: turlar arası dükkândan alışverişe zaman tanır. Süre bitince
      // oyuncu HİÇBİR ŞEY yapmadan (dükkândaysan bile kapanır) otomatik yeni bölüme geçilir.
      window.setTimeout(() => {
        if (pendingLevelNum.current !== next.level) return; // araya levelsync girdiyse iptal
        pendingLevelNum.current = 0;
        setOverlay(null);
        setShopOpen(false);
        buildWorld(next);
      }, LEVEL_WAIT_MS);
    }
    // #1: geride kalan oyuncu host'un mevcut bölümünü ISTER (throttle'lı).
    function requestLevelSync() {
      const nowMs = performance.now();
      if (nowMs - lastNeedLevelAt.current < 900) return;
      lastNeedLevelAt.current = nowMs;
      room.send({ t: "needlevel", have: levelRef.current?.level ?? 0 });
    }
    // #1: host, güncel bölümü serileştirip yollar (geride kalanı ANINDA yetiştirir).
    function sendLevelSync() {
      if (!levelRef.current) return;
      room.send({ t: "levelsync", lvl: serializeLevel(levelRef.current) as never, lvlNum: levelRef.current.level, scores: scores.current.slice() });
    }
    // #1: mevcut bölümden İLERİ bir bölüme anında atla (overlay/bekleme yok — kurtarma yolu).
    function applyLevelSync(lvl: RaceLevel, scoresIn: number[]) {
      if (levelRef.current && lvl.level <= levelRef.current.level) return; // zaten güncel/ileri
      scores.current = scoresIn.slice();
      pendingLevelNum.current = 0;
      setOverlay(null);
      setShopOpen(false);
      buildWorld(lvl);
    }

    // Bariyer koy (0.5 sn sonra aktif olur)
    function placeBarrier() {
      if (barrierStock.current <= 0 || !ready.current || resultPending.current || !levelRef.current) return;
      const c = cellOf(selfPos.current);
      if (c.x === levelRef.current.exit.x && c.y === levelRef.current.exit.y) return;
      for (const b of barriers.current.values()) if (b.x === c.x && b.y === c.y) return;
      const id = mySeat + "-" + barrierCounter.current++;
      barriers.current.set(id, { x: c.x, y: c.y, armAt: performance.now() + BARRIER_ARM_MS });
      barrierStock.current--;
      room.send({ t: "barrier", id, x: c.x, y: c.y });
    }
    function delBarrier(id: string) {
      if (!barriers.current.delete(id)) return;
      room.send({ t: "barrierdel", id });
    }
    // Faz C online: bulunduğun yere tuzak koy (gelini yavaşlatır) — herkese yayınla
    function placeTrapOnline() {
      if (trapStock.current <= 0 || !ready.current || resultPending.current) return;
      const nowP = performance.now();
      for (const [k, t] of onlineTraps.current) if (t.until <= nowP) onlineTraps.current.delete(k);
      const c = cellOf(selfPos.current);
      const key = c.x + "," + c.y;
      if (onlineTraps.current.has(key)) return;
      onlineTraps.current.set(key, { x: c.x, y: c.y, until: performance.now() + TUNING.trapSec * 1000 });
      trapStock.current--;
      setTrapCount(trapStock.current);
      sound.play("pickup");
      room.send({ t: "trap", x: c.x, y: c.y });
    }
    function activeBarrier(x: number, y: number, now: number): boolean {
      for (const b of barriers.current.values()) {
        if (b.x === x && b.y === y && now >= b.armAt) return true;
      }
      return false;
    }

    // Bir gelin öldü — herkeste görsel + ses. local=true ise benim vuruşum.
    function applyKill(id: number, x: number, y: number, kind: BKind, local: boolean) {
      if (!deadBrides.current.has(id)) {
        deadBrides.current.add(id);
        bloodStains.current.push({ x, y, r: 0.5 + Math.random() * 0.35, seed: Math.floor(Math.random() * 1000) });
        sound.play("kill"); // ölen gelinin ağlaması
        // Madde 7: mukus gelini öldüğü hücreye 10 sn hasar lekesi bırakır (herkeste)
        if (kind === "mucus") {
          mucus.current.push({ x: Math.floor(x), y: Math.floor(y), until: performance.now() + TUNING.mucusSec * 1000 });
        }
      }
      if (amHost.current) {
        hostBrides.current = hostBrides.current.filter((z) => z.id !== id);
        brideRespawnQueue.current.push(performance.now() + BRIDE_RESPAWN_MS); // 20 sn sonra yeniden doğ
        // Faz D online: "splitter" ölünce iki hızlı yavruya bölünür (yavrular bölünmez).
        // Yavrular tam konumda doğar, duvara girmeden ayrılır (yoksa saplanırlar).
        if (kind === "splitter" && mazeRef.current) {
          for (let k = 0; k < 2; k++) {
            const child: Zombie = {
              id: ++brideIdCounter.current,
              pos: { x, y },
              hp: 1, aware: true, lastSeen: null, seenTimer: 0,
              wanderDir: randomDir(), wanderTimer: 0, path: null, repathTimer: 0,
              kind: "normal", noSplit: true, speedMul: TUNING.splitChildSpeedMul,
            };
            tryMove(mazeRef.current, child.pos, BRIDE_RADIUS, k === 0 ? -0.28 : 0.28, 0);
            hostBrides.current.push(child);
          }
        }
      } else guestBrides.current.delete(id);
      if (local) {
        kills.current++;
        if (arenaMode) roundKills.current++; // arena: tur skoru (en çok öldüren turu kazanır)
        setCoins(addCoins(COIN_PER_KILL)); // gelin başına para (kişisel, kalıcı cüzdan)
        // Arena'da çıkış YOK — sadece yarışta 1 öldürünce çıkış açılır
        if (!arenaMode && kills.current >= 1 && !exitOpen.current) {
          exitOpen.current = true;
          sound.play("dooropen");
        }
        room.send({ t: "kill", id, x, y, k: KIND_CODE[kind] });
      }
    }

    room.onMessage = (m: NetMessage, fromId: string) => {
      // Yalnız GERÇEKTEN ayrılanları (Menü'ye basıp {t:left} yollayan) tümüyle yok say.
      // Zaman aşımıyla düşürülenler pos gelince geri gelebilsin (aşağıda reviveIfTimedOut).
      if (explicitLeftIds.current.has(fromId)) return;
      if (m.t === "map") {
        if (!ready.current) buildWorld(deserializeLevel(m.lvl as SerializedLevel));
      } else if (m.t === "pos") {
        reviveIfTimedOut(fromId); // pos akıyorsa oyuncu hâlâ oyunda → yanlış "ayrıldı"yı geri al
        let o = others.current.get(fromId);
        if (!o) {
          const s = order.indexOf(fromId);
          if (s < 0) return;
          o = { pos: { x: m.x as number, y: m.y as number }, target: { x: m.x as number, y: m.y as number }, dir: { x: 0, y: -1 }, seenAt: 0, seat: s, name: nameOf(s), everSeen: false };
          others.current.set(fromId, o);
        }
        o.target = { x: m.x as number, y: m.y as number };
        o.dir = { x: m.dx as number, y: m.dy as number };
        o.seenAt = performance.now();
        o.everSeen = true;
        // "Tek kaldın" kararı için: bu kayıt zaman aşımında SİLİNMEZ (others siliniyor),
        // böylece kimin ne zamandır sessiz olduğunu doğru ölçebiliriz.
        lastSeenById.current.set(fromId, o.seenAt);
        // Dükkan askeri pozisyonu (varsa) — diğer oyuncunun müttefikini çizmek için
        o.sPos = m.sx != null && m.sy != null ? { x: m.sx as number, y: m.sy as number } : null;
        o.dead = !!m.dead; // ölü/donmuş mu (soluk çiz)
        o.rk = (m.rk as number) ?? 0; // arena: bu oyuncunun tur öldürmesi (host tally için)
        // #1 self-healing: host heartbeat'ine güncel bölüm no'sunu ekler (yalnız host).
        // Ben geride kaldıysam (bölümüm host'unkinden küçük VE bir geçiş beklemiyorsam)
        // → host'tan mevcut bölümü iste. "result" mesajım düşmüş olsa bile böyle yetişirim.
        if (m.lvl != null && !arenaMode) {
          const hostLvl = m.lvl as number;
          const myLvl = levelRef.current?.level ?? 0;
          if (hostLvl > myLvl && hostLvl > pendingLevelNum.current) requestLevelSync();
        }
      } else if (m.t === "needlevel") {
        // Bir oyuncu geride kalmış → host isem güncel bölümü ona (herkese) yolla.
        if (amHost.current && levelRef.current && (m.have as number) < levelRef.current.level) sendLevelSync();
      } else if (m.t === "levelsync") {
        applyLevelSync(deserializeLevel(m.lvl as SerializedLevel), (m.scores as number[]) ?? scores.current);
      } else if (m.t === "brides" && !amHost.current) {
        const arr = m.b as [number, number, number, number, number][];
        const map = guestBrides.current;
        const live = new Set<number>();
        for (const [id, xi, yi, aw, kc] of arr) {
          if (deadBrides.current.has(id)) continue; // ölmüşü diriltme
          live.add(id);
          const target = { x: xi / 100, y: yi / 100 };
          const kind = CODE_KIND[kc] ?? "normal";
          const ex = map.get(id);
          if (ex) {
            ex.target = target;
            ex.aware = aw === 1;
            ex.kind = kind;
          } else {
            map.set(id, { id, pos: { ...target }, target, aware: aw === 1, kind });
          }
        }
        for (const id of map.keys()) if (!live.has(id)) map.delete(id);
      } else if (m.t === "kill") {
        applyKill(m.id as number, m.x as number, m.y as number, CODE_KIND[(m.k as number) ?? 0] ?? "normal", false);
      } else if (m.t === "reachexit") {
        if (amHost.current) handleReach(fromId);
      } else if (m.t === "result") {
        scores.current = m.scores as number[];
        showResult(m.winnerSeat as number);
        scheduleLoad(deserializeLevel(m.lvl as SerializedLevel));
      } else if (m.t === "barrier") {
        barriers.current.set(m.id as string, {
          x: m.x as number,
          y: m.y as number,
          armAt: performance.now() + BARRIER_ARM_MS,
        });
      } else if (m.t === "barrierdel") {
        barriers.current.delete(m.id as string);
      } else if (m.t === "trap") {
        // Faz C online: başka oyuncunun koyduğu tuzak (gelini yavaşlatır)
        const tx = m.x as number, ty = m.y as number;
        onlineTraps.current.set(tx + "," + ty, { x: tx, y: ty, until: performance.now() + TUNING.trapSec * 1000 });
      } else if (m.t === "left") {
        onPlayerLeft(fromId, true); // gerçekten ayrıldı (Menü'ye bastı)
      } else if (m.t === "veil") {
        // Madde 8: bir oyuncu görünmez oldu/bozuldu → host AI hedeflemesi için sakla
        const seat = m.seat as number;
        veiledUntil.current[seat] = m.on ? performance.now() + TUNING.veilSec * 1000 : 0;
      } else if (m.t === "roundend") {
        // Arena ARA: turu kim kazandı — yeni tur başlamadan HERKES görsün
        scores.current = m.scores as number[];
        roundEndsAt.current = 0;
        setShopOpen(false);
        setRoundInfo({
          winner: m.winner as number,
          kills: (m.kills as number) ?? 0,
          scores: m.scores as number[],
          standings: m.standings as { seat: number; k: number }[] | undefined,
        });
      } else if (m.t === "round") {
        // Arena: host yeni tur başlattı (puanlar + kalan süre)
        scores.current = m.scores as number[];
        roundKills.current = 0;
        roundNum.current = (m.roundNum as number) ?? roundNum.current + 1;
        roundEndsAt.current = performance.now() + ((m.remainMs as number) ?? ARENA_ROUND_MS);
        deadUntil.current = 0;
        hp.current = PLAYER_MAX_HP;
        selfPos.current = { ...mySpawn.current };
        bullets.current = [];
        setRoundInfo(null); // ara bitti
        setShopOpen(false); // #37: yeni tur → dükkân kapansın, oyuna dön
      } else if (m.t === "arenaover") {
        scores.current = m.scores as number[];
        resultPending.current = true;
        setArenaOver({ scores: m.scores as number[], winner: m.winner as number });
      } else if (m.t === "pvphit") {
        // PvP: başka bir oyuncunun mermisi bana isabet etti (atıcı tespit eder, ben hasarı uygularım).
        if (info.pvp && (m.to as number) === mySeat) {
          const now = performance.now();
          if (now > invulnUntil.current && veilUntil.current <= now && !resultPending.current && deadUntil.current === 0) {
            // dmg yoksa mermi isabeti (eski mesaj biçimi) → PVP_DMG
            hp.current -= (m.dmg as number) ?? PVP_DMG;
            hurt.current = Math.max(hurt.current, 0.5);
            sound.play("hurt");
            // vurulan da kan görsün (kendi konumunda sıçrama)
            bloodStains.current.push({ x: selfPos.current.x, y: selfPos.current.y, r: 0.35 + Math.random() * 0.2, seed: Math.floor(Math.random() * 1000) });
            if (hp.current <= 0) die(now);
          }
        }
      }
    };
    room.onStatus = () => {}; // ayrılma tespiti pos akışıyla (aşağıda) yapılıyor

    // Herkes başlangıç seviyesini kurar (host tam obje, guest deserialize)
    buildWorld(info.initialLevel);

    // Girdi
    const onKey = (e: KeyboardEvent, d: boolean) => {
      // Dükkân açıkken yeni tuş basımlarını yok say (keyup geçer → basılı tuş temizlenir)
      if (uiOpen.current && d) return;
      switch (e.key) {
        case "ArrowUp": case "w": case "W": input.current.up = d; break;
        case "ArrowDown": case "s": case "S": input.current.down = d; break;
        case "ArrowLeft": case "a": case "A": input.current.left = d; break;
        case "ArrowRight": case "d": case "D": input.current.right = d; break;
        case " ": case "Spacebar": input.current.fire = d; break;
        case "e": case "E": input.current.place = d; break;
        case "f": case "F": if (d) toggleWeapon(); break; // silah değiştir (sağ tık da yapar)
        case "t": case "T": if (d) placeTrapOnline(); break;
        case "q": case "Q": if (d) activateShieldOnline(); break; // envanter: kalkan
        case "r": case "R": if (d) activateRadarOnline(); break; // envanter: radar
        default: return;
      }
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // PC: SAĞ TIK = silah değiştir (tekli oyunla aynı). Bağlam menüsü açılmaz.
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      toggleWeapon();
    };
    const cvEl = canvasRef.current;
    cvEl?.addEventListener("contextmenu", onCtx);

    let dpr = 1, cssW = 0, cssH = 0, TS = 36;
    function resize() {
      const r = canvas!.getBoundingClientRect();
      cssW = r.width; cssH = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(cssW * dpr);
      canvas!.height = Math.floor(cssH * dpr);
      const vr = levelRef.current?.visionRadius ?? 6;
      // Mobilde daha yakın kamera (bkz. Game.tsx) — göz yormasın, harita büyük görünsün.
      const coarse =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(pointer: coarse)").matches
          : false;
      const across = coarse ? vr * 1.4 + 2 : vr * 2 + 2.5;
      TS = Math.max(24, Math.min(coarse ? 62 : 46, Math.min(cssW, cssH) / across));
    }
    resize();
    window.addEventListener("resize", resize);

    // Film grain deseni (bir kez)
    const noiseTile = document.createElement("canvas");
    noiseTile.width = 64; noiseTile.height = 64;
    const nctx = noiseTile.getContext("2d");
    if (nctx) {
      const img = nctx.createImageData(64, 64);
      for (let k = 0; k < img.data.length; k += 4) {
        const v = Math.random() * 255;
        img.data[k] = v; img.data[k + 1] = v; img.data[k + 2] = v; img.data[k + 3] = 255;
      }
      nctx.putImageData(img, 0, 0);
    }
    const grainPattern = ctx.createPattern(noiseTile, "repeat");

    let raf = 0, last = performance.now(), posAcc = 0, brideAcc = 0, hudAcc = 0, tensAcc = 0, leaveAcc = 0, resultReAcc = 0;
    const shade = (b: number[], f: number) =>
      `rgb(${(b[0] * f) | 0},${(b[1] * f) | 0},${(b[2] * f) | 0})`;

    function renderBrides(): RBride[] {
      if (amHost.current) {
        return hostBrides.current.map((z) => ({ id: z.id, pos: z.pos, target: z.pos, aware: z.aware, kind: (z.kind ?? "normal") as BKind }));
      }
      return Array.from(guestBrides.current.values());
    }

    // Host: tüm oyunculardan uzak, çıkış olmayan rastgele bir zemin hücresi
    function spawnBrideFarOnline(): Vec | null {
      const lvl = levelRef.current!, maze = mazeRef.current!;
      const players: Vec[] = [selfPos.current];
      for (const o of others.current.values()) players.push(o.pos);
      for (let i = 0; i < 50; i++) {
        const x = 1 + Math.floor(Math.random() * (maze.cols - 2));
        const y = 1 + Math.floor(Math.random() * (maze.rows - 2));
        if (maze.walls[y][x]) continue;
        if (x === lvl.exit.x && y === lvl.exit.y) continue;
        let far = true;
        for (const p of players) if (Math.hypot(x + 0.5 - p.x, y + 0.5 - p.y) < 6) { far = false; break; }
        if (far) return { x, y };
      }
      return null;
    }

    function step(dt: number, now: number) {
      const maze = mazeRef.current!;
      const lvl = levelRef.current!;
      const i = input.current;
      if (fireCd.current > 0) fireCd.current -= dt;
      if (swordCd.current > 0) swordCd.current -= dt;
      if (swordSwing.current > 0) swordSwing.current -= dt;
      if (hurt.current > 0) hurt.current -= dt;

      // Ölüm cezası: öldüysen 3 sn ölü yerinde donarsın (hareket/ateş/temas yok), sonra doğarsın.
      // NOT: host isen gelin simülasyonu (aşağıda) yine çalışır — yalnız KENDİ oyuncun donar.
      if (deadUntil.current > 0 && now >= deadUntil.current) {
        deadUntil.current = 0;
        hp.current = PLAYER_MAX_HP;
        selfPos.current = { ...mySpawn.current };
        ammoCount.current = Math.max(ammoCount.current, 1);
        invulnUntil.current = now + 2000;
        bullets.current = [];
      }
      const frozen = deadUntil.current > 0;

      // hareket (aktif bariyerler duvar gibi engeller) — donmuşken hareket yok
      let mx = 0, my = 0;
      if (!frozen) {
        if (i.up) my -= 1; if (i.down) my += 1; if (i.left) mx -= 1; if (i.right) mx += 1;
      }
      let scl = 1;
      const amag = Math.hypot(i.ax, i.ay);
      if (!frozen && amag > 0.18) { mx = i.ax; my = i.ay; scl = Math.min(1, amag); }
      const moving = mx !== 0 || my !== 0;
      selfMoving.current = moving;
      const barrierWall = (bx: number, by: number) => activeBarrier(bx, by, now);
      if (moving) {
        const len = Math.hypot(mx, my); mx /= len; my /= len;
        selfDir.current = { x: mx, y: my };
        tryMove(maze, selfPos.current, PLAYER_RADIUS, mx * PLAYER_SPEED * scl * dt, my * PLAYER_SPEED * scl * dt, barrierWall);
      }

      // bariyer koy (basılı tutmada bir kez)
      if (i.place && !placeHeld.current) { placeHeld.current = true; placeBarrier(); }
      if (!i.place) placeHeld.current = false;
      if (i.trap && !trapHeld.current) { trapHeld.current = true; placeTrapOnline(); }
      if (!i.trap) trapHeld.current = false;

      // mermisizken (0) önündeki bariyere 2 sn temasla kır
      if (ammoCount.current === 0 && moving) {
        const ax = Math.floor(selfPos.current.x + mx * 0.55);
        const ay = Math.floor(selfPos.current.y + my * 0.55);
        let tgt: string | null = null;
        for (const [id, b] of barriers.current) {
          if (b.x === ax && b.y === ay && now >= b.armAt) { tgt = id; break; }
        }
        if (tgt) {
          breakTimer.current += dt;
          if (breakTimer.current >= 2) { delBarrier(tgt); breakTimer.current = 0; }
        } else breakTimer.current = 0;
      } else breakTimer.current = 0;

      // KILIÇ (donmuşken yok) — mermi harcamaz, kısa menzil, tek darbede max 2 gelin.
      // Gelin ölümü mermiyle AYNI yolu kullanır (applyKill → herkese yayınlanır).
      // PvP hasarı da mermiyle aynı model: vuran tespit eder, hedef uygular.
      if (!frozen && i.fire && weaponRef.current === "sword" && swordCd.current <= 0) {
        swordCd.current = TUNING.swordCd;
        swordSwing.current = TUNING.swordSwingSec;
        if (veilUntil.current > now) {
          veilUntil.current = 0;
          veiledUntil.current[mySeat] = 0;
          room.send({ t: "veil", seat: mySeat, on: false });
        }
        sound.play("sword");
        const bs = renderBrides();
        for (const z of swordHits(bs, selfPos.current, selfDir.current)) {
          applyKill(z.id, z.pos.x, z.pos.y, z.kind, true);
        }
        if (info.pvp) {
          // Oyunculara: her vuruş swordPvpDmg (50) → 100 can 2 vuruşta biter
          const alive = Array.from(others.current.entries()).filter(([oid]) => !goneIds.current.has(oid));
          const hitP = swordHits(alive.map(([, o]) => o), selfPos.current, selfDir.current);
          for (const o of hitP) {
            room.send({ t: "pvphit", to: o.seat, dmg: TUNING.swordPvpDmg });
            bloodStains.current.push({ x: o.pos.x, y: o.pos.y, r: 0.35 + Math.random() * 0.2, seed: Math.floor(Math.random() * 1000) });
            sound.play("hurt");
          }
        }
      }

      // ateş (donmuşken yok) — yalnız MERMİ kuşanılıyken
      if (!frozen && i.fire && weaponRef.current === "gun" && fireCd.current <= 0 && ammoCount.current > 0) {
        ammoCount.current--;
        fireCd.current = FIRE_COOLDOWN;
        // Madde 8: ateş edersen görünmezlik bozulur
        if (veilUntil.current > now) {
          veilUntil.current = 0;
          veiledUntil.current[mySeat] = 0;
          room.send({ t: "veil", seat: mySeat, on: false });
        }
        bullets.current.push({
          pos: { ...selfPos.current },
          vel: { x: selfDir.current.x * BULLET_SPEED, y: selfDir.current.y * BULLET_SPEED },
          life: BULLET_LIFE,
        });
        sound.play("shot");
      }

      // host: gelin simülasyonu (tüm oyuncuları hedefler)
      if (amHost.current) {
        const targets: Vec[] = [selfPos.current];
        const veiledArr: boolean[] = [(veiledUntil.current[mySeat] ?? 0) > now]; // Madde 8
        for (const o of others.current.values()) {
          targets.push(o.pos);
          veiledArr.push((veiledUntil.current[o.seat] ?? 0) > now);
        }
        // Madde 0: kişi başı en fazla N gelin · Madde 8: görünmez oyuncular hedeflenmez
        // Faz C: tuzak hücrelerinde gelinler yavaşlar (host-otoriter)
        const slowCells = onlineTraps.current.size > 0
          ? new Set(Array.from(onlineTraps.current.values()).filter((t) => t.until > now).map((t) => t.y * maze.cols + t.x))
          : undefined;
        // Avcı sınırı ZORLUĞA bağlı (Kolay 2 / Orta 4 / Zor 7). Sabit 4 iken Zor'da
        // fazladan doğan gelinler sınıra takılıp aylak dolaşıyordu → zorluk artsa da
        // oyuncunun üstündeki baskı değişmiyordu.
        const maxHunters = (TUNING.diff[diff] ?? TUNING.diff.orta).hunters;
        moveBrides(hostBrides.current, maze, raceBrideConfig(lvl.level, diff), targets, dt, maxHunters, veiledArr, slowCells);
        // Faz D online: "caller" gelin — farkındayken cooldown'la yakındaki uyuyanları uyandırır
        for (const z of hostBrides.current) {
          if (z.kind !== "caller") continue;
          if (z.screamT && z.screamT > 0) z.screamT -= dt;
          if (z.callTimer == null) z.callTimer = TUNING.callerCooldown;
          z.callTimer -= dt;
          if (z.aware && z.callTimer <= 0) {
            z.callTimer = TUNING.callerCooldown;
            z.screamT = 0.7;
            for (const o of hostBrides.current) {
              if (o === z || o.aware) continue;
              if (Math.hypot(o.pos.x - z.pos.x, o.pos.y - z.pos.y) <= TUNING.callerRadius) {
                o.aware = true;
                o.lastSeen = { x: Math.floor(z.pos.x), y: Math.floor(z.pos.y) };
                o.seenTimer = 0; o.path = null; o.repathTimer = 0;
              }
            }
          }
        }
        // ölen gelinleri 20 sn sonra uzakta yeniden doğur
        const q = brideRespawnQueue.current;
        if (q.length) {
          const remain: number[] = [];
          for (const t of q) {
            if (now >= t) {
              const cell = spawnBrideFarOnline();
              if (cell) {
                hostBrides.current.push({
                  id: ++brideIdCounter.current,
                  pos: { x: cell.x + 0.5, y: cell.y + 0.5 },
                  hp: 1, aware: false, lastSeen: null, seenTimer: 4,
                  wanderDir: randomDir(), wanderTimer: 0, path: null, repathTimer: 0,
                });
              } else remain.push(t); // uygun yer yoksa tekrar dene
            } else remain.push(t);
          }
          brideRespawnQueue.current = remain;
        }
        // Arena: dalga dalga gelin ekle (host-otoriter). İLERİKİ TURLARDA daha kalabalık ama YAVAŞ.
        // roundEndsAt=0 → tur ARASI (kazanan ekranı): ara boyunca yeni gelin gelmez.
        if (arenaMode && roundEndsAt.current > 0 && now >= arenaNextWaveAt.current) {
          arenaWave.current += 1;
          arenaNextWaveAt.current = now + ARENA_WAVE_MS;
          // ZORLUK arenaya da uygulanır (eskiden hiç bakılmıyordu: Kolay da Zor da aynıydı)
          const dmul = diffParams(info.diff).countMul;
          // Üst sınır ve dalga başına eklenen, TUR ilerledikçe büyür → her tur bir
          // öncekinden kalabalık. Zorlukla ölçeklenir.
          // Arena yoğunluğu (kullanıcı: gelin çok azdı → 1.7×): hem üst sınır hem dalga eklemesi.
          const cap = Math.round((10 + order.length * 5 + roundNum.current * 4) * dmul * TUNING.arenaBrideMul);
          const add = Math.max(
            1,
            Math.round((ARENA_WAVE_ADD + Math.floor(roundNum.current / 2) + Math.floor(order.length / 2)) * dmul * TUNING.arenaBrideMul)
          );
          for (let i = 0; i < add; i++) {
            if (hostBrides.current.length >= cap) break;
            const cell = spawnBrideFarOnline();
            if (!cell) break;
            const total = hostBrides.current.length + 1;
            // Dalgalarda ÖZEL türler de çıksın (eskiden yalnız normal/dark/mucus'tu)
            let kind = assignBrideKind(total - 1, total);
            let callTimer: number | undefined;
            const r = Math.random();
            if (r < 0.16) kind = "splitter";
            else if (r < 0.28) { kind = "caller"; callTimer = TUNING.callerCooldown; }
            else if (r < 0.36 && roundNum.current >= 2) kind = "climber";
            hostBrides.current.push({
              id: ++brideIdCounter.current,
              pos: { x: cell.x + 0.5, y: cell.y + 0.5 },
              hp: 1, aware: false, lastSeen: null, seenTimer: 4,
              wanderDir: randomDir(), wanderTimer: 0, path: null, repathTimer: 0,
              kind, callTimer,
            });
          }
          sound.play("warn"); // yeni dalga uyarısı
        }

        // Arena TUR SONU (host): süre dolunca öldürmeye göre SIRALA →
        // 1. olana 2 puan, 2. olana 1 puan (eskiden yalnız kazanana +1 idi).
        if (arenaMode && !resultPending.current && roundEndsAt.current > 0 && now >= roundEndsAt.current) {
          const rk: Record<number, number> = { [mySeat]: roundKills.current };
          for (const o of others.current.values()) rk[o.seat] = o.rk ?? 0;
          // Sıralama (öldürme çok → az). Beraberlikte küçük koltuk önde.
          const rank = Object.keys(rk)
            .map(Number)
            .sort((a, b) => rk[b] - rk[a] || a - b);
          const winner = rank[0] ?? mySeat;
          const best = rk[winner] ?? 0;
          const sc = scores.current.slice();
          if (rank[0] !== undefined && (rk[rank[0]] ?? 0) > 0) sc[rank[0]] = (sc[rank[0]] ?? 0) + 2;
          if (rank[1] !== undefined && (rk[rank[1]] ?? 0) > 0) sc[rank[1]] = (sc[rank[1]] ?? 0) + 1;
          scores.current = sc;
          // Tur sıralaması herkese: sonuç ekranında tam liste gösterilir
          const standings = rank.map((seat) => ({ seat, k: rk[seat] ?? 0 }));
          if (sc[winner] >= ARENA_WIN_POINTS) {
            room.send({ t: "arenaover", scores: sc, winner });
            resultPending.current = true;
            setArenaOver({ scores: sc, winner });
          } else {
            // ARA: turu kim kazandı — HERKES görsün (4 sn), sonra yeni tur başlar.
            roundEndsAt.current = 0; // sayaç dursun (ara boyunca)
            hostBrides.current = []; // ara boyunca kimse saldırmasın
            brideRespawnQueue.current = [];
            setShopOpen(false); // dükkândaysan oyuna at (#37)
            room.send({ t: "roundend", winner, kills: best, scores: sc, standings });
            setRoundInfo({ winner, kills: best, scores: sc, standings });
            window.setTimeout(() => {
              const t2 = performance.now();
              roundNum.current += 1;
              roundKills.current = 0;
              arenaWave.current = 1;
              roundEndsAt.current = t2 + ARENA_ROUND_MS;
              arenaNextWaveAt.current = t2 + ARENA_WAVE_MS;
              // host da kendi oyuncusunu diriltip başlangıca al
              deadUntil.current = 0;
              hp.current = PLAYER_MAX_HP;
              selfPos.current = { ...mySpawn.current };
              bullets.current = [];
              setRoundInfo(null);
              room.send({ t: "round", scores: sc, winner, remainMs: ARENA_ROUND_MS, roundNum: roundNum.current });
            }, 4000);
          }
        }
      }

      const brides = renderBrides();

      // Dükkan askeri (online): seni takip eder + gelinlere ateş eder (mermi ortak sistemden).
      if (soldierPos.current) {
        const sp = soldierPos.current;
        const dx = selfPos.current.x - sp.x, dy = selfPos.current.y - sp.y;
        const d = Math.hypot(dx, dy);
        if (d > 1.1) {
          const spd = PLAYER_SPEED * 0.95 * dt;
          const nx = sp.x + (dx / d) * spd, ny = sp.y + (dy / d) * spd;
          if (!maze.walls[Math.floor(ny)]?.[Math.floor(nx)]) { sp.x = nx; sp.y = ny; }
        }
        soldierFireCd.current -= dt;
        if (soldierFireCd.current <= 0) {
          let tgt: RBride | null = null, td = Infinity;
          for (const z of brides) {
            const dz = Math.hypot(z.pos.x - sp.x, z.pos.y - sp.y);
            if (dz <= 7 && dz < td) { td = dz; tgt = z; }
          }
          if (tgt) {
            soldierFireCd.current = 0.9;
            const ex = tgt.pos.x - sp.x, ey = tgt.pos.y - sp.y, el = Math.hypot(ex, ey) || 1;
            bullets.current.push({ pos: { ...sp }, vel: { x: (ex / el) * BULLET_SPEED, y: (ey / el) * BULLET_SPEED }, life: BULLET_LIFE });
            sound.play("shot");
          }
        }
      }

      // Dinamik görüş/fener: menzilde gelin var mı? (Madde 4,5)
      const fl = flashlight.current;
      if (fl) {
        const inR = brides.some(
          (z) => Math.hypot(z.pos.x - selfPos.current.x, z.pos.y - selfPos.current.y) <= fl.base
        );
        fl.update(dt, inR);
      }

      // mermiler
      for (const b of bullets.current) {
        b.life -= dt;
        const steps = 3;
        const sx = (b.vel.x * dt) / steps, sy = (b.vel.y * dt) / steps;
        for (let s = 0; s < steps; s++) {
          b.pos.x += sx; b.pos.y += sy;
          const cx = Math.floor(b.pos.x), cy = Math.floor(b.pos.y);
          if (cx < 0 || cy < 0 || cx >= maze.cols || cy >= maze.rows || maze.walls[cy][cx]) { b.life = 0; break; }
          let hitBar = false;
          for (const [bid, bar] of barriers.current) {
            if (bar.x === cx && bar.y === cy) { delBarrier(bid); b.life = 0; hitBar = true; break; }
          }
          if (hitBar) break;
          let hit = false;
          for (const z of brides) {
            if (Math.hypot(b.pos.x - z.pos.x, b.pos.y - z.pos.y) < BRIDE_RADIUS + 0.08) {
              b.life = 0; hit = true;
              applyKill(z.id, z.pos.x, z.pos.y, z.kind, true);
              break;
            }
          }
          if (hit) break;
          // PvP: mermim başka bir oyuncuya değdi mi? (atıcı tespit eder, hedef hasarı uygular)
          if (info.pvp) {
            for (const [oid, o] of others.current) {
              if (goneIds.current.has(oid)) continue;
              if (Math.hypot(b.pos.x - o.pos.x, b.pos.y - o.pos.y) < PLAYER_RADIUS + 0.14) {
                b.life = 0; hit = true;
                room.send({ t: "pvphit", to: o.seat });
                // Vuran KAN görsün → isabet noktasına kan sıçraması
                bloodStains.current.push({ x: o.pos.x, y: o.pos.y, r: 0.35 + Math.random() * 0.2, seed: Math.floor(Math.random() * 1000) });
                sound.play("hurt");
                break;
              }
            }
            if (hit) break;
          }
        }
      }
      bullets.current = bullets.current.filter((b) => b.life > 0);

      // mermi topla + 10 sn respawn
      const pc = cellOf(selfPos.current);
      for (const a of ammo.current) {
        if (a.taken) {
          if (now - a.takenAt >= RESPAWN_MS) a.taken = false;
        } else if (a.x === pc.x && a.y === pc.y) {
          a.taken = true;
          a.takenAt = now;
          ammoCount.current++;
          sound.play("pickup");
        }
      }

      // Mini-görev (bloodtrail): gerçek marker'a bas → tamamla → kişisel mermi ödülü.
      // Yerel; gelin AI'sını değiştirmez, çıkışı geciktirmez (yarış korunur).
      const mqp = miniQuest.current;
      if (mqp && !mqDone.current) {
        let all = true;
        for (const m of mqp.markers) {
          if (!m.done && m.x === pc.x && m.y === pc.y) {
            m.done = true;
            sound.play("pickup");
          }
          if (!m.done) all = false;
        }
        if (all && mqp.markers.length > 0) {
          mqDone.current = true;
          const def = MQ_DEFS[mqp.kind];
          if (def.reward.ammo) ammoCount.current += def.reward.ammo;
          sound.play("secret");
          setMqToast(`${def.title} — +${def.reward.ammo ?? 0} mermi`);
          window.setTimeout(() => setMqToast(""), 3000);
        }
      }

      // can paketi topla + 30 sn respawn (canın tamsa alma, ama respawn'ı işle)
      {
        const full = hp.current >= PLAYER_MAX_HP;
        for (const h of health.current) {
          if (h.taken) {
            if (now - h.takenAt >= HEALTH_RESPAWN_MS) h.taken = false;
            continue;
          }
          if (full) continue;
          if (h.x === pc.x && h.y === pc.y) {
            h.taken = true;
            h.takenAt = now;
            hp.current = Math.min(PLAYER_MAX_HP, hp.current + HEAL_AMOUNT);
            sound.play("heal");
          }
        }
      }

      // Madde 8: duvak topla → 5 sn görünmez (host'a bildir)
      for (const v of veilItems.current) {
        if (!v.taken && v.x === pc.x && v.y === pc.y) {
          v.taken = true;
          veilUntil.current = now + TUNING.veilSec * 1000;
          veiledUntil.current[mySeat] = veilUntil.current;
          sound.play("veil");
          room.send({ t: "veil", seat: mySeat, on: true });
        }
      }

      // hasar (dokunulmazlık bittiyse VE görünmez değilken): gelin teması can barını düşürür
      if (!frozen && now > invulnUntil.current && veilUntil.current <= now) {
        let touched = false;
        let dmgMul = 1; // değen gelinin türü (kraliçe 1.5x / yavru 0.6x)
        for (const z of brides) {
          if (Math.hypot(z.pos.x - selfPos.current.x, z.pos.y - selfPos.current.y) < PLAYER_RADIUS + BRIDE_RADIUS) {
            touched = true;
            dmgMul = Math.max(dmgMul, KIND_DMG[z.kind] ?? 1);
            break;
          }
        }
        if (touched) {
          // ZORLUK gelin GÜCÜNÜ de belirler (Kolay 0.7 / Zor 1.4) — eskiden online'da
          // zorluk hasarı hiç etkilemiyordu, yalnız sayı/hız değişiyordu.
          hp.current -= CONTACT_DPS * dmgMul * diffParams(info.diff).dmgMul * dt;
          hurt.current = 0.25;
          sound.play("hurt");
          if (hp.current <= 0) die(now);
        }
      }

      // Madde 7: mukus lekeleri — süresi dolanı at + üzerindeysen az hasar
      if (mucus.current.length) {
        mucus.current = mucus.current.filter((m) => now < m.until);
        if (now > invulnUntil.current) {
          const mc = cellOf(selfPos.current);
          for (const m of mucus.current) {
            if (m.x === mc.x && m.y === mc.y) {
              hp.current -= TUNING.mucusDps * dt;
              hurt.current = Math.max(hurt.current, 0.15);
              if (hp.current <= 0) die(now);
              break;
            }
          }
        }
      }

      // çıkışa ulaşma (kendi çıkışın açıksa) → kazanma
      if (!resultPending.current && exitOpen.current) {
        const scc = cellOf(selfPos.current);
        if (scc.x === lvl.exit.x && scc.y === lvl.exit.y) {
          if (amHost.current) {
            handleReach(room.id);
          } else {
            // reachexit KAYBOLABİLİR (broadcast garantisiz). Eskiden tek sefer yollanıyordu →
            // düşerse host kazananı belirlemez, guest çıkışta KALICI takılırdı (softlock).
            // Çözüm: çıkışta durdukça ~1 sn'de bir yeniden yolla. Host resultPending ile
            // idempotenttir (ilk reachexit'i işler, sonrakileri yok sayar).
            const nowMs = performance.now();
            if (nowMs - lastReachSendAt.current > 900) {
              lastReachSendAt.current = nowMs;
              sentReach.current = true;
              room.send({ t: "reachexit" });
            }
          }
        }
      }

      // diğer oyuncuları yumuşat
      for (const o of others.current.values()) {
        o.pos.x += (o.target.x - o.pos.x) * Math.min(1, dt * 12);
        o.pos.y += (o.target.y - o.pos.y) * Math.min(1, dt * 12);
      }
      // misafir gelinleri yumuşat
      if (!amHost.current) {
        for (const z of guestBrides.current.values()) {
          z.pos.x += (z.target.x - z.pos.x) * Math.min(1, dt * 12);
          z.pos.y += (z.target.y - z.pos.y) * Math.min(1, dt * 12);
        }
      }

      // ayrılma tespiti (pos akışı = kalp atışı): LEAVE_MS pos gelmezse ayrıldı
      leaveAcc += dt;
      if (leaveAcc >= 0.5) {
        leaveAcc = 0;
        for (const [id, o] of others.current) {
          if (now - o.seenAt > LEAVE_MS) onPlayerLeft(id, false); // yalnız zaman aşımı (geri gelebilir)
        }
        // TEK KALDIN kararı — KAYNAK: kim GERÇEKTEN çıktı ({t:left}), pos kalp atışı DEĞİL.
        // pos'a bakmak yanlış alarm üretiyordu: telefon kilitlenince/sekme arka plana
        // geçince rAF durur, pos kesilir, oyuncu odada olmasına rağmen "ayrıldı" sayılırdı.
        // Kural (kullanıcı): odada 2+ kişi varsa oda KAPANMAZ.
        // Sekmesini kapatıp {t:left} yollayamayanlar için uzun bir emniyet süresi var.
        const stillIn = order.filter((id) => {
          if (id === room.id) return true; // sen
          if (explicitLeftIds.current.has(id)) return false; // gerçekten çıktı
          // Sekmeyi kapatıp {t:left} yollayamayanlar için emniyet: DEAD_MS boyunca hiç
          // pos gelmediyse yok say. Kısa kesintiler (kilit/arka plan) odayı KAPATMAZ.
          const seen = lastSeenById.current.get(id);
          return seen === undefined || now - seen <= DEAD_MS;
        }).length;
        if (stillIn < 2) {
          if (aloneSince.current === 0) aloneSince.current = now;
          else if (now - aloneSince.current > ALONE_GRACE_MS) setAlone(true);
        } else {
          aloneSince.current = 0; // 2+ kişi var → oda açık kalır
        }
      }

      // gerilim (kalp atışı) — en yakın gelin mesafesine göre
      tensAcc += dt;
      if (tensAcc >= 0.2) {
        tensAcc = 0;
        let nd = Infinity;
        for (const z of brides) {
          const d = Math.hypot(z.pos.x - selfPos.current.x, z.pos.y - selfPos.current.y);
          if (d < nd) nd = d;
        }
        const vr = lvl.visionRadius;
        sound.setTension(nd < vr ? Math.min(1, (vr - nd) / vr) : 0);
      }

      // Madde 10: rastgele korku olayları (yerel, atmosfer, HASARSIZ)
      const sk = scares.current.update(now / 1000, 1 + sound.tension * 0.5);
      if (sk === "whisper" || sk === "doorslam" || sk === "heartbeat") sound.play(sk);
      else if (sk === "flashjump") sound.play("flicker");
    }

    function render() {
      const lvl = levelRef.current!, maze = mazeRef.current!;
      const theme = THEMES[lvl.theme] ?? THEMES[0];
      const vEff = flashlight.current ? flashlight.current.eff : lvl.visionRadius; // dinamik görüş
      const p = selfPos.current;
      const camX = p.x * TS - cssW / 2, camY = p.y * TS - cssH / 2;
      const cols = maze.cols;
      const T = performance.now() / 1000;
      let flicker = 0.93 + 0.07 * Math.sin(T * 11);
      if (Math.random() < 0.02) flicker *= 0.62;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, cssW, cssH);

      const origin = cellOf(p);
      const vis = new Map<number, number>();
      for (const c of computeVisible(maze, origin, vEff)) {
        vis.set(c.y * cols + c.x, c.intensity);
        seen.current[c.y][c.x] = true;
      }

      const sCX = Math.max(0, Math.floor(camX / TS)), eCX = Math.min(cols - 1, Math.ceil((camX + cssW) / TS));
      const sCY = Math.max(0, Math.floor(camY / TS)), eCY = Math.min(maze.rows - 1, Math.ceil((camY + cssH) / TS));
      for (let y = sCY; y <= eCY; y++) {
        for (let x = sCX; x <= eCX; x++) {
          if (!seen.current[y][x]) continue;
          const wall = maze.walls[y][x];
          const inten = vis.get(y * cols + x);
          const sx = x * TS - camX, sy = y * TS - camY;
          const gr = grime(x, y);
          if (inten !== undefined) {
            let f = wall ? 0.42 + 0.66 * inten : 0.36 + 0.74 * inten;
            f *= flicker * (0.9 + 0.22 * gr);
            ctx!.fillStyle = shade(wall ? theme.wall : theme.floor, f);
          } else {
            const base = wall ? 36 : 22;
            const v = base * (0.72 + 0.5 * gr);
            ctx!.fillStyle = `rgb(${v | 0},${(v * 0.9) | 0},${(v * 0.82) | 0})`;
          }
          ctx!.fillRect(Math.floor(sx), Math.floor(sy), TS + 1, TS + 1);
          // Madde 11: tema süsleri — deterministik, herkes aynı (zemin süsü / duvar ağacı)
          if (!wall && theme.decor) {
            drawDecor(ctx!, theme, x, y, Math.floor(sx), Math.floor(sy), TS, inten !== undefined);
          } else if (wall && theme.wallStyle) {
            drawWallDecor(ctx!, theme, x, y, Math.floor(sx), Math.floor(sy), TS, inten !== undefined);
          }
        }
      }

      // kan izleri (kalıcı)
      for (const bl of bloodStains.current) {
        const bx = Math.floor(bl.x), by = Math.floor(bl.y);
        if (!seen.current[by] || !seen.current[by][bx]) continue;
        const litB = vis.get(by * cols + bx) !== undefined;
        const sx = bl.x * TS - camX, sy = bl.y * TS - camY;
        ctx!.save();
        ctx!.globalAlpha = litB ? 0.9 : 0.45;
        ctx!.fillStyle = litB ? "rgb(158,20,16)" : "rgb(66,12,10)";
        for (let i = 0; i < 6; i++) {
          const a = (bl.seed + i * 97) % 360;
          const rr = bl.r * TS * (0.2 + ((bl.seed + i * 31) % 100) / 180);
          const ox = Math.cos((a * Math.PI) / 180) * bl.r * TS * 0.4;
          const oy = Math.sin((a * Math.PI) / 180) * bl.r * TS * 0.4;
          ctx!.beginPath(); ctx!.arc(sx + ox, sy + oy, rr, 0, Math.PI * 2); ctx!.fill();
        }
        ctx!.restore();
      }

      // Madde 7: mukus lekeleri (parlak yeşil, karanlıkta bile hafif ışır)
      for (const m of mucus.current) {
        if (!seen.current[m.y] || !seen.current[m.y][m.x]) continue;
        const litM = vis.get(m.y * cols + m.x) !== undefined;
        const sx = m.x * TS - camX + TS / 2, sy = m.y * TS - camY + TS / 2;
        ctx!.save();
        ctx!.globalAlpha = litM ? 0.85 : 0.5;
        ctx!.shadowColor = "rgba(120,255,120,0.7)"; ctx!.shadowBlur = litM ? 12 : 7;
        ctx!.fillStyle = litM ? "rgb(120,205,95)" : "rgb(72,130,62)";
        ctx!.beginPath(); ctx!.ellipse(sx, sy, TS * 0.4, TS * 0.32, 0, 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
      }

      // çıkış
      const e = lvl.exit;
      if (seen.current[e.y][e.x]) {
        const sx = e.x * TS - camX, sy = e.y * TS - camY;
        ctx!.fillStyle = "rgb(8,10,15)";
        ctx!.fillRect(sx + TS * 0.18, sy + TS * 0.1, TS * 0.64, TS * 0.8);
        ctx!.save();
        if (exitOpen.current && vis.get(e.y * cols + e.x) !== undefined) {
          ctx!.strokeStyle = "rgba(90,235,150,0.95)"; ctx!.shadowColor = "rgba(90,235,150,0.7)"; ctx!.shadowBlur = 14; ctx!.lineWidth = 2.5;
        } else { ctx!.strokeStyle = "rgba(120,140,170,0.5)"; ctx!.lineWidth = 2; }
        ctx!.strokeRect(sx + TS * 0.18, sy + TS * 0.1, TS * 0.64, TS * 0.8);
        ctx!.restore();
      }

      // mermiler (yerdeki)
      for (const a of ammo.current) {
        if (a.taken || vis.get(a.y * cols + a.x) === undefined) continue;
        const sx = a.x * TS + TS / 2 - camX, sy = a.y * TS + TS / 2 - camY;
        ctx!.save(); ctx!.shadowColor = "rgba(190,150,70,0.5)"; ctx!.shadowBlur = 5;
        ctx!.fillStyle = "#b8944a";
        ctx!.fillRect(sx - TS * 0.05, sy - TS * 0.12, TS * 0.1, TS * 0.24);
        ctx!.restore();
      }

      // Mini-görev (bloodtrail): sahte damlalar + gerçek kan izi (Faz 4, online)
      const mqR = miniQuest.current;
      if (mqR && !mqDone.current) {
        for (const m of mqR.decoys) {
          if (vis.get(m.y * cols + m.x) === undefined) continue;
          const sx = m.x * TS + TS / 2 - camX, sy = m.y * TS + TS / 2 - camY;
          ctx!.save();
          ctx!.globalAlpha = 0.5;
          ctx!.fillStyle = "#5a1414";
          ctx!.beginPath(); ctx!.arc(sx, sy, TS * 0.1, 0, Math.PI * 2); ctx!.fill();
          ctx!.restore();
        }
        for (const m of mqR.markers) {
          if (m.done || vis.get(m.y * cols + m.x) === undefined) continue;
          const sx = m.x * TS + TS / 2 - camX, sy = m.y * TS + TS / 2 - camY;
          ctx!.save();
          ctx!.shadowColor = "rgba(200,30,30,0.9)"; ctx!.shadowBlur = 12;
          ctx!.fillStyle = "#a11414";
          ctx!.beginPath(); ctx!.arc(sx, sy, TS * 0.15, 0, Math.PI * 2); ctx!.fill();
          ctx!.restore();
        }
      }

      // can paketleri (kırmızı haç)
      for (const h of health.current) {
        if (h.taken || vis.get(h.y * cols + h.x) === undefined) continue;
        const sx = h.x * TS + TS / 2 - camX, sy = h.y * TS + TS / 2 - camY;
        ctx!.save();
        ctx!.shadowColor = "rgba(255,60,60,0.7)"; ctx!.shadowBlur = 8;
        const s = TS * 0.12, w = TS * 0.09;
        ctx!.fillStyle = "#e8e2da";
        ctx!.fillRect(sx - s - w * 0.4, sy - s - w * 0.4, (s + w * 0.4) * 2, (s + w * 0.4) * 2);
        ctx!.fillStyle = "#d23a34";
        ctx!.fillRect(sx - w / 2, sy - s, w, s * 2);
        ctx!.fillRect(sx - s, sy - w / 2, s * 2, w);
        ctx!.restore();
      }

      // Madde 8: gelin duvağı eşyası (soluk beyaz, salınan tül)
      for (const v of veilItems.current) {
        if (v.taken || vis.get(v.y * cols + v.x) === undefined) continue;
        const sx = v.x * TS + TS / 2 - camX, sy = v.y * TS + TS / 2 - camY + Math.sin(T * 2) * 2;
        ctx!.save();
        ctx!.shadowColor = "rgba(210,225,255,0.8)"; ctx!.shadowBlur = 12;
        ctx!.globalAlpha = 0.8; ctx!.fillStyle = "#e9edf7";
        ctx!.beginPath();
        ctx!.moveTo(sx, sy - TS * 0.16);
        ctx!.quadraticCurveTo(sx + TS * 0.18, sy, sx, sy + TS * 0.18);
        ctx!.quadraticCurveTo(sx - TS * 0.18, sy, sx, sy - TS * 0.16);
        ctx!.fill();
        ctx!.restore();
      }

      // bariyerler (görüşte)
      const nowB = performance.now();
      for (const b of barriers.current.values()) {
        if (seen.current[b.y] && !seen.current[b.y][b.x]) continue;
        if (vis.get(b.y * cols + b.x) === undefined) continue;
        const sx = b.x * TS - camX, sy = b.y * TS - camY;
        const active = nowB >= b.armAt;
        ctx!.save();
        if (active) {
          ctx!.fillStyle = "#6a5a4a";
          ctx!.fillRect(sx + 2, sy + 2, TS - 3, TS - 3);
          ctx!.strokeStyle = "rgba(30,22,16,0.9)"; ctx!.lineWidth = 2;
          ctx!.strokeRect(sx + 2, sy + 2, TS - 3, TS - 3);
          ctx!.strokeStyle = "rgba(20,14,10,0.7)"; ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.moveTo(sx + 4, sy + 4); ctx!.lineTo(sx + TS - 4, sy + TS - 4);
          ctx!.moveTo(sx + TS - 4, sy + 4); ctx!.lineTo(sx + 4, sy + TS - 4);
          ctx!.stroke();
        } else {
          const pulse = 0.25 + 0.2 * Math.sin(nowB / 120);
          ctx!.fillStyle = `rgba(120,150,220,${pulse})`;
          ctx!.fillRect(sx + 3, sy + 3, TS - 5, TS - 5);
          ctx!.strokeStyle = "rgba(150,180,255,0.6)"; ctx!.lineWidth = 1.5;
          ctx!.setLineDash([4, 3]);
          ctx!.strokeRect(sx + 3, sy + 3, TS - 5, TS - 5);
          ctx!.setLineDash([]);
        }
        ctx!.restore();
      }

      // Tuzaklar (Faz C online): örümcek ağı; üstteki gelin yavaşlar
      const nowT = performance.now();
      for (const tr of onlineTraps.current.values()) {
        if (tr.until <= nowT || vis.get(tr.y * cols + tr.x) === undefined) continue;
        const sx = tr.x * TS + TS / 2 - camX, sy = tr.y * TS + TS / 2 - camY;
        ctx!.save();
        ctx!.globalAlpha = 0.6;
        ctx!.strokeStyle = "rgba(180,220,235,0.8)"; ctx!.lineWidth = 1.5;
        const r = TS * 0.36;
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          ctx!.beginPath(); ctx!.moveTo(sx, sy); ctx!.lineTo(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r); ctx!.stroke();
        }
        for (let ring = 1; ring <= 2; ring++) { ctx!.beginPath(); ctx!.arc(sx, sy, (r * ring) / 2.2, 0, Math.PI * 2); ctx!.stroke(); }
        ctx!.restore();
      }

      // gelinler (türlere göre: kraliçe büyük+taç+aura, caller halka, climber karanlıkta soluk)
      const rbrides = renderBrides();
      for (const z of rbrides) {
        const sx = z.pos.x * TS - camX, sy = z.pos.y * TS - camY;
        if (sx < -TS * 2 || sy < -TS * 2 || sx > cssW + TS * 2 || sy > cssH + TS * 2) continue;
        const zc = cellOf(z.pos);
        const visible = vis.get(zc.y * cols + zc.x) !== undefined;
        const ghost = z.kind === "climber" || z.kind === "queen";
        if (!visible && !ghost) continue;
        const lean = p.x < z.pos.x ? -1 : 1;
        const scale = z.kind === "queen" ? TUNING.queenScale : 1;
        ctx!.save();
        if (!visible) ctx!.globalAlpha = 0.5;
        if (z.kind === "queen") {
          const r = TS * scale * 0.42;
          const aura = ctx!.createRadialGradient(sx, sy, r * 0.5, sx, sy, r * 2.4);
          const ap = 0.28 + 0.12 * Math.sin(T * 3);
          aura.addColorStop(0, `rgba(180,20,40,${ap})`);
          aura.addColorStop(1, "rgba(180,20,40,0)");
          ctx!.fillStyle = aura;
          ctx!.beginPath(); ctx!.arc(sx, sy, r * 2.4, 0, Math.PI * 2); ctx!.fill();
        }
        drawBride(ctx!, TS * scale, sx, sy, T, z.id, z.aware, lean);
        ctx!.restore();
        if (z.kind === "queen") {
          const r = TS * scale * 0.42;
          ctx!.save();
          ctx!.fillStyle = "#ffd75a"; ctx!.shadowColor = "rgba(255,215,90,0.9)"; ctx!.shadowBlur = 10;
          const cyTop = sy - r * 1.15;
          ctx!.beginPath();
          ctx!.moveTo(sx - r * 0.6, cyTop); ctx!.lineTo(sx - r * 0.6, cyTop - r * 0.35);
          ctx!.lineTo(sx - r * 0.3, cyTop - r * 0.1); ctx!.lineTo(sx, cyTop - r * 0.45);
          ctx!.lineTo(sx + r * 0.3, cyTop - r * 0.1); ctx!.lineTo(sx + r * 0.6, cyTop - r * 0.35);
          ctx!.lineTo(sx + r * 0.6, cyTop); ctx!.closePath(); ctx!.fill();
          ctx!.restore();
        }
        if (z.kind === "caller") {
          ctx!.save();
          if (z.screamT && z.screamT > 0) {
            // Çığlık anı: ÇOK BELİRGİN — kızıl aura + kalın genişleyen halkalar + "!"
            const t = z.screamT / 0.7, prog = 1 - t;
            const ar = TS * (1.4 + prog * 1.6);
            const aura = ctx!.createRadialGradient(sx, sy, TS * 0.3, sx, sy, ar);
            aura.addColorStop(0, `rgba(255,40,90,${0.42 * t})`);
            aura.addColorStop(1, "rgba(255,40,90,0)");
            ctx!.fillStyle = aura;
            ctx!.beginPath(); ctx!.arc(sx, sy, ar, 0, Math.PI * 2); ctx!.fill();
            ctx!.shadowColor = "rgba(255,60,110,0.9)"; ctx!.shadowBlur = 12; ctx!.lineWidth = 3.5;
            for (let k = 0; k < 4; k++) {
              ctx!.globalAlpha = Math.max(0, t - k * 0.12);
              ctx!.strokeStyle = "rgba(255,70,120,0.95)";
              ctx!.beginPath(); ctx!.arc(sx, sy, TS * (0.5 + prog * 3 + k * 0.5), 0, Math.PI * 2); ctx!.stroke();
            }
            ctx!.globalAlpha = t; ctx!.shadowBlur = 8; ctx!.fillStyle = "#ffd0dc";
            ctx!.font = `900 ${Math.round(TS * 0.6)}px 'Cinzel', serif`; ctx!.textAlign = "center";
            ctx!.fillText("!", sx + Math.sin(T * 40) * TS * 0.06, sy - TS * 0.9);
          } else {
            // Boşta: hafif nabız halkası (tür belli olsun)
            ctx!.globalAlpha = 0.35 + 0.2 * Math.sin(T * 4 + z.id);
            ctx!.strokeStyle = "rgba(255,120,200,0.8)"; ctx!.lineWidth = 2;
            ctx!.beginPath(); ctx!.arc(sx, sy, TS * 0.55, 0, Math.PI * 2); ctx!.stroke();
          }
          ctx!.restore();
        }
      }

      // Madde 6: karanlıkta hızlanan gelinlerin kırmızı gözleri (karanlıkta bile görünür)
      for (const z of rbrides) {
        if (z.kind !== "dark") continue;
        const sx = z.pos.x * TS - camX, sy = z.pos.y * TS - camY;
        if (sx < -TS || sy < -TS || sx > cssW + TS || sy > cssH + TS) continue;
        const flk = 0.7 + 0.3 * Math.sin(T * 7 + z.id);
        ctx!.save();
        ctx!.shadowColor = "rgba(255,30,30,0.95)"; ctx!.shadowBlur = 12;
        ctx!.fillStyle = `rgba(255,45,45,${flk})`;
        const r = Math.max(1.6, TS * 0.055), off = TS * 0.1;
        ctx!.beginPath(); ctx!.arc(sx - off, sy - TS * 0.06, r, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(sx + off, sy - TS * 0.06, r, 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
      }

      // uçan mermiler
      for (const b of bullets.current) {
        ctx!.save(); ctx!.shadowColor = "rgba(255,240,180,0.9)"; ctx!.shadowBlur = 8;
        ctx!.fillStyle = "#fff4c2";
        ctx!.beginPath(); ctx!.arc(b.pos.x * TS - camX, b.pos.y * TS - camY, Math.max(2, TS * 0.08), 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
      }

      // Oyuncu ismini kafasının biraz üstünde, küçük ama OKUNABİLİR (dış çizgili) yaz
      const drawNameTag = (x: number, y: number, text: string, color: string) => {
        if (!text) return;
        ctx!.save();
        const fs = Math.max(11, TS * 0.3);
        ctx!.font = `600 ${fs}px system-ui, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.textBaseline = "bottom";
        const ny = y - TS * 0.62;
        ctx!.lineJoin = "round";
        ctx!.lineWidth = Math.max(2.5, fs * 0.3);
        ctx!.strokeStyle = "rgba(0,0,0,0.9)";
        ctx!.strokeText(text, x, ny);
        ctx!.fillStyle = color;
        ctx!.fillText(text, x, ny);
        ctx!.restore();
      };

      // Dükkan askeri işaretçisi (müttefik): koltuk renginde çerçeve + üstünde oyuncu ismi
      const drawSoldierMarker = (wx: number, wy: number, color: string, name: string) => {
        const sx = wx * TS - camX, sy = wy * TS - camY;
        if (sx < -TS || sy < -TS || sx > cssW + TS || sy > cssH + TS) return;
        ctx!.save();
        ctx!.shadowColor = color; ctx!.shadowBlur = 8;
        // gövde + baş (asker)
        ctx!.fillStyle = "#39423a";
        ctx!.beginPath(); ctx!.ellipse(sx, sy + TS * 0.06, TS * 0.18, TS * 0.24, 0, 0, Math.PI * 2); ctx!.fill();
        ctx!.fillStyle = "#cfe9d6";
        ctx!.beginPath(); ctx!.arc(sx, sy - TS * 0.15, TS * 0.1, 0, Math.PI * 2); ctx!.fill();
        // senin renk çerçeven
        ctx!.shadowBlur = 0;
        ctx!.strokeStyle = color; ctx!.lineWidth = Math.max(2, TS * 0.06);
        ctx!.beginPath(); ctx!.arc(sx, sy, TS * 0.32, 0, Math.PI * 2); ctx!.stroke();
        ctx!.restore();
        drawNameTag(sx, sy, name, color);
      };

      // diğer oyuncular (görüşte) — koltuk rengiyle halkalı + isim
      const nowP = performance.now();
      for (const o of others.current.values()) {
        if (nowP - o.seenAt > 3000) continue;
        const oc = cellOf(o.pos);
        if (vis.get(oc.y * cols + oc.x) === undefined) continue;
        const ox = o.pos.x * TS - camX, oy = o.pos.y * TS - camY;
        if (o.dead) ctx!.save(), (ctx!.globalAlpha = 0.4); // ölü/donmuş → soluk
        drawPlayer(ctx!, TS, ox, oy, o.dir, T, !o.dead, flicker, lvl.visionRadius, { cone: false, ring: o.dead ? "#888" : SEAT_COLORS[o.seat % SEAT_COLORS.length] });
        if (o.dead) ctx!.restore();
        drawNameTag(ox, oy, o.name, o.dead ? "#999" : SEAT_COLORS[o.seat % SEAT_COLORS.length]);
        // o oyuncunun dükkan askeri (varsa)
        if (o.sPos) drawSoldierMarker(o.sPos.x, o.sPos.y, SEAT_COLORS[o.seat % SEAT_COLORS.length], o.name);
      }
      // kendi dükkan askerin (senin koltuk renginde + ismin)
      if (soldierPos.current) drawSoldierMarker(soldierPos.current.x, soldierPos.current.y, myColor, nameOf(mySeat));

      // kendi (dokunulmazlıkta camgöbeği halka; ölüyken soluk + geri sayım)
      const cx = cssW / 2, cy = cssH / 2;
      const nowSelf = performance.now();
      const invuln = nowSelf < invulnUntil.current;
      const selfDead = deadUntil.current > nowSelf;
      if (selfDead) ctx!.save(), (ctx!.globalAlpha = 0.4);
      drawPlayer(ctx!, TS, cx, cy, selfDir.current, T, selfDead ? false : selfMoving.current, flicker, vEff, selfDead ? { ring: "#888" } : invuln ? { ring: "#6ee7ff" } : undefined);
      // KILIÇ: kuşanılıysa elinde görünür
      if (weaponRef.current === "sword" && !selfDead) {
        const sw = swordColorRef.current;
        drawSword(ctx!, TS, cx, cy, selfDir.current, sw.blade, sw.glow, Math.max(0, swordSwing.current / TUNING.swordSwingSec));
      }
      if (selfDead) ctx!.restore();
      drawNameTag(cx, cy, nameOf(mySeat), selfDead ? "#999" : myColor); // kendi ismin de kafanın üstünde
      if (selfDead) {
        // "öldün — N sn" geri sayımı
        const sec = Math.max(1, Math.ceil((deadUntil.current - nowSelf) / 1000));
        ctx!.save();
        ctx!.fillStyle = "#ff6b6b";
        ctx!.font = `800 ${Math.round(TS * 0.5)}px 'Cinzel', serif`;
        ctx!.textAlign = "center";
        ctx!.shadowColor = "#000"; ctx!.shadowBlur = 6;
        ctx!.fillText(`ÖLDÜN · ${sec}`, cx, cy - TS * 0.95);
        ctx!.restore();
      }
      // Madde 8: görünmezken titreşen tül halkası
      if (veilUntil.current > nowSelf) {
        ctx!.save();
        ctx!.globalAlpha = 0.3 + 0.18 * Math.sin(T * 5);
        ctx!.strokeStyle = "rgba(215,228,255,0.85)"; ctx!.lineWidth = 2;
        ctx!.beginPath(); ctx!.arc(cx, cy, TS * 0.5, 0, Math.PI * 2); ctx!.stroke();
        ctx!.restore();
      }

      // vinyet (ağır)
      const g = ctx!.createRadialGradient(cx, cy, vEff * TS * 0.28, cx, cy, vEff * TS);
      g.addColorStop(0, "rgba(0,0,0,0)");
      g.addColorStop(0.72, "rgba(0,0,0,0.42)");
      g.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx!.fillStyle = g; ctx!.fillRect(0, 0, cssW, cssH);

      // film grain
      if (grainPattern) {
        ctx!.save();
        ctx!.globalAlpha = 0.06;
        ctx!.translate(-Math.floor(Math.random() * 64), -Math.floor(Math.random() * 64));
        ctx!.fillStyle = grainPattern;
        ctx!.fillRect(0, 0, cssW + 64, cssH + 64);
        ctx!.restore();
      }

      // hasar flaşı
      if (hurt.current > 0) {
        ctx!.fillStyle = `rgba(200,20,20,${Math.min(0.5, hurt.current * 1.6)})`;
        ctx!.fillRect(0, 0, cssW, cssH);
      }

      // Envanter radarı: 1.5 sn çıkışa dönük parlak ok (metin yok)
      if (radarUntil.current > performance.now()) {
        const rem = (radarUntil.current - performance.now()) / 1000;
        const a = Math.min(1, rem / 1.5);
        const ang = radarAngle.current;
        const pulse = 1 + 0.12 * Math.sin(T * 12);
        const dist = TS * (2.1 + 0.25 * Math.sin(T * 6));
        const ax = cx + Math.cos(ang) * dist;
        const ay = cy + Math.sin(ang) * dist;
        ctx!.save();
        ctx!.globalAlpha = a;
        const trail = ctx!.createLinearGradient(cx, cy, ax, ay);
        trail.addColorStop(0, "rgba(120,220,255,0)");
        trail.addColorStop(1, "rgba(120,220,255,0.5)");
        ctx!.strokeStyle = trail;
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(ax, ay);
        ctx!.stroke();
        ctx!.translate(ax, ay);
        ctx!.rotate(ang);
        ctx!.shadowColor = "rgba(120,220,255,0.95)";
        ctx!.shadowBlur = 22;
        ctx!.fillStyle = "#cfeeff";
        const s = TS * 0.5 * pulse;
        ctx!.beginPath();
        ctx!.moveTo(s, 0);
        ctx!.lineTo(-s * 0.55, -s * 0.62);
        ctx!.lineTo(-s * 0.22, 0);
        ctx!.lineTo(-s * 0.55, s * 0.62);
        ctx!.closePath();
        ctx!.fill();
        ctx!.restore();
      }

      // Madde 10: görsel korku efektleri (gölge / fener sıçraması) — hasarsız
      drawScareFx(scares.current.fx, T, cssW, cssH);
    }

    function drawScareFx(fx: ScareFx | null, time: number, cssW: number, cssH: number) {
      if (!fx) return;
      const age = Math.min(1, (time - fx.born) / fx.dur);
      if (fx.kind === "shadow") {
        const a = Math.sin(age * Math.PI) * 0.6;
        const band = Math.min(cssW, cssH) * 0.3;
        let x = 0, y = 0, w = cssW, h = cssH;
        if (fx.side === 0) { w = band; x = -band + age * band * 1.6; }
        else if (fx.side === 1) { w = band; x = cssW - age * band * 1.6; }
        else if (fx.side === 2) { h = band; y = -band + age * band * 1.6; }
        else { h = band; y = cssH - age * band * 1.6; }
        const horiz = fx.side < 2;
        const g = horiz ? ctx!.createLinearGradient(x, 0, x + w, 0) : ctx!.createLinearGradient(0, y, 0, y + h);
        const edgeFirst = fx.side === 0 || fx.side === 2;
        g.addColorStop(0, edgeFirst ? `rgba(0,0,0,${a})` : "rgba(0,0,0,0)");
        g.addColorStop(1, edgeFirst ? "rgba(0,0,0,0)" : `rgba(0,0,0,${a})`);
        ctx!.fillStyle = g; ctx!.fillRect(x, y, w, h);
      } else {
        const a = (1 - age) * 0.14;
        if (a > 0) { ctx!.fillStyle = `rgba(190,210,255,${a})`; ctx!.fillRect(0, 0, cssW, cssH); }
      }
    }

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (ready.current && mazeRef.current && levelRef.current) {
        if (!resultPending.current) {
          step(dt, now);
          if (amHost.current) {
            brideAcc += dt;
            if (brideAcc >= 0.05) {
              brideAcc = 0;
              room.send({
                t: "brides",
                b: hostBrides.current.map((z) => [z.id, Math.round(z.pos.x * 100), Math.round(z.pos.y * 100), z.aware ? 1 : 0, KIND_CODE[(z.kind ?? "normal") as BKind]]),
              });
            }
          }
        }
        // pos = kalp atışı: bölüm-sonu ekranında (resultPending) BİLE gönder ki
        // diğer oyuncular seni yanlışlıkla "ayrıldı" saymasın.
        // #1: host, güncel bölüm no'sunu (lvl) heartbeat'e ekler → geride kalan yetişir.
        posAcc += dt;
        if (posAcc >= 0.05) {
          posAcc = 0;
          room.send({ t: "pos", x: selfPos.current.x, y: selfPos.current.y, dx: selfDir.current.x, dy: selfDir.current.y, sx: soldierPos.current?.x ?? null, sy: soldierPos.current?.y ?? null, dead: deadUntil.current > 0, rk: roundKills.current, lvl: amHost.current ? levelRef.current.level : undefined });
        }
        // #1: host, overlay boyunca "result"ı periyodik yeniden yayınlar (kayıp mesaj
        // sigortası — tek yayında düşerse ~1 sn içinde tekrar ulaşır).
        if (amHost.current && resultPending.current && lastResult.current) {
          resultReAcc += dt;
          if (resultReAcc >= 1) {
            resultReAcc = 0;
            const lr = lastResult.current;
            room.send({ t: "result", winnerSeat: lr.winnerSeat, scores: lr.scores, lvl: lr.lvl as never });
          }
        } else resultReAcc = 0;
        hudAcc += dt;
        if (hudAcc >= 0.15) {
          hudAcc = 0;
          // Arena öldürme sıralaması: herkes görebilsin diye kendi turumuz + diğerlerinin
          // pos'ta yayınladığı rk (tur öldürme) birleştirilir.
          const board = arenaMode
            ? [
                { seat: mySeat, name: nameOf(mySeat), k: roundKills.current },
                ...Array.from(others.current.values()).map((o) => ({ seat: o.seat, name: o.name || nameOf(o.seat), k: o.rk ?? 0 })),
              ].sort((a, b) => b.k - a.k)
            : [];
          setHud({
            level: levelRef.current.level, ammo: ammoCount.current, exitOpen: exitOpen.current,
            kills: kills.current, barriers: barrierStock.current, hp: Math.max(0, hp.current),
            scores: scores.current.slice(), themeName: THEMES[levelRef.current.theme]?.name ?? "",
            veil: veilUntil.current > performance.now() ? Math.max(0, Math.ceil((veilUntil.current - performance.now()) / 1000)) : 0,
            wave: roundNum.current,
            surv: arenaMode && roundEndsAt.current ? Math.max(0, Math.ceil((roundEndsAt.current - performance.now()) / 1000)) : 0,
            rk: roundKills.current,
            brides: amHost.current ? hostBrides.current.length : guestBrides.current.size,
            board,
          });
          setMqHud(miniQuest.current && !mqDone.current ? MQ_DEFS[miniQuest.current.kind].hud : "");
        }
        render();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(toastTimer);
      cvEl?.removeEventListener("contextmenu", onCtx);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      room.onMessage = () => {};
      sound.stopGameMusic();
      sound.stopAmbient();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Envanter: kalkanı kullan (kişisel envanterden tüket → 3 sn dokunulmazlık)
  function activateShieldOnline() {
    if (!ready.current || resultPending.current) return;
    const inv = getInventory();
    if (inv.shields <= 0) return;
    inv.shields -= 1;
    saveInventory(inv);
    invulnUntil.current = Math.max(invulnUntil.current, performance.now() + 3000);
    sound.play("veil"); // hayaletimsi kalkan sesi
    setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps });
  }
  // Envanter: radarı kullan (kişisel envanterden tüket → 1.5 sn çıkışa dönük ok)
  function activateRadarOnline() {
    if (!ready.current || resultPending.current) return;
    const maze = mazeRef.current, lvl = levelRef.current;
    if (!maze || !lvl) return;
    const inv = getInventory();
    if (inv.radars <= 0) return;
    inv.radars -= 1;
    saveInventory(inv);
    // Çıkış yönünü BFS mesafe haritasıyla bul (komşu hücrelerden en yakını)
    const dist = bfsDistances(maze, lvl.exit);
    const pc = cellOf(selfPos.current);
    const here = dist[pc.y]?.[pc.x] ?? -1;
    let bestAng = 0;
    let bestD = here >= 0 ? here : Infinity;
    const opts = [
      { dx: 1, dy: 0, a: 0 },
      { dx: -1, dy: 0, a: Math.PI },
      { dx: 0, dy: -1, a: -Math.PI / 2 },
      { dx: 0, dy: 1, a: Math.PI / 2 },
    ];
    for (const o of opts) {
      const d = dist[pc.y + o.dy]?.[pc.x + o.dx];
      if (d !== undefined && d >= 0 && d < bestD) {
        bestD = d;
        bestAng = o.a;
      }
    }
    radarAngle.current = bestAng;
    radarUntil.current = performance.now() + 1500;
    sound.play("secret");
    setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps });
  }
  // Envanter: duvağı kullan (birkaç sn görünmez ol) — kişisel envanterden tüket
  function activateVeilOnline() {
    if (!ready.current || resultPending.current || veilUntil.current > performance.now()) return;
    const inv = getInventory();
    if (inv.veils <= 0) return;
    const now = performance.now();
    veilUntil.current = now + TUNING.veilSec * 1000;
    veiledUntil.current[mySeat] = veilUntil.current;
    inv.veils -= 1;
    saveInventory(inv);
    sound.play("veil");
    room.send({ t: "veil", seat: mySeat, on: true });
    setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps });
  }
  // Envanter: bulunduğun yere tuzak koy — kişisel envanterden tüket
  function activateInvTrapOnline() {
    if (!ready.current || resultPending.current) return;
    const inv = getInventory();
    if (inv.traps <= 0) return;
    const c = cellOf(selfPos.current);
    const key = c.x + "," + c.y;
    if (onlineTraps.current.has(key)) return;
    onlineTraps.current.set(key, { x: c.x, y: c.y, until: performance.now() + TUNING.trapSec * 1000 });
    inv.traps -= 1;
    saveInventory(inv);
    sound.play("pickup");
    room.send({ t: "trap", x: c.x, y: c.y });
    setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps });
  }
  // Slot: kuşanılan eşyayı kullan (boşsa envanteri aç)
  const SLOT_ICON_ON: Record<"shield" | "radar" | "veil" | "trap", IconName> = { shield: "shield", radar: "radar", veil: "veil", trap: "trap" };
  const equippedCountOn =
    equipped === "shield" ? invCounts.shields : equipped === "radar" ? invCounts.radars : equipped === "veil" ? invCounts.veils : equipped === "trap" ? invCounts.traps : 0;
  function useEquippedOnline() {
    if (!equipped || equippedCountOn <= 0) { setInvOpen(true); return; }
    if (equipped === "shield") activateShieldOnline();
    else if (equipped === "radar") activateRadarOnline();
    else if (equipped === "veil") activateVeilOnline();
    else if (equipped === "trap") activateInvTrapOnline();
  }

  // Dükkânı aç — hareket tuşlarını temizle (dükkânda kayıp gitmeyesin)
  function openShop() {
    uiOpen.current = true;
    input.current = { up: false, down: false, left: false, right: false, ax: 0, ay: 0, fire: false, place: false, trap: false };
    setShopOpen(true);
  }
  // Dükkânı kapat — para + envanter sayılarını tazele (aldıkların HUD'a yansısın)
  function closeShop() {
    uiOpen.current = false;
    setShopOpen(false);
    setCoins(getCoins());
    const inv = getInventory();
    setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps });
  }

  // Menüye dön — ayrıldığını hemen bildir (diğerleri anında görsün)
  function quit() {
    try {
      room.send({ t: "left" });
    } catch {
      /* geç */
    }
    onExit();
  }

  return (
    <div className="stage">
      <canvas ref={canvasRef} />

      <div className="hud">
        {/* Sol: bilgi çipleri — durum → kaynaklar → mod bilgisi → skor tablosu */}
        <div className="hud-info">
          <div className="chip">
            <span className="lbl">Can</span>
            <div className="hpbar">
              <div
                className="hpfill"
                style={{
                  width: `${(hud.hp / PLAYER_MAX_HP) * 100}%`,
                  background: hud.hp / PLAYER_MAX_HP > 0.35 ? "var(--hp)" : "var(--hp-low)",
                }}
              />
            </div>
          </div>
          <div className="chip">
            <span className="lbl"><Icon name="ammo" size={12} /> Mermi</span>
            <span className="val">{hud.ammo}</span>
          </div>
          <div className="chip">
            <span className="lbl"><Icon name="box" size={12} /> Bariyer</span>
            <span className="val">{hud.barriers}</span>
          </div>
          <div className="chip">
            <span className="lbl"><Icon name="trap" size={12} /> Tuzak</span>
            <span className="val">{trapCount}</span>
          </div>
          <div className="chip" style={{ borderColor: "rgba(255,205,80,0.6)" }}>
            <span className="lbl"><Icon name="coin" size={12} /> Altın</span>
            <span className="val" style={{ color: "#ffd75a" }}>{coins}</span>
          </div>
          <div className="chip">
            <span className="lbl">Bölüm</span>
            <span className="val">{hud.level}</span>
          </div>
          {info.pvp && (
            <div className="chip" style={{ borderColor: "rgba(255,120,120,0.6)" }}>
              <span className="lbl"><Icon name="swords" size={12} /> PvP</span>
              <span className="val" style={{ color: "#ff9a9a" }}>açık</span>
            </div>
          )}
          {arenaMode ? (
            // Arena'da Süre + Gelin ÜST ŞERİTTE DEĞİL — ortadaki belirgin banner'da
            // (aşağıda .arena-banner). Burada yalnız tur ve puan kalır.
            <>
              <div className="chip" style={{ borderColor: "rgba(255,170,90,0.6)" }}>
                <span className="lbl"><Icon name="swords" size={12} /> Tur</span>
                <span className="val" style={{ color: "#ffb45a" }}>{hud.wave}</span>
              </div>
              <div className="chip" style={{ borderColor: "rgba(125,255,176,0.5)" }}>
                <span className="lbl">Puanın</span>
                <span className="val" style={{ color: "#7dffb0" }}>{hud.scores[mySeat] ?? 0}/{ARENA_WIN_POINTS}</span>
              </div>
            </>
          ) : (
            <div className="chip" style={{ borderColor: hud.exitOpen ? "rgba(125,255,176,0.5)" : "rgba(255,150,150,0.5)" }}>
              <span className="lbl"><Icon name={hud.exitOpen ? "key" : "lock"} size={12} /> Çıkışın</span>
              <span className="val" style={{ color: hud.exitOpen ? "var(--hp)" : "var(--muted)" }}>
                {hud.exitOpen ? "AÇIK" : "KİLİTLİ"}
              </span>
            </div>
          )}
          {hud.veil > 0 && (
            <div className="chip" style={{ borderColor: "rgba(215,228,255,0.6)" }}>
              <span className="lbl"><Icon name="veil" size={12} /> Görünmez</span>
              <span className="val" style={{ color: "#d7e4ff" }}>{hud.veil}s</span>
            </div>
          )}
          {mqHud && (
            <div className="chip" style={{ borderColor: "rgba(255,200,90,0.6)" }}>
              <span className="lbl"><Icon name="flame" size={12} /> Fırsat</span>
              <span className="val" style={{ color: "#ffd75a" }}>{mqHud}</span>
            </div>
          )}
          {/* CANLI SKOR TABLOSU — kimin önde olduğu her an ekranda (yarış: tur galibiyeti, arena: puan) */}
          <div className="chip" style={{ borderColor: "rgba(255,205,80,0.55)" }}>
            <span className="lbl">
              <Icon name="trophy" size={12} /> {arenaMode ? `Puan (ilk ${ARENA_WIN_POINTS})` : "Skor"}
            </span>
            <span className="val" style={{ display: "inline-flex", gap: 7, flexWrap: "wrap" }}>
              {hud.scores.map((s, seat) => {
                const lead = s === Math.max(...hud.scores) && s > 0;
                const me = seat === mySeat;
                return (
                  <span
                    key={seat}
                    title={me ? `${nameOf(seat)} (sen)` : nameOf(seat)}
                    style={{
                      color: SEAT_COLORS[seat % SEAT_COLORS.length],
                      fontWeight: lead ? 900 : 700,
                      opacity: lead || me ? 1 : 0.75,
                      textDecoration: me ? "underline" : "none",
                    }}
                  >
                    {nameOf(seat)}&nbsp;{s}
                    {lead ? <Icon name="crown" size={11} style={{ marginLeft: 3 }} /> : null}
                  </span>
                );
              })}
            </span>
          </div>
        </div>

        {/* Sağ üst: yardım · dükkân · çıkış (hep yan yana) */}
        <div className="hud-actions">
          {arenaMode && (
            <button className="chip mutebtn" onClick={() => setRulesOpen(true)} title="Arena kuralları">
              <Icon name="help" size={17} />
            </button>
          )}
          <button className="chip mutebtn" onClick={openShop} title="Dükkân — altınla eşya al">
            <Icon name="cart" size={17} />
          </button>
          {/* Yanlışlıkla basınca oyun gitmesin → önce onay sor */}
          <button className="chip mutebtn" onClick={() => setConfirmQuit(true)} title="Menüye dön">
            <Icon name="exit" size={17} />
          </button>
        </div>
      </div>

      {/* Çıkış onayı — tek tıkla maçtan düşmeyi engeller */}
      {confirmQuit && (
        <div className="invbackdrop" onClick={(e) => { if (e.target === e.currentTarget) setConfirmQuit(false); }}>
          <div className="invcard" style={{ maxWidth: 360, textAlign: "center" }}>
            <div style={{ fontWeight: 800, fontSize: 16, color: "var(--ink-title)" }}>Oyundan çıkılsın mı?</div>
            <div style={{ fontSize: 13.5, color: "var(--muted)", marginTop: 6, lineHeight: 1.5 }}>
              Menüye dönersen bu maçtan ayrılırsın.
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, justifyContent: "center", flexWrap: "wrap" }}>
              <button className="btn btn-primary" onClick={() => setConfirmQuit(false)}>Oyuna Devam Et</button>
              <button className="danger-btn" onClick={quit}>Menüye Dön</button>
            </div>
          </div>
        </div>
      )}

      {/* ARENA — SÜRE + GELİN: üst şeritte kaybolmasın diye ortada, üstten biraz aşağıda,
          büyük ve belirgin renkte (kolay takip). Son 10 sn'de süre kırmızı yanar. */}
      {arenaMode && (
        <div className="arena-banner">
          <div className={"ab-item" + (hud.surv <= 10 ? " is-urgent" : "")}>
            <span className="ab-lbl">SÜRE</span>
            <span className="ab-val">
              {Math.floor(hud.surv / 60)}:{String(hud.surv % 60).padStart(2, "0")}
            </span>
          </div>
          <span className="ab-sep" />
          <div className="ab-item is-brides">
            <span className="ab-lbl">GELİN</span>
            <span className="ab-val">{hud.brides}</span>
          </div>
        </div>
      )}

      {/* ARENA — öldürme sıralaması: solda, küçük, YALNIZ ilk 3; herkes görür */}
      {arenaMode && hud.board.length > 0 && (
        <div className="arena-board">
          {hud.board.slice(0, 3).map((p, i) => (
            <div key={p.seat} className={"ab-row" + (p.seat === mySeat ? " is-me" : "")}>
              <span className="ab-rank">{i + 1}</span>
              <span className="ab-name" style={{ color: SEAT_COLORS[p.seat % SEAT_COLORS.length] }}>
                {p.name}
              </span>
              <span className="ab-k">{p.k}</span>
            </div>
          ))}
        </div>
      )}

      {/* Oyun-içi envanter (online) — ortalanmış modal, mobil dostu */}
      {invOpen && (
        <div className="invbackdrop" onClick={(e) => { if (e.target === e.currentTarget) setInvOpen(false); }}>
          <div className="invcard">
            <div style={{ fontWeight: 800, color: "#e0a24a", letterSpacing: "0.14em", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Icon name="box" size={18} /> ENVANTER</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>Kuşan → sonra ateşin yanındaki kutucukla kullan.</div>
            {([
              { kind: "shield", icon: "shield" as IconName, name: "Kalkan", n: invCounts.shields, desc: "3 sn dokunulmazlık" },
              { kind: "radar", icon: "radar" as IconName, name: "Radar", n: invCounts.radars, desc: "çıkış yönünü göster" },
              { kind: "veil", icon: "veil" as IconName, name: "Duvak", n: invCounts.veils, desc: "birkaç sn görünmez ol" },
              { kind: "trap", icon: "trap" as IconName, name: "Tuzak", n: invCounts.traps, desc: "yere koy, gelini yavaşlat" },
            ] as const).map((it) => (
              <button
                key={it.kind}
                className="btn"
                disabled={it.n <= 0}
                onClick={() => { setEquipped(it.kind); setInvOpen(false); }}
                style={{
                  opacity: it.n > 0 ? 1 : 0.4,
                  borderColor: equipped === it.kind ? "rgba(224,162,74,0.8)" : undefined,
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name={it.icon} size={16} /> {it.name} ({it.n}) — {it.desc}{equipped === it.kind ? <><Icon name="check" size={14} /> kuşanıldı</> : ""}
                </span>
              </button>
            ))}
            {invCounts.shields <= 0 && invCounts.radars <= 0 && invCounts.veils <= 0 && invCounts.traps <= 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Boş — menüdeki dükkândan alabilirsin.
              </div>
            )}
            <button className="btn" onClick={() => setInvOpen(false)} style={{ opacity: 0.7 }}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {toast && (
        <div
          className="warn"
          style={{ top: 70, background: "rgba(20,10,10,0.85)", color: "#ffd0d0", borderColor: "rgba(255,120,120,0.4)" }}
        >
          <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="key" size={15} /> {toast}</span>
        </div>
      )}

      {mqToast && (
        <div
          className="warn"
          style={{ top: toast ? 122 : 70, background: "rgba(70,55,15,0.92)", color: "#ffe9a8", borderColor: "rgba(255,215,90,0.6)" }}
        >
          ✦ {mqToast}
        </div>
      )}

      {alone && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="big" style={{ color: "#ff9a3c" }}>Oda kapandı</div>
          <div className="subtitle">Odada 2 kişiden az kaldı — yarış sona erdi.</div>
          <button className="btn btn-primary" onClick={quit}>← Geri</button>
        </div>
      )}

      {phase === "left" && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="big" style={{ color: "#ff6b6b" }}>Bağlantı koptu</div>
          <button className="btn btn-primary" onClick={quit}>← Geri</button>
        </div>
      )}

      {overlay && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.82)" }}>
          <div
            className="big"
            style={{ color: overlay.winnerSeat === mySeat ? "#7dffb0" : "#ff6b6b" }}
          >
            {overlay.winnerSeat === mySeat
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>Bu bölümü KAZANDIN! <Icon name="trophy" size={26} /></span>
              : `${nameOf(overlay.winnerSeat)} kazandı`}
          </div>
          <div className="subtitle" style={{ fontSize: "clamp(18px,4.5vw,28px)" }}>
            {overlay.scores.map((s, seat) => (
              <span key={seat}>
                {seat > 0 && " · "}
                <b style={{ color: SEAT_COLORS[seat % SEAT_COLORS.length] }}>
                  {nameOf(seat)}: {s}
                </b>
              </span>
            ))}
          </div>
          <div className="subtitle">Sonraki bölüm ~5 sn içinde — dükkâna uğrayabilirsin.</div>
          <button className="btn" onClick={openShop} style={{ borderColor: "rgba(255,205,80,0.6)", display: "inline-flex", alignItems: "center", gap: 6, justifyContent: "center" }}>
            <Icon name="cart" size={16} /> Dükkâna Uğra ({coins} <Icon name="coin" size={13} />)
          </button>
        </div>
      )}

      {/* Arena KURALLARI — oyun başında 4 sn otomatik, sonra HUD'daki "?" ile */}
      {arenaMode && rulesOpen && !arenaOver && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.88)", zIndex: 28 }}>
          <div className="big" style={{ color: "#ffb45a", display: "inline-flex", alignItems: "center", gap: 10 }}>
            <Icon name="swords" size={28} /> ARENA KURALLARI
          </div>
          <div className="how" style={{ textAlign: "left", maxWidth: 480 }}>
            <p style={{ margin: 0 }}><b>Amaç:</b> Turu <b>en çok gelin öldüren</b> kazanır (+1 puan).</p>
            <p style={{ margin: "10px 0 0" }}><b>Kazanma:</b> İlk <b>{ARENA_WIN_POINTS} puana</b> ulaşan maçı alır.</p>
            <p style={{ margin: "10px 0 0" }}><b>Tur süresi:</b> 2 dakika. Süre bitince tur sonuçlanır.</p>
            <p style={{ margin: "10px 0 0" }}><b>Çıkış yok:</b> Açık arenada dalga dalga gelin gelir; turlar ilerledikçe artar.</p>
            <p style={{ margin: "10px 0 0" }}><b>Ölüm:</b> Ölürsen <b>3 sn</b> yerinde beklersin (kill süresinden kaybedersin), sonra doğarsın.</p>
            <p style={{ margin: "10px 0 0" }}><b>Can:</b> Arenada can paketi seyrektir — dikkatli oyna.</p>
            <p style={{ margin: "10px 0 0", color: "#8f8776", fontStyle: "italic" }}>Bu ekranı oyun içinde <b>?</b> düğmesiyle tekrar açabilirsin.</p>
          </div>
          <button className="btn btn-primary" onClick={() => setRulesOpen(false)}>Anladım</button>
        </div>
      )}

      {/* Tur ARASI — turu kim kazandı (yeni tur başlamadan herkes görür) */}
      {roundInfo && !arenaOver && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.86)", zIndex: 29 }}>
          <div className="big" style={{ color: roundInfo.winner === mySeat ? "#7dffb0" : "#ffb45a" }}>
            {roundInfo.winner === mySeat
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>TURU SEN KAZANDIN! <Icon name="trophy" size={26} /></span>
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="trophy" size={24} /> {nameOf(roundInfo.winner)} turu kazandı</span>}
          </div>
          <div className="subtitle" style={{ fontSize: "clamp(15px,3.6vw,20px)" }}>
            {roundInfo.kills} gelin öldürdü · +2 puan
          </div>
          {/* TURUN TAM SIRALAMASI — herkes nerede bitirdiğini görür.
              Puanlama: 1. +2 · 2. +1 · diğerleri 0 */}
          <div className="subtitle" style={{ fontSize: "clamp(13px,3.2vw,17px)", lineHeight: 1.7 }}>
            {(roundInfo.standings ?? []).map((p, i) => (
              <div key={p.seat} style={{ display: "flex", gap: 10, justifyContent: "center", alignItems: "baseline" }}>
                <span style={{ color: "#8f8776", minWidth: 18 }}>{i + 1}.</span>
                <b style={{ color: SEAT_COLORS[p.seat % SEAT_COLORS.length], minWidth: 90, textAlign: "left" }}>{nameOf(p.seat)}</b>
                <span style={{ color: "#ff9a9a" }}>{p.k} gelin</span>
                <span style={{ color: i === 0 ? "#7dffb0" : i === 1 ? "#ffd75a" : "#8f8776" }}>
                  {i === 0 ? "+2" : i === 1 ? "+1" : "+0"} puan
                </span>
                <span style={{ color: "var(--muted)" }}>
                  (toplam {roundInfo.scores[p.seat] ?? 0})
                </span>
              </div>
            ))}
          </div>
          <div className="subtitle" style={{ color: "#8f8776" }}>Yeni tur başlıyor…</div>
        </div>
      )}

      {/* Arena maçı bitti — en çok tur kazanan (5) maçı aldı */}
      {arenaOver && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)", zIndex: 30 }}>
          <div className="big" style={{ color: arenaOver.winner === mySeat ? "#7dffb0" : "#ff6b6b" }}>
            {arenaOver.winner === mySeat
              ? <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>ARENA ŞAMPİYONU SENSİN! <Icon name="trophy" size={28} /></span>
              : <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><Icon name="trophy" size={26} /> {nameOf(arenaOver.winner)} kazandı</span>}
          </div>
          <div className="subtitle" style={{ fontSize: "clamp(16px,4vw,24px)", lineHeight: 1.8 }}>
            {arenaOver.scores.map((s, seat) => (
              <div key={seat}>
                <b style={{ color: SEAT_COLORS[seat % SEAT_COLORS.length] }}>{nameOf(seat)}</b>: {s} puan
              </div>
            ))}
          </div>
          <button className="btn btn-primary" onClick={onExit} style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            ← Menüye Dön
          </button>
        </div>
      )}

      {/* Oyun-içi dükkân (market) — tam ekran overlay; alttaki oyun sürer */}
      {shopOpen && (
        <Shop title="DÜKKÂN" onBack={closeShop} standalone />
      )}

      <div className="hint">
        <b>WASD/Ok</b> hareket · <b>Boşluk</b> ateş · <b>E</b> bariyer · <b>T</b> tuzak · <b>Q</b> kalkan · <b>R</b> radar · <Icon name="box" size={13} style={{ verticalAlign: "-2px" }} /> envanter · çıkışın için 1 gelin öldür
      </div>

      <div className="touch">
        <Joystick onMove={(x, y) => { input.current.ax = x; input.current.ay = y; }} />
        <button
          className="barrierbtn"
          onPointerDown={(e) => { e.preventDefault(); input.current.place = true; }}
          onPointerUp={() => (input.current.place = false)}
          onPointerLeave={() => (input.current.place = false)}
          onPointerCancel={() => (input.current.place = false)}
        >
          BARİYER
        </button>
        <button
          className="barrierbtn"
          style={{ right: 130, bottom: 138, background: "radial-gradient(circle at 40% 35%, #4a6a86, #22344a)", opacity: trapCount > 0 ? 1 : 0.4 }}
          onPointerDown={(e) => { e.preventDefault(); input.current.trap = true; }}
          onPointerUp={() => (input.current.trap = false)}
          onPointerLeave={() => (input.current.trap = false)}
          onPointerCancel={() => (input.current.trap = false)}
        >
          <Icon name="trap" size={20} />{trapCount}
        </button>
        <button
          className={"fire" + (weapon === "sword" ? " is-sword" : "")}
          onPointerDown={(e) => { e.preventDefault(); input.current.fire = true; }}
          onPointerUp={() => (input.current.fire = false)}
          onPointerLeave={() => (input.current.fire = false)}
          onPointerCancel={() => (input.current.fire = false)}
        >
          {weapon === "sword" ? "KILIÇ" : "ATEŞ"}
        </button>
        {/* Ateşin ÜSTÜNDEKİ eylem satırı (tekli oyunla aynı düzen) — sabit sağ-alt
            konum yerine satır: tuzak/bariyer butonlarıyla çakışmaz. */}
        <div className="actionrow actionrow-mp">
          <button
            className={"actbtn" + (weapon === "sword" ? " is-sword" : "")}
            onPointerDown={(e) => { e.preventDefault(); toggleWeapon(); }}
            title={weapon === "sword" ? "Silaha geç (F / sağ tık)" : "Kılıca geç (F / sağ tık)"}
            aria-label="Silah değiştir"
          >
            {weapon === "sword" ? <Icon name="ammo" size={18} /> : <Icon name="sword" size={20} />}
          </button>
        </div>
      </div>

      {/* Envanteri aç — slotun hemen üstünde */}
      <button
        className="invbtn invbtn-mp"
        onPointerDown={(e) => e.preventDefault()}
        onClick={() => { const inv = getInventory(); setInvCounts({ shields: inv.shields, radars: inv.radars, veils: inv.veils, traps: inv.traps }); setInvOpen(true); }}
        title="Envanter"
      >
        <Icon name="box" size={18} /> {invCounts.shields + invCounts.radars + invCounts.veils + invCounts.traps}
      </button>

      {/* Kuşanılan eşya slotu (kalkan/radar) — tıkla=kullan, boşsa envanteri aç */}
      <button
        className="slotbtn slotbtn-mp"
        // onPointerDown → joystick basılıyken (2. parmak) da kullanılabilir (bkz. Game.tsx)
        onPointerDown={(e) => { e.preventDefault(); useEquippedOnline(); }}
        title={equipped ? "Kuşanılan eşyayı kullan" : "Envanteri aç"}
      >
        {equipped ? (
          <>
            <span className="si"><Icon name={SLOT_ICON_ON[equipped]} size={22} /></span>
            <span className="sc">{equippedCountOn}</span>
          </>
        ) : (
          <span className="si" style={{ opacity: 0.5 }}>▫</span>
        )}
      </button>
    </div>
  );
}
