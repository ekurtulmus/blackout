// BLACKOUT — korku ses motoru.
// Web Audio API ile her şey KOD İÇİNDE sentezleniyor (ses dosyası yok, telif yok).
// Reverb ile mekân/derinlik hissi + guttural efektler + sürekli korku ambiyansı
// (alçak uğultu + gerilime göre kalp atışı + arkadan rastgele iniltiler/fısıltılar).
import type { SoundEvent } from "./engine";

class SoundEngine {
  private ctx: AudioContext | null = null;
  private master: GainNode | null = null;
  private reverb: ConvolverNode | null = null;
  private noiseBuf: AudioBuffer | null = null;
  private ambient: {
    nodes: AudioScheduledSourceNode[];
    gain: GainNode;
  } | null = null;
  private timers: number[] = [];
  private menuAudio: HTMLAudioElement | null = null;
  private gameAudio: HTMLAudioElement | null = null;
  muted = false;
  tension = 0; // 0..1 (Game her kare günceller)
  private lastHurt = -1;
  private vol = 1; // 0..1 genel ses seviyesi (ayarlardan)
  private musicOn = true; // müzik açık mı
  private prefsLoaded = false;
  private readonly base = 0.42; // ana ses taban kazancı

  // Ayar tercihlerini cihazdan yükle (bir kez)
  private loadPrefs() {
    if (this.prefsLoaded) return;
    this.prefsLoaded = true;
    try {
      const v = localStorage.getItem("blackout_vol");
      if (v !== null) this.vol = Math.max(0, Math.min(1, parseFloat(v)));
      const m = localStorage.getItem("blackout_music");
      if (m !== null) this.musicOn = m === "1";
      const mu = localStorage.getItem("blackout_muted");
      if (mu !== null) this.muted = mu === "1";
    } catch {
      /* geç */
    }
  }

  // Ana ses + müzik seviyelerini geçerli tercihlere göre uygula
  private applyLevels() {
    if (this.master && this.ctx) {
      this.master.gain.setTargetAtTime(this.muted ? 0 : this.vol * this.base, this.ctx.currentTime, 0.02);
    }
    if (this.menuAudio) {
      this.menuAudio.muted = this.muted;
      this.menuAudio.volume = this.musicOn ? this.vol * 0.55 : 0;
    }
    if (this.gameAudio) {
      this.gameAudio.muted = this.muted;
      this.gameAudio.volume = this.musicOn ? this.vol * 0.45 : 0;
    }
  }

  getVolume() {
    this.loadPrefs();
    return this.vol;
  }
  isMusicOn() {
    this.loadPrefs();
    return this.musicOn;
  }

  setVolume(v: number) {
    this.vol = Math.max(0, Math.min(1, v));
    try {
      localStorage.setItem("blackout_vol", String(this.vol));
    } catch {
      /* geç */
    }
    this.applyLevels();
  }

  setMusic(on: boolean) {
    this.musicOn = on;
    try {
      localStorage.setItem("blackout_music", on ? "1" : "0");
    } catch {
      /* geç */
    }
    this.applyLevels();
  }

