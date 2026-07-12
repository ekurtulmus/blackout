"use client";

import { useEffect, useRef, useState } from "react";
import { Joystick } from "@/components/Game";
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  PLAYER_MAX_HP,
  CONTACT_DPS,
  BULLET_SPEED,
  BULLET_LIFE,
  FIRE_COOLDOWN,
  HEAL_AMOUNT,
} from "@/lib/engine";
import { BRIDE_RADIUS, moveBrides, randomDir } from "@/lib/brides";
import { cellOf, tryMove } from "@/lib/physics";
import { computeVisible } from "@/lib/vision";
import { sound } from "@/lib/audio";
import { drawBride, drawPlayer, grime } from "@/lib/sprites";
import { THEMES } from "@/lib/themes";
import type { Maze } from "@/lib/maze";
import {
  deserializeLevel,
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

const RESPAWN_MS = 10000; // toplanan mermi bu sürede haritada geri doğar
const BRIDE_RESPAWN_MS = 20000; // ölen gelin bu sürede yeniden doğar
const BARRIER_ARM_MS = 500; // bariyer koyduktan sonra aktifleşme süresi
const LEAVE_MS = 4000; // bu kadar süre pos gelmezse oyuncu "ayrıldı" sayılır

// Koltuk (seat) renkleri — 0 host
const SEAT_COLORS = ["#6ee7ff", "#ff9a3c", "#7dffb0", "#c98cff", "#ffd166", "#ff6b9d"];

type Phase = "playing" | "left";
type RBride = { id: number; pos: Vec; target: Vec; aware: boolean };
type Bullet = { pos: Vec; vel: Vec; life: number };
type Other = { pos: Vec; target: Vec; dir: Vec; seenAt: number; seat: number; name: string; everSeen: boolean };

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
  const input = useRef({ up: false, down: false, left: false, right: false, ax: 0, ay: 0, fire: false, place: false });
  const [phase, setPhase] = useState<Phase>("playing");
  const [hud, setHud] = useState({ level: 1, ammo: 0, exitOpen: false, kills: 0, barriers: 3, hp: PLAYER_MAX_HP, scores: [] as number[], themeName: "" });
  const [toast, setToast] = useState<string | null>(null); // "X ayrıldı" vb.
  const [alone, setAlone] = useState(false); // diğerleri gitti → tek kaldın

  const mySeat = info.seat;
  const diff = info.diff;
  const order = info.order; // oyuncu id sırası (seat = index)
  const myColor = SEAT_COLORS[mySeat % SEAT_COLORS.length];
  const nameOf = (seat: number) =>
    info.names[seat] || (seat === 0 ? "Ev sahibi" : `Oyuncu ${seat + 1}`);

  // Dünya
  const levelRef = useRef<RaceLevel | null>(null);
  const mazeRef = useRef<Maze | null>(null);
  const selfPos = useRef<Vec>({ x: 1.5, y: 1.5 });
  const selfDir = useRef<Vec>({ x: 0, y: -1 });
  const mySpawn = useRef<Vec>({ x: 1.5, y: 1.5 });
  const others = useRef<Map<string, Other>>(new Map()); // diğer oyuncular (id -> durum)
  const goneIds = useRef<Set<string>>(new Set()); // ayrılmış oyuncular
  const seen = useRef<boolean[][]>([]);
  const ready = useRef(false);
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
  const health = useRef<{ x: number; y: number; taken: boolean }[]>([]); // can paketleri (respawn yok)
  const ammoCount = useRef(0);
  const bullets = useRef<Bullet[]>([]);
  const fireCd = useRef(0);
  const kills = useRef(0);
  const exitOpen = useRef(false);
  const invulnUntil = useRef(0);
  const hurt = useRef(0);
  const hp = useRef(PLAYER_MAX_HP);
  const selfMoving = useRef(false);
  const bloodStains = useRef<{ x: number; y: number; r: number; seed: number }[]>([]);
  // Bariyerler (paylaşılan): id -> {x,y,armAt}
  const barriers = useRef<Map<string, { x: number; y: number; armAt: number }>>(new Map());
  const barrierStock = useRef(3);
  const barrierCounter = useRef(0);
  const breakTimer = useRef(0);
  const placeHeld = useRef(false);
  // Yarış sonucu / puan (seat sırasına göre)
  const scores = useRef<number[]>(order.map(() => 0));
  const resultPending = useRef(false);
  const sentReach = useRef(false);
  const [overlay, setOverlay] = useState<{ winnerSeat: number; scores: number[] } | null>(null);

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
    // diğer oyuncular (ayrılmış olanları dahil etme)
    others.current.clear();
    for (let s = 0; s < order.length; s++) {
      const id = order[s];
      if (id === room.id || goneIds.current.has(id)) continue;
      const p = sp(s);
      others.current.set(id, { pos: { ...p }, target: { ...p }, dir: { x: 0, y: -1 }, seenAt: 0, seat: s, name: nameOf(s), everSeen: false });
    }
    seen.current = Array.from({ length: lvl.rows }, () => Array.from({ length: lvl.cols }, () => false));
    ammo.current = lvl.ammo.map((c) => ({ x: c.x, y: c.y, taken: false, takenAt: 0 }));
    health.current = lvl.health.map((c) => ({ x: c.x, y: c.y, taken: false }));
    ammoCount.current = 0;
    bullets.current = [];
    kills.current = 0;
    exitOpen.current = false;
    barriers.current.clear();
    barrierStock.current = 3;
    breakTimer.current = 0;
    bloodStains.current = [];
    deadBrides.current.clear();
    guestBrides.current.clear();
    hp.current = PLAYER_MAX_HP;
    invulnUntil.current = performance.now() + 1500;
    if (amHost.current) {
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
      }));
      brideIdCounter.current = lvl.brideSpawns.length;
    } else {
      hostBrides.current = [];
    }
    brideRespawnQueue.current = [];
    resultPending.current = false;
    sentReach.current = false;
    ready.current = true;
    setPhase("playing");
    setHud((h) => ({ ...h, level: lvl.level, ammo: 0, exitOpen: false, kills: 0 }));
  }

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const mountTime = performance.now();

    // Ses — online moda bağla (menü müziği page tarafında susturuldu)
    sound.init();
    sound.resume();
    sound.playGameMusic().then((ok) => {
      if (!ok) sound.startAmbient();
    });

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
        // devral: mevcut gelin görüntüsünü tam simülasyona çevir
        hostBrides.current = Array.from(guestBrides.current.values()).map((z) => ({
          id: z.id,
          pos: { ...z.pos },
          hp: 1,
          aware: z.aware,
          lastSeen: null,
          seenTimer: 4,
          wanderDir: randomDir(),
          wanderTimer: 0,
          path: null,
          repathTimer: 0,
        }));
        flash("Ev sahibi ayrıldı — kontrolü sen devraldın");
      }
      amHost.current = nowHost;
    }

    // Bir oyuncu ayrıldı (pos akışı kesildi ya da {t:left} geldi)
    function onPlayerLeft(id: string) {
      if (goneIds.current.has(id)) return;
      const o = others.current.get(id);
      goneIds.current.add(id);
      others.current.delete(id);
      flash(`${o ? o.name : "Bir oyuncu"} oyundan ayrıldı`);
      updateHost();
      if (others.current.size === 0) setAlone(true); // tek kaldın → menü
    }

    // Bir oyuncu açık çıkışa ulaştı → host bu bölümün kazananını belirler
    function handleReach(who: string) {
      if (resultPending.current || !levelRef.current) return;
      const seat = Math.max(0, order.indexOf(who));
      resultPending.current = true;
      scores.current = scores.current.slice();
      scores.current[seat] = (scores.current[seat] ?? 0) + 1;
      const next = generateRaceLevel(levelRef.current.level + 1, diff, info.themeSeed);
      room.send({
        t: "result",
        winnerSeat: seat,
        scores: scores.current,
        lvl: serializeLevel(next) as never,
      });
      showResult(seat);
      scheduleLoad(next);
    }
    function showResult(winnerSeat: number) {
      resultPending.current = true;
      setOverlay({ winnerSeat, scores: scores.current.slice() });
    }
    function scheduleLoad(next: RaceLevel) {
      window.setTimeout(() => {
        setOverlay(null);
        buildWorld(next);
      }, 2600);
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
    function activeBarrier(x: number, y: number, now: number): boolean {
      for (const b of barriers.current.values()) {
        if (b.x === x && b.y === y && now >= b.armAt) return true;
      }
      return false;
    }

    // Bir gelin öldü — herkeste görsel + ses. local=true ise benim vuruşum.
    function applyKill(id: number, x: number, y: number, local: boolean) {
      if (!deadBrides.current.has(id)) {
        deadBrides.current.add(id);
        bloodStains.current.push({ x, y, r: 0.5 + Math.random() * 0.35, seed: Math.floor(Math.random() * 1000) });
        sound.play("kill"); // ölen gelinin ağlaması
      }
      if (amHost.current) {
        hostBrides.current = hostBrides.current.filter((z) => z.id !== id);
        brideRespawnQueue.current.push(performance.now() + BRIDE_RESPAWN_MS); // 20 sn sonra yeniden doğ
      } else guestBrides.current.delete(id);
      if (local) {
        kills.current++;
        if (kills.current >= 1 && !exitOpen.current) {
          exitOpen.current = true;
          sound.play("dooropen");
        }
        room.send({ t: "kill", id, x, y });
      }
    }

    room.onMessage = (m: NetMessage, fromId: string) => {
      if (goneIds.current.has(fromId) && m.t !== "left") return;
      if (m.t === "map") {
        if (!ready.current) buildWorld(deserializeLevel(m.lvl as SerializedLevel));
      } else if (m.t === "pos") {
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
      } else if (m.t === "brides" && !amHost.current) {
        const arr = m.b as [number, number, number, number][];
        const map = guestBrides.current;
        const live = new Set<number>();
        for (const [id, xi, yi, aw] of arr) {
          if (deadBrides.current.has(id)) continue; // ölmüşü diriltme
          live.add(id);
          const target = { x: xi / 100, y: yi / 100 };
          const ex = map.get(id);
          if (ex) {
            ex.target = target;
            ex.aware = aw === 1;
          } else {
            map.set(id, { id, pos: { ...target }, target, aware: aw === 1 });
          }
        }
        for (const id of map.keys()) if (!live.has(id)) map.delete(id);
      } else if (m.t === "kill") {
        applyKill(m.id as number, m.x as number, m.y as number, false);
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
      } else if (m.t === "left") {
        onPlayerLeft(fromId);
      }
    };
    room.onStatus = () => {}; // ayrılma tespiti pos akışıyla (aşağıda) yapılıyor

    // Herkes başlangıç seviyesini kurar (host tam obje, guest deserialize)
    buildWorld(info.initialLevel);

    // Girdi
    const onKey = (e: KeyboardEvent, d: boolean) => {
      switch (e.key) {
        case "ArrowUp": case "w": case "W": input.current.up = d; break;
        case "ArrowDown": case "s": case "S": input.current.down = d; break;
        case "ArrowLeft": case "a": case "A": input.current.left = d; break;
        case "ArrowRight": case "d": case "D": input.current.right = d; break;
        case " ": case "Spacebar": input.current.fire = d; break;
        case "e": case "E": input.current.place = d; break;
        default: return;
      }
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    let dpr = 1, cssW = 0, cssH = 0, TS = 36;
    function resize() {
      const r = canvas!.getBoundingClientRect();
      cssW = r.width; cssH = r.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(cssW * dpr);
      canvas!.height = Math.floor(cssH * dpr);
      const vr = levelRef.current?.visionRadius ?? 6;
      TS = Math.max(24, Math.min(46, Math.min(cssW, cssH) / (vr * 2 + 2.5)));
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

    let raf = 0, last = performance.now(), posAcc = 0, brideAcc = 0, hudAcc = 0, tensAcc = 0, leaveAcc = 0;
    const shade = (b: number[], f: number) =>
      `rgb(${(b[0] * f) | 0},${(b[1] * f) | 0},${(b[2] * f) | 0})`;

    function renderBrides(): RBride[] {
      if (amHost.current) {
        return hostBrides.current.map((z) => ({ id: z.id, pos: z.pos, target: z.pos, aware: z.aware }));
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
      if (hurt.current > 0) hurt.current -= dt;

      // hareket (aktif bariyerler duvar gibi engeller)
      let mx = 0, my = 0;
      if (i.up) my -= 1; if (i.down) my += 1; if (i.left) mx -= 1; if (i.right) mx += 1;
      let scl = 1;
      const amag = Math.hypot(i.ax, i.ay);
      if (amag > 0.18) { mx = i.ax; my = i.ay; scl = Math.min(1, amag); }
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

      // ateş
      if (i.fire && fireCd.current <= 0 && ammoCount.current > 0) {
        ammoCount.current--;
        fireCd.current = FIRE_COOLDOWN;
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
        for (const o of others.current.values()) targets.push(o.pos);
        moveBrides(hostBrides.current, maze, raceBrideConfig(lvl.level, diff), targets, dt);
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
      }

      const brides = renderBrides();

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
              applyKill(z.id, z.pos.x, z.pos.y, true);
              break;
            }
          }
          if (hit) break;
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

      // can paketi topla (canın tamsa dokunma)
      if (hp.current < PLAYER_MAX_HP) {
        for (const h of health.current) {
          if (!h.taken && h.x === pc.x && h.y === pc.y) {
            h.taken = true;
            hp.current = Math.min(PLAYER_MAX_HP, hp.current + HEAL_AMOUNT);
            sound.play("heal");
          }
        }
      }

      // hasar (dokunulmazlık bittiyse): gelin teması can barını düşürür
      if (now > invulnUntil.current) {
        let touched = false;
        for (const z of brides) {
          if (Math.hypot(z.pos.x - selfPos.current.x, z.pos.y - selfPos.current.y) < PLAYER_RADIUS + BRIDE_RADIUS) {
            touched = true;
            break;
          }
        }
        if (touched) {
          hp.current -= CONTACT_DPS * dt;
          hurt.current = 0.25;
          sound.play("hurt");
          if (hp.current <= 0) {
            hp.current = PLAYER_MAX_HP;
            selfPos.current = { ...mySpawn.current };
            ammoCount.current = Math.max(ammoCount.current, 1);
            invulnUntil.current = now + 2000;
            hurt.current = 0.5;
            bullets.current = [];
          }
        }
      }

      // çıkışa ulaşma (kendi çıkışın açıksa) → kazanma
      if (!resultPending.current && !sentReach.current && exitOpen.current) {
        const scc = cellOf(selfPos.current);
        if (scc.x === lvl.exit.x && scc.y === lvl.exit.y) {
          if (amHost.current) {
            handleReach(room.id);
          } else {
            sentReach.current = true;
            room.send({ t: "reachexit" });
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

      // ayrılma tespiti (pos akışı = kalp atışı)
      leaveAcc += dt;
      if (leaveAcc >= 0.5) {
        leaveAcc = 0;
        for (const [id, o] of others.current) {
          const gone = (o.everSeen && now - o.seenAt > LEAVE_MS) || (!o.everSeen && now - mountTime > 8000);
          if (gone) onPlayerLeft(id);
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
    }

    function render() {
      const lvl = levelRef.current!, maze = mazeRef.current!;
      const theme = THEMES[lvl.theme] ?? THEMES[0];
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
      for (const c of computeVisible(maze, origin, lvl.visionRadius)) {
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

      // gelinler (görüşte)
      for (const z of renderBrides()) {
        const zc = cellOf(z.pos);
        if (vis.get(zc.y * cols + zc.x) === undefined) continue;
        const lean = p.x < z.pos.x ? -1 : 1;
        drawBride(ctx!, TS, z.pos.x * TS - camX, z.pos.y * TS - camY, T, z.id, z.aware, lean);
      }

      // uçan mermiler
      for (const b of bullets.current) {
        ctx!.save(); ctx!.shadowColor = "rgba(255,240,180,0.9)"; ctx!.shadowBlur = 8;
        ctx!.fillStyle = "#fff4c2";
        ctx!.beginPath(); ctx!.arc(b.pos.x * TS - camX, b.pos.y * TS - camY, Math.max(2, TS * 0.08), 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
      }

      // diğer oyuncular (görüşte) — koltuk rengiyle halkalı + isim
      const nowP = performance.now();
      for (const o of others.current.values()) {
        if (nowP - o.seenAt > 3000) continue;
        const oc = cellOf(o.pos);
        if (vis.get(oc.y * cols + oc.x) === undefined) continue;
        const ox = o.pos.x * TS - camX, oy = o.pos.y * TS - camY;
        drawPlayer(ctx!, TS, ox, oy, o.dir, T, true, flicker, lvl.visionRadius, { cone: false, ring: SEAT_COLORS[o.seat % SEAT_COLORS.length] });
        ctx!.save();
        ctx!.font = `${Math.max(9, TS * 0.28)}px system-ui, sans-serif`;
        ctx!.textAlign = "center";
        ctx!.fillStyle = "rgba(0,0,0,0.6)";
        ctx!.fillText(o.name, ox + 1, oy - TS * 0.5 + 1);
        ctx!.fillStyle = SEAT_COLORS[o.seat % SEAT_COLORS.length];
        ctx!.fillText(o.name, ox, oy - TS * 0.5);
        ctx!.restore();
      }

      // kendi (dokunulmazlıkta camgöbeği halka)
      const cx = cssW / 2, cy = cssH / 2;
      const invuln = performance.now() < invulnUntil.current;
      drawPlayer(ctx!, TS, cx, cy, selfDir.current, T, selfMoving.current, flicker, lvl.visionRadius, invuln ? { ring: "#6ee7ff" } : undefined);

      // vinyet (ağır)
      const g = ctx!.createRadialGradient(cx, cy, lvl.visionRadius * TS * 0.28, cx, cy, lvl.visionRadius * TS);
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
    }

    function loop(now: number) {
      const dt = Math.min((now - last) / 1000, 0.05);
      last = now;
      if (ready.current && mazeRef.current && levelRef.current) {
        if (!resultPending.current) {
          step(dt, now);
          posAcc += dt;
          if (posAcc >= 0.05) {
            posAcc = 0;
            room.send({ t: "pos", x: selfPos.current.x, y: selfPos.current.y, dx: selfDir.current.x, dy: selfDir.current.y });
          }
          if (amHost.current) {
            brideAcc += dt;
            if (brideAcc >= 0.05) {
              brideAcc = 0;
              room.send({
                t: "brides",
                b: hostBrides.current.map((z) => [z.id, Math.round(z.pos.x * 100), Math.round(z.pos.y * 100), z.aware ? 1 : 0]),
              });
            }
          }
        }
        hudAcc += dt;
        if (hudAcc >= 0.15) {
          hudAcc = 0;
          setHud({ level: levelRef.current.level, ammo: ammoCount.current, exitOpen: exitOpen.current, kills: kills.current, barriers: barrierStock.current, hp: Math.max(0, hp.current), scores: scores.current.slice(), themeName: THEMES[levelRef.current.theme]?.name ?? "" });
        }
        render();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(toastTimer);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      room.onMessage = () => {};
      sound.stopGameMusic();
      sound.stopAmbient();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
        <div className="chip"><span className="lbl">Mod</span><span className="val">Yarış {info.diff}</span></div>
        <div className="chip"><span className="lbl">Bölüm</span><span className="val">{hud.level}</span></div>
        <div className="chip"><span className="lbl">Tema</span><span className="val">{hud.themeName}</span></div>
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
        <div className="chip"><span className="lbl">Mermi</span><span className="val">{hud.ammo}</span></div>
        <div className="chip"><span className="lbl">Bariyer</span><span className="val">{hud.barriers}</span></div>
        <div className="chip">
          <span className="lbl">Çıkışın</span>
          <span className="val" style={{ color: hud.exitOpen ? "var(--hp)" : "var(--muted)" }}>
            {hud.exitOpen ? "AÇIK" : "KİLİTLİ"}
          </span>
        </div>
        <div className="chip"><span className="lbl">Skor</span>
          <span className="val">
            {hud.scores.map((s, seat) => (
              <span key={seat}>
                {seat > 0 && <span style={{ color: "var(--muted)" }}> · </span>}
                <span
                  style={{
                    color: SEAT_COLORS[seat % SEAT_COLORS.length],
                    fontWeight: seat === mySeat ? 900 : 400,
                    textDecoration: seat === mySeat ? "underline" : "none",
                  }}
                >
                  {s}
                </span>
              </span>
            ))}
          </span>
        </div>
        <div className="chip"><span className="lbl">Sen</span>
          <span className="val" style={{ color: myColor }}>{nameOf(mySeat)}</span>
        </div>
        <button className="chip mutebtn" onClick={quit} title="Menüye dön">
          <span className="val">⎋</span>
        </button>
      </div>

      {toast && (
        <div
          className="warn"
          style={{ top: 70, background: "rgba(20,10,10,0.85)", color: "#ffd0d0", borderColor: "rgba(255,120,120,0.4)" }}
        >
          🚪 {toast}
        </div>
      )}

      {alone && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="big" style={{ color: "#ff9a3c" }}>Diğer oyuncular ayrıldı</div>
          <div className="subtitle">Yarışacak kimse kalmadı.</div>
          <button className="btn btn-primary" onClick={quit}>← Menü</button>
        </div>
      )}

      {phase === "left" && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="big" style={{ color: "#ff6b6b" }}>Bağlantı koptu</div>
          <button className="btn btn-primary" onClick={quit}>← Menü</button>
        </div>
      )}

      {overlay && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.82)" }}>
          <div
            className="big"
            style={{ color: overlay.winnerSeat === mySeat ? "#7dffb0" : "#ff6b6b" }}
          >
            {overlay.winnerSeat === mySeat
              ? "Bu bölümü KAZANDIN! 🏆"
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
          <div className="subtitle">Sonraki bölüm başlıyor…</div>
        </div>
      )}

      <div className="hint">
        <b>WASD/Ok</b> hareket · <b>Boşluk</b> ateş · <b>E</b> bariyer · çıkışın için 1 gelin öldür
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
          className="fire"
          onPointerDown={(e) => { e.preventDefault(); input.current.fire = true; }}
          onPointerUp={() => (input.current.fire = false)}
          onPointerLeave={() => (input.current.fire = false)}
          onPointerCancel={() => (input.current.fire = false)}
        >
          ATEŞ
        </button>
      </div>
    </div>
  );
}
