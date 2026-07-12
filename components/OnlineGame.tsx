"use client";

import { useEffect, useRef, useState } from "react";
import { Joystick } from "@/components/Game";
import {
  PLAYER_SPEED,
  PLAYER_RADIUS,
  BULLET_SPEED,
  BULLET_LIFE,
  FIRE_COOLDOWN,
} from "@/lib/engine";
import { BRIDE_RADIUS, moveBrides, randomDir } from "@/lib/brides";
import { levelConfig } from "@/lib/levels";
import { cellOf, tryMove } from "@/lib/physics";
import { computeVisible } from "@/lib/vision";
import { drawBride, drawPlayer, grime } from "@/lib/sprites";
import type { Maze } from "@/lib/maze";
import {
  deserializeLevel,
  generateRaceLevel,
  levelMaze,
  serializeLevel,
  type RaceLevel,
} from "@/lib/online";
import type { NetRole, NetRoom, NetMessage } from "@/lib/net";
import type { Vec, Zombie } from "@/lib/types";

const FLOOR = [58, 48, 42];
const WALL = [104, 84, 70];

type Phase = "loading" | "playing" | "left";
type RBride = { id: number; pos: Vec; target: Vec; aware: boolean };
type Bullet = { pos: Vec; vel: Vec; life: number };

