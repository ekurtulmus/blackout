// BLACKOUT — RASTGELE KORKU OLAYLARI (Faz 5 / Madde 10).
// Ara ara (seyrek, cooldown'lu) scripted atmosfer anları: ani fısıltı, ekran
// kenarından geçen gölge, uzak kapı çarpması, fenerin bir anlık sıçraması, kısa
// kalp atışı yükselişi. HASAR VERMEZ — ceza değil, gerilim. Art arda spam yok.
//
// Tamamen YEREL/atmosferik: oyunu etkilemez → online'da host-otoriterlik gerekmez
// (her istemci kendi korkusunu yaşar). Hem engine (tek kişilik) hem OnlineGame kullanır.
import { TUNING } from "./config";

export type ScareKind =
  | "whisper" // ani yakın fısıltı (ses)
  | "doorslam" // uzak kapı çarpması (ses)
  | "heartbeat" // kısa kalp atışı yükselişi (ses)
  | "shadow" // ekran kenarından geçen gölge (görsel)
  | "flashjump"; // fenerin bir anlık sıçraması/titremesi (görsel)

// Aktif görsel efekt (gölge/flashjump) — render katmanı bunu okur
export type ScareFx = {
  kind: "shadow" | "flashjump";
  side: 0 | 1 | 2 | 3; // 0=sol 1=sağ 2=üst 3=alt
  born: number; // başladığı an (saniye)
  dur: number; // süresi (saniye)
};

const KINDS: ScareKind[] = ["whisper", "doorslam", "heartbeat", "shadow", "flashjump"];

export class ScareDirector {
  private nextAt: number;
  private rng: () => number;
  private lastKind: ScareKind | null = null;
  fx: ScareFx | null = null;

  constructor(startTime = 0, rng: () => number = Math.random) {
    this.rng = rng;
    this.nextAt = startTime + this.gap();
  }

  private gap(): number {
    return TUNING.scareMinSec + this.rng() * (TUNING.scareMaxSec - TUNING.scareMinSec);
  }

  reset(startTime = 0) {
    this.fx = null;
    this.lastKind = null;
    this.nextAt = startTime + this.gap();
  }

  // Her karede çağır. time saniye cinsinden. intensity>1 → biraz daha sık
  // (yüksek gerilim/tema); yine de min taban korunur (spam yok).
  // Döndürdüğü kind ses/tension içindir; görsel efekt `this.fx`te tutulur.
  update(time: number, intensity = 1): ScareKind | null {
    if (this.fx && time - this.fx.born > this.fx.dur) this.fx = null;
    if (time < this.nextAt) return null;

    // Aynı türü art arda seçme (çeşitlilik)
    let k = KINDS[Math.floor(this.rng() * KINDS.length)];
    if (k === this.lastKind) k = KINDS[(KINDS.indexOf(k) + 1) % KINDS.length];
    this.lastKind = k;

    // Sıradaki: yoğunlukla kısalır ama min tabanın altına inmez
    const g = this.gap() / Math.max(0.5, intensity);
    this.nextAt = time + Math.max(TUNING.scareMinSec * 0.55, g);

    if (k === "shadow" || k === "flashjump") {
      this.fx = {
        kind: k,
        side: (Math.floor(this.rng() * 4) % 4) as 0 | 1 | 2 | 3,
        born: time,
        dur: k === "shadow" ? 1.0 : 0.4,
      };
    }
    return k;
  }
}
