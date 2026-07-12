"use client";

import {
  useEffect,
  useRef,
  useState,
  type PointerEvent as RPointerEvent,
} from "react";
import {
  GameEngine,
  PLAYER_MAX_HP,
  type Input,
} from "@/lib/engine";
import { sound } from "@/lib/audio";
import type { GameStatus, Vec } from "@/lib/types";

export type EndResult = {
  status: GameStatus; // "dead" | "levelclear" | "gameover" | "win"
  level: number;
  score: number;
  lives: number;
};

type Hud = {
  level: number;
  ammo: number;
  zombies: number;
  killed: number;
  score: number;
  time: number;
  hp: number;
  lives: number;
  exitOpen: boolean;
  warn: boolean;
};

// Kirli ama canlı zindan paleti (korku tonu, soluk değil)
const FLOOR = [58, 48, 42];
const WALL = [104, 84, 70];

// Hücre koordinatından deterministik "kir" gürültüsü (0..1)
function grime(x: number, y: number) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

export default function Game({
  level,
  score,
  lives,
  onEnd,
}: {
  level: number;
  score: number;
  lives: number;
  onEnd: (r: EndResult) => void;
}) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputExternal = useRef<Input | null>(null);
  const [muted, setMuted] = useState(sound.muted);
  const [hud, setHud] = useState<Hud>({
    level,
    ammo: 0,
    zombies: 0,
    killed: 0,
    score,
    time: 0,
    hp: PLAYER_MAX_HP,
    lives,
    exitOpen: false,
    warn: false,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new GameEngine(level, score, lives);
    const input: Input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      ax: 0,
      ay: 0,
    };
    inputExternal.current = input;

    let ended = false;
    let raf = 0;
    let last = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let TS = 36; // hücre boyutu (CSS px)

    // Film grain deseni (bir kez üretilir)
    const noiseTile = document.createElement("canvas");
    noiseTile.width = 64;
    noiseTile.height = 64;
    const nctx = noiseTile.getContext("2d");
    if (nctx) {
      const img = nctx.createImageData(64, 64);
      for (let i = 0; i < img.data.length; i += 4) {
        const v = Math.random() * 255;
        img.data[i] = v;
        img.data[i + 1] = v;
        img.data[i + 2] = v;
        img.data[i + 3] = 255;
      }
      nctx.putImageData(img, 0, 0);
    }
    const grainPattern = ctx.createPattern(noiseTile, "repeat");

    function resize() {
      const rect = canvas!.getBoundingClientRect();
      cssW = rect.width;
      cssH = rect.height;
      dpr = Math.min(window.devicePixelRatio || 1, 2);
      canvas!.width = Math.floor(cssW * dpr);
      canvas!.height = Math.floor(cssH * dpr);
      const minDim = Math.min(cssW, cssH);
      TS = Math.max(
        24,
        Math.min(46, minDim / (engine.config.visionRadius * 2 + 2.5))
      );
    }
    resize();
    window.addEventListener("resize", resize);

    // --- Klavye ---
    const onKey = (e: KeyboardEvent, down: boolean) => {
      switch (e.key) {
        case "ArrowUp":
        case "w":
        case "W":
          input.up = down;
          break;
        case "ArrowDown":
        case "s":
        case "S":
          input.down = down;
          break;
        case "ArrowLeft":
        case "a":
        case "A":
          input.left = down;
          break;
        case "ArrowRight":
        case "d":
        case "D":
          input.right = down;
          break;
        case " ":
        case "Spacebar":
          input.fire = down;
          break;
        default:
          return;
      }
      e.preventDefault();
    };
    const kd = (e: KeyboardEvent) => onKey(e, true);
    const ku = (e: KeyboardEvent) => onKey(e, false);
    window.addEventListener("keydown", kd);
    window.addEventListener("keyup", ku);

    // Ses tarayıcı kuralı gereği ilk kullanıcı hareketinde başlar
    sound.init();
    let audioStarted = false;
    const startAudio = () => {
      if (audioStarted) return;
      audioStarted = true;
      sound.resume();
      sound.stopMenuMusic();
      // Kullanıcı oyun-içi ses dosyası verdiyse onu çal; yoksa synth korku ambiyansı
      sound.playGameMusic().then((ok) => {
        if (!ok) sound.startAmbient();
      });
    };
    window.addEventListener("keydown", startAudio);
    window.addEventListener("pointerdown", startAudio);

    // --- Render ---
    function shade(base: number[], f: number) {
      return `rgb(${(base[0] * f) | 0},${(base[1] * f) | 0},${
        (base[2] * f) | 0
      })`;
    }

    function worldToScreen(x: number, y: number, camX: number, camY: number) {
      return { sx: x * TS - camX, sy: y * TS - camY };
    }

    function render() {
      const p = engine.player;
      const camX = p.pos.x * TS - cssW / 2;
      const camY = p.pos.y * TS - cssH / 2;

      // El feneri titreşimi (tekinsiz) — ışığı hafifçe kısıp arada ani karartır
      let flicker = 0.93 + 0.07 * Math.sin(engine.time * 11);
      if (Math.random() < 0.02) flicker *= 0.62;

      ctx!.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx!.fillStyle = "#000";
      ctx!.fillRect(0, 0, cssW, cssH);

      // görünür hücreler için hızlı arama tablosu
      const cols = engine.maze.cols;
      const vis = new Map<number, number>();
      for (const c of engine.visible) vis.set(c.y * cols + c.x, c.intensity);

      const startCX = Math.max(0, Math.floor(camX / TS));
      const endCX = Math.min(cols - 1, Math.ceil((camX + cssW) / TS));
      const startCY = Math.max(0, Math.floor(camY / TS));
      const endCY = Math.min(
        engine.maze.rows - 1,
        Math.ceil((camY + cssH) / TS)
      );

      for (let y = startCY; y <= endCY; y++) {
        for (let x = startCX; x <= endCX; x++) {
          if (!engine.seen[y][x]) continue;
          const wall = engine.maze.walls[y][x];
          const intensity = vis.get(y * cols + x);
          const sx = x * TS - camX;
          const sy = y * TS - camY;
          const gr = grime(x, y); // kir dokusu 0..1
          if (intensity !== undefined) {
            // aydınlık (titreşen el feneri) + kir — daha parlak/canlı
            let f = wall ? 0.42 + 0.66 * intensity : 0.36 + 0.74 * intensity;
            f *= flicker * (0.9 + 0.22 * gr);
            ctx!.fillStyle = shade(wall ? WALL : FLOOR, f);
          } else {
            // hafıza — koyu ama tümüyle ölü değil, sıcak gri
            const base = wall ? 36 : 22;
            const v = base * (0.72 + 0.5 * gr);
            ctx!.fillStyle = `rgb(${v | 0},${(v * 0.9) | 0},${(v * 0.82) | 0})`;
          }
          ctx!.fillRect(Math.floor(sx), Math.floor(sy), TS + 1, TS + 1);
        }
      }

      // --- Kan izleri (kalıcı, hafızada da görünür) ---
      for (const bl of engine.bloodStains) {
        const bx = Math.floor(bl.x);
        const by = Math.floor(bl.y);
        if (!engine.seen[by][bx]) continue;
        const litB = vis.get(by * cols + bx) !== undefined;
        const sx = bl.x * TS - camX;
        const sy = bl.y * TS - camY;
        ctx!.save();
        ctx!.globalAlpha = litB ? 0.9 : 0.45;
        ctx!.fillStyle = litB ? "rgb(158,20,16)" : "rgb(66,12,10)";
        // düzensiz lekeler
        for (let i = 0; i < 6; i++) {
          const a = (bl.seed + i * 97) % 360;
          const rr = bl.r * TS * (0.2 + ((bl.seed + i * 31) % 100) / 180);
          const ox = Math.cos((a * Math.PI) / 180) * bl.r * TS * 0.4;
          const oy = Math.sin((a * Math.PI) / 180) * bl.r * TS * 0.4;
          ctx!.beginPath();
          ctx!.arc(sx + ox, sy + oy, rr, 0, Math.PI * 2);
          ctx!.fill();
        }
        ctx!.restore();
      }

      // --- Çıkış kapısı ---
      drawExit(camX, camY, vis, cols);

      // --- Mermiler (yerdeki fişek kovanları) ---
      for (const a of engine.ammoItems) {
        if (a.taken) continue;
        if (vis.get(a.cell.y * cols + a.cell.x) === undefined) continue;
        const sx = a.cell.x * TS + TS / 2 - camX;
        const sy = a.cell.y * TS + TS / 2 - camY;
        ctx!.save();
        // hafif soluk pirinç parıltısı (abartısız)
        ctx!.shadowColor = "rgba(190,150,70,0.5)";
        ctx!.shadowBlur = 5;
        ctx!.fillStyle = "#b8944a";
        const w = Math.max(2, TS * 0.1);
        const h = Math.max(4, TS * 0.24);
        ctx!.translate(sx, sy);
        ctx!.rotate(0.5);
        ctx!.fillRect(-w / 2, -h / 2, w, h);
        // kovan ucu
        ctx!.fillStyle = "#d9b874";
        ctx!.fillRect(-w / 2, -h / 2, w, h * 0.3);
        ctx!.restore();
      }

      // --- Kanlı Gelinler (4 çeşit karışık, hep oyuncuya dönük) ---
      for (const z of engine.zombies) {
        const zc = { x: Math.floor(z.pos.x), y: Math.floor(z.pos.y) };
        if (vis.get(zc.y * cols + zc.x) === undefined) continue;
        const s = worldToScreen(z.pos.x, z.pos.y, camX, camY);
        // oyuncu solda mı sağda mı (hafif yön eğimi için)
        const lean = engine.player.pos.x < z.pos.x ? -1 : 1;
        drawBride(s.sx, s.sy, engine.time, z.id, z.aware, lean);
      }

      // --- Mermi (uçan) ---
      for (const b of engine.bullets) {
        const s = worldToScreen(b.pos.x, b.pos.y, camX, camY);
        ctx!.save();
        ctx!.shadowColor = "rgba(255,240,180,0.9)";
        ctx!.shadowBlur = 10;
        ctx!.fillStyle = "#fff4c2";
        ctx!.beginPath();
        ctx!.arc(s.sx, s.sy, Math.max(2, TS * 0.08), 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }

      // --- Oyuncu + el feneri konisi ---
      drawPlayer(cssW / 2, cssH / 2, p.dir, engine.time, engine.playerMoving, flicker);

      // --- Vinyet (ağır, boğucu kenar kararması) ---
      const grad = ctx!.createRadialGradient(
        cssW / 2,
        cssH / 2,
        engine.config.visionRadius * TS * 0.28,
        cssW / 2,
        cssH / 2,
        engine.config.visionRadius * TS * 1.0
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(0.72, "rgba(0,0,0,0.42)");
      grad.addColorStop(1, "rgba(0,0,0,0.82)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, cssW, cssH);

      // --- Film grain (gritli doku) ---
      if (grainPattern) {
        ctx!.save();
        ctx!.globalAlpha = 0.06 + engine.tension * 0.05;
        const ox = Math.floor(Math.random() * 64);
        const oy = Math.floor(Math.random() * 64);
        ctx!.fillStyle = grainPattern;
        ctx!.translate(-ox, -oy);
        ctx!.fillRect(0, 0, cssW + 64, cssH + 64);
        ctx!.restore();
      }

      // --- Kan görüşü: gerilim/hasar arttıkça ekran kenarları kızarır ---
      if (engine.tension > 0.35 || engine.hurtFlash > 0) {
        const red = Math.max(engine.hurtFlash * 1.8, (engine.tension - 0.35) * 0.5);
        const rv = ctx!.createRadialGradient(
          cssW / 2,
          cssH / 2,
          Math.min(cssW, cssH) * 0.25,
          cssW / 2,
          cssH / 2,
          Math.min(cssW, cssH) * 0.6
        );
        rv.addColorStop(0, "rgba(120,0,0,0)");
        rv.addColorStop(1, `rgba(120,0,0,${Math.min(0.5, red)})`);
        ctx!.fillStyle = rv;
        ctx!.fillRect(0, 0, cssW, cssH);
      }
    }

    function drawExit(
      camX: number,
      camY: number,
      vis: Map<number, number>,
      cols: number
    ) {
      const e = engine.exit;
      if (!engine.seen[e.y][e.x]) return;
      const visible = vis.get(e.y * cols + e.x) !== undefined;
      const sx = e.x * TS - camX;
      const sy = e.y * TS - camY;
      // kapı boşluğu (koyu girinti)
      ctx!.fillStyle = "rgb(8,10,15)";
      ctx!.fillRect(sx + TS * 0.18, sy + TS * 0.1, TS * 0.64, TS * 0.8);
      // çerçeve
      const open = engine.exitOpen;
      ctx!.save();
      if (visible && open) {
        ctx!.strokeStyle = "rgba(90,235,150,0.95)";
        ctx!.shadowColor = "rgba(90,235,150,0.7)";
        ctx!.shadowBlur = 16;
        ctx!.lineWidth = 2.5;
      } else if (visible) {
        ctx!.strokeStyle = "rgba(120,140,170,0.5)";
        ctx!.lineWidth = 2;
      } else {
        ctx!.strokeStyle = "rgba(90,100,120,0.35)";
        ctx!.lineWidth = 1.5;
      }
      ctx!.strokeRect(sx + TS * 0.18, sy + TS * 0.1, TS * 0.64, TS * 0.8);
      ctx!.restore();
    }

    function drawPlayer(
      cx: number,
      cy: number,
      dir: Vec,
      t: number,
      moving: boolean,
      flicker: number
    ) {
      const ang = Math.atan2(dir.y, dir.x);

      // Soğuk el feneri konisi (titreşimli, dar)
      const reach = engine.config.visionRadius * TS * 0.95;
      const spread = 0.46;
      const cone = ctx!.createRadialGradient(cx, cy, TS * 0.3, cx, cy, reach);
      cone.addColorStop(0, `rgba(200,220,255,${0.15 * flicker})`);
      cone.addColorStop(1, "rgba(200,220,255,0)");
      ctx!.save();
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.arc(cx, cy, reach, ang - spread, ang + spread);
      ctx!.closePath();
      ctx!.fillStyle = cone;
      ctx!.fill();
      ctx!.restore();

      const R = TS * 0.42;
      const bob = moving ? Math.sin(t * 12) : 0;

      ctx!.save();
      ctx!.translate(cx, cy);
      ctx!.rotate(ang);

      // yere düşen gölge
      ctx!.fillStyle = "rgba(0,0,0,0.5)";
      ctx!.beginPath();
      ctx!.ellipse(0, 0, R * 0.9, R * 0.72, 0, 0, Math.PI * 2);
      ctx!.fill();

      // bacaklar (karanlık, yürürken sallanır)
      ctx!.strokeStyle = "#0b0d0f";
      ctx!.lineWidth = R * 0.22;
      ctx!.lineCap = "round";
      ctx!.beginPath();
      ctx!.moveTo(-R * 0.05, -R * 0.3);
      ctx!.lineTo(-R * 0.5, -R * 0.3 - bob * R * 0.16);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(-R * 0.05, R * 0.3);
      ctx!.lineTo(-R * 0.5, R * 0.3 + bob * R * 0.16);
      ctx!.stroke();

      // gövde (koyu giysi) — soğuk kenar ışığı
      const body = ctx!.createRadialGradient(R * 0.15, -R * 0.15, R * 0.05, 0, 0, R * 0.85);
      body.addColorStop(0, "#2c3338");
      body.addColorStop(1, "#0a0c0e");
      ctx!.fillStyle = body;
      ctx!.beginPath();
      ctx!.ellipse(0, 0, R * 0.6, R * 0.48, 0, 0, Math.PI * 2);
      ctx!.fill();
      // ışık alan kenar (ince soğuk vurgu)
      ctx!.strokeStyle = `rgba(150,180,210,${0.5 * flicker})`;
      ctx!.lineWidth = 1;
      ctx!.beginPath();
      ctx!.ellipse(R * 0.08, -R * 0.05, R * 0.55, R * 0.44, 0, -1.0, 0.9);
      ctx!.stroke();

      // kollar (feneri ileri tutar)
      ctx!.strokeStyle = "#161a1d";
      ctx!.lineWidth = R * 0.18;
      ctx!.beginPath();
      ctx!.moveTo(R * 0.1, -R * 0.3);
      ctx!.lineTo(R * 0.5, -R * 0.14);
      ctx!.stroke();
      ctx!.beginPath();
      ctx!.moveTo(R * 0.1, R * 0.3);
      ctx!.lineTo(R * 0.5, R * 0.14);
      ctx!.stroke();

      // kafa (solgun, çökük)
      const head = ctx!.createRadialGradient(R * 0.32, -R * 0.06, R * 0.02, R * 0.26, 0, R * 0.28);
      head.addColorStop(0, "#c9bda6");
      head.addColorStop(1, "#6f6353");
      ctx!.fillStyle = head;
      ctx!.beginPath();
      ctx!.arc(R * 0.26, 0, R * 0.24, 0, Math.PI * 2);
      ctx!.fill();

      // el feneri + soğuk mercek (titreşimli)
      ctx!.fillStyle = "#08090a";
      ctx!.fillRect(R * 0.48, -R * 0.08, R * 0.22, R * 0.16);
      ctx!.save();
      ctx!.globalAlpha = flicker;
      ctx!.shadowColor = "rgba(200,225,255,0.9)";
      ctx!.shadowBlur = 12;
      ctx!.fillStyle = "#e6f0ff";
      ctx!.beginPath();
      ctx!.arc(R * 0.7, 0, R * 0.07, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();

      ctx!.restore();
    }

    // Kanlı Gelin — 4 çeşit (id % 4), dik duruş = oyuncuya (kameraya) dönük.
    function drawBride(
      cx: number,
      cy: number,
      t: number,
      id: number,
      aware: boolean,
      lean: number
    ) {
      const variant = id % 4;
      const S = TS * (0.4 + ((id * 53) % 20) / 200); // hafif boyut çeşitliliği
      const hp = t * (aware ? 2.4 : 1.4) + id; // saç/hareket fazı (farkındaysa hızlı)
      const bob = Math.sin(t * 1.3 + id) * S * 0.05;

      ctx!.save();
      ctx!.translate(cx, cy + bob);
      ctx!.rotate(lean * 0.07); // oyuncuya doğru hafif eğim
      ctx!.lineJoin = "round";
      ctx!.lineCap = "round";

      // gölge
      ctx!.fillStyle = "rgba(0,0,0,0.42)";
      ctx!.beginPath();
      ctx!.ellipse(0, S * 1.0, S * 0.85, S * 0.28, 0, 0, Math.PI * 2);
      ctx!.fill();

      // kafa-merkezli çerçeve (kafa origin'de, etek aşağı sarkar)
      ctx!.translate(0, -S * 0.45);

      const gown = (c1: string, c2: string) => {
        const gg = ctx!.createLinearGradient(0, 0, 0, S * 1.5);
        gg.addColorStop(0, c1);
        gg.addColorStop(1, c2);
        ctx!.fillStyle = gg;
        ctx!.beginPath();
        ctx!.moveTo(-S * 0.26, S * 0.3);
        ctx!.lineTo(-S * 0.8, S * 1.5);
        ctx!.quadraticCurveTo(0, S * 1.72, S * 0.8, S * 1.5);
        ctx!.lineTo(S * 0.26, S * 0.3);
        ctx!.closePath();
        ctx!.fill();
      };
      const backHair = (col: string) => {
        ctx!.fillStyle = col;
        for (let i = -1; i <= 1; i += 2) {
          ctx!.beginPath();
          ctx!.moveTo(0, -S * 0.45);
          ctx!.quadraticCurveTo(
            i * S * 0.9,
            S * 0.5 + Math.sin(hp + i) * S * 0.12,
            i * S * 0.5,
            S * 1.35
          );
          ctx!.quadraticCurveTo(i * S * 0.18, S * 0.9, 0, S * 0.15);
          ctx!.closePath();
          ctx!.fill();
        }
      };
      const face = (shadow: boolean) => {
        const fg = ctx!.createRadialGradient(-S * 0.1, -S * 0.12, 2, 0, 0, S * 0.56);
        fg.addColorStop(0, shadow ? "#d0d4d7" : "#e9ecef");
        fg.addColorStop(1, shadow ? "#7c8288" : "#969ca2");
        ctx!.fillStyle = fg;
        ctx!.beginPath();
        ctx!.ellipse(0, 0, S * 0.42, S * 0.52, 0, 0, Math.PI * 2);
        ctx!.fill();
      };
      const fringe = (col: string) => {
        ctx!.fillStyle = col;
        ctx!.beginPath();
        ctx!.moveTo(0, -S * 0.58);
        ctx!.quadraticCurveTo(-S * 0.62, -S * 0.42, -S * 0.44, S * 0.12);
        ctx!.quadraticCurveTo(-S * 0.52, -S * 0.32, 0, -S * 0.36);
        ctx!.quadraticCurveTo(S * 0.52, -S * 0.32, S * 0.44, S * 0.12);
        ctx!.quadraticCurveTo(S * 0.62, -S * 0.42, 0, -S * 0.58);
        ctx!.fill();
      };
      const drawEyes = (col: string) => {
        ctx!.fillStyle = col;
        ctx!.beginPath();
        ctx!.ellipse(-S * 0.15, -S * 0.04, S * 0.07, S * 0.11, 0, 0, Math.PI * 2);
        ctx!.ellipse(S * 0.15, -S * 0.04, S * 0.07, S * 0.11, 0, 0, Math.PI * 2);
        ctx!.fill();
        if (aware) {
          // fark edince gözler kırmızı yanar
          ctx!.save();
          ctx!.shadowColor = "rgba(255,45,30,0.95)";
          ctx!.shadowBlur = 12;
          ctx!.fillStyle = "#ff3a22";
          ctx!.beginPath();
          ctx!.arc(-S * 0.15, -S * 0.03, S * 0.035, 0, Math.PI * 2);
          ctx!.arc(S * 0.15, -S * 0.03, S * 0.035, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
      };
      const tear = (ex: number, sy: number, len: number, w: number, thick = 0.035) => {
        ctx!.strokeStyle = "#8a1414";
        ctx!.lineWidth = S * thick;
        ctx!.beginPath();
        ctx!.moveTo(ex, sy);
        ctx!.quadraticCurveTo(
          ex + Math.sin(hp + w) * S * 0.04,
          sy + len * 0.5,
          ex * 0.9,
          sy + len
        );
        ctx!.stroke();
        ctx!.fillStyle = "#9a1010";
        ctx!.beginPath();
        ctx!.arc(ex * 0.9, sy + len, S * (thick * 1.1), 0, Math.PI * 2);
        ctx!.fill();
      };

      if (variant === 0) {
        // 1 — Klasik
        gown("#c8ccd0", "rgba(120,126,132,0.12)");
        backHair("#08080d");
        ctx!.save();
        ctx!.globalAlpha = 0.5;
        ctx!.fillStyle = "#eae4de";
        ctx!.beginPath();
        ctx!.moveTo(0, -S * 0.7);
        ctx!.quadraticCurveTo(-S * 0.85, -S * 0.2, -S * 0.66, S * 1.0);
        ctx!.quadraticCurveTo(0, S * 1.25, S * 0.66, S * 1.0);
        ctx!.quadraticCurveTo(S * 0.85, -S * 0.2, 0, -S * 0.7);
        ctx!.fill();
        ctx!.restore();
        face(false);
        fringe("#0c0a12");
        drawEyes("#0a0710");
        tear(-S * 0.15, S * 0.05, S * 0.5, 0);
        tear(S * 0.15, S * 0.05, S * 0.5, 1.5);
        ctx!.fillStyle = "#5a0c0c";
        ctx!.beginPath();
        ctx!.ellipse(0, S * 0.24, S * 0.05, S * 0.04, 0, 0, Math.PI * 2);
        ctx!.fill();
      } else if (variant === 1) {
        // 2 — Çürük duvak
        gown("#a7a89a", "rgba(80,84,74,0.12)");
        backHair("#0c0a0c");
        ctx!.save();
        ctx!.globalAlpha = 0.42;
        ctx!.fillStyle = "#cfc9bf";
        ctx!.beginPath();
        ctx!.moveTo(0, -S * 0.72);
        ctx!.quadraticCurveTo(-S * 0.8, -S * 0.2, -S * 0.62, S * 0.85);
        for (let i = 0; i < 5; i++) {
          const xx = -S * 0.62 + i * S * 0.26;
          ctx!.lineTo(xx + S * 0.06, S * (0.85 + (i % 2 ? 0.2 : 0.03)));
          ctx!.lineTo(xx + S * 0.16, S * 0.82);
        }
        ctx!.quadraticCurveTo(S * 0.8, -S * 0.2, 0, -S * 0.72);
        ctx!.fill();
        ctx!.restore();
        face(true);
        fringe("#0d0b0f");
        ctx!.fillStyle = "rgba(10,8,10,0.5)";
        ctx!.beginPath();
        ctx!.ellipse(-S * 0.15, -S * 0.03, S * 0.13, S * 0.14, 0, 0, Math.PI * 2);
        ctx!.ellipse(S * 0.15, -S * 0.03, S * 0.13, S * 0.14, 0, 0, Math.PI * 2);
        ctx!.fill();
        drawEyes("#080608");
        tear(-S * 0.15, S * 0.05, S * 0.55, 0);
        tear(S * 0.15, S * 0.05, S * 0.45, 2);
        ctx!.fillStyle = "#3a0808";
        ctx!.beginPath();
        ctx!.ellipse(0, S * 0.24, S * 0.06, S * 0.045, 0, 0, Math.PI * 2);
        ctx!.fill();
      } else if (variant === 2) {
        // 3 — Ağlayan kan
        ctx!.save();
        ctx!.globalAlpha = 0.4;
        ctx!.fillStyle = "#e6e0da";
        ctx!.beginPath();
        ctx!.moveTo(-S * 0.5, -S * 0.55);
        ctx!.quadraticCurveTo(0, -S * 1.1, S * 0.5, -S * 0.55);
        ctx!.quadraticCurveTo(0, -S * 0.75, -S * 0.5, -S * 0.55);
        ctx!.fill();
        ctx!.restore();
        gown("#d6d0ca", "rgba(150,140,132,0.1)");
        backHair("#0a0810");
        face(false);
        fringe("#0c0a12");
        drawEyes("#0a0710");
        tear(-S * 0.15, S * 0.05, S * 0.8, 0, 0.05);
        tear(S * 0.15, S * 0.05, S * 0.8, 1, 0.05);
        ctx!.fillStyle = "#0a0508";
        ctx!.beginPath();
        ctx!.ellipse(0, S * 0.26, S * 0.08, S * 0.13, 0, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.strokeStyle = "#8a1414";
        ctx!.lineWidth = S * 0.045;
        ctx!.beginPath();
        ctx!.moveTo(0, S * 0.36);
        ctx!.quadraticCurveTo(Math.sin(hp) * S * 0.04, S * 0.6, -S * 0.05, S * 0.82);
        ctx!.stroke();
        ctx!.fillStyle = "#9a1010";
        ctx!.beginPath();
        ctx!.arc(-S * 0.05, S * 0.82, S * 0.04, 0, Math.PI * 2);
        ctx!.fill();
      } else {
        // 4 — Solgun zarif
        const halo = ctx!.createRadialGradient(0, S * 0.2, 4, 0, S * 0.2, S * 1.5);
        halo.addColorStop(0, "rgba(220,225,235,0.2)");
        halo.addColorStop(1, "rgba(220,225,235,0)");
        ctx!.fillStyle = halo;
        ctx!.beginPath();
        ctx!.arc(0, S * 0.2, S * 1.5, 0, Math.PI * 2);
        ctx!.fill();
        gown("#e2ddd8", "rgba(180,175,170,0.1)");
        backHair("#0c0a12");
        ctx!.save();
        ctx!.globalAlpha = 0.45;
        ctx!.fillStyle = "#f0ece7";
        ctx!.beginPath();
        ctx!.moveTo(0, -S * 0.72);
        ctx!.quadraticCurveTo(-S * 0.95, -S * 0.1, -S * 0.75 + Math.sin(hp) * S * 0.08, S * 1.35);
        ctx!.quadraticCurveTo(0, S * 1.6, S * 0.75 + Math.sin(hp + 1) * S * 0.08, S * 1.35);
        ctx!.quadraticCurveTo(S * 0.95, -S * 0.1, 0, -S * 0.72);
        ctx!.fill();
        ctx!.restore();
        face(false);
        fringe("#0d0b13");
        drawEyes("#0b0812");
        tear(S * 0.15, S * 0.05, S * 0.5, 1);
        ctx!.fillStyle = "#3a1a20";
        ctx!.beginPath();
        ctx!.ellipse(0, S * 0.23, S * 0.04, S * 0.03, 0, 0, Math.PI * 2);
        ctx!.fill();
      }

      ctx!.restore();
    }

    // --- Ana döngü ---
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt, input);
      // gerilimi sese aktar (kalp atışı hızı/şiddeti)
      sound.setTension(engine.tension);
      // bu karede oluşan ses olaylarını çal ve boşalt
      if (engine.events.length) {
        for (const ev of engine.events) sound.play(ev);
        engine.events.length = 0;
      }
      render();

      if (!ended && engine.status !== "playing") {
        ended = true;
        onEnd({
          status: engine.status,
          level: engine.level,
          score: engine.score,
          lives: engine.lives,
        });
        return; // döngüyü durdur
      }
      raf = requestAnimationFrame(loop);
    }
    raf = requestAnimationFrame(loop);

    // HUD güncellemesi (hafif, ~10fps)
    const hudTimer = window.setInterval(() => {
      setHud({
        level: engine.level,
        ammo: engine.ammoCount,
        zombies: engine.zombiesRemaining,
        killed: engine.zombiesKilled,
        score: engine.score,
        time: engine.time,
        hp: Math.max(0, engine.player.hp),
        lives: engine.lives,
        exitOpen: engine.exitOpen,
        warn: engine.warnTimer > 0,
      });
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(hudTimer);
      window.removeEventListener("resize", resize);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", startAudio);
      window.removeEventListener("pointerdown", startAudio);
      sound.stopAmbient();
      sound.stopGameMusic();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dokunmatik ateş butonu input referansına yazar (yalnız boolean tuşlar)
  const setFlag = (k: "up" | "down" | "left" | "right" | "fire", v: boolean) => {
    const i = inputExternal.current;
    if (i) i[k] = v;
  };

  const hpPct = (hud.hp / PLAYER_MAX_HP) * 100;
  const hpColor = hpPct > 35 ? "var(--hp)" : "var(--hp-low)";
  const mm = Math.floor(hud.time / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(hud.time % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="stage">
      <canvas ref={canvasRef} />

      <div className="hud">
        <div className="chip">
          <span className="lbl">Bölüm</span>
          <span className="val">{hud.level}</span>
        </div>
        <div className="chip">
          <span className="lbl">Mermi</span>
          <span className="val">{hud.ammo}</span>
        </div>
        <div className="chip">
          <span className="lbl">Gelin</span>
          <span className="val">{hud.zombies}</span>
        </div>
        <div className="chip">
          <span className="lbl">Skor</span>
          <span className="val">{hud.score}</span>
        </div>
        <div className="chip">
          <span className="lbl">Süre</span>
          <span className="val">
            {mm}:{ss}
          </span>
        </div>
        <div className="chip">
          <span className="lbl">Can</span>
          <div className="hpbar">
            <div
              className="hpfill"
              style={{ width: `${hpPct}%`, background: hpColor }}
            />
          </div>
        </div>
        <div className="chip">
          <div className="lives">
            {[0, 1, 2].map((i) => (
              <span
                key={i}
                className={"heart" + (i < hud.lives ? "" : " gone")}
              >
                ♥
              </span>
            ))}
          </div>
        </div>
        <div className="chip">
          <span className="lbl">Çıkış</span>
          <span
            className="val"
            style={{ color: hud.exitOpen ? "var(--hp)" : "var(--muted)" }}
          >
            {hud.exitOpen ? "AÇIK" : "KİLİTLİ"}
          </span>
        </div>
        <button
          className="chip mutebtn"
          onClick={() => {
            const m = !sound.muted;
            sound.setMuted(m);
            setMuted(m);
          }}
          title={muted ? "Sesi aç" : "Sesi kapat"}
        >
          <span className="val">{muted ? "🔇" : "🔊"}</span>
        </button>
      </div>

      {hud.warn && (
        <div className="warn">Çıkış kilitli — önce en az 1 gelini yok et!</div>
      )}

      <div className="hint">
        Hareket: <b>WASD / Ok tuşları</b> &nbsp;·&nbsp; Ateş:{" "}
        <b>Boşluk</b>
      </div>

      {/* Dokunmatik kontroller (sadece dokunmatik cihazlarda görünür) */}
      <div className="touch">
        <Joystick
          onMove={(x, y) => {
            const i = inputExternal.current;
            if (i) {
              i.ax = x;
              i.ay = y;
            }
          }}
        />
        <button
          className="fire"
          onPointerDown={(e) => {
            e.preventDefault();
            setFlag("fire", true);
          }}
          onPointerUp={() => setFlag("fire", false)}
          onPointerLeave={() => setFlag("fire", false)}
          onPointerCancel={() => setFlag("fire", false)}
        >
          ATEŞ
        </button>
      </div>
    </div>
  );
}

// Analog joystick (mobil hareket) — sürükleme yönü + itme miktarı = hız
export function Joystick({ onMove }: { onMove: (x: number, y: number) => void }) {
  const baseRef = useRef<HTMLDivElement | null>(null);
  const [thumb, setThumb] = useState({ x: 0, y: 0 });
  const drag = useRef<{ id: number; cx: number; cy: number; r: number } | null>(
    null
  );
  const MAX = 44; // başlığın maksimum kayması (px)

  const move = (e: RPointerEvent<HTMLDivElement>) => {
    const d = drag.current;
    if (!d || e.pointerId !== d.id) return;
    const dx = e.clientX - d.cx;
    const dy = e.clientY - d.cy;
    const mag = Math.hypot(dx, dy);
    const cl = Math.min(mag, d.r);
    const ux = mag > 0 ? dx / mag : 0;
    const uy = mag > 0 ? dy / mag : 0;
    const tx = ux * cl;
    const ty = uy * cl;
    setThumb({ x: tx, y: ty });
    onMove(tx / d.r, ty / d.r);
    e.preventDefault();
  };
  const start = (e: RPointerEvent<HTMLDivElement>) => {
    const el = baseRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    drag.current = {
      id: e.pointerId,
      cx: rect.left + rect.width / 2,
      cy: rect.top + rect.height / 2,
      r: MAX,
    };
    try {
      el.setPointerCapture(e.pointerId);
    } catch {
      /* yok say */
    }
    move(e);
  };
  const end = (e: RPointerEvent<HTMLDivElement>) => {
    if (!drag.current) return;
    drag.current = null;
    setThumb({ x: 0, y: 0 });
    onMove(0, 0);
    e.preventDefault();
  };

  return (
    <div
      className="joybase"
      ref={baseRef}
      onPointerDown={start}
      onPointerMove={move}
      onPointerUp={end}
      onPointerCancel={end}
    >
      <div
        className="joythumb"
        style={{ transform: `translate(${thumb.x}px, ${thumb.y}px)` }}
      />
    </div>
  );
}
