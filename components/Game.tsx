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
  type Diff,
} from "@/lib/engine";
import { sound } from "@/lib/audio";
import { drawBride, drawPlayer, grime } from "@/lib/sprites";
import { themeFor } from "@/lib/themes";
import type { Mission } from "@/lib/missions";
import type { GameStatus, Vec } from "@/lib/types";

export type EndResult = {
  status: GameStatus; // "dead" | "levelclear" | "gameover" | "win"
  level: number;
  score: number;
  lives: number;
  time?: number; // geçen süre (sn) — görev rekoru / sonsuz mod skoru
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
  veil: number; // görünmezlik kalan saniye (0 = kapalı)
};

export default function Game({
  level,
  score,
  lives,
  themeSeed = 0,
  mission = null,
  withPhoto = false,
  diff = "orta",
  onEnd,
  onQuit,
  onFragment,
}: {
  level: number;
  score: number;
  lives: number;
  themeSeed?: number;
  mission?: Mission | null;
  withPhoto?: boolean;
  diff?: Diff;
  onEnd: (r: EndResult) => void;
  onQuit?: () => void;
  onFragment?: () => void;
}) {
  const theme = themeFor(level, themeSeed); // bu bölümün görsel teması
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputExternal = useRef<Input | null>(null);
  const [muted, setMuted] = useState(sound.muted);
  const [objective, setObjective] = useState(mission?.objectiveHint ?? "");
  const [brief, setBrief] = useState(!!mission); // görev başında brifing göster
  const briefRef = useRef<boolean>(!!mission); // brifing açıkken oyun donar
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const startMission = () => {
    briefRef.current = false;
    setBrief(false);
  };
  const togglePause = () => {
    const v = !pausedRef.current;
    pausedRef.current = v;
    setPaused(v);
  };
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
    veil: 0,
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const engine = new GameEngine(level, score, lives, mission, withPhoto, diff);
    let fragmentReported = false;
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
        case "Escape":
        case "p":
        case "P":
          if (down) togglePause();
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
            ctx!.fillStyle = shade(wall ? theme.wall : theme.floor, f);
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

      // --- Mukus lekeleri (Madde 7): parlak yeşil, karanlıkta bile hafif ışır ---
      for (const m of engine.mucus) {
        if (!engine.seen[m.y] || !engine.seen[m.y][m.x]) continue;
        const litM = vis.get(m.y * cols + m.x) !== undefined;
        const sx = m.x * TS - camX + TS / 2;
        const sy = m.y * TS - camY + TS / 2;
        ctx!.save();
        ctx!.globalAlpha = litM ? 0.85 : 0.5;
        ctx!.shadowColor = "rgba(120,255,120,0.7)";
        ctx!.shadowBlur = litM ? 12 : 7;
        ctx!.fillStyle = litM ? "rgb(120,205,95)" : "rgb(72,130,62)";
        ctx!.beginPath();
        ctx!.ellipse(sx, sy, TS * 0.4, TS * 0.32, 0, 0, Math.PI * 2);
        ctx!.fill();
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

      // --- Can paketleri (kırmızı haç) ---
      for (const h of engine.healthItems) {
        if (h.taken) continue;
        if (vis.get(h.cell.y * cols + h.cell.x) === undefined) continue;
        const sx = h.cell.x * TS + TS / 2 - camX;
        const sy = h.cell.y * TS + TS / 2 - camY;
        ctx!.save();
        ctx!.shadowColor = "rgba(255,60,60,0.7)";
        ctx!.shadowBlur = 8;
        const s = TS * 0.12; // haç kolu yarı uzunluğu
        const w = TS * 0.09; // haç kolu kalınlığı
        ctx!.fillStyle = "#e8e2da"; // soluk beyaz kutu
        ctx!.fillRect(sx - s - w * 0.4, sy - s - w * 0.4, (s + w * 0.4) * 2, (s + w * 0.4) * 2);
        ctx!.fillStyle = "#d23a34"; // kırmızı haç
        ctx!.fillRect(sx - w / 2, sy - s, w, s * 2);
        ctx!.fillRect(sx - s, sy - w / 2, s * 2, w);
        ctx!.restore();
      }

      // --- Madde 8: gelin duvağı eşyası (soluk beyaz, salınan hayaletimsi tül) ---
      for (const v of engine.veilItems) {
        if (v.taken) continue;
        if (vis.get(v.cell.y * cols + v.cell.x) === undefined) continue;
        const sx = v.cell.x * TS + TS / 2 - camX;
        const sy = v.cell.y * TS + TS / 2 - camY + Math.sin(engine.time * 2) * 2;
        ctx!.save();
        ctx!.shadowColor = "rgba(210,225,255,0.8)";
        ctx!.shadowBlur = 12;
        ctx!.globalAlpha = 0.8;
        ctx!.fillStyle = "#e9edf7";
        ctx!.beginPath();
        ctx!.moveTo(sx, sy - TS * 0.16);
        ctx!.quadraticCurveTo(sx + TS * 0.18, sy, sx, sy + TS * 0.18);
        ctx!.quadraticCurveTo(sx - TS * 0.18, sy, sx, sy - TS * 0.16);
        ctx!.fill();
        ctx!.restore();
      }

      // --- Gizli: düğün fotoğrafı parçası (soluk sepya, hafif salınan parıltı) ---
      if (engine.photoItem && !engine.photoItem.taken) {
        const ph = engine.photoItem;
        if (vis.get(ph.cell.y * cols + ph.cell.x) !== undefined) {
          const sx = ph.cell.x * TS + TS / 2 - camX;
          const sy = ph.cell.y * TS + TS / 2 - camY;
          const w = TS * 0.26, h = TS * 0.32;
          ctx!.save();
          ctx!.translate(sx, sy);
          ctx!.rotate(Math.sin(engine.time * 1.5) * 0.12);
          ctx!.shadowColor = "rgba(255,220,150,0.8)";
          ctx!.shadowBlur = 12;
          ctx!.fillStyle = "#efe2c6"; // fotoğraf kağıdı
          ctx!.fillRect(-w / 2, -h / 2, w, h);
          ctx!.fillStyle = "#7a6a52"; // sepya portre
          ctx!.fillRect(-w / 2 + w * 0.14, -h / 2 + h * 0.12, w * 0.72, h * 0.6);
          ctx!.restore();
        }
      }

      // --- Görev: toplanacak parçalar (parlayan camgöbeği elmas) ---
      for (const c of engine.collectItems) {
        if (c.taken) continue;
        if (vis.get(c.cell.y * cols + c.cell.x) === undefined) continue;
        const sx = c.cell.x * TS + TS / 2 - camX;
        const sy = c.cell.y * TS + TS / 2 - camY;
        const s = TS * 0.16;
        ctx!.save();
        ctx!.translate(sx, sy);
        ctx!.rotate(Math.PI / 4 + Math.sin(engine.time * 2) * 0.15);
        ctx!.shadowColor = "rgba(110,231,255,0.9)";
        ctx!.shadowBlur = 12;
        ctx!.fillStyle = "#8be9ff";
        ctx!.fillRect(-s / 2, -s / 2, s, s);
        ctx!.fillStyle = "rgba(255,255,255,0.8)";
        ctx!.fillRect(-s / 2, -s / 2, s * 0.35, s * 0.35);
        ctx!.restore();
      }

      // --- Kanlı Gelinler (4 çeşit karışık, hep oyuncuya dönük) ---
      for (const z of engine.zombies) {
        const zc = { x: Math.floor(z.pos.x), y: Math.floor(z.pos.y) };
        if (vis.get(zc.y * cols + zc.x) === undefined) continue;
        const s = worldToScreen(z.pos.x, z.pos.y, camX, camY);
        // oyuncu solda mı sağda mı (hafif yön eğimi için)
        const lean = engine.player.pos.x < z.pos.x ? -1 : 1;
        drawBride(ctx!, TS, s.sx, s.sy, engine.time, z.id, z.aware, lean);
      }

      // --- Madde 6: karanlıkta hızlanan gelinlerin KIRMIZI GÖZLERİ ---
      // Karanlıkta bile görünür (nerede olduğunu bil, ama dokunma).
      for (const z of engine.zombies) {
        if (z.kind !== "dark") continue;
        const sx = z.pos.x * TS - camX;
        const sy = z.pos.y * TS - camY;
        if (sx < -TS || sy < -TS || sx > cssW + TS || sy > cssH + TS) continue;
        const flick = 0.7 + 0.3 * Math.sin(engine.time * 7 + z.id);
        ctx!.save();
        ctx!.shadowColor = "rgba(255,30,30,0.95)";
        ctx!.shadowBlur = 12;
        ctx!.fillStyle = `rgba(255,45,45,${flick})`;
        const r = Math.max(1.6, TS * 0.055);
        const off = TS * 0.1;
        ctx!.beginPath(); ctx!.arc(sx - off, sy - TS * 0.06, r, 0, Math.PI * 2); ctx!.fill();
        ctx!.beginPath(); ctx!.arc(sx + off, sy - TS * 0.06, r, 0, Math.PI * 2); ctx!.fill();
        ctx!.restore();
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

      // --- Oyuncu + el feneri konisi (dinamik efektif yarıçap) ---
      const vEff = engine.flashlight.eff;
      drawPlayer(ctx!, TS, cssW / 2, cssH / 2, p.dir, engine.time, engine.playerMoving, flicker, vEff);
      // Madde 8: görünmezken (duvak) titreşen tül halkası
      if (engine.veiled) {
        ctx!.save();
        ctx!.globalAlpha = 0.3 + 0.18 * Math.sin(engine.time * 5);
        ctx!.strokeStyle = "rgba(215,228,255,0.85)";
        ctx!.lineWidth = 2;
        ctx!.beginPath();
        ctx!.arc(cssW / 2, cssH / 2, TS * 0.5, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }

      // --- Vinyet (ağır, boğucu kenar kararması) — dinamik görüşe göre ---
      const grad = ctx!.createRadialGradient(
        cssW / 2,
        cssH / 2,
        vEff * TS * 0.28,
        cssW / 2,
        cssH / 2,
        vEff * TS * 1.0
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

    // --- Ana döngü ---
    function loop(now: number) {
      // Duraklatıldıysa ya da görev brifingi açıksa dünyayı dondur
      if (pausedRef.current || briefRef.current) {
        last = now;
        raf = requestAnimationFrame(loop);
        return;
      }
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
          time: engine.time,
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
        veil: engine.veiled ? Math.max(0, Math.ceil(engine.veilUntil - engine.time)) : 0,
      });
      if (mission) setObjective(engine.objectiveText());
      // gizli fotoğraf parçası toplandıysa bir kez bildir
      if (engine.photoTaken && !fragmentReported) {
        fragmentReported = true;
        onFragment?.();
      }
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
        {mission && (
          <div className="chip" style={{ borderColor: "rgba(110,231,255,0.6)" }}>
            <span className="lbl">Görev</span>
            <span className="val" style={{ color: "#8be9ff" }}>{objective}</span>
          </div>
        )}
        {!mission && (
          <div className="chip">
            <span className="lbl">Bölüm</span>
            <span className="val">{hud.level}</span>
          </div>
        )}
        <div className="chip">
          <span className="lbl">Tema</span>
          <span className="val">{theme.name}</span>
        </div>
        {!mission?.noFire && (
          <div className="chip">
            <span className="lbl">Mermi</span>
            <span className="val">{hud.ammo}</span>
          </div>
        )}
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
        {hud.veil > 0 && (
          <div className="chip" style={{ borderColor: "rgba(215,228,255,0.6)" }}>
            <span className="lbl">Görünmez</span>
            <span className="val" style={{ color: "#d7e4ff" }}>{hud.veil}s</span>
          </div>
        )}
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
        <button
          className="chip mutebtn"
          onClick={togglePause}
          title={paused ? "Devam et" : "Duraklat"}
        >
          <span className="val">{paused ? "▶" : "⏸"}</span>
        </button>
      </div>

      {hud.warn && (
        <div className="warn">Çıkış kilitli — önce en az 1 gelini yok et!</div>
      )}

      {brief && mission && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.86)" }}>
          <div className="subtitle" style={{ color: "#8be9ff", letterSpacing: "0.15em" }}>
            {mission.endless ? "MOD" : `GÖREV ${mission.id}`}
          </div>
          <div className="title" style={{ fontSize: "clamp(30px,8vw,56px)" }}>
            {mission.title}
          </div>
          <div className="how" style={{ maxWidth: 480, lineHeight: 1.6 }}>
            {mission.brief}
            <div style={{ marginTop: 10, color: "#8be9ff" }}>
              <b>Hedef:</b> {mission.objectiveHint}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={startMission}>
              Başla →
            </button>
            {onQuit && (
              <button className="btn" onClick={onQuit} style={{ opacity: 0.7 }}>
                ← Geri
              </button>
            )}
          </div>
        </div>
      )}

      {paused && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.82)" }}>
          <div className="big" style={{ color: "#6ee7ff" }}>DURAKLATILDI</div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", justifyContent: "center" }}>
            <button className="btn btn-primary" onClick={togglePause}>
              ▶ Devam Et
            </button>
            {onQuit && (
              <button className="btn" onClick={onQuit}>
                ← Menüye Dön
              </button>
            )}
          </div>
        </div>
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
        {!mission?.noFire && (
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
        )}
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
