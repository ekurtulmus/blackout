// BLACKOUT — merkezi denge/ritim ayarları. TÜM sihirli sayılar burada toplanır;
// dosyalara dağıtma. Geriye dönük uyumlu; değerleri buradan ayarla.

export const TUNING = {
  // --- Oyuncu ---
  playerSpeed: 3.4, // hücre/saniye (engine PLAYER_SPEED buradan)

  // --- Madde 2: temas hasarı (saniyede) 35 -> 20 ---
  contactDps: 20,

  // --- ZORLUK — TEK KAYNAK (tek kişilik + online yarış + arena hepsi bunu kullanır) ---
  // count: gelin sayısı · speed: hız · vision: gelinin görme menzili · intel: zekâ
  // dmg: temas hasarı = GELİN GÜCÜ (eskiden zorluk gücü hiç etkilemiyordu).
  // NOT: speed yine brideSpeedCap ile sınırlıdır (gelin oyuncuyu ASLA geçemez), bu yüzden
  // Zor'un asıl farkı SAYI ve GÜÇ üzerinden gelir.
  // hunters: bir oyuncuyu AYNI ANDA kaç gelin kovalayabilir (online).
  //   Sabit 4 iken, Zor'da gelin sayısı artsa bile baskı Orta'yla aynı hissediliyordu:
  //   fazladan doğan gelinler avcı sınırına takılıp aylak dolaşıyordu.
  diff: {
    kolay: { count: 0.5, speed: 0.78, vision: 1.15, dmg: 0.7, intel: -0.15, hunters: 2 },
    orta: { count: 1.0, speed: 1.0, vision: 1.0, dmg: 1.0, intel: 0, hunters: 4 },
    zor: { count: 1.85, speed: 1.18, vision: 0.85, dmg: 1.4, intel: 0.2, hunters: 7 },
  } as Record<
    "kolay" | "orta" | "zor",
    { count: number; speed: number; vision: number; dmg: number; intel: number; hunters: number }
  >,

  // --- Madde 3: gelin hızı tavanı = oyuncu hızının %8 altı; ASLA geçilmez ---
  brideSpeedCapFactor: 0.82,
  get brideSpeedCap() {
    return this.playerSpeed * this.brideSpeedCapFactor; // ~3.128
  },
  brideSpeedEase: 1.6, // hız eğrisi ease-in üssü (erken bölümler çok yumuşak; zorluk sona yayılır)

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

  // --- Madde 6 (revize): karanlık gelini ---
  darkBrideLightMul: 0.28, // (kullanılmıyor — artık görünce normal hızda gelir)
  darkBrideDarkMul: 1.15, // seni GÖRMEZKEN karanlıkta hızlı (yine %92 tavanla sınırlı)
  darkBrideMax: 2, // bölüm başına en fazla

  // --- Madde 7: mukus bırakan gelin ---
  mucusBrideMax: 2, // bölüm başına en fazla
  mucusSec: 10, // mukus lekesi kaç saniye kalır
  mucusDps: 8, // mukus üzerinde saniyelik hasar

  // --- Madde 8: gelin duvağı (görünmezlik) ---
  veilSec: 5, // toplayınca kaç saniye görünmez kalınır

  // --- Madde 10: rastgele korku olayları (HASAR VERMEZ, sadece atmosfer) ---
  scareMinSec: 16, // korku olayları arası min süre (seyrek; art arda spam yok)
  scareMaxSec: 34, // korku olayları arası max süre

  // --- Faz C: Koşma (sprint) ---
  sprintMul: 1.6, // koşarken hız çarpanı
  staminaMax: 100,
  staminaDrain: 40, // koşarken saniyelik tükenme
  staminaRegen: 22, // koşmazken saniyelik dolum
  staminaMinToStart: 12, // bu değerin altında yeniden koşmaya başlayamazsın (nefeslen)

  // --- Faz C: Tuzak (gelini yavaşlatır, DURDURMAZ) ---
  trapSlowMul: 0.4, // tuzak üstündeki gelin hızı (%40)
  trapSec: 10, // tuzak kaç saniye aktif kalır (kalıcı değil)

  // --- Faz D: Yeni gelin türleri (tek kişilik) ---
  callerCooldown: 6, // caller kaç saniyede bir yakındakileri çağırır
  callerRadius: 7, // çağrının etki yarıçapı (hücre)
  splitChildSpeedMul: 1.28, // bölünen yavrular biraz daha hızlı
  climberSpeedMul: 0.6, // duvar tırmanan yavaş ilerler (gerçekçi/tırmanır gibi)
  queenHp: 6, // kraliçe kaç isabetle ölür
  queenSpeedMul: 0.72, // kraliçe yavaş ama asla durmaz
  queenScale: 1.6, // kraliçe görsel büyüklük çarpanı
  queenEveryLevels: 4, // her bu kadar bölümde bir kraliçe (4, 8...)
  queenReward: 8, // kraliçe öldürünce ekstra para
  queenDmgMul: 1.5, // kraliçe teması normalden 1.5 kat hasar
  splitChildScale: 0.62, // bölünen yavru görsel boyutu
  splitChildDmgMul: 0.6, // bölünen yavru normalden %40 az hasar

  // --- KILIÇ (temel silah; mermiyle ARASINDA geçiş yapılır, mermiyi tüketmez) ---
  swordRange: 1.35, // baktığın yönde bu mesafedeki gelinler biçilir (~1 kare)
  swordArc: Math.PI * 0.62, // vuruş konisi (baktığın yön ± ~56°)
  swordMaxTargets: 2, // TEK darbede en fazla 2 gelin
  swordCd: 0.45, // vuruşlar arası bekleme (saniye)
  swordPvpDmg: 50, // oyuncuya vuruş hasarı → 100 can = 2 vuruş (55 can da 2 vuruş)
  swordSwingSec: 0.18, // savurma animasyonu süresi (çizim)
  swordQueenDmg: 2, // kraliçe (çok canlı) kılıçla 2 hasar alır

  // --- Asker (kurtarılabilir müttefik, eski "rehin") ---
  soldierFireCd: 3, // asker kaç saniyede bir ateş eder
  soldierRange: 8, // asker bu menzildeki gelinlere ateş eder (hücre)
  soldierRespawnSec: 8, // ölen asker kaç saniye sonra başka yerde doğar
  soldierMaxHp: 30, // asker canı (temasla azalır; CONTACT_DPS 20 → ~1.5 sn dayanır = 1.5x)
};
