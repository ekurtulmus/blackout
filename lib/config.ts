// BLACKOUT — merkezi denge/ritim ayarları. TÜM sihirli sayılar burada toplanır;
// dosyalara dağıtma. Geriye dönük uyumlu; değerleri buradan ayarla.

export const TUNING = {
  // --- Oyuncu ---
  playerSpeed: 3.4, // hücre/saniye (engine PLAYER_SPEED buradan)

  // --- Madde 2: temas hasarı (saniyede) 35 -> 20 ---
  contactDps: 20,

  // --- Madde 3: gelin hızı tavanı = oyuncu hızının %8 altı; ASLA geçilmez ---
  brideSpeedCapFactor: 0.92,
  get brideSpeedCap() {
    return this.playerSpeed * this.brideSpeedCapFactor; // ~3.128
  },
  brideSpeedEase: 1.25, // hız eğrisi ease-in üssü (yumuşak artış)

  // --- Madde 0: online'da bir oyuncunun peşinde AYNI ANDA max gelin ---
  maxHuntersPerPlayer: 4,

  // --- Madde 1: kişi sayısına oranlı harita/yoğunluk (online) ---
  mapSizePerPlayer: 4, // her ekstra oyuncu için labirente +hücre (base + (n-1)*k)
  // yoğunluk çarpanı = densityBase + densityPer * playerCount
  densityBase: 0.6,
  densityPer: 0.4,
  healthBase: 3, // online can paketi taban sayısı (yoğunlukla ölçeklenir)
  healthMax: 12,

  // --- Madde 4: lastik-bant dinamik görüş ---
  visionCalmSec: 3, // bu kadar süre gelin görmezsen görüş daralmaya başlar
  visionCalmFactor: 0.65, // rahatken base'in %65'ine kadar sıkışır
  visionLerp: 1.5, // görüş yumuşama hızı (LERP), düşük = daha yavaş

  // --- Madde 5: telegraph'lı fener kararması ---
  dimMinSec: 8, // kararmalar arası min süre
  dimMaxSec: 12, // kararmalar arası max süre (aralık rastgele)
  dimTelegraphSec: 0.5, // kararmadan önce uyarı süresi (hafif kısılma)
  dimTelegraphFactor: 0.85, // uyarıda fener çarpanı
  dimDipSec: 0.5, // asıl kararma süresi
  dimFactor: 0.42, // kararma anında fener çarpanı (görüş bu kadar düşer)
  dimLerp: 8, // kararma yumuşama hızı
};
