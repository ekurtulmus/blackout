"use client";

import { useEffect, useRef, useState } from "react";
import Icon, { type IconName } from "@/components/Icon";

// Sinematik ana menü — kullanıcının tasarımı (tepeden-bakış labirent animasyonu +
// kanlı vinyet + Cinzel başlık) oyuna uyarlandı. Tüm modlara + ikincil ekranlara bağlı.
export default function MainMenu({
  onSolo,
  onRace,
  onMissions,
  onModes,
  onSecrets,
  onShop,
  onAchievements,
  onJournal,
  onSettings,
  onFriends,
  friendsOnline,
  secrets,
  secretTotal,
  coins,
  ach,
  achTotal,
  journal,
  journalTotal,
}: {
  onSolo: () => void;
  onRace: () => void;
  onMissions: () => void;
  onModes: () => void;
  onSecrets: () => void;
  onShop: () => void;
  onAchievements: () => void;
  onJournal: () => void;
  onSettings: () => void;
  onFriends: () => void;
  friendsOnline: number;
  secrets: number;
  secretTotal: number;
  coins: number;
  ach: number;
  achTotal: number;
  journal: number;
  journalTotal: number;
}) {
  const gameRef = useRef<HTMLCanvasElement | null>(null);
  const grainRef = useRef<HTMLCanvasElement | null>(null);
  const [modal, setModal] = useState(false);
  const [topic, setTopic] = useState<string | null>(null); // Nasıl Oynanır: açık konu
  const [isTouch, setIsTouch] = useState(false); // dokunmatik mi (kontrol anlatımı için)

  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);

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

    function sizeGame() {
      cv!.width = W();
      cv!.height = H();
      buildMaze();
    }
    sizeGame();
    let rt: ReturnType<typeof setTimeout>;
    const onResize = () => { clearTimeout(rt); rt = setTimeout(sizeGame, 200); };
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

  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setModal(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  const mpIcon = (
    <svg className="mm-mp" viewBox="0 0 48 24" width="42" height="21" aria-hidden="true">
      {[6, 20, 34].map((cx, i) => (
        <g key={cx} opacity={i === 1 ? 1 : 0.75}>
          <circle cx={cx + 4} cy="8" r="3.4" />
          <path d={`M${cx - 0.5} 22 v-5 a4.5 4.5 0 0 1 9 0 v5 z`} />
        </g>
      ))}
    </svg>
  );
  const primary: { label: string; onClick: () => void; icon?: React.ReactNode }[] = [
    { label: "Yalnız Kaçış", onClick: onSolo },
    { label: "Ölüm Koşusu", onClick: onRace, icon: mpIcon },
    { label: "Karanlık Görevler", onClick: onMissions },
    { label: "Modlar", onClick: onModes },
  ];
  const secondary: { icon: IconName; label: string; note?: string; coin?: boolean; onClick: () => void }[] = [
    { icon: "photo", label: "Sırlar", note: `${secrets}/${secretTotal}`, onClick: onSecrets },
    { icon: "cart", label: "Dükkân", note: `${coins}`, coin: true, onClick: onShop },
    { icon: "trophy", label: "Başarımlar", note: `${ach}/${achTotal}`, onClick: onAchievements },
    { icon: "book", label: "Günlük", note: `${journal}/${journalTotal}`, onClick: onJournal },
  ];

  // Nasıl Oynanır — konu-konu bilgi (kullanıcı merak ettiğine tıklar)
  const helpTopics: { key: string; title: string; items: { k?: string; t: string }[] }[] = [
    {
      key: "kontrol",
      title: "Kontroller",
      items: isTouch
        ? [
            { k: "Hareket", t: "Sol alttaki joystick'i sürükle — çektiğin yöne yürürsün." },
            { k: "Ateş", t: "Sağ alttaki ATEŞ düğmesi; baktığın yöne mermi atar." },
            { k: "Bariyer / Tuzak", t: "Sağ alttaki BARİYER ve 🕸️ düğmeleriyle yere koyarsın." },
            { k: "Envanter / Dükkân", t: "Üstteki 📦 (envanter) ve 🛒 (dükkân) düğmeleri." },
          ]
        : [
            { k: "Hareket", t: "WASD veya ok tuşları · Shift ile koş (nefes barı tükenir)." },
            { k: "Ateş", t: "Boşluk tuşu — baktığın yöne ateş eder." },
            { k: "Eşya", t: "Q kalkan · R radar · E bariyer · T tuzak/duvak." },
            { k: "Envanter", t: "📦 düğmesiyle envanteri aç, eşyanı kuşan." },
          ],
    },
    {
      key: "amac",
      title: "Amaç & Bölüm",
      items: [
        { t: "Kapkaranlık labirentte fenerinle yolunu bul." },
        { k: "Çıkış kilidi", t: "Çıkış önce KİLİTLİ. En az 1 gelini yok edince açılır." },
        { k: "Bölüm geç", t: "Yeşil parlayan kapıya ulaş → sonraki bölüm. Yalnız Kaçış'ta 10 bölüm." },
      ],
    },
    {
      key: "gelinler",
      title: "Kanlı Gelinler",
      items: [
        { k: "Kanlı Gelin", t: "Klasik avcı. Görünce koşar, asla vazgeçmez; bölümle zekileşir." },
        { k: "Karanlık Gelin", t: "Işıkta yavaş, karanlıkta hızlanır. Karanlıkta gözleri kırmızı parlar." },
        { k: "Mukus Gelini", t: "Öldüğünde 10 sn zehirli yeşil leke bırakır; üstünden geçme." },
        { k: "Çağıran Gelin", t: "Çığlık atıp yakındaki uyuyan gelinleri uyandırır, sürü çeker." },
        { k: "Bölünen Gelin", t: "Öldürünce iki hızlı yavruya bölünür. Köşede sıkışma." },
        { k: "Duvar Aşan Gelin", t: "Duvarların içinden yavaşça süzülür; labirent durduramaz." },
        { k: "Kraliçe Gelin", t: "Dev boss, birkaç bölümde bir. Taçlı, kızıl auralı, çok tehlikeli." },
      ],
    },
    {
      key: "can",
      title: "Can & Ölüm",
      items: [
        { k: "3 can", t: "Gelin teması can barını düşürür. Bar bitince bir can gider." },
        { k: "Yeniden doğuş", t: "Ölünce bölüm başında kısa dokunulmazlıkla doğarsın." },
        { k: "Kalp atışı", t: "Karanlıkta kalbin hızlanır — yakında gelin var demektir." },
      ],
    },
    {
      key: "mermi",
      title: "Mermi & Ateş",
      items: [
        { k: "Sınırlı mermi", t: "Yerdeki parlayan mermileri topla; boşa harcama." },
        { k: "Ses çeker", t: "Ateş sesi gelinleri üstüne çeker." },
        { k: "Geri doğar", t: "Toplanan mermi 10 sn sonra yerinde geri belirir." },
      ],
    },
    {
      key: "para",
      title: "Dükkân & Para",
      items: [
        { k: "Altın kazan", t: "Gelin öldürünce ve bölüm geçince altın kazanırsın." },
        { k: "Dükkân", t: "🛒 Dükkân'dan kalkan, radar, tuzak, ekstra can, kalıcı geliştirme ve kozmetik al." },
        { k: "Her yerde geçerli", t: "Aldığın eşya tüm modlarda ve bölümlerde kullanılır." },
      ],
    },
    {
      key: "envanter",
      title: "Envanter",
      items: [
        { k: "Kalkan", t: "Kısa süre dokunulmazlık — sıkıştığında kullan." },
        { k: "Radar", t: "Çıkış yönünü bir kez ok olarak gösterir." },
        { k: "Tuzak", t: "Yere koy; üstünden geçen gelin bir süre yavaşlar (durdurmaz)." },
        { t: "Eşyanı 📦 envanterden kuşanıp istediğin an tetikle." },
      ],
    },
    {
      key: "duvak",
      title: "Duvak (Görünmezlik)",
      items: [
        { k: "Duvak eşyası", t: "Yerde bulursun; alınca 5 sn görünmez olursun." },
        { k: "Gizlen", t: "Görünmezken gelinler seni göremez — köşeden sıvış." },
        { k: "Dikkat", t: "Ateş edersen görünmezlik anında bozulur." },
      ],
    },
    {
      key: "firsat",
      title: "Fırsatlar (Yüzük, Ayna, Çan…)",
      items: [
        { t: "Bölümlerde ara sıra opsiyonel 'Fırsat' hedefleri çıkar. Çıkışı geciktirmez." },
        { k: "Yüzük", t: "Ekstra para verir — ama bir gelini çıldırtıp hızlandırır." },
        { k: "Ayna", t: "Kehanet: birkaç sn beklersen çıkış yönünü gösterir." },
        { k: "Çan", t: "Tüm gelinleri çana çeker — tuzak kurmak için birebir." },
        { k: "Mumlar / Kan izi", t: "Mumları yak ya da doğru kan izini takip et → ödül." },
      ],
    },
    {
      key: "yaris",
      title: "Ölüm Koşusu (Online)",
      items: [
        { t: "2-6 kişi aynı labirentte yarışır; ilk çıkan bölümü kazanır, puan birikir." },
        { k: "Bariyer", t: "Bölüm başına 3 hakkın var; koyduğun bariyer rakibin yolunu kapar, bir atışla yıkılır." },
        { k: "Dükkân", t: "Turlar arası 🛒 ile kazandığın parayla eşya al." },
        { k: "Ölüm", t: "Can barın bitince başta güvenle doğarsın; yarış sürer." },
      ],
    },
  ];
  const openTopic = topic ? helpTopics.find((h) => h.key === topic) : null;

  return (
    <div className="mm-root">
      <style>{MM_CSS}</style>
      <canvas ref={gameRef} className="mm-game" />
      <div className="mm-scrim" />
      <canvas ref={grainRef} className="mm-grain" />
      <div className="mm-vignette" />

      {/* Sağ üstte küçük kare arkadaşlar butonu (çevrimiçi sayısı rozetli) */}
      <button className="mm-friends" onClick={onFriends} title="Arkadaşlarım" aria-label="Arkadaşlarım">
        <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="9" cy="8" r="3.2" />
          <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
          <circle cx="17" cy="8.5" r="2.4" />
          <path d="M15.5 14.2A4.6 4.6 0 0 1 20.5 18.5" />
        </svg>
        {friendsOnline > 0 && <span className="mm-friends-badge">{friendsOnline}</span>}
      </button>

      <div className="mm-wrap">
        <h1 className="mm-title">
          BLACK<span className="mm-o">O</span>UT
        </h1>
        <div className="mm-sub">Karanlıkta Kaçış</div>

        <nav className="mm-menu">
          {primary.map((it, i) => (
            <div
              key={it.label}
              className={"mm-item mm-in" + (it.icon ? " mm-item-mp" : "")}
              style={{ animationDelay: `${1.1 + i * 0.12}s` }}
              onClick={it.onClick}
            >
              {it.icon}
              {it.label}
            </div>
          ))}
        </nav>

        <div className="mm-secondary">
          {secondary.map((it) => (
            <button key={it.label} className="mm-schip" onClick={it.onClick}>
              <Icon name={it.icon} size={15} className="mm-sicon" />
              {it.label}
              {it.note ? (
                <span className="mm-note">
                  {it.coin ? <Icon name="coin" size={12} style={{ margin: "0 2px -2px 0" }} /> : " "}
                  {it.note}
                </span>
              ) : null}
            </button>
          ))}
        </div>

        <div className="mm-foot">
          <button onClick={() => { setTopic(null); setModal(true); }}>Nasıl Oynanır</button>
          <button onClick={onSettings}>Ayarlar</button>
        </div>

        <div className="mm-lore">
          Bir düğün vardı… kimse ondan sağ dönmedi.{" "}
          <span className="mm-r">Kanlı gelinler</span> hâlâ damadını arıyor.
        </div>
      </div>

      <div
        className={"mm-modal" + (modal ? " open" : "")}
        onClick={(e) => { if ((e.target as HTMLElement).classList.contains("mm-modal")) setModal(false); }}
      >
        <div className="mm-card">
          <span className="mm-close" onClick={() => setModal(false)}>✕</span>
          {openTopic ? (
            <>
              <button className="mm-help-back" onClick={() => setTopic(null)}>← Geri</button>
              <h2>{openTopic.title}</h2>
              <ul className="mm-help-detail">
                {openTopic.items.map((it, i) => (
                  <li key={i}>{it.k ? <b>{it.k}</b> : null}{it.k ? " — " : ""}{it.t}</li>
                ))}
              </ul>
            </>
          ) : (
            <>
              <h2>Nasıl Oynanır</h2>
              <p className="mm-help-lead">Merak ettiğin konuya dokun:</p>
              <div className="mm-help-grid">
                {helpTopics.map((h) => (
                  <button key={h.key} className="mm-help-topic" onClick={() => setTopic(h.key)}>
                    {h.title}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

const MM_CSS = `
.mm-root{position:fixed;inset:0;overflow-y:auto;overflow-x:hidden;-webkit-overflow-scrolling:touch;background:#000;font-family:'EB Garamond',Georgia,serif;color:#e4ddce;z-index:0;}
.mm-game{position:fixed;inset:0;width:100%;height:100%;z-index:0;}
.mm-grain{position:fixed;inset:0;width:100%;height:100%;z-index:2;opacity:.05;mix-blend-mode:overlay;pointer-events:none;}
.mm-scrim{position:fixed;inset:0;z-index:1;pointer-events:none;background:radial-gradient(closest-side 46vw 44vh at 50% 46%, rgba(4,3,3,.82), rgba(4,3,3,.5) 55%, rgba(4,3,3,0) 100%);}
.mm-vignette{position:fixed;inset:0;z-index:3;pointer-events:none;background:radial-gradient(130% 120% at 50% 50%, transparent 42%, rgba(40,8,8,.5) 82%, rgba(20,3,3,.85) 100%);box-shadow:inset 0 0 260px 120px #000;animation:mm-beat 3.4s ease-in-out infinite;}
@keyframes mm-beat{0%,100%{box-shadow:inset 0 0 260px 120px #000;}50%{box-shadow:inset 0 0 300px 140px #000;}}
.mm-wrap{position:relative;z-index:5;min-height:100dvh;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:44px 20px 48px;}
.mm-title{font-family:'Cinzel',serif;font-weight:800;font-size:clamp(52px,9vw,116px);letter-spacing:.2em;color:#efe7d6;text-shadow:0 0 30px rgba(0,0,0,.9),0 0 40px rgba(209,26,26,.35),0 0 80px rgba(139,13,13,.3);opacity:0;animation:mm-titleIn 1s ease-out .15s forwards, mm-flicker 7s 1.2s infinite steps(1);}
.mm-title .mm-o{display:inline-block;color:#fff;text-shadow:0 0 14px #ffd27a,0 0 32px #ff8a3a,0 0 58px #d11a1a;animation:mm-flame .12s infinite alternate;}
@keyframes mm-titleIn{from{opacity:0;letter-spacing:.5em;filter:blur(10px);}to{opacity:1;letter-spacing:.2em;filter:blur(0);}}
@keyframes mm-flame{from{opacity:.85;}to{opacity:1;}}
@keyframes mm-flicker{0%,18%,20%,54%,56%,100%{opacity:1;}19%{opacity:.55;}55%{opacity:.7;}81%{opacity:.4;}82%{opacity:1;}}
.mm-sub{margin-top:22px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.6em;color:#6f695d;text-transform:uppercase;opacity:0;animation:mm-fade .9s ease-out .9s forwards;text-shadow:0 0 10px #000;}
.mm-menu{margin-top:54px;display:flex;flex-direction:column;align-items:center;gap:20px;}
.mm-item{font-family:'Cinzel',serif;font-weight:400;font-size:clamp(17px,2.4vw,21px);letter-spacing:.22em;color:#a49d8e;cursor:pointer;position:relative;padding:13px 46px;min-width:min(320px,84vw);text-align:center;border-radius:8px;background:rgba(255,255,255,.015);border:1px solid rgba(200,180,150,.06);transition:color .25s,background .25s,border-color .25s,text-shadow .25s;opacity:0;transform:translateY(8px);text-shadow:0 0 12px #000,0 0 24px #000;}
.mm-item.mm-in{animation:mm-fade .7s ease-out forwards;}
.mm-item::after{content:"";position:absolute;left:50%;bottom:7px;width:0;height:1px;background:#d11a1a;transform:translateX(-50%);transition:width .3s;box-shadow:0 0 6px #d11a1a;}
.mm-item:hover{color:#fff;background:rgba(209,26,26,.07);border-color:rgba(209,26,26,.4);text-shadow:0 0 18px rgba(209,26,26,.6),0 0 6px #000;}
.mm-item:hover::after{width:56%;}
.mm-item-mp{display:inline-flex;align-items:center;justify-content:center;gap:13px;}
.mm-mp{fill:currentColor;opacity:.9;filter:drop-shadow(0 0 8px rgba(209,26,26,.4));flex:none;}
.mm-secondary{margin-top:38px;display:flex;flex-wrap:wrap;justify-content:center;gap:10px 12px;opacity:0;animation:mm-fade 1s ease-out 1.7s forwards;}
.mm-schip{display:inline-flex;align-items:center;gap:8px;background:rgba(255,255,255,.015);border:1px solid rgba(200,180,150,.08);border-radius:6px;font-family:'Cinzel',serif;font-size:12.5px;letter-spacing:.16em;color:#8a8474;cursor:pointer;text-transform:uppercase;transition:color .25s,background .25s,border-color .25s;text-shadow:0 0 10px #000;padding:9px 15px;}
.mm-schip:hover{color:#e0a24a;background:rgba(224,162,74,.07);border-color:rgba(224,162,74,.4);}
.mm-sicon{font-size:15px;line-height:1;}
.mm-note{color:#6f695d;letter-spacing:.05em;}
.mm-lore{position:relative;z-index:5;margin-top:30px;pointer-events:none;width:min(620px,86vw);text-align:center;font-style:italic;font-size:15px;line-height:1.75;color:#8f8776;letter-spacing:.03em;text-shadow:0 0 14px #000,0 0 30px rgba(139,13,13,.25);opacity:0;animation:mm-loreIn 1.6s ease-out 2s forwards, mm-lorePulse 6s 3.6s ease-in-out infinite;}
.mm-lore::before,.mm-lore::after{content:"";display:block;width:44px;height:1px;margin:0 auto;background:linear-gradient(90deg,transparent,rgba(209,26,26,.5),transparent);}
.mm-lore::before{margin-bottom:14px;}.mm-lore::after{margin-top:14px;}
.mm-lore .mm-r{color:#c86b4a;}
@keyframes mm-loreIn{to{opacity:.9;}}
@keyframes mm-lorePulse{0%,100%{opacity:.62;}50%{opacity:.92;}}
.mm-foot{position:relative;z-index:5;margin-top:34px;display:flex;justify-content:center;gap:14px;flex-wrap:wrap;opacity:0;animation:mm-fade 1s ease-out 1.6s forwards;}
.mm-foot button{background:rgba(255,255,255,.02);border:1px solid rgba(200,180,150,.16);border-radius:6px;padding:10px 22px;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.24em;color:#8a8474;cursor:pointer;text-transform:uppercase;transition:color .25s,background .25s,border-color .25s;text-shadow:0 0 10px #000;}
.mm-foot button:hover{color:#e0a24a;background:rgba(224,162,74,.07);border-color:rgba(224,162,74,.42);}
.mm-friends{position:fixed;top:14px;right:14px;z-index:8;width:46px;height:46px;border-radius:10px;display:flex;align-items:center;justify-content:center;background:rgba(20,15,13,.7);border:1px solid rgba(206,186,156,.28);color:#c9bfa8;cursor:pointer;backdrop-filter:blur(3px);transition:color .2s,border-color .2s,background .2s;}
.mm-friends:hover{color:#e0a24a;border-color:rgba(224,162,74,.5);background:rgba(30,22,18,.85);}
.mm-friends-badge{position:absolute;top:-5px;right:-5px;min-width:18px;height:18px;padding:0 4px;border-radius:9px;background:#2e9e5b;color:#fff;font-size:11px;font-weight:800;display:flex;align-items:center;justify-content:center;font-family:system-ui,sans-serif;box-shadow:0 0 0 2px #0a0807;}
/* Mobilde buton çerçeveleri daha belirgin + hafif dolgu (göze net görünsün) */
@media (max-width:640px){
  .mm-item{border-color:rgba(206,186,156,.28);background:rgba(255,255,255,.035);}
  .mm-schip{border-color:rgba(206,186,156,.32);background:rgba(255,255,255,.035);}
  .mm-foot button{border-color:rgba(206,186,156,.32);background:rgba(255,255,255,.035);}
}
@keyframes mm-fade{to{opacity:1;transform:none;}}
.mm-modal{position:fixed;inset:0;z-index:20;display:flex;align-items:center;justify-content:center;background:rgba(0,0,0,.74);backdrop-filter:blur(4px);opacity:0;pointer-events:none;transition:opacity .35s;}
.mm-modal.open{opacity:1;pointer-events:auto;}
.mm-card{width:min(540px,90vw);max-height:86vh;overflow-y:auto;background:linear-gradient(180deg,rgba(18,14,12,.98),rgba(10,8,7,.98));border:1px solid rgba(120,110,95,.2);border-top:2px solid #d11a1a;padding:34px 38px;position:relative;transform:translateY(16px) scale(.98);transition:transform .35s;box-shadow:0 30px 90px rgba(0,0,0,.7);}
.mm-card::-webkit-scrollbar{width:8px;}
.mm-card::-webkit-scrollbar-thumb{background:rgba(150,40,40,.4);border-radius:4px;}
.mm-modal.open .mm-card{transform:none;}
.mm-card h2{font-family:'Cinzel',serif;font-size:15px;letter-spacing:.3em;text-transform:uppercase;color:#e0a24a;margin-bottom:18px;text-align:center;}
.mm-card h3{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.24em;text-transform:uppercase;color:#c86b4a;margin:22px 0 12px;text-align:center;border-top:1px solid rgba(120,110,95,.16);padding-top:18px;}
.mm-intro{font-size:14.5px;color:#9b9484;line-height:1.66;margin:0 0 18px;font-style:italic;}
.mm-intro b{color:#c86b4a;font-style:normal;}
.mm-tip{font-size:14px;color:#8f8776;line-height:1.6;margin:16px 0 0;padding-top:14px;border-top:1px solid rgba(120,110,95,.16);}
.mm-tip b{color:#e0a24a;}
.mm-card ul{list-style:none;display:grid;gap:11px;margin:0;padding:0;}
.mm-card li{font-size:15.5px;color:#a9a294;line-height:1.5;padding-left:18px;position:relative;}
.mm-card li::before{content:"›";position:absolute;left:0;color:#d11a1a;font-weight:700;}
.mm-card li b{color:#e4ddce;font-weight:500;}
.mm-brides li{font-size:14.5px;line-height:1.55;}
.mm-brides li::before{content:"✦";color:#c86b4a;}
.mm-brides li b{color:#efc987;}
/* Nasıl Oynanır — konu grid + detay */
.mm-help-lead{font-size:13.5px;color:#8f8776;font-style:italic;margin:0 0 16px;text-align:center;}
.mm-help-grid{display:grid;grid-template-columns:1fr 1fr;gap:9px;}
.mm-help-topic{font-family:'Cinzel',serif;font-size:13px;letter-spacing:.06em;color:#c9bfa8;background:rgba(255,255,255,.025);border:1px solid rgba(206,186,156,.2);border-radius:7px;padding:13px 12px;cursor:pointer;text-align:center;line-height:1.3;transition:color .2s,background .2s,border-color .2s;}
.mm-help-topic:hover{color:#efc987;background:rgba(224,162,74,.08);border-color:rgba(224,162,74,.45);}
.mm-help-back{display:inline-flex;align-items:center;align-self:flex-start;background:rgba(255,255,255,.03);border:1px solid rgba(206,186,156,.28);border-radius:7px;color:#cabfa8;font-family:'Cinzel',serif;font-size:12px;letter-spacing:.12em;text-transform:uppercase;cursor:pointer;padding:8px 14px;margin-bottom:16px;transition:color .2s,border-color .2s,background .2s;}
.mm-help-back:hover{color:#e0a24a;border-color:rgba(224,162,74,.5);background:rgba(224,162,74,.08);}
.mm-help-detail{list-style:none;display:grid;gap:12px;margin:0;padding:0;}
.mm-help-detail li{font-size:14.5px;color:#a9a294;line-height:1.55;padding-left:16px;position:relative;}
.mm-help-detail li::before{content:"›";position:absolute;left:0;color:#d11a1a;font-weight:700;}
.mm-help-detail li b{color:#efc987;font-weight:600;}
@media (max-width:420px){.mm-help-grid{grid-template-columns:1fr;}}
.mm-card kbd{font-family:'Cinzel',serif;font-size:11px;color:#e4ddce;background:linear-gradient(180deg,#2a211d,#171210);border:1px solid rgba(150,130,110,.3);border-bottom-width:2px;border-radius:4px;padding:2px 8px;margin:0 1px;display:inline-block;}
.mm-close{position:absolute;top:16px;right:20px;font-family:'Cinzel',serif;font-size:20px;color:#6f695d;cursor:pointer;transition:color .2s;line-height:1;}
.mm-close:hover{color:#d11a1a;}
`;