  init() {
    if (this.ctx) return;
    this.loadPrefs();
    const AC: typeof AudioContext =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext: typeof AudioContext })
        .webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();

    this.master = this.ctx.createGain();
    this.master.gain.value = this.muted ? 0 : this.vol * this.base;
    this.master.connect(this.ctx.destination);

    // Karanlık oda reverb'ü (sentetik impulse response)
    this.reverb = this.ctx.createConvolver();
    this.reverb.buffer = this.makeImpulse(2.2, 3.0);
    const rgain = this.ctx.createGain();
    rgain.gain.value = 0.45;
    this.reverb.connect(rgain);
    rgain.connect(this.master);

    // Gürültü tamponu
    const len = Math.floor(this.ctx.sampleRate * 2);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    this.noiseBuf = buf;
  }

  private makeImpulse(dur: number, decay: number): AudioBuffer {
    const ctx = this.ctx!;
    const len = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = buf.getChannelData(c);
      for (let i = 0; i < len; i++) {
        d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, decay);
      }
    }
    return buf;
  }

  resume() {
    this.init();
    if (this.ctx && this.ctx.state === "suspended") this.ctx.resume();
  }

  setMuted(m: boolean) {
    this.muted = m;
    try {
      localStorage.setItem("blackout_muted", m ? "1" : "0");
    } catch {
      /* geç */
    }
    this.applyLevels();
  }

  // --- Kullanıcının verdiği ses dosyaları (public/audio/menu.mp3, game.mp3) ---
  private ensureEl(kind: "menu" | "game"): HTMLAudioElement {
    if (kind === "menu") {
      if (!this.menuAudio) {
        const a = new Audio("/audio/menu.mp3");
        a.loop = true;
        a.preload = "auto";
        a.volume = 0.55;
        a.muted = this.muted;
        this.menuAudio = a;
      }
      return this.menuAudio;
    }
    if (!this.gameAudio) {
      const a = new Audio("/audio/game.mp3");
      a.loop = true;
      a.preload = "auto";
      a.volume = 0.45; // oyun içi arka plan — çok yüksek değil
      a.muted = this.muted;
      this.gameAudio = a;
    }
    return this.gameAudio;
  }

  // Menü müziğini çalar. Otomatik-oynatma izni varsa hemen başlar; yoksa false döner.
  playMenuMusic(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const a = this.ensureEl("menu");
        if (!a.paused) {
          resolve(true);
          return;
        }
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.then(() => resolve(true)).catch(() => resolve(false));
        } else {
          resolve(true);
        }
      } catch {
        resolve(false);
      }
    });
  }

  stopMenuMusic() {
    if (this.menuAudio) this.menuAudio.pause();
  }

  // Göze batmayan otomatik başlatma:
  // Menüye girer girmez SESSİZ (muted) autoplay başlatılır — tarayıcılar buna izin verir.
  // Müzik gizlice çalmaya başlar; hiçbir uyarı gerekmez.
  primeMenuMusic() {
    try {
      const a = this.ensureEl("menu");
      a.muted = true; // sessiz autoplay (izin verilir)
      if (a.paused) a.play().catch(() => {});
    } catch {
      /* dosya yoksa geç */
    }
  }

  // İlk kullanıcı etkileşiminde sesi aç — müzik zaten çaldığından anında duyulur.
  revealMenuMusic() {
    try {
      const a = this.ensureEl("menu");
      a.muted = this.muted; // global sessizde değilse duyulur
      if (a.paused) a.play().catch(() => {});
      this.applyLevels(); // ses seviyesi / müzik tercihini uygula
    } catch {
      /* geç */
    }
  }

  // Oyun-içi müziği çalar; dosya yoksa/başlamazsa false döner (synth ambiyansa düşülür)
  playGameMusic(): Promise<boolean> {
    return new Promise((resolve) => {
      try {
        const a = this.ensureEl("game");
        let done = false;
        const fail = () => {
          if (!done) {
            done = true;
            resolve(false);
          }
        };
        a.addEventListener("error", fail, { once: true });
        a.currentTime = 0;
        this.applyLevels(); // ses seviyesi / müzik tercihini uygula
        const p = a.play();
        if (p && typeof p.then === "function") {
          p.then(() => {
            if (!done && !a.error) {
              done = true;
              resolve(true);
            } else {
              fail();
            }
          }).catch(fail);
        } else {
          resolve(!a.error);
        }
      } catch {
        resolve(false);
      }
    });
  }

  stopGameMusic() {
    if (this.gameAudio) this.gameAudio.pause();
  }

  setTension(v: number) {
    this.tension = Math.max(0, Math.min(1, v));
  }

  // --- yardımcılar ---
  private connectOut(node: AudioNode, wet = 0.25, pan = 0) {
    if (!this.ctx || !this.master) return;
    let n: AudioNode = node;
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      node.connect(p);
      n = p;
    }
    n.connect(this.master);
    if (this.reverb && wet > 0) {
      const s = this.ctx.createGain();
      s.gain.value = wet;
      n.connect(s);
      s.connect(this.reverb);
    }
  }

  private env(g: GainNode, t0: number, peak: number, atk: number, dec: number) {
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(peak, t0 + atk);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + atk + dec);
  }

  private noise(
    t0: number,
    dur: number,
    peak: number,
    freq: number,
    type: BiquadFilterType = "lowpass",
    wet = 0.2,
    pan = 0,
    q = 0.7
  ) {
    if (!this.ctx || !this.noiseBuf) return;
    const src = this.ctx.createBufferSource();
    src.buffer = this.noiseBuf;
    src.playbackRate.value = 0.8 + Math.random() * 0.4;
    const f = this.ctx.createBiquadFilter();
    f.type = type;
    f.frequency.value = freq;
    f.Q.value = q;
    const g = this.ctx.createGain();
    src.connect(f);
    f.connect(g);
    this.connectOut(g, wet, pan);
    this.env(g, t0, peak, 0.002, dur);
    src.start(t0);
    src.stop(t0 + dur + 0.05);
  }

  private tone(
    t0: number,
    f0: number,
    f1: number,
    dur: number,
    peak: number,
    type: OscillatorType = "sine",
    wet = 0.2,
    pan = 0
  ) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = type;
    o.frequency.setValueAtTime(f0, t0);
    o.frequency.exponentialRampToValueAtTime(Math.max(1, f1), t0 + dur);
    const g = this.ctx.createGain();
    o.connect(g);
    this.connectOut(g, wet, pan);
    this.env(g, t0, peak, 0.006, dur);
    o.start(t0);
    o.stop(t0 + dur + 0.05);
  }

  // Gerçek bir kadın ağlaması/feryadı — çok kısa, hayaletimsi (ölen gelin için).
  // Ses teli (sawtooth) + ünlü formant filtreleri + vibrato (titrek perde) +
  // tremolo (kesik hıçkırık) + baştaki nefes + bol reverb.
  private cry(t0: number) {
    if (!this.ctx || !this.master) return;
    const ctx = this.ctx;
    const dur = 0.4;

    const osc = ctx.createOscillator();
    osc.type = "sawtooth";
    // acı feryat konturu: hızlı yüksel → dalgalan → düş
    osc.frequency.setValueAtTime(360, t0);
    osc.frequency.linearRampToValueAtTime(690, t0 + 0.07);
    osc.frequency.linearRampToValueAtTime(520, t0 + 0.17);
    osc.frequency.exponentialRampToValueAtTime(230, t0 + dur);

    // vibrato — ağlamanın titrek perdesi
    const vib = ctx.createOscillator();
    vib.type = "sine";
    vib.frequency.value = 6.5;
    const vibGain = ctx.createGain();
    vibGain.gain.value = 24;
    vib.connect(vibGain);
    vibGain.connect(osc.frequency);

    // ünlü (vowel) formantları — insan sesi "aaa/uaa" tınısı
    const f1 = ctx.createBiquadFilter();
    f1.type = "bandpass";
    f1.frequency.value = 850;
    f1.Q.value = 3;
    const f2 = ctx.createBiquadFilter();
    f2.type = "bandpass";
    f2.frequency.value = 1650;
    f2.Q.value = 4.5;

    // hıçkırık zarfı + tremolo (kesik kesik ağlama) — daha yüksek
    const amp = ctx.createGain();
    amp.gain.setValueAtTime(0.0001, t0);
    amp.gain.linearRampToValueAtTime(0.98, t0 + 0.03);
    amp.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    const trem = ctx.createOscillator();
    trem.type = "sine";
    trem.frequency.value = 9;
    const tremGain = ctx.createGain();
    tremGain.gain.value = 0.22;
    trem.connect(tremGain);
    tremGain.connect(amp.gain);

    osc.connect(f1);
    f1.connect(f2);
    f2.connect(amp);
    this.connectOut(amp, 0.6); // bol reverb — ürkütücü/hayaletimsi

    // baştaki kısa nefes/hıçkırık (inhale catch)
    this.noise(t0, 0.06, 0.3, 1900, "highpass", 0.3, 0, 1);

    const stopAt = t0 + dur + 0.05;
    osc.start(t0);
    vib.start(t0);
    trem.start(t0);
    osc.stop(stopAt);
    vib.stop(stopAt);
    trem.stop(stopAt);
  }

  play(ev: SoundEvent) {
    if (!this.ctx || this.muted) return;
    const t = this.ctx.currentTime;
    switch (ev) {
      case "shot": {
        // Baya kısık silah: derin gümbürtü + hafif gürültü (çok azaltıldı)
        this.tone(t, 110, 38, 0.22, 0.18, "sine", 0.3);
        this.noise(t, 0.18, 0.2, 2200, "lowpass", 0.3);
        this.noise(t, 0.04, 0.12, 3500, "highpass", 0.12);
        break;
      }
      case "kill": {
        // Ölen gelinin çok kısa, gerçekçi ağlaması/feryadı
        this.cry(t);
        break;
      }
      case "pickup": {
        // Alçak metalik tık (neşeli değil)
        this.noise(t, 0.05, 0.3, 2600, "bandpass", 0.15, 0, 3);
        this.tone(t, 900, 700, 0.06, 0.12, "triangle", 0.1);
        break;
      }
      case "heal": {
        // Can paketi: yumuşak, sıcak yükselen iki ton (rahatlama) + hafif parıltı
        this.tone(t, 320, 560, 0.5, 0.22, "sine", 0.5);
        this.tone(t + 0.09, 480, 760, 0.5, 0.16, "triangle", 0.5);
        this.noise(t, 0.06, 0.1, 3200, "highpass", 0.2, 0, 2);
        break;
      }
      case "hurt": {
        if (t - this.lastHurt < 0.18) return;
        this.lastHurt = t;
        // Hayaletimsi soğuk temas — yumuşak alçalan inilti + hafif üşüme hışırtısı
        // ("pıt" darbe değil, kısık ve oyuna uygun)
        this.tone(t, 300, 130, 0.26, 0.18, "sine", 0.45);
        this.noise(t, 0.16, 0.13, 900, "bandpass", 0.4, 0, 1.5);
        break;
      }
      case "dooropen": {
        // Alçak uğursuz gümbürtü (parlak zil değil)
        this.tone(t, 70, 55, 1.1, 0.4, "sine", 0.6);
        this.noise(t, 1.0, 0.28, 320, "lowpass", 0.6);
        this.tone(t + 0.1, 240, 150, 0.9, 0.14, "triangle", 0.5);
        break;
      }
      case "warn": {
        // Dissonant alçak vızıltı (küçük ikili)
        this.tone(t, 150, 150, 0.5, 0.3, "sawtooth", 0.3);
        this.tone(t, 159, 159, 0.5, 0.28, "sawtooth", 0.3);
        break;
      }
      case "levelclear": {
        // Rahatlama ama tekinsiz: alçak yükselen pad + tek orta ton
        this.tone(t, 90, 180, 1.4, 0.32, "sine", 0.7);
        this.tone(t + 0.2, 240, 245, 1.0, 0.16, "triangle", 0.6);
        break;
      }
      case "win": {
        // Karanlıktan çıkış: alçak zafer değil, derin nefes gibi swell
        this.tone(t, 80, 160, 2.0, 0.34, "sine", 0.8);
        this.tone(t + 0.3, 200, 300, 1.6, 0.16, "triangle", 0.7);
        break;
      }
      case "gameover": {
        // Derin dehşet: alçak dissonant kümesi düşerek + gürültü
        this.tone(t, 130, 45, 1.6, 0.45, "sawtooth", 0.7);
        this.tone(t + 0.05, 138, 50, 1.5, 0.35, "sawtooth", 0.7);
        this.tone(t + 0.1, 90, 30, 1.6, 0.4, "square", 0.6);
        this.noise(t, 1.2, 0.25, 400, "lowpass", 0.7);
        break;
      }
    }
  }

  // --- Sürekli korku ambiyansı ---
  startAmbient() {
    if (!this.ctx || !this.master || this.ambient) return;
    const ctx = this.ctx;
    const gain = ctx.createGain();
    gain.gain.value = 0.0001;
    this.connectOut(gain, 0.5);

    const nodes: AudioScheduledSourceNode[] = [];

    // Katman 1: derin alt uğultu (~42 Hz)
    const sub = ctx.createOscillator();
    sub.type = "sine";
    sub.frequency.value = 42;
    // Katman 2: dissonant alçak çift (uğursuz)
    const d1 = ctx.createOscillator();
    d1.type = "sine";
    d1.frequency.value = 70;
    const d2 = ctx.createOscillator();
    d2.type = "sine";
    d2.frequency.value = 74.3;
    const lp = ctx.createBiquadFilter();
    lp.type = "lowpass";
    lp.frequency.value = 240;
    sub.connect(gain);
    d1.connect(lp);
    d2.connect(lp);
    lp.connect(gain);

    // Katman 3: yavaş süzülen rüzgâr/hışırtı
    const wind = ctx.createBufferSource();
    wind.buffer = this.noiseBuf;
    wind.loop = true;
    const bp = ctx.createBiquadFilter();
    bp.type = "bandpass";
    bp.frequency.value = 420;
    bp.Q.value = 0.6;
    const windGain = ctx.createGain();
    windGain.gain.value = 0.06;
    wind.connect(bp);
    bp.connect(windGain);
    windGain.connect(gain);

    // Uğultuda hafif dalgalanma (LFO)
    const lfo = ctx.createOscillator();
    lfo.type = "sine";
    lfo.frequency.value = 0.08;
    const lfoGain = ctx.createGain();
    lfoGain.gain.value = 60;
    lfo.connect(lfoGain);
    lfoGain.connect(bp.frequency);

    sub.start();
    d1.start();
    d2.start();
    wind.start();
    lfo.start();
    nodes.push(sub, d1, d2, wind, lfo);

    // "çok yüksek olmayan" — alçak seviyede aç
    gain.gain.setTargetAtTime(0.1, ctx.currentTime, 3);
    this.ambient = { nodes, gain };

    this.scheduleHeartbeat();
    this.scheduleSpooky();
  }

  stopAmbient() {
    if (!this.ctx || !this.ambient) return;
    const a = this.ambient;
    a.gain.gain.setTargetAtTime(0.0001, this.ctx.currentTime, 0.4);
    const stopAt = this.ctx.currentTime + 0.8;
    a.nodes.forEach((n) => {
      try {
        n.stop(stopAt);
      } catch {
        /* zaten durmuş olabilir */
      }
    });
    this.ambient = null;
    this.timers.forEach((id) => window.clearTimeout(id));
    this.timers = [];
  }

  // Gerilime göre hızlanıp yükselen kalp atışı
  private scheduleHeartbeat() {
    if (!this.ctx) return;
    const t = this.tension;
    const interval = t > 0.05 ? 1.25 - t * 0.75 : 1.4; // saniye
    const id = window.setTimeout(() => {
      if (!this.ambient) return;
      if (this.tension > 0.05 && !this.muted) this.heartbeat(this.tension);
      this.scheduleHeartbeat();
    }, interval * 1000);
    this.timers.push(id);
  }

  private heartbeat(v: number) {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const vol = 0.12 + v * 0.32;
    this.thump(t, vol);
    this.thump(t + 0.17, vol * 0.72);
  }

  private thump(t0: number, peak: number) {
    if (!this.ctx) return;
    const o = this.ctx.createOscillator();
    o.type = "sine";
    o.frequency.setValueAtTime(62, t0);
    o.frequency.exponentialRampToValueAtTime(36, t0 + 0.16);
    const g = this.ctx.createGain();
    o.connect(g);
    this.connectOut(g, 0.15);
    this.env(g, t0, peak, 0.005, 0.16);
    o.start(t0);
    o.stop(t0 + 0.22);
  }

  // Arkadan rastgele gelen tekinsiz sesler (uzak inilti / gıcırtı / fısıltı)
  private scheduleSpooky() {
    const delay = 5 + Math.random() * 12; // 5-17 sn
    const id = window.setTimeout(() => {
      if (!this.ambient) return;
      if (!this.muted) this.spooky();
      this.scheduleSpooky();
    }, delay * 1000);
    this.timers.push(id);
  }

  private spooky() {
    if (!this.ctx) return;
    const t = this.ctx.currentTime;
    const pan = Math.random() * 1.6 - 0.8; // sağ/sol
    const pick = Math.floor(Math.random() * 3);
    if (pick === 0) {
      // uzak inilti
      const f0 = 90 + Math.random() * 40;
      this.tone(t, f0, f0 * 0.6, 1.4, 0.13, "sawtooth", 0.8, pan);
      this.tone(t + 0.05, f0 * 1.02, f0 * 0.62, 1.3, 0.1, "sine", 0.8, pan);
    } else if (pick === 1) {
      // gıcırtı / metalik sürtünme
      this.noise(t, 0.6, 0.12, 1600 + Math.random() * 800, "bandpass", 0.7, pan, 4);
    } else {
      // fısıltı benzeri süzülmüş gürültü
      this.noise(t, 1.0, 0.1, 1400, "bandpass", 0.6, pan, 1.5);
    }
  }
}

// Tüm oyun boyunca tek örnek (bölümler arası AudioContext'i korur).
export const sound = new SoundEngine();
