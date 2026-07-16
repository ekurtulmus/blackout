"use client";

import { useEffect, useRef } from "react";

// BLACKOUT — ORTAK EKRAN KABUĞU (tasarım handoff).
// Sabit arka plan (z sırası): labirent canvas → radyal scrim → film taneciği → vinyet (nabız).
// Bu bileşen page.tsx'te BİR KEZ mount edilir; ekranlar `children` olarak değişir →
// arka plan ekranlar arası KESİNTİSİZ akar (canvas hiç sıfırlanmaz).
//
// Chrome:
//  - menu=true  → sol üstte cüzdan çipi, sağ üstte Ayarlar + Arkadaşlar (46px kare)
//  - menu=false → sol üstte TEK geri butonu (46px kare, yalnız ok ikonu)
export default function MenuShell({
  menu = false,
  onBack,
  onSettings,
  onFriends,
  coins = 0,
  friendsOnline = 0,
  children,
}: {
  menu?: boolean;
  onBack?: () => void;
  onSettings?: () => void;
  onFriends?: () => void;
  coins?: number;
  friendsOnline?: number;
  children: React.ReactNode;
}) {
  const gameRef = useRef<HTMLCanvasElement | null>(null);
  const grainRef = useRef<HTMLCanvasElement | null>(null);

  // --- Grain (film taneciği) ---
  useEffect(() => {
    const gc = grainRef.current;
    if (!gc) return;
    const gx = gc.getContext("2d");
    if (!gx) return;
    let raf = 0;
    const size = () => {
      gc.width = window.innerWidth >> 1;
      gc.height = window.innerHeight >> 1;
    };
    size();
    window.addEventListener("resize", size);
    const grain = () => {
      const w = gc.width, h = gc.height;
      if (w > 0 && h > 0) {
        const img = gx.createImageData(w, h), d = img.data;
        for (let i = 0; i < d.length; i += 4) {
          const v = Math.random() * 255;
          d[i] = d[i + 1] = d[i + 2] = v;
          d[i + 3] = 255;
        }
        gx.putImageData(img, 0, 0);
      }
      raf = requestAnimationFrame(grain);
    };
    raf = requestAnimationFrame(grain);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", size);
    };
  }, []);

  // --- Tepeden-bakış labirent sahnesi (arka plan) ---
  useEffect(() => {
    const cv = gameRef.current;
    if (!cv) return;
    const g = cv.getContext("2d");
    if (!g) return;
    const TS = 46;
    let COLS = 0, ROWS = 0;
    let grid = new Uint8Array(0);
    let seen = new Float32Array(0);
    let px = 0, py = 0, heading = 0;
    let player = { c: 0, r: 0, x: 0, y: 0 };
    let brides: { c: number; r: number; x: number; y: number; path: number[][]; cool: number }[] = [];
    let path: number[][] = [];
    let target: number[] | null = null;
    const W = () => window.innerWidth, H = () => window.innerHeight;
    const idx = (c: number, r: number) => r * COLS + c;
    const inb = (c: number, r: number) => c >= 0 && r >= 0 && c < COLS && r < ROWS;

    function buildMaze() {
      COLS = Math.floor(W() / TS) | 1;
      ROWS = Math.floor(H() / TS) | 1;
      if (COLS < 11) COLS = 11;
      if (ROWS < 9) ROWS = 9;
      grid = new Uint8Array(COLS * ROWS);
      const cc = (COLS - 1) / 2, cr = (ROWS - 1) / 2;
      const vis = new Uint8Array(cc * cr);
      const stack: number[][] = [[0, 0]];
      vis[0] = 1;
      const cellFloor = (cx: number, cy: number) => { grid[idx(cx * 2 + 1, cy * 2 + 1)] = 1; };
      cellFloor(0, 0);
      while (stack.length) {
        const [cx, cy] = stack[stack.length - 1];
        const dirs = [[1, 0], [-1, 0], [0, 1], [0, -1]].sort(() => Math.random() - 0.5);
        let moved = false;
        for (const [dx, dy] of dirs) {
          const nx = cx + dx, ny = cy + dy;
          if (nx >= 0 && ny >= 0 && nx < cc && ny < cr && !vis[ny * cc + nx]) {
            vis[ny * cc + nx] = 1;
            grid[idx(cx * 2 + 1 + dx, cy * 2 + 1 + dy)] = 1;
            cellFloor(nx, ny);
            stack.push([nx, ny]);
            moved = true;
            break;
          }
        }
        if (!moved) stack.pop();
      }
      for (let i = 0; i < COLS * ROWS * 0.04; i++) {
        const c = 1 + Math.floor(Math.random() * (COLS - 2)), r = 1 + Math.floor(Math.random() * (ROWS - 2));
        grid[idx(c, r)] = 1;
      }
      seen = new Float32Array(COLS * ROWS);
      const floors: number[][] = [];
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) if (grid[idx(c, r)]) floors.push([c, r]);
      const start = floors[Math.floor(Math.random() * floors.length)];
      player = { c: start[0], r: start[1], x: start[0] * TS + TS / 2, y: start[1] * TS + TS / 2 };
      px = player.x; py = player.y;
      brides = [0, 1].map(() => {
        const f = floors[Math.floor(Math.random() * floors.length)];
        return { c: f[0], r: f[1], x: f[0] * TS + TS / 2, y: f[1] * TS + TS / 2, path: [], cool: 0 };
      });
      path = []; target = null;
    }

    function bfs(sc: number, sr: number, tc: number, tr: number): number[][] {
      const prev = new Int32Array(COLS * ROWS).fill(-1);
      const q = [idx(sc, sr)];
      prev[idx(sc, sr)] = idx(sc, sr);
      let head = 0;
      while (head < q.length) {
        const cur = q[head++];
        const cc = cur % COLS, cr = (cur / COLS) | 0;
        if (cc === tc && cr === tr) break;
        for (const [dx, dy] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) {
          const nc = cc + dx, nr = cr + dy;
          if (inb(nc, nr) && grid[idx(nc, nr)] && prev[idx(nc, nr)] === -1) {
            prev[idx(nc, nr)] = cur;
            q.push(idx(nc, nr));
          }
        }
      }
      if (prev[idx(tc, tr)] === -1) return [];
      const out: number[][] = [];
      let cur = idx(tc, tr);
      while (cur !== idx(sc, sr)) { out.push([cur % COLS, (cur / COLS) | 0]); cur = prev[cur]; }
      return out.reverse();
    }

    function randFloorFar(fromC: number, fromR: number): number[] | null {
      let best: number[] | null = null, bd = -1;
      for (let k = 0; k < 40; k++) {
        const c = Math.floor(Math.random() * COLS), r = Math.floor(Math.random() * ROWS);
        if (!grid[idx(c, r)]) continue;
        const d = Math.abs(c - fromC) + Math.abs(r - fromR);
        if (d > bd) { bd = d; best = [c, r]; }
      }
      return best;
    }

    function step(dt: number) {
      if (!path.length) {
        target = randFloorFar(player.c, player.r);
        if (target) path = bfs(player.c, player.r, target[0], target[1]);
      }
      if (path.length) {
        const [nc, nr] = path[0];
        const tx = nc * TS + TS / 2, ty = nr * TS + TS / 2;
        const dx = tx - px, dy = ty - py, d = Math.hypot(dx, dy);
        const sp = 95 * dt;
        if (d < sp) { px = tx; py = ty; player.c = nc; player.r = nr; path.shift(); }
        else { px += dx / d * sp; py += dy / d * sp; heading = Math.atan2(dy, dx); }
      }
      brides.forEach((b) => {
        b.cool -= dt;
        if (b.cool <= 0 || !b.path.length) { b.path = bfs(b.c, b.r, player.c, player.r); b.cool = 0.6; }
        if (b.path.length) {
          const [nc, nr] = b.path[0];
          const tx = nc * TS + TS / 2, ty = nr * TS + TS / 2;
          const dx = tx - b.x, dy = ty - b.y, d = Math.hypot(dx, dy);
          const sp = 70 * dt;
          if (d < sp) { b.x = tx; b.y = ty; b.c = nc; b.r = nr; b.path.shift(); }
          else { b.x += dx / d * sp; b.y += dy / d * sp; }
        }
      });
    }

    const R = 5.4, CONE = 0.85;
    function bright(wx: number, wy: number) {
      const dx = wx - px, dy = wy - py, dist = Math.hypot(dx, dy) / TS;
      if (dist > R + 0.5) return 0;
      const ang = Math.atan2(dy, dx);
      let diff = Math.abs(ang - heading);
      if (diff > Math.PI) diff = 2 * Math.PI - diff;
      const close = dist < 1.7 ? (1 - dist / 2.2) : 0;
      const cone = diff < CONE ? (1 - dist / R) * (1 - diff / CONE * 0.5) : 0;
      return Math.max(0, Math.min(1, Math.max(close, cone)));
    }

    function drawBride(b: { x: number; y: number }, br: number) {
      const s = TS * 0.5;
      g!.save();
      g!.translate(b.x, b.y);
      g!.globalAlpha = Math.min(1, br * 1.3);
      g!.fillStyle = "#d9d2c4";
      g!.beginPath();
      g!.moveTo(-s * 0.42, s * 0.5);
      g!.quadraticCurveTo(-s * 0.5, -s * 0.45, 0, -s * 0.55);
      g!.quadraticCurveTo(s * 0.5, -s * 0.45, s * 0.42, s * 0.5);
      g!.closePath();
      g!.fill();
      g!.fillStyle = "#efe9dc";
      g!.beginPath();
      g!.arc(0, -s * 0.42, s * 0.26, 0, 7);
      g!.fill();
      g!.fillStyle = "#b01414";
      g!.fillRect(-s * 0.06, -s * 0.34, s * 0.12, s * 0.34);
      g!.fillStyle = "#ff2323";
      g!.shadowColor = "#ff0000";
      g!.shadowBlur = 6;
      g!.beginPath();
      g!.arc(-s * 0.1, -s * 0.46, 1.5, 0, 7);
      g!.fill();
      g!.beginPath();
      g!.arc(s * 0.1, -s * 0.46, 1.5, 0, 7);
      g!.fill();
      g!.restore();
    }

    function render() {
      g!.fillStyle = "#000";
      g!.fillRect(0, 0, cv!.width, cv!.height);
      const cone = g!.createRadialGradient(px, py, 4, px, py, R * TS);
      cone.addColorStop(0, "rgba(120,105,80,.20)");
      cone.addColorStop(0.5, "rgba(70,60,45,.10)");
      cone.addColorStop(1, "rgba(0,0,0,0)");
      for (let r = 0; r < ROWS; r++) for (let c = 0; c < COLS; c++) {
        const wx = c * TS + TS / 2, wy = r * TS + TS / 2;
        const b = bright(wx, wy);
        const i = idx(c, r);
        seen[i] = Math.max(seen[i] * 0.992, b);
        const vis = Math.max(b, seen[i] * 0.2);
        if (vis < 0.02) continue;
        if (grid[i]) {
          const base = vis;
          const rr = Math.floor(74 * base + 8), gg = Math.floor(60 * base + 6), bb = Math.floor(46 * base + 5);
          g!.fillStyle = `rgb(${rr},${gg},${bb})`;
        } else {
          const base = vis * 0.5;
          const v = Math.floor(34 * base + 4);
          g!.fillStyle = `rgb(${v + 4},${v + 3},${v})`;
        }
        g!.fillRect(c * TS, r * TS, TS + 1, TS + 1);
        if (b > 0.15) { g!.fillStyle = `rgba(0,0,0,${0.1 * Math.random()})`; g!.fillRect(c * TS, r * TS, TS, TS); }
      }
      g!.fillStyle = cone;
      g!.fillRect(0, 0, cv!.width, cv!.height);
      brides.forEach((b) => { const bb = bright(b.x, b.y); if (bb > 0.06) drawBride(b, bb); });
      const pg = g!.createRadialGradient(px, py, 1, px, py, TS * 1.4);
      pg.addColorStop(0, "rgba(255,210,140,.5)");
      pg.addColorStop(1, "rgba(255,150,60,0)");
      g!.fillStyle = pg;
      g!.beginPath();
      g!.arc(px, py, TS * 1.4, 0, 7);
      g!.fill();
      g!.fillStyle = "#1a1512";
      g!.beginPath();
      g!.arc(px, py, TS * 0.22, 0, 7);
      g!.fill();
      g!.fillStyle = "#3a2f26";
      g!.beginPath();
      g!.arc(px, py - 2, TS * 0.12, 0, 7);
      g!.fill();
    }

    function sizeGame(rebuild: boolean) {
      cv!.width = W();
      cv!.height = H();
      if (rebuild) buildMaze();
    }
    sizeGame(true);
    let lastW = W(), lastH = H();
    let rt: ReturnType<typeof setTimeout>;
    // Mobilde kaydırınca adres çubuğu yüksekliği değişir → resize tetiklenir.
    // Labirenti yalnız GENİŞLİK ya da BÜYÜK yükseklik değişiminde (yön dönüşü) yeniden kur.
    const onResize = () => {
      clearTimeout(rt);
      rt = setTimeout(() => {
        const w = W(), h = H();
        const rebuild = w !== lastW || Math.abs(h - lastH) > 160;
        lastW = w; lastH = h;
        sizeGame(rebuild);
      }, 200);
    };
    window.addEventListener("resize", onResize);

    let raf = 0, last = 0;
    const loop = (t: number) => {
      const dt = Math.min(0.05, (t - last) / 1000 || 0);
      last = t;
      step(dt);
      render();
      raf = requestAnimationFrame(loop);
    };
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener("resize", onResize);
      clearTimeout(rt);
    };
  }, []);

  return (
    <div className="shell">
      <canvas ref={gameRef} className="shell-game" />
      <div className="shell-scrim" />
      <canvas ref={grainRef} className="shell-grain" />
      <div className="shell-vignette" />

      {/* Sol üst: menüde cüzdan çipi, diğer ekranlarda TEK geri butonu */}
      {menu ? (
        <div className="shell-wallet">
          <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="#e0a24a" strokeWidth="1.6" aria-hidden="true">
            <circle cx="12" cy="12" r="8.2" />
            <path d="M12 7.5v9M9.6 9.6h3.4a1.7 1.7 0 0 1 0 3.4H10a1.7 1.7 0 0 0 0 3.4h3.4" strokeLinecap="round" />
          </svg>
          {coins}
        </div>
      ) : (
        onBack && (
          <button className="shell-icon shell-back" onClick={onBack} title="Geri" aria-label="Geri">
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          </button>
        )
      )}

      {/* Sağ üst (yalnız menüde): Ayarlar + Arkadaşlar */}
      {menu && (
        <div className="shell-top-right">
          <button className="shell-icon" onClick={onSettings} title="Ayarlar" aria-label="Ayarlar">
            <svg viewBox="0 0 24 24" width="21" height="21" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="3.2" />
              <path d="M12 2.6l1 2.2a1.4 1.4 0 0 0 1.9.8l2.2-1 1.3 1.3-1 2.2a1.4 1.4 0 0 0 .8 1.9l2.2 1v1.8l-2.2 1a1.4 1.4 0 0 0-.8 1.9l1 2.2-1.3 1.3-2.2-1a1.4 1.4 0 0 0-1.9.8l-1 2.2h-1.8l-1-2.2a1.4 1.4 0 0 0-1.9-.8l-2.2 1-1.3-1.3 1-2.2a1.4 1.4 0 0 0-.8-1.9l-2.2-1v-1.8l2.2-1a1.4 1.4 0 0 0 .8-1.9l-1-2.2 1.3-1.3 2.2 1a1.4 1.4 0 0 0 1.9-.8z" />
            </svg>
          </button>
          <button className="shell-icon" onClick={onFriends} title="Arkadaşlarım" aria-label="Arkadaşlarım" style={{ position: "relative" }}>
            <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="9" cy="8" r="3.2" />
              <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
              <circle cx="17" cy="8.5" r="2.4" />
              <path d="M15.5 14.2A4.6 4.6 0 0 1 20.5 18.5" />
            </svg>
            {friendsOnline > 0 && <span className="shell-badge">{friendsOnline}</span>}
          </button>
        </div>
      )}

      {/* İçerik */}
      <div className="shell-content">{children}</div>
    </div>
  );
}
