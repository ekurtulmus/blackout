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
import { drawBride, drawPlayer, drawSword, grime } from "@/lib/sprites";
import { themeFor } from "@/lib/themes";
import { drawDecor, drawWallDecor } from "@/lib/decor";
import { getCoins, addCoins } from "@/lib/coins";
import { getInventory, saveInventory, FLASH_COLORS, SKIN_RINGS, SWORD_COLORS } from "@/lib/inventory";
import { bumpStat } from "@/lib/achievements";
import { TUNING } from "@/lib/config";
import type { Mission } from "@/lib/missions";
import type { GameStatus, Vec } from "@/lib/types";
import Icon, { type IconName } from "@/components/Icon";

export type EndResult = {
  status: GameStatus; // "dead" | "levelclear" | "gameover" | "win"
  level: number;
  score: number;
  lives: number;
  time?: number; // geçen süre (sn) — görev rekoru / sonsuz mod skoru
  coins?: number; // kalıcı cüzdandaki toplam para (senkron sonrası)
  coinsGained?: number; // bu bölümde kazanılan para
  levelClearBonus?: number; // bölüm-geçince bonusu (levelclear ekranında göster)
  // Faz F: başarım koşulları için bölüm özeti
  kills?: number;
  flawless?: boolean; // hasarsız bitti mi
  killedQueen?: boolean;
  hostageRescued?: boolean;
  wasEscape?: boolean;
  crushed?: boolean; // ölüm sebebi: kaçış süresi doldu, çıkış çöktü ("seni buldular" değil)
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
  onNote,
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
  onNote?: (id: number) => void;
}) {
  const theme = themeFor(level, themeSeed); // bu bölümün görsel teması
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const inputExternal = useRef<Input | null>(null);
  // Kuşanılan silah: mermi ↔ kılıç. Ref = oyun döngüsü okur, state = buton görünümü.
  const [weapon, setWeapon] = useState<"gun" | "sword">("gun");
  const weaponRef = useRef<"gun" | "sword">("gun");
  const toggleWeapon = () => {
    const w = weaponRef.current === "gun" ? "sword" : "gun";
    weaponRef.current = w;
    setWeapon(w);
  };
  const [muted, setMuted] = useState(sound.muted);
  const [mq, setMq] = useState(""); // aktif mini-görev HUD metni (Faz 4)
  const [mqToast, setMqToast] = useState(""); // mini-görev tamamlanınca ödül bildirimi
  const mqReportedRef = useRef(false);
  const [coins, setCoins] = useState(0); // para (kalıcı; mount'ta yüklenir)
  const [exitHint, setExitHint] = useState(""); // ayna kehaneti: çıkış yönü
  const [levelNotice, setLevelNotice] = useState(""); // bu bölümün özel uyarısı ("" = yok)
  const [helpOpen, setHelpOpen] = useState(false); // hazırlık/yardım ekranı (oyunu duraklatır)
  const [exitMsg, setExitMsg] = useState(""); // çıkışa tıklayınca kilit sebebi
  const [escapeSec, setEscapeSec] = useState(""); // Faz E: kaçış geri sayımı
  const [soldierState, setSoldierState] = useState<"none" | "rescue" | "escort">("none");
  const [hpBlink, setHpBlink] = useState(false); // can azalınca bar yanıp söner
  const prevHpRef = useRef(PLAYER_MAX_HP);
  // Rehberli 1. bölüm (tutorial) — motordan okunan durum
  const [tut, setTut] = useState({ on: false, hint: "", healthShown: false });
  const [actionsOpen, setActionsOpen] = useState(false); // sağ üst: ? / ses / duraklat menüsü açık mı
  const engineRef = useRef<GameEngine | null>(null);
  const coinSyncRef = useRef(0); // engine.coinsEarned'den kalıcı cüzdana işlenen son değer
  const [invOpen, setInvOpen] = useState(false); // oyun-içi envanter paneli açık mı
  const [invCounts, setInvCounts] = useState({ veils: 0 }); // kullanılabilir eşyalar (yalnız Duvak kaldı)
  // Kuşanılan eşya (slot) — bölümler arası KALICI (localStorage): bölüm geçince slot boşalmasın,
  // biz değiştirene kadar aynı eşya kuşanılı kalsın.
  // Yalnız Duvak kaldı (kalkan/radar/tuzak kaldırıldı) → kuşanılabilir tek eşya "veil".
  const [equipped, setEquipped] = useState<"veil" | null>(() => {
    try {
      return localStorage.getItem("blackout_equipped") === "veil" ? "veil" : null;
    } catch {
      return null;
    }
  });
  const [stamina, setStamina] = useState(100); // koşma barı (HUD)
  const flashColorRef = useRef<[number, number, number]>([200, 220, 255]);
  const skinRingRef = useRef<string | undefined>(undefined);
  const swordColorRef = useRef(SWORD_COLORS.default); // kuşanılan kılıç rengi
  const [objective, setObjective] = useState(mission?.objectiveHint ?? "");
  const [brief, setBrief] = useState(!!mission); // görev başında brifing göster
  const briefRef = useRef<boolean>(!!mission); // brifing açıkken oyun donar
  const [paused, setPaused] = useState(false);
  const pausedRef = useRef(false);
  const invPausedRef = useRef(false); // envanter paneli açıkken oyunu dondur (tek kişilik)
  const startMission = () => {
    briefRef.current = false;
    setBrief(false);
  };
  const togglePause = () => {
    const v = !pausedRef.current;
    pausedRef.current = v;
    setPaused(v);
    sound.setPaused(v); // duraklatınca TÜM ses dursun, devam edince geri gelsin
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

  // Envanter paneli açık/kapalı → oyun döngüsü donsun/devam etsin (tek kişilik)
  useEffect(() => {
    invPausedRef.current = invOpen;
  }, [invOpen]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Hikâye görevleri (Karanlık Görevler) kendi tasarlanmış kurallarıyla kalır
    // (ör. "Tek Nefes" = tek can). Hayatta kalma modları — Arena / Bitmeyen Gece /
    // Kör Gece / Sürü Gecesi — normal oyun gibi davranır: dükkân eşyaları geçerli.
    const storyMission = !!mission && !mission.arena && !mission.endless;
    // Dükkan askeri: sahipsen (ölene dek) her bölümde yanında bir müttefik doğar.
    // Eskiden `!mission` idi → arena/bitmeyen gecede asker HİÇ çıkmıyordu.
    const hiredSoldier = !storyMission && getInventory().hiredSoldier;
    const engine = new GameEngine(level, score, lives, mission, withPhoto, diff, hiredSoldier);
    engineRef.current = engine;
    // Kiralık asker çizimi için: senin görünüm halka rengin + ismin (çerçeve + üstünde yazı)
    const mySoldierRing = SKIN_RINGS[getInventory().skin] ?? "#7dffb0";
    let mySoldierName = "SEN";
    try { const n = localStorage.getItem("blackout_name"); if (n && n.trim()) mySoldierName = n.trim().slice(0, 10); } catch { /* geç */ }
    setCoins(getCoins()); // kalıcı parayı yükle
    // Envanter (Faz B): başlangıç eşyaları. Eskiden `!mission` idi → Arena/Bitmeyen
    // Gece'de KALICI paketler (sürekli cephane) hiç uygulanmıyordu ("bazı oyunlarda
    // +3 mermiyle başlamıyor"). Artık hayatta kalma modlarında da geçerli.
    if (!storyMission) {
      const inv = getInventory();
      // Rehberli bölümde mermi SENARYODAN gelir (tabancayı bulunca) → permAmmo bonusunu verme.
      if (inv.permAmmo && !engine.tutorial) engine.ammoCount += 3; // KALICI: her bölüm/tur +3
      // Kişiselleştirme: fener rengi + görünüm halkası
      flashColorRef.current = FLASH_COLORS[inv.flashColor] ?? FLASH_COLORS.default;
      skinRingRef.current = SKIN_RINGS[inv.skin];
      swordColorRef.current = SWORD_COLORS[inv.sword] ?? SWORD_COLORS.default;
      setInvCounts({ veils: inv.veils });
    }
    // Bu bölümün özel uyarısı (çember / kaçış / asker) — BÖLÜM BAŞLAMADAN gösterilir
    let notice = "";
    if (engine.escape) {
      notice = "ÇIKIŞ ÇÖKÜYOR! Çıkış baştan açık — geri sayım bitmeden gizli kapıya ulaş, yoksa altında kalırsın.";
    } else if (engine.soldiers.length > 0) {
      notice = "Karanlıkta zincirli asker(ler) var. Yanına git, zincirini çöz — arkanda gelir ve gelinlere ateş eder. Ölürse başka yerde doğar.";
    } else if (!mission && engine.miniQuest?.kind === "markedkill") {
      notice = "⊚ Çıkış KİLİTLİ: işaretli çemberin içinde bir gelin öldürünce açılır.";
    }
    setLevelNotice(notice);
    // Normal bölümde özel uyarı varsa oyunu başlatmadan brifing göster (loop briefRef ile durur)
    if (!mission && notice) {
      briefRef.current = true;
      setHelpOpen(true);
    }
    let fragmentReported = false;
    let noteReported = false;
    const input: Input = {
      up: false,
      down: false,
      left: false,
      right: false,
      fire: false,
      sword: false,
      sprint: false,
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
      // Mobilde (dokunmatik) daha YAKIN kamera: daha az hücre göster → oyuncu/harita büyük görünür.
      const coarse =
        typeof window !== "undefined" && window.matchMedia
          ? window.matchMedia("(pointer: coarse)").matches
          : false;
      const across = coarse
        ? engine.config.visionRadius * 1.4 + 2
        : engine.config.visionRadius * 2 + 2.5;
      TS = Math.max(24, Math.min(coarse ? 62 : 46, minDim / across));
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
        case "Shift":
          input.sprint = down; // Faz C: koşma
          break;
        case "f":
        case "F":
          if (down) toggleWeapon(); // silah değiştir: mermi ↔ kılıç
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

    // PC: SAĞ TIK = silah değiştir (mermi ↔ kılıç). Tarayıcının bağlam menüsü
    // açılmasın diye canvas üzerinde varsayılan davranış engellenir.
    const onCtx = (e: MouseEvent) => {
      e.preventDefault();
      toggleWeapon();
    };
    const cvEl = canvasRef.current;
    cvEl?.addEventListener("contextmenu", onCtx);
    // PC: SOL TIK = kuşanılan silahı kullan (ateş / kılıç savur)
    const onMouseDown = (e: MouseEvent) => { if (e.button === 0) input.fire = true; };
    const onMouseUp = (e: MouseEvent) => { if (e.button === 0) input.fire = false; };
    cvEl?.addEventListener("mousedown", onMouseDown);
    window.addEventListener("mouseup", onMouseUp);

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
    // Ses menüde zaten açıldıysa (buraya gelmek için tıklandı) müziği HEMEN başlat —
    // özellikle Bitmeyen Gece'ye girer girmez müzik çalsın (tuşa basmayı bekleme).
    startAudio();

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
          // Madde 11: tema süsleri — deterministik (zemin süsü / duvar ağacı)
          if (!wall && theme.decor) {
            drawDecor(ctx!, theme, x, y, Math.floor(sx), Math.floor(sy), TS, intensity !== undefined);
          } else if (wall && theme.wallStyle) {
            drawWallDecor(ctx!, theme, x, y, Math.floor(sx), Math.floor(sy), TS, intensity !== undefined);
          }
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

      // --- Rehberli bölüm yer eşyaları (kılıç / tabanca / duvak) — parlayan işaret ---
      if (engine.tutorial) {
        const pulse = 0.6 + 0.4 * Math.sin(engine.time * 4);
        for (const it of engine.tutItems) {
          if (it.taken) continue;
          if (vis.get(it.cell.y * cols + it.cell.x) === undefined) continue;
          const sx = it.cell.x * TS + TS / 2 - camX;
          const sy = it.cell.y * TS + TS / 2 - camY + Math.sin(engine.time * 2) * 2;
          ctx!.save();
          ctx!.translate(sx, sy);
          if (it.kind === "sword") {
            ctx!.shadowColor = "rgba(200,220,255,0.8)"; ctx!.shadowBlur = 10 * pulse;
            ctx!.strokeStyle = "#cfd8e6"; ctx!.lineWidth = Math.max(2, TS * 0.06); ctx!.lineCap = "round";
            ctx!.beginPath(); ctx!.moveTo(-TS * 0.16, TS * 0.16); ctx!.lineTo(TS * 0.16, -TS * 0.16); ctx!.stroke();
            ctx!.strokeStyle = "#8a6b3a"; ctx!.beginPath(); ctx!.moveTo(-TS * 0.2, TS * 0.1); ctx!.lineTo(-TS * 0.08, TS * 0.22); ctx!.stroke();
          } else if (it.kind === "gun") {
            ctx!.shadowColor = "rgba(255,190,90,0.7)"; ctx!.shadowBlur = 9 * pulse;
            ctx!.fillStyle = "#3a3f47"; ctx!.fillRect(-TS * 0.2, -TS * 0.06, TS * 0.34, TS * 0.1); // namlu
            ctx!.fillRect(-TS * 0.06, -TS * 0.04, TS * 0.09, TS * 0.2); // kabza
          } else {
            ctx!.shadowColor = "rgba(210,225,255,0.8)"; ctx!.shadowBlur = 11 * pulse;
            ctx!.strokeStyle = "rgba(220,232,255," + (0.6 + 0.4 * pulse) + ")"; ctx!.lineWidth = Math.max(1.5, TS * 0.05);
            ctx!.beginPath(); ctx!.arc(0, 0, TS * 0.18, 0, Math.PI * 2); ctx!.stroke();
          }
          ctx!.restore();
        }
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

      // --- Faz F: günlük/not sayfası (soluk kağıt, hafif salınan) ---
      if (engine.noteItem && !engine.noteItem.taken) {
        const n = engine.noteItem;
        if (vis.get(n.cell.y * cols + n.cell.x) !== undefined) {
          const sx = n.cell.x * TS + TS / 2 - camX;
          const sy = n.cell.y * TS + TS / 2 - camY + Math.sin(engine.time * 1.8) * 1.5;
          const w = TS * 0.24, h = TS * 0.3;
          ctx!.save();
          ctx!.shadowColor = "rgba(230,220,180,0.8)";
          ctx!.shadowBlur = 12;
          ctx!.fillStyle = "#e9e0c4"; // kağıt
          ctx!.fillRect(sx - w / 2, sy - h / 2, w, h);
          ctx!.strokeStyle = "rgba(90,80,60,0.6)"; // satırlar
          ctx!.lineWidth = 1;
          for (let i = 1; i <= 3; i++) {
            ctx!.beginPath();
            ctx!.moveTo(sx - w / 2 + w * 0.15, sy - h / 2 + (h * i) / 4);
            ctx!.lineTo(sx + w / 2 - w * 0.15, sy - h / 2 + (h * i) / 4);
            ctx!.stroke();
          }
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

      // --- Mini-görev marker'ları (Faz 4) ---
      if (engine.miniQuest && !engine.mqDone) {
        const q = engine.miniQuest;
        const t = engine.time;
        const cellVisible = (cx: number, cy: number) => vis.get(cy * cols + cx) !== undefined;
        const scr = (cx: number, cy: number) => ({
          sx: cx * TS + TS / 2 - camX,
          sy: cy * TS + TS / 2 - camY,
        });
        // markedkill: işaretli bölge halkası
        if (q.kind === "markedkill" && q.zone) {
          const { sx, sy } = scr(q.zone.x, q.zone.y);
          if (cellVisible(q.zone.x, q.zone.y)) {
            ctx!.save();
            ctx!.strokeStyle = `rgba(255,80,80,${0.5 + 0.25 * Math.sin(t * 3)})`;
            ctx!.lineWidth = 2;
            ctx!.setLineDash([6, 5]);
            ctx!.beginPath();
            ctx!.arc(sx, sy, q.zone.r * TS, 0, Math.PI * 2);
            ctx!.stroke();
            ctx!.restore();
          }
        }
        // sahte kan izleri (bloodtrail decoy) — soluk, parıltısız
        for (const m of q.decoys) {
          if (!cellVisible(m.x, m.y)) continue;
          const { sx, sy } = scr(m.x, m.y);
          ctx!.save();
          ctx!.globalAlpha = 0.5;
          ctx!.fillStyle = "#5a1414";
          ctx!.beginPath();
          ctx!.arc(sx, sy, TS * 0.1, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
        }
        // gerçek marker'lar
        for (const m of q.markers) {
          if (!cellVisible(m.x, m.y)) continue;
          const { sx, sy } = scr(m.x, m.y);
          ctx!.save();
          if (q.kind === "candles") {
            // Mum: koyu şamdan taban + krem gövde + (yanıksa) parlak alev.
            // Mermiden (pirinç dikey çubuk) belirgin biçimde farklı.
            const lit = !!(m.litUntil && m.litUntil > t);
            ctx!.shadowColor = lit ? "rgba(255,170,50,0.95)" : "rgba(90,90,110,0.35)";
            ctx!.shadowBlur = lit ? 16 : 3;
            // şamdan taban (elips)
            ctx!.fillStyle = "#3a3330";
            ctx!.beginPath();
            ctx!.ellipse(sx, sy + TS * 0.17, TS * 0.13, TS * 0.05, 0, 0, Math.PI * 2);
            ctx!.fill();
            // mum gövdesi (silindir; yanıkken daha parlak krem)
            ctx!.fillStyle = lit ? "#f3ead0" : "#a89f8c";
            ctx!.fillRect(sx - TS * 0.06, sy - TS * 0.12, TS * 0.12, TS * 0.29);
            // fitil
            ctx!.fillStyle = "#2a2620";
            ctx!.fillRect(sx - TS * 0.012, sy - TS * 0.17, TS * 0.024, TS * 0.06);
            if (lit) {
              const fl = 0.7 + 0.3 * Math.sin(t * 10 + m.x);
              const grd = ctx!.createRadialGradient(sx, sy - TS * 0.22, 0, sx, sy - TS * 0.22, TS * 0.13);
              grd.addColorStop(0, `rgba(255,242,190,${fl})`);
              grd.addColorStop(0.5, `rgba(255,150,40,${fl * 0.9})`);
              grd.addColorStop(1, "rgba(255,80,0,0)");
              ctx!.fillStyle = grd;
              ctx!.beginPath();
              ctx!.ellipse(sx, sy - TS * 0.22, TS * 0.06, TS * 0.12, 0, 0, Math.PI * 2);
              ctx!.fill();
            }
          } else if (q.kind === "ring") {
            // YÜZÜK: kalın altın halka (delikli) + tepede parlayan taş → "çember/ayna"dan ayrışsın
            ctx!.shadowColor = "rgba(255,215,90,0.9)";
            ctx!.shadowBlur = 12;
            ctx!.strokeStyle = "#ffd75a";
            ctx!.lineWidth = TS * 0.08;
            ctx!.beginPath();
            ctx!.arc(sx, sy + TS * 0.04, TS * 0.13, 0, Math.PI * 2);
            ctx!.stroke();
            ctx!.fillStyle = "#bfe6ff"; // taş (elmas)
            ctx!.beginPath();
            ctx!.moveTo(sx, sy - TS * 0.2);
            ctx!.lineTo(sx + TS * 0.07, sy - TS * 0.11);
            ctx!.lineTo(sx, sy - TS * 0.04);
            ctx!.lineTo(sx - TS * 0.07, sy - TS * 0.11);
            ctx!.closePath();
            ctx!.fill();
          } else if (q.kind === "bell") {
            ctx!.shadowColor = "rgba(210,170,90,0.9)";
            ctx!.shadowBlur = 10;
            ctx!.fillStyle = "#c9a34e";
            ctx!.beginPath();
            ctx!.moveTo(sx, sy - TS * 0.16);
            ctx!.quadraticCurveTo(sx + TS * 0.16, sy, sx + TS * 0.13, sy + TS * 0.12);
            ctx!.lineTo(sx - TS * 0.13, sy + TS * 0.12);
            ctx!.quadraticCurveTo(sx - TS * 0.16, sy, sx, sy - TS * 0.16);
            ctx!.fill();
            ctx!.fillRect(sx - TS * 0.02, sy + TS * 0.12, TS * 0.04, TS * 0.05);
          } else if (q.kind === "bloodtrail") {
            ctx!.shadowColor = "rgba(200,30,30,0.9)";
            ctx!.shadowBlur = 12;
            ctx!.fillStyle = "#a11414";
            ctx!.beginPath();
            ctx!.arc(sx, sy, TS * 0.15 + Math.sin(t * 3) * 1.5, 0, Math.PI * 2);
            ctx!.fill();
          } else if (q.kind === "darkhall") {
            ctx!.shadowColor = "rgba(90,120,255,0.7)";
            ctx!.shadowBlur = 14;
            ctx!.fillStyle = "#0a0a14";
            ctx!.beginPath();
            ctx!.arc(sx, sy, TS * 0.17, 0, Math.PI * 2);
            ctx!.fill();
            ctx!.strokeStyle = "rgba(140,160,255,0.7)";
            ctx!.lineWidth = 2;
            ctx!.stroke();
          } else if (q.kind === "mirror") {
            // AYNA: SAPLI el aynası → yuvarlak cam + altta sap (duvak/yüzükten ayrışsın)
            const armed = engine.miniQuestText().includes("Uzaklaş");
            ctx!.strokeStyle = "#8a6a3a"; // sap
            ctx!.lineWidth = TS * 0.06;
            ctx!.lineCap = "round";
            ctx!.beginPath();
            ctx!.moveTo(sx, sy + TS * 0.06);
            ctx!.lineTo(sx, sy + TS * 0.22);
            ctx!.stroke();
            ctx!.shadowColor = armed ? "rgba(255,60,60,0.9)" : "rgba(180,220,255,0.8)";
            ctx!.shadowBlur = armed ? 16 : 10;
            ctx!.fillStyle = armed ? "#3a2230" : "#b9d6ea";
            ctx!.beginPath();
            ctx!.arc(sx, sy - TS * 0.05, TS * 0.14, 0, Math.PI * 2); // yuvarlak cam
            ctx!.fill();
            ctx!.strokeStyle = "#7a6a52"; // çerçeve
            ctx!.lineWidth = 2;
            ctx!.stroke();
          }
          ctx!.restore();
        }
      }

      // --- Tuzaklar (Faz C): örümcek ağı benzeri; üstteki gelin yavaşlar ---
      for (const tr of engine.traps) {
        if (vis.get(tr.y * cols + tr.x) === undefined) continue;
        const sx = tr.x * TS + TS / 2 - camX;
        const sy = tr.y * TS + TS / 2 - camY;
        const fade = Math.min(1, Math.max(0.3, tr.until - engine.time)); // bitişe yakın soluklaş
        ctx!.save();
        ctx!.globalAlpha = 0.5 + 0.3 * fade;
        ctx!.strokeStyle = "rgba(180,220,235,0.8)";
        ctx!.lineWidth = 1.5;
        const r = TS * 0.36;
        // radyal ipler
        for (let a = 0; a < 8; a++) {
          const ang = (a / 8) * Math.PI * 2;
          ctx!.beginPath();
          ctx!.moveTo(sx, sy);
          ctx!.lineTo(sx + Math.cos(ang) * r, sy + Math.sin(ang) * r);
          ctx!.stroke();
        }
        // konsantrik halkalar
        for (let ring = 1; ring <= 2; ring++) {
          ctx!.beginPath();
          ctx!.arc(sx, sy, (r * ring) / 2.2, 0, Math.PI * 2);
          ctx!.stroke();
        }
        ctx!.restore();
      }

      // --- Askerler: kilitli (zincirli, kurtar!) / escort (silahlı, takip eder) ---
      for (const sd of engine.soldiers) {
        if (sd.state === "dead") continue;
        const sc = { x: Math.floor(sd.pos.x), y: Math.floor(sd.pos.y) };
        if (vis.get(sc.y * cols + sc.x) === undefined) continue;
        const s = worldToScreen(sd.pos.x, sd.pos.y, camX, camY);
        const escort = sd.state === "escort";
        const col = escort ? "#7dffb0" : "#8be9ff";
        ctx!.save();
        ctx!.shadowColor = col;
        ctx!.shadowBlur = escort ? 10 : 14;
        // gövde (asker üniforması koyu yeşil-gri)
        ctx!.fillStyle = "#39423a";
        ctx!.beginPath();
        ctx!.ellipse(s.sx, s.sy + TS * 0.06, TS * 0.2, TS * 0.26, 0, 0, Math.PI * 2);
        ctx!.fill();
        // baş
        ctx!.fillStyle = escort ? "#cfe9d6" : "#cfe0ee";
        ctx!.beginPath();
        ctx!.arc(s.sx, s.sy - TS * 0.16, TS * 0.11, 0, Math.PI * 2);
        ctx!.fill();
        if (escort) {
          // tüfek (namlu ileri)
          ctx!.strokeStyle = "#20242a";
          ctx!.lineWidth = Math.max(2, TS * 0.05);
          ctx!.beginPath();
          ctx!.moveTo(s.sx - TS * 0.05, s.sy);
          ctx!.lineTo(s.sx + TS * 0.28, s.sy - TS * 0.04);
          ctx!.stroke();
          // küçük can barı
          const hpFrac = Math.max(0, Math.min(1, sd.hp / TUNING.soldierMaxHp));
          const bw = TS * 0.44;
          ctx!.fillStyle = "rgba(0,0,0,0.6)";
          ctx!.fillRect(s.sx - bw / 2, s.sy - TS * 0.4, bw, TS * 0.07);
          ctx!.fillStyle = hpFrac > 0.35 ? "#7dffb0" : "#ff9a3c";
          ctx!.fillRect(s.sx - bw / 2, s.sy - TS * 0.4, bw * hpFrac, TS * 0.07);
          // Kiralık asker: SENİN görünüm rengin halka + üstünde ismin (müttefik belli olsun)
          if (sd.hired) {
            ctx!.shadowBlur = 0;
            ctx!.strokeStyle = mySoldierRing;
            ctx!.lineWidth = Math.max(2, TS * 0.06);
            ctx!.beginPath();
            ctx!.arc(s.sx, s.sy, TS * 0.34, 0, Math.PI * 2);
            ctx!.stroke();
            ctx!.fillStyle = mySoldierRing;
            ctx!.font = `700 ${Math.round(TS * 0.24)}px 'Cinzel', serif`;
            ctx!.textAlign = "center";
            ctx!.shadowColor = "#000";
            ctx!.shadowBlur = 4;
            ctx!.fillText(mySoldierName, s.sx, s.sy - TS * 0.5);
          }
        } else {
          // kilit/zincir halkası (kurtar!)
          ctx!.globalAlpha = 0.4 + 0.3 * Math.sin(engine.time * 4);
          ctx!.strokeStyle = col;
          ctx!.lineWidth = 2;
          ctx!.setLineDash([4, 4]);
          ctx!.beginPath();
          ctx!.arc(s.sx, s.sy, TS * 0.4, 0, Math.PI * 2);
          ctx!.stroke();
        }
        ctx!.restore();
      }

      // --- Kanlı Gelinler (türlere göre) ---
      for (const z of engine.zombies) {
        const s = worldToScreen(z.pos.x, z.pos.y, camX, camY);
        if (s.sx < -TS * 2 || s.sy < -TS * 2 || s.sx > cssW + TS * 2 || s.sy > cssH + TS * 2) continue;
        const zc = { x: Math.floor(z.pos.x), y: Math.floor(z.pos.y) };
        const visible = vis.get(zc.y * cols + zc.x) !== undefined;
        // climber/queen görüş dışında da (duvarda/karanlıkta) hafifçe belli olur
        const ghost = z.kind === "climber" || z.kind === "queen";
        if (!visible && !ghost) continue;
        const lean = engine.player.pos.x < z.pos.x ? -1 : 1;
        const scale = z.scale ?? 1; // kraliçe büyük, bölünen yavru küçük
        ctx!.save();
        if (!visible) ctx!.globalAlpha = 0.5; // karanlıktaki tırmanan/kraliçe soluk
        drawBride(ctx!, TS * scale, s.sx, s.sy, engine.time, z.id, z.aware, lean);
        ctx!.restore();

        // Kraliçe: uzaktan fark edilen kızıl aura + taç + can pip'leri
        if (z.kind === "queen") {
          const r = TS * scale * 0.42;
          // aura (uzaktan bile görünür)
          ctx!.save();
          const aura = ctx!.createRadialGradient(s.sx, s.sy, r * 0.5, s.sx, s.sy, r * 2.4);
          const ap = 0.28 + 0.12 * Math.sin(engine.time * 3);
          aura.addColorStop(0, `rgba(180,20,40,${ap})`);
          aura.addColorStop(1, "rgba(180,20,40,0)");
          ctx!.fillStyle = aura;
          ctx!.beginPath();
          ctx!.arc(s.sx, s.sy, r * 2.4, 0, Math.PI * 2);
          ctx!.fill();
          ctx!.restore();
          ctx!.save();
          ctx!.fillStyle = "#ffd75a";
          ctx!.shadowColor = "rgba(255,215,90,0.9)";
          ctx!.shadowBlur = 10;
          // basit taç (üç sivri)
          ctx!.beginPath();
          const cyTop = s.sy - r * 1.15;
          ctx!.moveTo(s.sx - r * 0.6, cyTop);
          ctx!.lineTo(s.sx - r * 0.6, cyTop - r * 0.35);
          ctx!.lineTo(s.sx - r * 0.3, cyTop - r * 0.1);
          ctx!.lineTo(s.sx, cyTop - r * 0.45);
          ctx!.lineTo(s.sx + r * 0.3, cyTop - r * 0.1);
          ctx!.lineTo(s.sx + r * 0.6, cyTop - r * 0.35);
          ctx!.lineTo(s.sx + r * 0.6, cyTop);
          ctx!.closePath();
          ctx!.fill();
          // can pip'leri
          const mx = z.maxHp ?? TUNING.queenHp;
          const pw = TS * 0.12;
          const total = mx * pw + (mx - 1) * 3;
          for (let i = 0; i < mx; i++) {
            ctx!.fillStyle = i < z.hp ? "#ff5a5a" : "rgba(120,120,120,0.5)";
            ctx!.fillRect(s.sx - total / 2 + i * (pw + 3), s.sy - r * 1.6, pw, pw * 0.5);
          }
          ctx!.restore();
        }

        // Caller: çığlık anında ÇOK BELİRGİN — parlayan kızıl aura + kalın genişleyen
        // ses halkaları + titreşim + "çığlık" işareti. Karanlıkta bile fark edilir.
        if (z.kind === "caller" && z.screamT && z.screamT > 0) {
          const t = z.screamT / 0.7; // 1 → 0
          const prog = 1 - t;
          ctx!.save();
          // 1) nabız gibi kızıl aura (uzaktan bile göze çarpar)
          const ar = TS * (1.4 + prog * 1.6);
          const aura = ctx!.createRadialGradient(s.sx, s.sy, TS * 0.3, s.sx, s.sy, ar);
          aura.addColorStop(0, `rgba(255,40,90,${0.42 * t})`);
          aura.addColorStop(1, "rgba(255,40,90,0)");
          ctx!.fillStyle = aura;
          ctx!.beginPath();
          ctx!.arc(s.sx, s.sy, ar, 0, Math.PI * 2);
          ctx!.fill();
          // 2) kalın, parlayan genişleyen halkalar (4 dalga)
          ctx!.shadowColor = "rgba(255,60,110,0.9)";
          ctx!.shadowBlur = 12;
          ctx!.lineWidth = 3.5;
          for (let k = 0; k < 4; k++) {
            const rr = TS * (0.5 + prog * 3 + k * 0.5);
            ctx!.globalAlpha = Math.max(0, t - k * 0.12);
            ctx!.strokeStyle = "rgba(255,70,120,0.95)";
            ctx!.beginPath();
            ctx!.arc(s.sx, s.sy, rr, 0, Math.PI * 2);
            ctx!.stroke();
          }
          // 3) baş üstünde titreyen çığlık işareti (!)
          ctx!.globalAlpha = t;
          ctx!.shadowBlur = 8;
          ctx!.fillStyle = "#ffd0dc";
          ctx!.font = `900 ${Math.round(TS * 0.6)}px 'Cinzel', serif`;
          ctx!.textAlign = "center";
          const jitter = Math.sin(engine.time * 40) * TS * 0.06;
          ctx!.fillText("!", s.sx + jitter, s.sy - TS * 0.9);
          ctx!.restore();
        }
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
      drawPlayer(ctx!, TS, cssW / 2, cssH / 2, p.dir, engine.time, engine.playerMoving, flicker, vEff, {
        coneColor: flashColorRef.current,
        ring: engine.invuln ? "#6ee7ff" : skinRingRef.current,
      });
      // KILIÇ: kuşanılıysa elde HEP görünür (savururken yay çizer)
      if (weaponRef.current === "sword") {
        const sw = swordColorRef.current;
        drawSword(
          ctx!, TS, cssW / 2, cssH / 2, p.dir, sw.blade, sw.glow,
          Math.max(0, engine.swordSwing / TUNING.swordSwingSec)
        );
      } else {
        // TABANCA: kuşanılıysa elde küçük namlu görünür (silah kullanıldığı belli olsun)
        ctx!.save();
        ctx!.translate(cssW / 2, cssH / 2);
        ctx!.rotate(Math.atan2(p.dir.y, p.dir.x));
        ctx!.fillStyle = "#41474f";
        ctx!.fillRect(TS * 0.12, -TS * 0.055, TS * 0.36, TS * 0.11); // namlu (ileri)
        ctx!.fillStyle = "#2b2f36";
        ctx!.fillRect(TS * 0.14, TS * 0.02, TS * 0.1, TS * 0.16); // kabza
        ctx!.restore();
      }
      // Kalkan (dokunulmazlık) halkası
      if (engine.invuln) {
        ctx!.save();
        ctx!.globalAlpha = 0.35 + 0.2 * Math.sin(engine.time * 8);
        ctx!.strokeStyle = "rgba(120,220,255,0.9)";
        ctx!.lineWidth = 2.5;
        ctx!.beginPath();
        ctx!.arc(cssW / 2, cssH / 2, TS * 0.55, 0, Math.PI * 2);
        ctx!.stroke();
        ctx!.restore();
      }
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

      // --- Gerilim: göremediğin kenarlar KIZARMAZ, daha da KARARIR (kırmızı alarm yok) ---
      if (engine.tension > 0.35) {
        const dark = Math.min(0.45, (engine.tension - 0.35) * 0.55);
        const dv = ctx!.createRadialGradient(
          cssW / 2,
          cssH / 2,
          Math.min(cssW, cssH) * 0.25,
          cssW / 2,
          cssH / 2,
          Math.min(cssW, cssH) * 0.6
        );
        dv.addColorStop(0, "rgba(0,0,0,0)");
        dv.addColorStop(1, `rgba(2,2,3,${dark})`);
        ctx!.fillStyle = dv;
        ctx!.fillRect(0, 0, cssW, cssH);
      }
      // Hasar anı: KISA kırmızı flaş (kalıcı alarm değil, "vuruldum" geri bildirimi)
      if (engine.hurtFlash > 0) {
        ctx!.fillStyle = `rgba(150,10,10,${Math.min(0.32, engine.hurtFlash * 0.9)})`;
        ctx!.fillRect(0, 0, cssW, cssH);
      }

      // --- Madde 10: rastgele korku efektleri (görsel, HASARSIZ) ---
      drawScareFx(engine.scares.fx, engine.time, cssW, cssH);

      // --- Faz E: kaçış — süre azaldıkça kırmızı nabız (aciliyet) ---
      if (engine.escape) {
        const rem = engine.escapeTime - engine.time;
        if (rem < 12) {
          const it = Math.max(0, 1 - rem / 12);
          const pulse = 0.12 + 0.28 * it * (0.5 + 0.5 * Math.sin(engine.time * (4 + it * 7)));
          const g = ctx!.createRadialGradient(cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.28, cssW / 2, cssH / 2, Math.min(cssW, cssH) * 0.72);
          g.addColorStop(0, "rgba(150,0,0,0)");
          g.addColorStop(1, `rgba(150,0,0,${pulse})`);
          ctx!.fillStyle = g;
          ctx!.fillRect(0, 0, cssW, cssH);
        }
      }

      // --- Radar oku: 1.5 sn çıkışa dönük parlak ok (metin yok) ---
      if (engine.radarUntil > engine.time) {
        const rem = engine.radarUntil - engine.time;
        const a = Math.min(1, rem / 1.5);
        const ang = engine.radarAngle;
        const cx = cssW / 2, cy = cssH / 2;
        const pulse = 1 + 0.12 * Math.sin(engine.time * 12);
        const dist = TS * (2.1 + 0.25 * Math.sin(engine.time * 6));
        const ax = cx + Math.cos(ang) * dist;
        const ay = cy + Math.sin(ang) * dist;
        ctx!.save();
        ctx!.globalAlpha = a;
        // oyuncudan oka doğru soluk iz
        const trail = ctx!.createLinearGradient(cx, cy, ax, ay);
        trail.addColorStop(0, "rgba(120,220,255,0)");
        trail.addColorStop(1, "rgba(120,220,255,0.5)");
        ctx!.strokeStyle = trail;
        ctx!.lineWidth = 3;
        ctx!.beginPath();
        ctx!.moveTo(cx, cy);
        ctx!.lineTo(ax, ay);
        ctx!.stroke();
        // ok başı
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
    }

    // Ekran kenarından geçen gölge / fenerin anlık sıçraması (atmosfer)
    function drawScareFx(
      fx: import("@/lib/scares").ScareFx | null,
      time: number,
      cssW: number,
      cssH: number
    ) {
      if (!fx) return;
      const age = Math.min(1, (time - fx.born) / fx.dur); // 0..1
      if (fx.kind === "shadow") {
        const a = Math.sin(age * Math.PI) * 0.6; // gir → çık
        const band = Math.min(cssW, cssH) * 0.3;
        let x = 0,
          y = 0,
          w = cssW,
          h = cssH;
        if (fx.side === 0) {
          w = band;
          x = -band + age * band * 1.6;
        } else if (fx.side === 1) {
          w = band;
          x = cssW - age * band * 1.6;
        } else if (fx.side === 2) {
          h = band;
          y = -band + age * band * 1.6;
        } else {
          h = band;
          y = cssH - age * band * 1.6;
        }
        const horiz = fx.side < 2;
        const g = horiz
          ? ctx!.createLinearGradient(x, 0, x + w, 0)
          : ctx!.createLinearGradient(0, y, 0, y + h);
        const edgeFirst = fx.side === 0 || fx.side === 2;
        g.addColorStop(0, edgeFirst ? `rgba(0,0,0,${a})` : "rgba(0,0,0,0)");
        g.addColorStop(1, edgeFirst ? "rgba(0,0,0,0)" : `rgba(0,0,0,${a})`);
        ctx!.fillStyle = g;
        ctx!.fillRect(x, y, w, h);
      } else {
        // flashjump: kısa beyaz-mavi parlama (fener sıçraması), hızla söner
        const a = (1 - age) * 0.14;
        if (a > 0) {
          ctx!.fillStyle = `rgba(190,210,255,${a})`;
          ctx!.fillRect(0, 0, cssW, cssH);
        }
      }
    }

    function drawExit(
      camX: number,
      camY: number,
      vis: Map<number, number>,
      cols: number
    ) {
      // Çıkışı olmayan modlarda (dayan/endless/arena) kapı çizilmez — amacı yok, yanıltıcı.
      if (mission && (mission.surviveTime || mission.endless || mission.arena)) return;
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
      // Duraklatıldıysa, görev brifingi ya da envanter paneli açıksa dünyayı dondur
      if (pausedRef.current || briefRef.current || invPausedRef.current) {
        last = now;
        raf = requestAnimationFrame(loop);
        return;
      }
      const dt = (now - last) / 1000;
      last = now;
      // SİLAH SEÇİMİ: tek bir saldırı girdisi (Boşluk / ATEŞ butonu) var; kuşanılan
      // silaha göre ya mermi ya kılıç tetiklenir. Kılıç mermi harcamaz.
      const atk = input.fire;
      const useSword = weaponRef.current === "sword";
      input.sword = useSword && atk;
      input.fire = !useSword && atk;
      engine.update(dt, input);
      input.fire = atk; // basılı tutmayı bozma (mobil buton)
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
        // Öldüysen (bir can gitti / oyun bitti) → kiralık askeri kaybet (yeniden alınabilir)
        if (engine.status === "dead" || engine.status === "gameover") {
          const inv = getInventory();
          if (inv.hiredSoldier) { inv.hiredSoldier = false; saveInventory(inv); }
        }
        // Son para senkronu (bölüm bonusu / son öldürmeler kalıcı cüzdana geçsin)
        const finalGain = engine.coinsEarned - coinSyncRef.current;
        const total = finalGain > 0 ? addCoins(finalGain) : getCoins();
        coinSyncRef.current = engine.coinsEarned;
        onEnd({
          status: engine.status,
          level: engine.level,
          score: engine.score,
          lives: engine.lives,
          time: engine.time,
          coins: total,
          coinsGained: engine.coinsEarned,
          levelClearBonus: engine.levelClearBonus,
          kills: engine.zombiesKilled,
          flawless: engine.player.hp >= PLAYER_MAX_HP,
          killedQueen: engine.killedQueen,
          hostageRescued: engine.soldierRescued,
          wasEscape: engine.escape || engine.escapeTime > 0,
          crushed: engine.crushed,
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
      if (engine.tutorial) {
        setTut({ on: true, hint: engine.tutHint, healthShown: engine.tutHealthShown });
        // Senaryo silahı ELE kuşandırır (kılıç/tabanca bulunca kullanıma hazır)
        if (engine.tutEquip) {
          weaponRef.current = engine.tutEquip;
          setWeapon(engine.tutEquip);
          engine.tutEquip = "";
        }
      }
      // Can azaldıysa can barını kısa süre yanıp söndür (fark edilsin)
      const curHp = Math.max(0, engine.player.hp);
      if (curHp < prevHpRef.current - 0.4) {
        setHpBlink(true);
        window.setTimeout(() => setHpBlink(false), 550);
      }
      prevHpRef.current = curHp;
      setStamina(Math.round(engine.stamina)); // koşma barı
      // Kazanılan parayı kalıcı cüzdana işle (gelin/mini-görev/bölüm bonusu)
      const gained = engine.coinsEarned - coinSyncRef.current;
      if (gained > 0) {
        coinSyncRef.current = engine.coinsEarned;
        setCoins(addCoins(gained));
      }
      // Mini-görev (Faz 4): aktif hedef metni + ayna kehaneti yönü
      setMq(engine.miniQuestText());
      setExitHint(engine.exitHintText());
      // Faz E: kaçış geri sayımı + asker durumu
      setEscapeSec(engine.escapeText());
      setSoldierState(
        engine.soldiers.length === 0 ? "none" : engine.hasEscort ? "escort" : "rescue"
      );
      if (engine.mqRewardMsg && !mqReportedRef.current) {
        mqReportedRef.current = true;
        const d = engine.mqDef;
        const bits: string[] = [];
        if (d?.reward.coins) bits.push(`+${d.reward.coins} para`);
        if (d?.reward.ammo) bits.push(`+${d.reward.ammo} mermi`);
        if (d?.reward.health) bits.push(`+${d.reward.health} can`);
        if (d?.reward.score) bits.push(`+${d.reward.score} puan`);
        // Ayna: maddi ödül yok; kehanet yönünü göster
        const suffix = engine.miniQuest?.kind === "mirror" ? `Çıkış → ${engine.mqHintDir}` : bits.join(", ");
        setMqToast(`${engine.mqRewardMsg}${suffix ? " — " + suffix : ""}`);
        window.setTimeout(() => setMqToast(""), 3500);
      }
      // gizli fotoğraf parçası toplandıysa bir kez bildir
      if (engine.photoTaken && !fragmentReported) {
        fragmentReported = true;
        onFragment?.();
      }
      // Faz F: günlük sayfası toplandıysa bir kez bildir + toast
      if (engine.noteTaken && !noteReported) {
        noteReported = true;
        onNote?.(engine.noteId);
        setMqToast("Günlük sayfası bulundu — menüden okuyabilirsin");
        window.setTimeout(() => setMqToast(""), 3500);
      }
    }, 100);

    return () => {
      cancelAnimationFrame(raf);
      window.clearInterval(hudTimer);
      window.removeEventListener("resize", resize);
      cvEl?.removeEventListener("contextmenu", onCtx);
      cvEl?.removeEventListener("mousedown", onMouseDown);
      window.removeEventListener("mouseup", onMouseUp);
      window.removeEventListener("keydown", kd);
      window.removeEventListener("keyup", ku);
      window.removeEventListener("keydown", startAudio);
      window.removeEventListener("pointerdown", startAudio);
      sound.stopAmbient();
      sound.stopGameMusic();
      sound.setPaused(false); // oyundan çıkarken ses motoru askıda kalmasın (menüde sus kalmaz)
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // dokunmatik ateş butonu input referansına yazar (yalnız boolean tuşlar)
  const setFlag = (k: "up" | "down" | "left" | "right" | "fire", v: boolean) => {
    const i = inputExternal.current;
    if (i) i[k] = v;
  };

  // Envanter: duvağı kullan (birkaç sn görünmez ol)
  const useVeil = () => {
    const e = engineRef.current;
    if (!e || e.veiled) return;
    const inv = getInventory();
    if (inv.veils <= 0) return;
    inv.veils -= 1;
    saveInventory(inv);
    e.activateVeil();
    bumpStat("veilUses"); // başarım: use_veil
    setInvCounts({ veils: inv.veils });
  };
  // Slot: kuşanılan eşyayı kullan (kutucuk boşsa envanteri aç). Yalnız Duvak kaldı.
  const SLOT_ICON: Record<"veil", IconName> = { veil: "veil" };
  const equippedCount = equipped === "veil" ? invCounts.veils : 0;
  const useEquipped = () => {
    if (!equipped || equippedCount <= 0) { setInvOpen(true); return; }
    if (equipped === "veil") useVeil();
  };
  // Envanterden bir eşyayı KUŞAN (slot'a koy) — direkt kullanma
  const equip = (kind: "veil") => {
    setEquipped(kind);
    try { localStorage.setItem("blackout_equipped", kind); } catch { /* geç */ }
    setInvOpen(false);
  };

  // ? butonu: hazırlık/yardım ekranını aç (oyunu duraklatır); Devam ile kapat
  const openHelp = () => {
    briefRef.current = true;
    setHelpOpen(true);
  };
  const closeHelp = () => {
    briefRef.current = false;
    setHelpOpen(false);
  };

  const hpPct = (hud.hp / PLAYER_MAX_HP) * 100;
  const hpColor = hpPct > 35 ? "var(--hp)" : "var(--hp-low)";
  // Çıkışı OLMAYAN modlar (dayan / Bitmeyen Gece / Kör Gece / Sürü / Arena): kapı ve
  // "Çıkış" çipi anlamsız → gizlenir. "X sn dayan" görevinde süre GERİYE sayar.
  const noExitMode = !!(mission && (mission.surviveTime || mission.endless || mission.arena));
  const surviveCountdown = !!mission?.surviveTime;
  const shownTime = surviveCountdown ? Math.max(0, Math.ceil(mission!.surviveTime! - hud.time)) : hud.time;
  const mm = Math.floor(shownTime / 60)
    .toString()
    .padStart(2, "0");
  const ss = Math.floor(shownTime % 60)
    .toString()
    .padStart(2, "0");

  return (
    <div className="stage">
      <canvas ref={canvasRef} />

      <div className="hud">
        {/* Sol: bilgi çipleri — durum (can/nefes) önce, sayaçlar sonra, geçici uyarılar en sonda */}
        <div className="hud-info">
          {/* Rehberli bölümde can barı, "3 can" tanıtılana kadar GİZLİ (o ana kadar dokunulmazsın). */}
          {(!tut.on || tut.healthShown) && (
          <div className="chip">
            <div className={"hpbar" + (hpBlink ? " blink" : "")}>
              <div className="hpfill" style={{ width: `${hpPct}%`, background: hpColor }} />
            </div>
            <div className="lives">
              {Array.from({ length: Math.max(3, hud.lives) }, (_, i) => (
                <Icon key={i} name="heart" size={13} fill={i < hud.lives} className={"heart" + (i < hud.lives ? "" : " gone")} />
              ))}
            </div>
          </div>
          )}
          <div className="chip">
            <span className="lbl">Nefes</span>
            <div className="hpbar" style={{ width: 90 }}>
              <div
                className="hpfill"
                style={{ width: `${stamina}%`, background: stamina > 20 ? "#7ec8ff" : "#ff9a3c" }}
              />
            </div>
          </div>
          {!mission && (
            <div className="chip">
              <span className="lbl">Bölüm</span>
              <span className="val">{hud.level}</span>
            </div>
          )}
          {!mission?.noFire && (
            <div className="chip">
              <span className="lbl"><Icon name="ammo" size={14} /></span>
              <span className="val">{hud.ammo}</span>
            </div>
          )}
          {mission && (
            // Bitmeyen Gece/Kör Gece'de süre = SKORUN (uzun dayanmak iyidir) → ayrıca vurgula
            <div className="chip" style={mission.endless ? { borderColor: "rgba(125,255,176,0.6)" } : surviveCountdown ? { borderColor: "rgba(255,150,150,0.6)" } : undefined}>
              <span className="lbl">{mission.endless ? "Dayandığın süre" : surviveCountdown ? "Kalan" : "Süre"}</span>
              <span className="val" style={mission.endless ? { color: "#7dffb0" } : surviveCountdown ? { color: "#ff9a9a" } : undefined}>
                {mm}:{ss}
              </span>
            </div>
          )}
          {!mission && (
            <div className="chip" style={{ borderColor: "rgba(255,205,80,0.6)" }}>
              <span className="lbl"><Icon name="coin" size={14} /></span>
              <span className="val" style={{ color: "#ffd75a" }}>{coins}</span>
            </div>
          )}
          {/* Çıkış durumu = TEK kilit ikonu (yazı yok): kilitliyken kapalı, açıkken açık
              kilit. Çıkışsız modlarda (dayan/endless/arena) hiç gösterilmez. */}
          {!noExitMode && (
          <button
            className="chip is-btn is-icononly"
            style={{ borderColor: hud.exitOpen ? "rgba(125,255,176,0.5)" : "rgba(255,150,150,0.5)", color: hud.exitOpen ? "var(--hp)" : "var(--muted)" }}
            onClick={() => {
              const r = engineRef.current?.exitLockReason() ?? "";
              if (r) {
                setExitMsg(r);
                window.setTimeout(() => setExitMsg(""), 4000);
              }
            }}
            title={hud.exitOpen ? "Çıkış açık" : "Çıkış kilitli — neden?"}
            aria-label={hud.exitOpen ? "Çıkış açık" : "Çıkış kilitli"}
          >
            <Icon name={hud.exitOpen ? "lockOpen" : "lock"} size={17} />
          </button>
          )}
          {/* Endless'ta hedef metni zaten "Süre Xs" → üstteki süre çipiyle aynı, tekrar etme */}
          {mission && !mission.endless && (
            <div className="chip" style={{ borderColor: "rgba(110,231,255,0.6)" }}>
              <span className="lbl"><Icon name="target" size={12} /> Görev</span>
              <span className="val" style={{ color: "#8be9ff" }}>{objective}</span>
            </div>
          )}
          {exitHint && (
            <div className="chip" style={{ borderColor: "rgba(180,220,255,0.6)" }}>
              <span className="lbl"><Icon name="map" size={12} /> Kehanet</span>
              <span className="val" style={{ color: "#bfe0ff" }}>{exitHint}</span>
            </div>
          )}
          {escapeSec && (
            <div className="chip" style={{ borderColor: "rgba(255,90,90,0.8)" }}>
              <span className="lbl"><Icon name="bomb" size={12} /> Çöküyor</span>
              <span className="val" style={{ color: "#ff6b6b", fontWeight: 900 }}>{escapeSec}</span>
            </div>
          )}
          {hud.veil > 0 && (
            <div className="chip" style={{ borderColor: "rgba(215,228,255,0.6)" }}>
              <span className="lbl"><Icon name="veil" size={12} /> Görünmez</span>
              <span className="val" style={{ color: "#d7e4ff" }}>{hud.veil}s</span>
            </div>
          )}
          {mq && !mission && (
            <div className="chip" style={{ borderColor: "rgba(255,200,90,0.6)" }} title="Fırsat görevi">
              <span className="lbl"><Icon name="flame" size={14} /></span>
              <span className="val" style={{ color: "#ffd75a" }}>{mq}</span>
            </div>
          )}
        </div>

        {/* Sağ üst: yardım · ses · duraklat (hep yan yana, aynı sırada) */}
        {/* Sağ üst: tek aşağı-ok → açılınca ? / ses / duraklat (hamburger tarzı) */}
        <div className="hud-actions">
          <button
            className="chip mutebtn"
            onClick={() => setActionsOpen((o) => !o)}
            title="Menü"
            aria-label="Menü"
            style={levelNotice && !actionsOpen ? { borderColor: "rgba(255,200,90,0.7)" } : undefined}
          >
            <Icon name={actionsOpen ? "chevronUp" : "chevronDown"} size={18} />
          </button>
          {actionsOpen && (
            <div className="hud-actions-menu">
              <button
                className="chip mutebtn"
                onClick={() => { openHelp(); setActionsOpen(false); }}
                title="Hedef / kontroller / uyarı"
                style={levelNotice ? { borderColor: "rgba(255,200,90,0.7)" } : undefined}
              >
                <Icon name="help" size={17} />
              </button>
              <button
                className="chip mutebtn"
                onClick={() => {
                  const m = !sound.muted;
                  sound.setMuted(m);
                  setMuted(m);
                }}
                title={muted ? "Sesi aç" : "Sesi kapat"}
              >
                <Icon name={muted ? "mute" : "music"} size={17} />
              </button>
              <button className="chip mutebtn" onClick={() => { togglePause(); setActionsOpen(false); }} title={paused ? "Devam et" : "Duraklat"}>
                <Icon name={paused ? "play" : "pause"} size={17} fill />
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Oyun-içi envanter — masaüstünde sağ-orta, mobilde ortalanmış. Tıkla=KUŞAN */}
      {invOpen && !mission && (
        <div
          className="invbackdrop"
          onClick={(e) => { if (e.target === e.currentTarget) setInvOpen(false); }}
        >
          <div className="invcard">
            <div style={{ fontWeight: 800, color: "#e0a24a", letterSpacing: "0.14em", fontSize: 13, display: "flex", alignItems: "center", gap: 6 }}><Icon name="box" size={18} /> ENVANTER</div>
            <div style={{ fontSize: 12, color: "var(--muted)", marginTop: -4 }}>Kuşan → sonra ateşin yanındaki kutucukla kullan.</div>
            {([
              { kind: "veil", icon: "veil" as IconName, name: "Duvak", n: invCounts.veils, desc: "birkaç sn görünmez ol" },
            ] as const).map((it) => (
              <button
                key={it.kind}
                className="btn"
                disabled={it.n <= 0}
                onClick={() => equip(it.kind)}
                style={{
                  opacity: it.n > 0 ? 1 : 0.4,
                  borderColor: equipped === it.kind ? "rgba(224,162,74,0.8)" : undefined,
                  textAlign: "left",
                }}
              >
                <span style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
                  <Icon name={it.icon} size={16} /> {it.name} ({it.n}) — {it.desc}
                  {equipped === it.kind ? <><Icon name="check" size={14} /> kuşanıldı</> : ""}
                </span>
              </button>
            ))}
            {invCounts.veils <= 0 && (
              <div style={{ fontSize: 12, color: "var(--muted)" }}>
                Boş — dükkândan alabilirsin.
              </div>
            )}
            <button className="btn" onClick={() => setInvOpen(false)} style={{ opacity: 0.7 }}>
              Kapat
            </button>
          </div>
        </div>
      )}

      {/* Rehberli 1. bölüm: alt-ortada büyük ipucu bandı (adım adım öğretir) */}
      {tut.on && tut.hint && (
        <div className="tut-hint">{tut.hint}</div>
      )}

      {(hud.warn || exitMsg) && (
        <div className="warn">
          {exitMsg || engineRef.current?.exitLockReason() || "Çıkış kilitli — önce en az 1 gelini yok et!"}
        </div>
      )}

      {mqToast && (
        <div
          className="warn"
          style={{
            top: hud.warn || exitMsg ? 116 : 64,
            background: "rgba(70,55,15,0.92)",
            border: "1px solid rgba(255,215,90,0.6)",
            color: "#ffe9a8",
            boxShadow: "0 0 30px rgba(255,200,80,0.3)",
          }}
        >
          ✦ {mqToast}
        </div>
      )}

      {helpOpen && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.9)" }}>
          <div className="scr-eyebrow">Hazırlık</div>
          <h2 className="scr-title" style={{ fontSize: "clamp(28px,6vw,44px)" }}>BÖLÜM {hud.level}</h2>
          <div className={"panel" + (levelNotice ? " panel-gold" : "")} style={{ maxWidth: 520, width: "100%", textAlign: "left" }}>
            <p className="panel-p" style={{ fontStyle: "normal", color: levelNotice ? "#ffe9a8" : undefined }}>
              {levelNotice || "Gelinleri yok et, gizli çıkışı bul. Karanlıkta hızlı ol."}
            </p>
            <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--edge)", fontSize: 13.5, color: "var(--ink-2)", lineHeight: 1.8 }}>
              <span style={{ color: "var(--copper)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>Kontroller</span>
              <div style={{ marginTop: 5 }}>
                WASD/ok hareket · Boşluk ateş · <kbd>Shift</kbd> koş · <kbd>E</kbd> tuzak ·{" "}
                <kbd>Q</kbd> kalkan · <kbd>R</kbd> radar · <Icon name="box" size={13} style={{ verticalAlign: "-2px" }} /> envanter
              </div>
            </div>
          </div>
          <button className="btn-primary-x" onClick={closeHelp}>
            {hud.time > 0.1 ? "Devam →" : "Başla →"}
          </button>
        </div>
      )}

      {brief && mission && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.86)" }}>
          {/* Geri: diğer TÜM ekranlarla aynı — sol üst, 46px, yalnız ok ikonu */}
          {onQuit && (
            <button className="shell-icon shell-back" onClick={onQuit} title="Geri" aria-label="Geri">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="scr-eyebrow">
            {mission.endless || mission.arena ? "MOD" : `GÖREV ${mission.id}`}
          </div>
          <h2 className="scr-title" style={{ fontSize: "clamp(30px,7vw,52px)" }}>
            {mission.title}
          </h2>
          <div className="panel panel-blood" style={{ maxWidth: 520, width: "100%", textAlign: "left" }}>
            <p className="panel-p" style={{ fontStyle: "normal" }}>{mission.brief}</p>
            <div style={{ marginTop: 13, paddingTop: 13, borderTop: "1px solid var(--edge)", fontSize: 15 }}>
              <span style={{ color: "var(--copper)", fontWeight: 700, letterSpacing: "0.14em", textTransform: "uppercase", fontSize: 12 }}>Hedef</span>
              <div style={{ marginTop: 5, color: "var(--ink-body)" }}>{mission.objectiveHint}</div>
            </div>
          </div>
          <button className="btn-primary-x" onClick={startMission}>Başla →</button>
        </div>
      )}

      {paused && (
        <div className="screen" style={{ background: "rgba(0,0,0,0.82)" }}>
          {/* Geri: sol üst, 46px ikon (tüm ekranlarla aynı) */}
          {onQuit && (
            <button className="shell-icon shell-back" onClick={onQuit} title="Geri" aria-label="Geri">
              <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </button>
          )}
          <div className="pause-glyph" aria-label="Duraklatıldı"><Icon name="pause" size={54} fill /></div>
          <button className="btn-primary-x" onClick={togglePause}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
            Devam Et
          </button>
        </div>
      )}

      <div className="hint">
        Hareket: <b>WASD / Ok tuşları</b> &nbsp;·&nbsp; Ateş:{" "}
        <b>Boşluk</b>
      </div>

      {/* Dokunmatik kontroller (sadece dokunmatik cihazlarda görünür) */}
      <div className="touch">
        <Joystick
          snap8={!mission?.arena}
          onMove={(x, y) => {
            const i = inputExternal.current;
            if (i) {
              i.ax = x;
              i.ay = y;
            }
          }}
        />
        {/* Saldırı butonu — kuşanılan silaha göre ateş eder ya da kılıç savurur.
            KILIÇ mermi harcamaz → "Sessizlik" (noFire) görevinde bile kullanılabilir,
            o yüzden buton kılıçtayken gizlenmez. */}
        {(!mission?.noFire || weapon === "sword") && (
          <button
            className={"fire" + (weapon === "sword" ? " is-sword" : "")}
            onPointerDown={(e) => {
              e.preventDefault();
              setFlag("fire", true);
            }}
            onPointerUp={() => setFlag("fire", false)}
            onPointerLeave={() => setFlag("fire", false)}
            onPointerCancel={() => setFlag("fire", false)}
          >
            {weapon === "sword" ? "KILIÇ" : "ATEŞ"}
          </button>
        )}
        {/* Ateşin ÜSTÜNDEKİ eylem satırı: silah değiştir + koş YAN YANA.
            İkisi de ayrı ayrı sağ-alta konumlanıyordu (bottom 146 / 148) → üst üste
            biniyorlardı. Tek satırda tutulunca çakışma yapısal olarak imkânsız. */}
        <div className="actionrow">
          <button
            className={"actbtn" + (weapon === "sword" ? " is-sword" : "")}
            onPointerDown={(e) => { e.preventDefault(); toggleWeapon(); }}
            title={weapon === "sword" ? "Silaha geç (F / sağ tık)" : "Kılıca geç (F / sağ tık)"}
            aria-label="Silah değiştir"
          >
            {weapon === "sword" ? <Icon name="ammo" size={18} /> : <Icon name="sword" size={20} />}
          </button>
          <button
            className="actbtn is-sprint"
            onPointerDown={(e) => { e.preventDefault(); const i = inputExternal.current; if (i) i.sprint = true; }}
            onPointerUp={() => { const i = inputExternal.current; if (i) i.sprint = false; }}
            onPointerLeave={() => { const i = inputExternal.current; if (i) i.sprint = false; }}
            onPointerCancel={() => { const i = inputExternal.current; if (i) i.sprint = false; }}
          >
            KOŞ
          </button>
        </div>
      </div>

      {/* Envanteri aç — slotun hemen üstünde */}
      {!mission && (
        <button
          className="invbtn"
          onPointerDown={(e) => e.preventDefault()}
          onClick={() => {
            const inv = getInventory();
            setInvCounts({ veils: inv.veils });
            setInvOpen(true);
          }}
          title="Envanter"
        >
          <Icon name="box" size={18} /> {invCounts.veils}
        </button>
      )}

      {/* Kuşanılan eşya slotu (ateşin solunda; masaüstünde sağ-altta). Tıkla=kullan */}
      {!mission && (
        <button
          className="slotbtn"
          // onPointerDown ile tetikle → joystick basılıyken (2. parmak) da çalışır;
          // onClick mobilde aktif dokunuş varken güvenilir tetiklenmiyordu (hareket+özellik aynı anda).
          onPointerDown={(e) => { e.preventDefault(); useEquipped(); }}
          title={equipped ? "Kuşanılan eşyayı kullan" : "Envanteri aç"}
        >
          {equipped ? (
            <>
              <span className="si"><Icon name={SLOT_ICON[equipped]} size={22} /></span>
              <span className="sc">{equippedCount}</span>
            </>
          ) : (
            <span className="si" style={{ opacity: 0.5 }}>▫</span>
          )}
        </button>
      )}
    </div>
  );
}

// Analog joystick (mobil hareket) — sürükleme yönü + itme miktarı = hız.
// snap8=true → çıkış 8 yöne (yatay/dikey + ÇAPRAZLAR) sabitlenir: labirentte ateş
// kolaylaşsın diye (serbest 360° yerine 45°'lik adımlar). Arena/açık alanda serbest bırakılır.
export function Joystick({ onMove, snap8 = false }: { onMove: (x: number, y: number) => void; snap8?: boolean }) {
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
    const rx = tx / d.r, ry = ty / d.r;
    if (snap8) {
      // Ölü bölge + en yakın 45°'ye sabitle → 8 yön (çaprazlar dahil), serbest 360° değil.
      if (Math.hypot(rx, ry) < 0.3) onMove(0, 0);
      else {
        const step = Math.PI / 4;
        const ang = Math.round(Math.atan2(ry, rx) / step) * step;
        onMove(Math.cos(ang), Math.sin(ang));
      }
    } else {
      onMove(rx, ry);
    }
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