export default function OnlineGame({
  room,
  role,
  onExit,
}: {
  room: NetRoom;
  role: NetRole;
  onExit: () => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const input = useRef({ up: false, down: false, left: false, right: false, ax: 0, ay: 0, fire: false, place: false });
  const [phase, setPhase] = useState<Phase>(role === "host" ? "playing" : "loading");
  const [hud, setHud] = useState({ level: 1, ammo: 0, exitOpen: false, kills: 0, myScore: 0, oppScore: 0, barriers: 3 });

  // Dünya
  const levelRef = useRef<RaceLevel | null>(null);
  const mazeRef = useRef<Maze | null>(null);
  const selfPos = useRef<Vec>({ x: 1.5, y: 1.5 });
  const selfDir = useRef<Vec>({ x: 0, y: -1 });
  const mySpawn = useRef<Vec>({ x: 1.5, y: 1.5 });
  const oppPos = useRef<Vec>({ x: 1.5, y: 1.5 });
  const oppTarget = useRef<Vec>({ x: 1.5, y: 1.5 });
  const oppDir = useRef<Vec>({ x: 0, y: -1 });
  const oppSeenAt = useRef(0);
  const seen = useRef<boolean[][]>([]);
  const ready = useRef(false);

  // Gelinler
  const hostBrides = useRef<Zombie[]>([]); // host: tam simülasyon
  const guestBrides = useRef<Map<number, RBride>>(new Map()); // misafir: akıştan
  // Mermi / ateş
  const ammo = useRef<{ x: number; y: number; taken: boolean }[]>([]);
  const ammoCount = useRef(0);
  const bullets = useRef<Bullet[]>([]);
  const fireCd = useRef(0);
  const kills = useRef(0);
  const exitOpen = useRef(false);
  const invulnUntil = useRef(0);
  const hurt = useRef(0);
  const selfMoving = useRef(false);
  const bloodStains = useRef<{ x: number; y: number; r: number; seed: number }[]>([]);
  // Bariyerler (paylaşılan): id -> {x,y,armAt,owner}
  const barriers = useRef<Map<string, { x: number; y: number; armAt: number; owner: NetRole }>>(new Map());
  const barrierStock = useRef(3);
  const barrierCounter = useRef(0);
  const breakTimer = useRef(0); // mermisizken temasla kırma sayacı
  const placeHeld = useRef(false);
  // Yarış sonucu / puan
  const scores = useRef({ host: 0, guest: 0 });
  const resultPending = useRef(false);
  const sentReach = useRef(false);
  const [overlay, setOverlay] = useState<{ winner: NetRole; hs: number; gs: number } | null>(null);

  function buildWorld(lvl: RaceLevel) {
    levelRef.current = lvl;
    mazeRef.current = levelMaze(lvl);
    const meIdx = role === "host" ? 0 : 1;
    const opIdx = role === "host" ? 1 : 0;
    mySpawn.current = { x: lvl.spawns[meIdx].x + 0.5, y: lvl.spawns[meIdx].y + 0.5 };
    selfPos.current = { ...mySpawn.current };
    oppPos.current = { x: lvl.spawns[opIdx].x + 0.5, y: lvl.spawns[opIdx].y + 0.5 };
    oppTarget.current = { ...oppPos.current };
    seen.current = Array.from({ length: lvl.rows }, () => Array.from({ length: lvl.cols }, () => false));
    ammo.current = lvl.ammo.map((c) => ({ x: c.x, y: c.y, taken: false }));
    ammoCount.current = 0;
    bullets.current = [];
    kills.current = 0;
    exitOpen.current = false;
    barriers.current.clear();
    barrierStock.current = 3;
    breakTimer.current = 0;
    bloodStains.current = [];
    invulnUntil.current = performance.now() + 1500;
    // host gelinleri üretir
    if (role === "host") {
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
    }
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

    let needMapTimer = 0;
    function sendMap() {
      if (levelRef.current) room.send({ t: "map", lvl: serializeLevel(levelRef.current) as never });
    }

    // Bir oyuncu açık çıkışa ulaştı → host bu bölümün kazananını belirler
    function handleReach(who: NetRole) {
      if (resultPending.current || !levelRef.current) return;
      resultPending.current = true;
      scores.current = { ...scores.current, [who]: scores.current[who] + 1 };
      const next = generateRaceLevel(levelRef.current.level + 1);
      room.send({
        t: "result",
        winner: who,
        hs: scores.current.host,
        gs: scores.current.guest,
        lvl: serializeLevel(next) as never,
      });
      showResult(who);
      scheduleLoad(next);
    }
    function showResult(who: NetRole) {
      resultPending.current = true;
      setOverlay({ winner: who, hs: scores.current.host, gs: scores.current.guest });
    }
    function scheduleLoad(next: RaceLevel) {
      window.setTimeout(() => {
        setOverlay(null);
        buildWorld(next);
      }, 2600);
    }

    // Bariyer: oyuncunun bulunduğu hücreye koy (1 sn sonra aktif olur)
    function placeBarrier() {
      if (barrierStock.current <= 0 || !ready.current || resultPending.current || !levelRef.current) return;
      const c = cellOf(selfPos.current);
      if (c.x === levelRef.current.exit.x && c.y === levelRef.current.exit.y) return;
      // aynı hücrede zaten bariyer varsa koyma
      for (const b of barriers.current.values()) if (b.x === c.x && b.y === c.y) return;
      const id = (role === "host" ? "h" : "g") + barrierCounter.current++;
      barriers.current.set(id, { x: c.x, y: c.y, armAt: performance.now() + 1000, owner: role });
      barrierStock.current--;
      room.send({ t: "barrier", id, x: c.x, y: c.y });
    }
    function delBarrier(id: string) {
      if (!barriers.current.delete(id)) return;
      room.send({ t: "barrierdel", id });
    }
    // Verilen hücrede AKTİF bariyer var mı (oyuncu hareketini engeller)
    function activeBarrier(x: number, y: number, now: number): boolean {
      for (const b of barriers.current.values()) {
        if (b.x === x && b.y === y && now >= b.armAt) return true;
      }
      return false;
    }

    room.onMessage = (m: NetMessage) => {
      if (m.t === "map") {
        if (!ready.current) buildWorld(deserializeLevel(m.lvl as never));
      } else if (m.t === "needmap") {
        if (role === "host") sendMap();
      } else if (m.t === "pos") {
        oppTarget.current = { x: m.x as number, y: m.y as number };
        oppDir.current = { x: m.dx as number, y: m.dy as number };
        oppSeenAt.current = performance.now();
      } else if (m.t === "brides" && role === "guest") {
        const arr = m.b as [number, number, number, number][];
        const map = guestBrides.current;
        const live = new Set<number>();
        for (const [id, xi, yi, aw] of arr) {
          live.add(id);
          const ex = map.get(id);
          const target = { x: xi / 100, y: yi / 100 };
          if (ex) {
            ex.target = target;
            ex.aware = aw === 1;
          } else {
            map.set(id, { id, pos: { ...target }, target, aware: aw === 1 });
          }
        }
        for (const id of map.keys()) if (!live.has(id)) map.delete(id);
      } else if (m.t === "kill" && role === "host") {
        const id = m.id as number;
        hostBrides.current = hostBrides.current.filter((z) => z.id !== id);
      } else if (m.t === "reachexit" && role === "host") {
        handleReach("guest");
      } else if (m.t === "result") {
        scores.current = { host: m.hs as number, guest: m.gs as number };
        showResult(m.winner as NetRole);
        if (role === "guest") scheduleLoad(deserializeLevel(m.lvl as never));
      } else if (m.t === "barrier") {
        const id = m.id as string;
        barriers.current.set(id, {
          x: m.x as number,
          y: m.y as number,
          armAt: performance.now() + 1000,
          owner: id[0] === "h" ? "host" : "guest",
        });
      } else if (m.t === "barrierdel") {
        barriers.current.delete(m.id as string);
      }
    };
    room.onStatus = (s) => {
      if (s === "left") setPhase("left");
    };

    if (role === "host") {
      buildWorld(generateRaceLevel(1));
      sendMap();
    } else {
      const ask = () => {
        if (ready.current) return;
        room.send({ t: "needmap" });
        needMapTimer = window.setTimeout(ask, 500);
      };
      ask();
    }

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

    let raf = 0, last = performance.now(), posAcc = 0, brideAcc = 0, hudAcc = 0;
    const shade = (b: number[], f: number) =>
      `rgb(${(b[0] * f) | 0},${(b[1] * f) | 0},${(b[2] * f) | 0})`;

    function renderBrides(): RBride[] {
      if (role === "host") {
        return hostBrides.current.map((z) => ({ id: z.id, pos: z.pos, target: z.pos, aware: z.aware }));
      }
      return Array.from(guestBrides.current.values());
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
      let sc = 1;
      const amag = Math.hypot(i.ax, i.ay);
      if (amag > 0.18) { mx = i.ax; my = i.ay; sc = Math.min(1, amag); }
      const moving = mx !== 0 || my !== 0;
      selfMoving.current = moving;
      const barrierWall = (bx: number, by: number) => activeBarrier(bx, by, now);
      if (moving) {
        const len = Math.hypot(mx, my); mx /= len; my /= len;
        selfDir.current = { x: mx, y: my };
        tryMove(maze, selfPos.current, PLAYER_RADIUS, mx * PLAYER_SPEED * sc * dt, my * PLAYER_SPEED * sc * dt, barrierWall);
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
      }

      // host: gelin simülasyonu
      if (role === "host") {
        const cfg = levelConfig(lvl.level);
        moveBrides(
          hostBrides.current, maze,
          { intelligence: cfg.intelligence, visionRadius: lvl.visionRadius, zombieSpeed: cfg.zombieSpeed },
          [selfPos.current, oppPos.current], dt
        );
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
          // bariyer vuruldu mu → tek atışta yık (mermi biter)
          let hitBar = false;
          for (const [bid, bar] of barriers.current) {
            if (bar.x === cx && bar.y === cy) { delBarrier(bid); b.life = 0; hitBar = true; break; }
          }
          if (hitBar) break;
          let hit = false;
          for (const z of brides) {
            if (Math.hypot(b.pos.x - z.pos.x, b.pos.y - z.pos.y) < BRIDE_RADIUS + 0.08) {
              b.life = 0; hit = true;
              killBride(z.id);
              break;
            }
          }
          if (hit) break;
        }
      }
      bullets.current = bullets.current.filter((b) => b.life > 0);

      // mermi topla
      const pc = cellOf(selfPos.current);
      for (const a of ammo.current) {
        if (!a.taken && a.x === pc.x && a.y === pc.y) { a.taken = true; ammoCount.current++; }
      }

      // ölüm (tek dokunuş) — davetsiz doğuş koruması bittiyse
      if (now > invulnUntil.current) {
        for (const z of brides) {
          if (Math.hypot(z.pos.x - selfPos.current.x, z.pos.y - selfPos.current.y) < PLAYER_RADIUS + BRIDE_RADIUS) {
            // öl → başlangıçta doğ + 1 mermi
            selfPos.current = { ...mySpawn.current };
            ammoCount.current = Math.max(ammoCount.current, 1);
            invulnUntil.current = now + 1500;
            hurt.current = 0.4;
            bullets.current = [];
            break;
          }
        }
      }

      // çıkışa ulaşma (kendi çıkışın açıksa) → kazanma
      if (!resultPending.current && !sentReach.current && exitOpen.current) {
        const sc = cellOf(selfPos.current);
        if (sc.x === lvl.exit.x && sc.y === lvl.exit.y) {
          if (role === "host") {
            handleReach("host");
          } else {
            sentReach.current = true;
            room.send({ t: "reachexit" });
          }
        }
      }

      // rakip yumuşat
      const op = oppPos.current, ot = oppTarget.current;
      op.x += (ot.x - op.x) * Math.min(1, dt * 12);
      op.y += (ot.y - op.y) * Math.min(1, dt * 12);
      // misafir gelinleri yumuşat
      if (role === "guest") {
        for (const z of guestBrides.current.values()) {
          z.pos.x += (z.target.x - z.pos.x) * Math.min(1, dt * 12);
          z.pos.y += (z.target.y - z.pos.y) * Math.min(1, dt * 12);
        }
      }
    }

    function killBride(id: number) {
      // ölen gelinin yerine kan izi bırak
      let bpos: Vec | null = null;
      if (role === "host") {
        const z = hostBrides.current.find((b) => b.id === id);
        if (z) bpos = z.pos;
        hostBrides.current = hostBrides.current.filter((z) => z.id !== id);
      } else {
        const z = guestBrides.current.get(id);
        if (z) bpos = z.pos;
        guestBrides.current.delete(id);
        room.send({ t: "kill", id });
      }
      if (bpos) {
        bloodStains.current.push({
          x: bpos.x,
          y: bpos.y,
          r: 0.5 + Math.random() * 0.35,
          seed: Math.floor(Math.random() * 1000),
        });
      }
      kills.current++;
      if (kills.current >= 1) exitOpen.current = true;
    }


    function render() {
      const lvl = levelRef.current!, maze = mazeRef.current!;
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
            ctx!.fillStyle = shade(wall ? WALL : FLOOR, f);
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

      // bariyerler (görüşte) — hazırlanıyor: yanıp sönen; aktif: katı taş
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
          // çatlak/çapraz
          ctx!.strokeStyle = "rgba(20,14,10,0.7)"; ctx!.lineWidth = 1.5;
          ctx!.beginPath();
          ctx!.moveTo(sx + 4, sy + 4); ctx!.lineTo(sx + TS - 4, sy + TS - 4);
          ctx!.moveTo(sx + TS - 4, sy + 4); ctx!.lineTo(sx + 4, sy + TS - 4);
          ctx!.stroke();
        } else {
          // hazırlanıyor: yanıp sönen yarı saydam
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

      // gelinler (görüşte) — detaylı ortak sprite
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

      // rakip (görüşte) — turuncu halkalı hayatta-kalan
      const oc = cellOf(oppPos.current);
      if (vis.get(oc.y * cols + oc.x) !== undefined && performance.now() - oppSeenAt.current < 3000) {
        const ox = oppPos.current.x * TS - camX, oy = oppPos.current.y * TS - camY;
        drawPlayer(ctx!, TS, ox, oy, oppDir.current, T, true, flicker, lvl.visionRadius, { cone: false, ring: "#ff9a3c" });
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
          if (role === "host") {
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
          const mine = role === "host" ? scores.current.host : scores.current.guest;
          const opp = role === "host" ? scores.current.guest : scores.current.host;
          setHud({ level: levelRef.current.level, ammo: ammoCount.current, exitOpen: exitOpen.current, kills: kills.current, myScore: mine, oppScore: opp, barriers: barrierStock.current });
        }
        render();
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.clearTimeout(needMapTimer);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("resize", resize);
      room.onMessage = () => {};
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="stage">
      <canvas ref={canvasRef} />

      <div className="hud">
        <div className="chip"><span className="lbl">Mod</span><span className="val">Yarış</span></div>
        <div className="chip"><span className="lbl">Bölüm</span><span className="val">{hud.level}</span></div>
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
            <span style={{ color: "#6ee7ff" }}>{hud.myScore}</span>
            <span style={{ color: "var(--muted)" }}> — </span>
            <span style={{ color: "#ff9a3c" }}>{hud.oppScore}</span>
          </span>
        </div>
        <div className="chip"><span className="lbl">Sen</span>
          <span className="val" style={{ color: "#6ee7ff" }}>{role === "host" ? "Ev sahibi" : "Misafir"}</span>
        </div>
      </div>

      {phase === "loading" && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.85)" }}>
          <div className="big">Harita alınıyor…</div>
        </div>
      )}
      {phase === "left" && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="big" style={{ color: "#ff6b6b" }}>Rakip ayrıldı</div>
          <button className="btn btn-primary" onClick={onExit}>← Menü</button>
        </div>
      )}

      {overlay && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.82)" }}>
          <div
            className="big"
            style={{ color: overlay.winner === role ? "#7dffb0" : "#ff6b6b" }}
          >
            {overlay.winner === role ? "Bu bölümü KAZANDIN! 🏆" : "Rakip bu bölümü kazandı"}
          </div>
          <div className="subtitle" style={{ fontSize: "clamp(20px,5vw,32px)" }}>
            Skor — Sen:{" "}
            <b style={{ color: "#6ee7ff" }}>
              {role === "host" ? overlay.hs : overlay.gs}
            </b>{" "}
            · Rakip:{" "}
            <b style={{ color: "#ff9a3c" }}>
              {role === "host" ? overlay.gs : overlay.hs}
            </b>
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
