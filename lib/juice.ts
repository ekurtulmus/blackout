// GAME FEEL ("juice") — her vuruşun, hasarın, toplamanın HİSSEDİLMESİ.
//
// Motor (engine.ts) yalnız "ne oldu, nerede" bilgisini `fx` kuyruğuna yazar;
// bu dosya onu ekran sarsıntısı + kısa donma (hitstop) + parçacık + halka + titreşime çevirir.
// Oyun mantığını DEĞİŞTİRMEZ (hasar/hız/çarpışma aynı) — yalnız his katmanı.
//
// İlkeler:
// - Efekt NETLİĞİ bozmamalı: parçacıklar kısa ömürlü, sayıları tavanlı (MAX_PARTICLES).
// - shadowBlur KULLANILMAZ (düşük-uçlu telefonda en pahalı şey) — parlama "lighter" ile.
// - Sarsıntı "trauma" modeli: etki trauma ekler, sarsıntı trauma² ile ölçeklenir, hızla söner.
//   Böylece küçük olaylar neredeyse hissedilmez, büyükler (kraliçe/ölüm) güçlü hissedilir.
// - "Hareketi azalt" tercihi açıksa sarsıntı kısılır.

export type FxKind =
  | "kill" // gelin öldü (x,y = gelin; dx,dy = vuruş yönü)
  | "hit" // gelin yaralandı ama ölmedi (kraliçe)
  | "spark" // mermi duvara çarptı
  | "hurt" // oyuncu hasar aldı
  | "spot" // bir gelin seni fark etti (x,y = gelin)
  | "shot" // ateş edildi (x,y = oyuncu; dx,dy = yön)
  | "swing" // kılıç savruldu
  | "pickup" // eşya toplandı
  | "door" // çıkış açıldı (x,y = kapı)
  | "death" // oyuncu öldü
  | "clear"; // bölüm bitti

export type Fx = { k: FxKind; x: number; y: number; dx?: number; dy?: number; big?: boolean };

type Particle = {
  x: number; // hücre biriminde (dünya)
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  size: number; // hücre biriminde
  r: number;
  g: number;
  b: number;
  add: boolean; // true = ışıyan (lighter), false = mat (kan)
  drag: number;
};

type Ring = { x: number; y: number; r0: number; r1: number; life: number; max: number; color: string; w: number };

const MAX_PARTICLES = 240;

// --- Titreşim (haptik) — Ayarlar'dan kapatılabilir ---
export const HAPTIC_KEY = "blackout_haptics";
let hapticCache: boolean | null = null;
export function hapticsOn(): boolean {
  if (hapticCache !== null) return hapticCache;
  try {
    hapticCache = localStorage.getItem(HAPTIC_KEY) !== "0";
  } catch {
    hapticCache = true;
  }
  return hapticCache;
}
export function setHaptics(on: boolean) {
  hapticCache = on;
  try {
    localStorage.setItem(HAPTIC_KEY, on ? "1" : "0");
  } catch {
    /* geç */
  }
}
export function buzz(pattern: number | number[]) {
  if (!hapticsOn()) return;
  try {
    if (typeof navigator !== "undefined" && "vibrate" in navigator) navigator.vibrate(pattern);
  } catch {
    /* bazı tarayıcılar izin vermez — sessizce geç */
  }
}

function rnd(a: number, b: number) {
  return a + Math.random() * (b - a);
}

export class Juice {
  trauma = 0; // 0..1 — sarsıntı enerjisi
  hitstop = 0; // saniye — dünyanın kısa süre donması (vuruşun "ağırlığı")
  particles: Particle[] = [];
  rings: Ring[] = [];
  private t = 0;
  private shakeScale = 1;

