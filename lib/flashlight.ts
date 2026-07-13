// Dinamik fener/görüş denetleyicisi — hem tek kişilik (engine) hem online (OnlineGame)
// aynı mantığı kullanır. Tüm geçişler LERP ile YUMUŞAK; ani zıplama yok.
// Madde 4: lastik-bant görüş (rahatken daralır, gelin çıkınca genişler).
// Madde 5: telegraph'lı fener kararması (uyarı + kısa dip + ses ipucu).
import { TUNING } from "./config";

export class Flashlight {
  base: number; // temel görüş yarıçapı
  eff: number; // o anki efektif yarıçap (render bunu kullanır)
  onDip: () => void = () => {}; // dip anında ses ipucu (bir kez)

  private calm = 0; // gelin görmeden geçen süre
  private t = 0; // iç zaman (saniye)
  private nextDim: number; // sıradaki kararma anı
  private dimFactor = 1; // kararma çarpanı
  private dipped = false; // bu dip için ses çaldı mı

  constructor(base: number) {
    this.base = base;
    this.eff = base;
    this.nextDim = this.schedule();
  }

  reset(base: number) {
    this.base = base;
    this.eff = base;
    this.calm = 0;
    this.t = 0;
    this.dimFactor = 1;
    this.dipped = false;
    this.nextDim = this.schedule();
  }

  private schedule(): number {
    return this.t + TUNING.dimMinSec + Math.random() * (TUNING.dimMaxSec - TUNING.dimMinSec);
  }

  // brideInRange: menzil içinde (farkında/görülen) gelin var mı?
  // dt küçük tutulmuş varsayılır (motorlar zaten sınırlıyor).
  update(dt: number, brideInRange: boolean) {
    this.t += dt;

    // Madde 4: rahatlık sayacı → görüş hedefi
    if (brideInRange) this.calm = 0;
    else this.calm += dt;
    const relaxed = this.calm > TUNING.visionCalmSec;
    const targetBase = relaxed ? this.base * TUNING.visionCalmFactor : this.base;

    // Madde 5: kararma fazları (uyarı → dip → toparlan)
    const toDip = this.nextDim - this.t;
    let dimTarget = 1;
    if (toDip <= 0 && toDip > -TUNING.dimDipSec) {
      dimTarget = TUNING.dimFactor; // dip
      if (!this.dipped) {
        this.dipped = true;
        this.onDip(); // ses ipucu bir kez
      }
    } else if (toDip > 0 && toDip <= TUNING.dimTelegraphSec) {
      dimTarget = TUNING.dimTelegraphFactor; // uyarı (telegraph): hafif kısılma
    } else if (toDip <= -TUNING.dimDipSec) {
      this.nextDim = this.schedule(); // kararma bitti → yeniden zamanla
      this.dipped = false;
    }
    this.dimFactor += (dimTarget - this.dimFactor) * Math.min(1, dt * TUNING.dimLerp);

    // Efektif yarıçap: rahatlık hedefi × kararma çarpanı, yumuşak LERP
    const target = targetBase * this.dimFactor;
    this.eff += (target - this.eff) * Math.min(1, dt * TUNING.visionLerp);
  }
}
