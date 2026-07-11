"use client";

import { useEffect, useRef, useState } from "react";
import {
  GameEngine,
  PLAYER_MAX_HP,
  type Input,
} from "@/lib/engine";
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

const FLOOR = [40, 54, 78];
const WALL = [78, 92, 120];

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
    };
    inputExternal.current = input;

    let ended = false;
    let raf = 0;
    let last = performance.now();
    let dpr = Math.min(window.devicePixelRatio || 1, 2);
    let cssW = 0;
    let cssH = 0;
    let TS = 36; // hücre boyutu (CSS px)

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
          if (intensity !== undefined) {
            // aydınlık (el feneri)
            const f = wall ? 0.35 + 0.65 * intensity : 0.28 + 0.72 * intensity;
            ctx!.fillStyle = shade(wall ? WALL : FLOOR, f);
          } else {
            // hafıza (soluk gri)
            ctx!.fillStyle = wall ? "rgb(30,34,46)" : "rgb(17,19,27)";
          }
          ctx!.fillRect(Math.floor(sx), Math.floor(sy), TS + 1, TS + 1);
        }
      }

      // --- Çıkış kapısı ---
      drawExit(camX, camY, vis, cols);

      // --- Mermiler (yerdeki) ---
      for (const a of engine.ammoItems) {
        if (a.taken) continue;
        if (vis.get(a.cell.y * cols + a.cell.x) === undefined) continue;
        const sx = a.cell.x * TS + TS / 2 - camX;
        const sy = a.cell.y * TS + TS / 2 - camY;
        ctx!.save();
        ctx!.shadowColor = "rgba(255,220,120,0.9)";
        ctx!.shadowBlur = 12;
        ctx!.fillStyle = "#ffdd77";
        ctx!.beginPath();
        ctx!.arc(sx, sy, Math.max(3, TS * 0.13), 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
      }

      // --- Zombiler ---
      for (const z of engine.zombies) {
        const zc = { x: Math.floor(z.pos.x), y: Math.floor(z.pos.y) };
        if (vis.get(zc.y * cols + zc.x) === undefined) continue;
        const s = worldToScreen(z.pos.x, z.pos.y, camX, camY);
        const r = TS * 0.34;
        ctx!.save();
        ctx!.shadowColor = "rgba(0,0,0,0.6)";
        ctx!.shadowBlur = 8;
        ctx!.fillStyle = z.aware ? "rgb(96,120,74)" : "rgb(74,92,64)";
        ctx!.beginPath();
        ctx!.arc(s.sx, s.sy, r, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.restore();
        ctx!.strokeStyle = "rgba(20,30,18,0.9)";
        ctx!.lineWidth = 1.5;
        ctx!.stroke();
        // gözler
        const eye = z.aware ? "#ff5b5b" : "#c9d8b0";
        const ex = TS * 0.12;
        ctx!.fillStyle = eye;
        if (z.aware) {
          ctx!.shadowColor = "rgba(255,80,80,0.9)";
          ctx!.shadowBlur = 8;
        }
        ctx!.beginPath();
        ctx!.arc(s.sx - ex, s.sy - ex * 0.4, TS * 0.05, 0, Math.PI * 2);
        ctx!.arc(s.sx + ex, s.sy - ex * 0.4, TS * 0.05, 0, Math.PI * 2);
        ctx!.fill();
        ctx!.shadowBlur = 0;
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
      drawPlayer(cssW / 2, cssH / 2, p.dir);

      // --- Vinyet (kenar kararması) ---
      const grad = ctx!.createRadialGradient(
        cssW / 2,
        cssH / 2,
        engine.config.visionRadius * TS * 0.35,
        cssW / 2,
        cssH / 2,
        engine.config.visionRadius * TS * 1.05
      );
      grad.addColorStop(0, "rgba(0,0,0,0)");
      grad.addColorStop(1, "rgba(0,0,0,0.62)");
      ctx!.fillStyle = grad;
      ctx!.fillRect(0, 0, cssW, cssH);

      // --- Hasar flaşı ---
      if (engine.hurtFlash > 0) {
        ctx!.fillStyle = `rgba(200,20,20,${Math.min(
          0.45,
          engine.hurtFlash * 1.8
        )})`;
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

    function drawPlayer(cx: number, cy: number, dir: Vec) {
      // el feneri konisi
      const ang = Math.atan2(dir.y, dir.x);
      const reach = engine.config.visionRadius * TS * 0.95;
      const spread = 0.55;
      const cone = ctx!.createRadialGradient(cx, cy, TS * 0.3, cx, cy, reach);
      cone.addColorStop(0, "rgba(200,240,255,0.16)");
      cone.addColorStop(1, "rgba(200,240,255,0)");
      ctx!.save();
      ctx!.beginPath();
      ctx!.moveTo(cx, cy);
      ctx!.arc(cx, cy, reach, ang - spread, ang + spread);
      ctx!.closePath();
      ctx!.fillStyle = cone;
      ctx!.fill();
      ctx!.restore();

      // oyuncu gövdesi
      ctx!.save();
      ctx!.shadowColor = "rgba(110,231,255,0.8)";
      ctx!.shadowBlur = 14;
      ctx!.fillStyle = "#dff6ff";
      ctx!.beginPath();
      ctx!.arc(cx, cy, TS * 0.26, 0, Math.PI * 2);
      ctx!.fill();
      ctx!.restore();
      // yön göstergesi
      ctx!.fillStyle = "#0a2b33";
      ctx!.beginPath();
      ctx!.arc(cx + dir.x * TS * 0.12, cy + dir.y * TS * 0.12, TS * 0.09, 0, Math.PI * 2);
      ctx!.fill();
    }

    // --- Ana döngü ---
    function loop(now: number) {
      const dt = (now - last) / 1000;
      last = now;
      engine.update(dt, input);
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
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dokunmatik kontroller input referansına yazar
  const setFlag = (k: keyof Input, v: boolean) => {
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
          <span className="lbl">Zombi</span>
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
      </div>

      {hud.warn && (
        <div className="warn">Çıkış kilitli — önce en az 1 zombi öldür!</div>
      )}

      <div className="hint">
        Hareket: <b>WASD / Ok tuşları</b> &nbsp;·&nbsp; Ateş:{" "}
        <b>Boşluk</b>
      </div>

      {/* Dokunmatik kontroller (sadece dokunmatik cihazlarda görünür) */}
      <div className="touch">
        <div className="dpad">
          <TB
            keys={["up", "left"]}
            set={setFlag}
            label="↖"
          />
          <TB keys={["up"]} set={setFlag} label="↑" />
          <TB keys={["up", "right"]} set={setFlag} label="↗" />
          <TB keys={["left"]} set={setFlag} label="←" />
          <div />
          <TB keys={["right"]} set={setFlag} label="→" />
          <TB keys={["down", "left"]} set={setFlag} label="↙" />
          <TB keys={["down"]} set={setFlag} label="↓" />
          <TB keys={["down", "right"]} set={setFlag} label="↘" />
        </div>
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

// Dokunmatik yön butonu
function TB({
  keys,
  set,
  label,
}: {
  keys: (keyof Input)[];
  set: (k: keyof Input, v: boolean) => void;
  label: string;
}) {
  const on = (v: boolean) => keys.forEach((k) => set(k, v));
  return (
    <button
      className="tbtn"
      onPointerDown={(e) => {
        e.preventDefault();
        on(true);
      }}
      onPointerUp={() => on(false)}
      onPointerLeave={() => on(false)}
      onPointerCancel={() => on(false)}
    >
      {label}
    </button>
  );
}