  constructor() {
    try {
      if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) this.shakeScale = 0.3;
    } catch {
      /* geç */
    }
  }

  private addTrauma(v: number) {
    this.trauma = Math.min(1, this.trauma + v);
  }
  private stop(sec: number) {
    this.hitstop = Math.max(this.hitstop, sec);
  }

  private burst(
    x: number,
    y: number,
    n: number,
    o: {
      dx?: number;
      dy?: number;
      spread?: number; // radyan
      speed: [number, number];
      life: [number, number];
      size: [number, number];
      rgb: [number, number, number];
      add?: boolean;
      drag?: number;
    }
  ) {
    const base = o.dx !== undefined && o.dy !== undefined && (o.dx || o.dy) ? Math.atan2(o.dy, o.dx) : null;
    for (let i = 0; i < n; i++) {
      if (this.particles.length >= MAX_PARTICLES) this.particles.shift();
      const a = base === null ? Math.random() * Math.PI * 2 : base + rnd(-1, 1) * (o.spread ?? 0.9);
      const sp = rnd(o.speed[0], o.speed[1]);
      const life = rnd(o.life[0], o.life[1]);
      const jitter = 0.85 + Math.random() * 0.3;
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life,
        max: life,
        size: rnd(o.size[0], o.size[1]),
        r: Math.min(255, o.rgb[0] * jitter),
        g: Math.min(255, o.rgb[1] * jitter),
        b: Math.min(255, o.rgb[2] * jitter),
        add: !!o.add,
        drag: o.drag ?? 5,
      });
    }
  }

  private ring(x: number, y: number, r1: number, life: number, color: string, w = 2) {
    this.rings.push({ x, y, r0: 0.15, r1, life, max: life, color, w });
  }

  add(fx: Fx) {
    switch (fx.k) {
      case "kill": {
        const big = !!fx.big;
        // Kan: vuruş yönünde savrulan koni (yön okunabilir) + küçük dağınık damlalar
        this.burst(fx.x, fx.y, big ? 26 : 14, {
          dx: fx.dx, dy: fx.dy, spread: 0.75,
          speed: [2.2, big ? 7.5 : 5.5], life: [0.35, 0.7], size: [0.05, big ? 0.14 : 0.1],
          rgb: [170, 18, 14], drag: 6,
        });
        this.burst(fx.x, fx.y, big ? 10 : 5, {
          speed: [0.6, 2.2], life: [0.3, 0.55], size: [0.04, 0.08], rgb: [120, 10, 10], drag: 4,
        });
        // Ruhun çıkışı: soluk, soğuk kıvılcımlar yukarı/dışarı süzülür — "gitti" hissi
        this.burst(fx.x, fx.y, big ? 16 : 7, {
          speed: [0.4, 1.6], life: [0.5, 1.0], size: [0.03, 0.06], rgb: [200, 215, 255], add: true, drag: 1.5,
        });
        this.ring(fx.x, fx.y, big ? 2.2 : 1.1, big ? 0.5 : 0.32, big ? "rgba(255,200,120," : "rgba(220,230,255,", big ? 3 : 2);
        this.addTrauma(big ? 0.75 : 0.32);
        this.stop(big ? 0.14 : 0.055);
        buzz(big ? [45, 35, 90] : 28);
        break;
      }
      case "hit": {
        this.burst(fx.x, fx.y, 8, {
          dx: fx.dx, dy: fx.dy, spread: 0.6,
          speed: [2, 5], life: [0.15, 0.3], size: [0.03, 0.06], rgb: [255, 200, 140], add: true, drag: 7,
        });
        this.addTrauma(0.18);
        this.stop(0.035);
        buzz(14);
        break;
      }
      case "spark": {
        this.burst(fx.x, fx.y, 6, {
          dx: fx.dx !== undefined ? -fx.dx : undefined, dy: fx.dy !== undefined ? -fx.dy : undefined, spread: 1.1,
          speed: [1.5, 4], life: [0.1, 0.25], size: [0.02, 0.045], rgb: [255, 220, 150], add: true, drag: 8,
        });
        break;
      }
      case "spot": {
        // Sarsıntı DEĞİL irkilme: küçük ama keskin; asıl iş ses + gözlerde.
        this.addTrauma(fx.big ? 0.35 : 0.2);
        this.ring(fx.x, fx.y, fx.big ? 1.6 : 0.9, 0.4, "rgba(255,50,35,", 2);
        buzz(fx.big ? [30, 50, 30] : 22);
        break;
      }
      case "hurt": {
        this.addTrauma(0.42);
        buzz(55);
        break;
      }
      case "shot": {
        // Namlu ateşi: yöne doğru kısa sıcak kıvılcım + hafif geri tepme sarsıntısı
        const ox = fx.x + (fx.dx ?? 0) * 0.45;
        const oy = fx.y + (fx.dy ?? 0) * 0.45;
        this.burst(ox, oy, 7, {
          dx: fx.dx, dy: fx.dy, spread: 0.45,
          speed: [2.5, 6], life: [0.06, 0.16], size: [0.03, 0.07], rgb: [255, 225, 160], add: true, drag: 10,
        });
        this.addTrauma(0.12);
        buzz(10);
        break;
      }
      case "swing": {
        this.addTrauma(0.06);
        buzz(8);
        break;
      }
      case "pickup": {
        this.burst(fx.x, fx.y, 10, {
          speed: [0.8, 2.4], life: [0.35, 0.65], size: [0.03, 0.06], rgb: [255, 214, 120], add: true, drag: 3,
        });
        this.ring(fx.x, fx.y, 0.9, 0.35, "rgba(255,214,120,", 2);
        buzz(12);
        break;
      }
      case "door": {
        this.ring(fx.x, fx.y, 2.6, 0.9, "rgba(90,235,150,", 3);
        this.burst(fx.x, fx.y, 14, {
          speed: [0.5, 2], life: [0.6, 1.1], size: [0.03, 0.06], rgb: [110, 240, 160], add: true, drag: 1.5,
        });
        this.addTrauma(0.22);
        buzz([20, 40, 30]);
        break;
      }
      case "death": {
        this.burst(fx.x, fx.y, 30, {
          speed: [1.5, 6], life: [0.5, 1.0], size: [0.05, 0.13], rgb: [160, 14, 12], drag: 5,
        });
        this.addTrauma(1);
        buzz([80, 60, 160]);
        break;
      }
      case "clear": {
        this.ring(fx.x, fx.y, 3.5, 0.8, "rgba(200,225,255,", 3);
        buzz([15, 30, 15]);
        break;
      }
    }
  }

  update(dt: number) {
    this.t += dt;
    this.trauma = Math.max(0, this.trauma - dt * 1.9);
    if (this.hitstop > 0) this.hitstop = Math.max(0, this.hitstop - dt);
    const ps = this.particles;
    let w = 0;
    for (let i = 0; i < ps.length; i++) {
      const p = ps[i];
      p.life -= dt;
      if (p.life <= 0) continue;
      const k = Math.exp(-p.drag * dt);
      p.vx *= k;
      p.vy *= k;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      ps[w++] = p;
    }
    ps.length = w;
    this.rings = this.rings.filter((r) => (r.life -= dt) > 0);
  }

  // Ekran sarsıntısı (CSS px). Perlin yerine birkaç sinüs toplamı: rastgele titreme
  // gibi "cızırtılı" değil, ağır ve organik.
  shake(maxPx: number): { x: number; y: number; rot: number } {
    const s = this.trauma * this.trauma * this.shakeScale;
    if (s <= 0.0005) return { x: 0, y: 0, rot: 0 };
    const t = this.t;
    const nx = Math.sin(t * 47.3) * 0.6 + Math.sin(t * 91.1 + 1.3) * 0.4;
    const ny = Math.sin(t * 53.7 + 2.1) * 0.6 + Math.sin(t * 83.9 + 0.4) * 0.4;
    const nr = Math.sin(t * 39.1 + 4.2);
    return { x: nx * maxPx * s, y: ny * maxPx * s, rot: nr * 0.012 * s };
  }

  draw(ctx: CanvasRenderingContext2D, TS: number, camX: number, camY: number) {
    if (this.rings.length) {
      ctx.save();
      for (const r of this.rings) {
        const k = 1 - r.life / r.max; // 0..1
        const e = 1 - Math.pow(1 - k, 3); // ease-out
        const rad = (r.r0 + (r.r1 - r.r0) * e) * TS;
        ctx.strokeStyle = r.color + (0.7 * (1 - k)).toFixed(3) + ")";
        ctx.lineWidth = r.w * (1 - k * 0.6);
        ctx.beginPath();
        ctx.arc(r.x * TS - camX, r.y * TS - camY, rad, 0, Math.PI * 2);
        ctx.stroke();
      }
      ctx.restore();
    }
    if (!this.particles.length) return;
    ctx.save();
    // Önce mat (kan), sonra ışıyan (lighter) — iki geçiş, durum değişimi az.
    for (let pass = 0; pass < 2; pass++) {
      const additive = pass === 1;
      ctx.globalCompositeOperation = additive ? "lighter" : "source-over";
      for (const p of this.particles) {
        if (p.add !== additive) continue;
        const a = Math.min(1, (p.life / p.max) * 1.4);
        const sz = Math.max(1, p.size * TS * (additive ? 0.6 + 0.4 * a : 1));
        ctx.fillStyle = `rgba(${p.r | 0},${p.g | 0},${p.b | 0},${a.toFixed(3)})`;
        ctx.fillRect(p.x * TS - camX - sz / 2, p.y * TS - camY - sz / 2, sz, sz);
      }
    }
    ctx.restore();
  }
}

