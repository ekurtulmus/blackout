// BLACKOUT — MİNİ-GÖREVLER (Faz 4 / Madde 9).
// Normal bölümlere serpiştirilen OPSİYONEL mini-hedefler. Tamamlanınca küçük ödül
// (mermi/can/puan). Zorunlu değil; çıkışı geciktirmez. HUD'da aktif olan gösterilir.
//
// Online dengesi: Ölüm Yarışı bir YARIŞ → mini-görevler oyunu UZATMAMALI. Her görevin
// bir etiketi var (kisa/orta/uzun). Online'da SADECE `online:true` (kisa, tamamen yerel,
// gelin AI'sını değiştirmeyen) görevler çıkar; kişisel mermi ödülü verir (mermi zaten
// online'da yerel/kişisel). Diğerleri (gezme/toplama/gelin tetikleyen) yalnız tek kişilik.

import type { Vec } from "./types";

export type MQKind =
  | "candles" // Üç mumu yak — 3 mumu ziyaret et (uzun, tek)
  | "ring" // Gelinin yüzüğünü bul — al; bir gelin delirir/hızlanır (orta, tek)
  | "markedkill" // İşaretli bölgede gelin öldür (uzun, tek)
  | "bell" // Çanı çal — tüm gelinleri sana çeker (orta, tek)
  | "bloodtrail" // Kanı takip et — sahte izler de var (kisa, ONLINE)
  | "darkhall" // Fenersiz koridorun sonuna ulaş (uzun, tek)
  | "mirror"; // Aynadan kaç — yaklaş, sonra hızla uzaklaş (kisa, tek)

export type MQTag = "kisa" | "orta" | "uzun";
export type MQReward = { ammo?: number; health?: number; score?: number };

export type MQDef = {
  kind: MQKind;
  title: string; // görev adı (toast/HUD)
  hud: string; // HUD kısa etiketi (ilerleme öncesi)
  icon: string; // HUD/emoji ipucu
  tag: MQTag;
  online: boolean; // online yarışta çıkabilir mi (yalnız kisa + yerel + gelin-nötr)
  reward: MQReward;
};

export const MQ_DEFS: Record<MQKind, MQDef> = {
  candles: { kind: "candles", title: "Üç Mumu Yak", hud: "Mumlar", icon: "🕯", tag: "uzun", online: false, reward: { ammo: 3, score: 150 } },
  ring: { kind: "ring", title: "Yüzüğü Bul", hud: "Yüzüğü bul", icon: "💍", tag: "orta", online: false, reward: { ammo: 2, score: 120 } },
  markedkill: { kind: "markedkill", title: "İşaretli İnfaz", hud: "İşaretli bölgede öldür", icon: "⊚", tag: "uzun", online: false, reward: { ammo: 2, health: 30, score: 160 } },
  bell: { kind: "bell", title: "Çanı Çal", hud: "Çanı çal", icon: "🔔", tag: "orta", online: false, reward: { ammo: 4, score: 140 } },
  bloodtrail: { kind: "bloodtrail", title: "Kanı Takip Et", hud: "Kanı takip et", icon: "🩸", tag: "kisa", online: true, reward: { ammo: 2, score: 90 } },
  darkhall: { kind: "darkhall", title: "Fenersiz Koridor", hud: "Koridorun sonuna ulaş", icon: "🕳", tag: "uzun", online: false, reward: { health: 45, score: 120 } },
  mirror: { kind: "mirror", title: "Aynadan Kaç", hud: "Aynadan uzaklaş", icon: "🪞", tag: "kisa", online: false, reward: { ammo: 2, score: 100 } },
};

// Tek kişilik havuzu (hepsi) ve online havuzu (yalnız güvenli olanlar)
export const MQ_KINDS_SP: MQKind[] = ["candles", "ring", "markedkill", "bell", "bloodtrail", "darkhall", "mirror"];
export const MQ_KINDS_ONLINE: MQKind[] = MQ_KINDS_SP.filter((k) => MQ_DEFS[k].online);

export type MQMarker = { x: number; y: number; done: boolean };