// --- Uyarlanabilir kalite: düşük-uçlu cihazda pahalı efektleri kapat ---
// Kare süresini izler; ~2 sn boyunca ortalama ~45 FPS'in altındaysa `low` olur.
// Bir kez düşünce geri yükselmez (kalite gidip gelip titremesin).
export class QualityGuard {
  low = false;
  private acc = 0;
  private n = 0;
  private warm = 0;
  constructor(private onLow: () => void) {}
  frame(dtSec: number) {
    if (this.low) return;
    if (dtSec > 0.25) return; // sekme arka plandan döndü — ölçme
    this.warm += dtSec;
    if (this.warm < 1.5) return; // ilk anlardaki derleme/yükleme takılmalarını sayma
    this.acc += dtSec;
    this.n++;
    if (this.acc >= 2) {
      const avg = this.acc / this.n;
      if (avg > 1 / 45) {
        this.low = true;
        this.onLow();
      }
      this.acc = 0;
      this.n = 0;
    }
  }
}

// ctx.shadowBlur'u TÜM çizim kodunda tek hamlede etkisiz kıl (31 ayrı yeri tek tek
// değiştirmeden). Gölge bulanıklığı canvas'ın en pahalı işlemidir; kapatınca parlamalar
// sadece biraz daha "keskin" görünür, oyun aynı kalır.
export function disableShadowBlur(ctx: CanvasRenderingContext2D) {
  try {
    Object.defineProperty(ctx, "shadowBlur", { configurable: true, get: () => 0, set: () => {} });
  } catch {
    /* geç */
  }
}