export type MQPlan = {
  kind: MQKind;
  markers: MQMarker[]; // ziyaret/toplama hedefleri (gerçek)
  decoys: MQMarker[]; // yalnız görsel sahte izler (bloodtrail)
  zone?: { x: number; y: number; r: number }; // markedkill bölgesi
};

// --- Deterministik RNG (online: herkes aynı planı bağımsızca üretsin) ---
export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return function () {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function d2(a: Vec, b: Vec): number {
  return (a.x - b.x) ** 2 + (a.y - b.y) ** 2;
}

function shuffleRng<T>(arr: T[], rng: () => number): T[] {
  const a = arr.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Havuzdan birbirinden en az minD uzak n hücre seç (mümkünse).
function pickSpread(pool: Vec[], n: number, minD2: number): Vec[] {
  const out: Vec[] = [];
  for (const c of pool) {
    if (out.every((o) => d2(o, c) >= minD2)) {
      out.push(c);
      if (out.length >= n) break;
    }
  }
  // yeterli değilse gevşet (havuz sırasından tamamla)
  for (const c of pool) {
    if (out.length >= n) break;
    if (!out.some((o) => o.x === c.x && o.y === c.y)) out.push(c);
  }
  return out.slice(0, n);
}

// Bir mini-görev planı üret. `allowed` havuzundan RNG ile bir tür seçer, hücreleri yerleştirir.
// floors: ulaşılabilir zemin hücreleri (x,y tam sayı). spawn/exit hariç tutulur.
export function planMiniQuest(
  rng: () => number,
  floors: Vec[],
  spawn: Vec,
  exit: Vec,
  allowed: MQKind[]
): MQPlan | null {
  if (allowed.length === 0) return null;
  const kind = allowed[Math.floor(rng() * allowed.length)];
  // spawn/exit dışı, spawn'a çok bitişik olmayan hücreler
  const pool = shuffleRng(
    floors.filter(
      (c) =>
        !(c.x === spawn.x && c.y === spawn.y) &&
        !(c.x === exit.x && c.y === exit.y) &&
        d2(c, spawn) >= 9 // en az ~3 hücre uzak
    ),
    rng
  );
  if (pool.length < 4) return null;

  const mk = (c: Vec): MQMarker => ({ x: c.x, y: c.y, done: false });

  switch (kind) {
    case "candles": {
      const cells = pickSpread(pool, 3, 16); // birbirinden ~4 hücre ayrık
      return { kind, markers: cells.map(mk), decoys: [] };
    }
    case "ring":
    case "bell":
    case "mirror": {
      // tek hedef; mirror için spawn'a görece yakın olanı tercih et (erken tetiklensin)
      let cell = pool[0];
      if (kind === "mirror") {
        let bd = Infinity;
        for (const c of pool) {
          const dd = d2(c, spawn);
          if (dd >= 12 && dd < bd) {
            bd = dd;
            cell = c;
          }
        }
      }
      return { kind, markers: [mk(cell)], decoys: [] };
    }
    case "darkhall": {
      // spawn'dan en uzak hücre (uzun yolun sonu)
      let cell = pool[0];
      let bd = -1;
      for (const c of pool) {
        const dd = d2(c, spawn);
        if (dd > bd) {
          bd = dd;
          cell = c;
        }
      }
      return { kind, markers: [mk(cell)], decoys: [] };
    }
    case "markedkill": {
      // orta-uzak bir bölge; yarıçap 2 hücre
      let cell = pool[0];
      for (const c of pool) {
        const dd = d2(c, spawn);
        if (dd >= 36) {
          cell = c;
          break;
        }
      }
      return { kind, markers: [], decoys: [], zone: { x: cell.x, y: cell.y, r: 2 } };
    }
    case "bloodtrail": {
      // gerçek son (ödül) hücresi + sahte damla izleri (yanıltıcı)
      const real = pool[0];
      const decoys = pickSpread(
        pool.filter((c) => d2(c, real) >= 16),
        3,
        16
      );
      return { kind, markers: [mk(real)], decoys: decoys.map(mk) };
    }
  }
}
