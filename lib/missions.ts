// Görev Modu — tek kişilik, elle tasarlanmış hedef odaklı görevler.
// Mevcut motoru (engine.ts) kullanır; her görev bazı kuralları değiştirir.

export type Mission = {
  id: number;
  title: string;
  brief: string; // oyun başında gösterilen kısa açıklama
  objectiveHint: string; // liste ekranında tek satır hedef
  levelBase: number; // levelConfig temeli (harita boyutu/gelin/hız)
  lives: number; // görev tek denemelik; ölünce baştan
  visionMul?: number; // fener görüş çarpanı (fenersiz görevler için < 1)
  noFire?: boolean; // ateş yasak (sessiz görevler)
  zombies?: number; // gelin sayısını elle ayarla
  killTarget?: number; // bu kadar gelin öldür → çıkış açılır
  collectTarget?: number; // bu kadar parça topla → çıkış açılır
  timeLimit?: number; // bu süre içinde çıkışa ulaş, yoksa başarısız (sn)
  surviveTime?: number; // çıkış YOK; bu kadar dayan → başarı (sn)
  exitOpenAtStart?: boolean; // hedef yoksa çıkış baştan açık
  endless?: boolean; // Sonsuz Hayatta Kalma: çıkış yok, ölene kadar sür, skor=süre
  escalateEvery?: number; // endless: bu saniyede bir ekstra gelin doğar (zorluk artar)
  escape?: boolean; // Faz E: kaçış görevi — çıkış çöküyor, geri sayımla kaç
  escapeSeconds?: number; // kaçış için saniye
};

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "Avcı",
    brief: "Karanlıkta 3 gelini yok et, sonra çıkışı bul. Isınma turu.",
    objectiveHint: "3 gelin öldür → çık",
    levelBase: 2,
    lives: 3,
    killTarget: 3,
  },
  {
    id: 2,
    title: "Yıkım",
    brief: "Çıkış çöküyor! Tavan üstüne iniyor — 90 saniye içinde gizli kapıya ulaş yoksa altında kalırsın.",
    objectiveHint: "Çıkış çöküyor · 90 sn içinde kaç",
    levelBase: 3,
    lives: 2,
    escape: true,
    escapeSeconds: 90,
    exitOpenAtStart: true,
  },
  {
    id: 3,
    title: "Yüzük Parçaları",
    brief: "Kırık nişan yüzüğünün 3 parçasını topla, sonra çıkışı aç.",
    objectiveHint: "3 parça topla → çık",
    levelBase: 3,
    lives: 2,
    collectTarget: 3,
  },
  {
    id: 4,
    title: "Hayatta Kal",
    brief: "Çıkış yok. Gelinler her yerde. 60 saniye ne pahasına olursa olsun dayan.",
    objectiveHint: "60 sn dayan",
    levelBase: 4,
    lives: 1,
    zombies: 14,
    surviveTime: 60,
  },
  {
    id: 5,
    title: "Kör Karanlık",
    brief: "Fenerin neredeyse sönmüş. Daracık ışıkla bir gelini indir ve çık.",
    objectiveHint: "Çok dar görüş · 1 gelin → çık",
    levelBase: 3,
    lives: 2,
    visionMul: 0.55,
    killTarget: 1,
  },
  {
    id: 6,
    title: "Sessizlik",
    brief: "Silahın yok. Ateş edemezsin — gelinlerden sıvışıp çıkışa ulaş.",
    objectiveHint: "Ateş yasak · çıkışa ulaş",
    levelBase: 3,
    lives: 2,
    noFire: true,
    exitOpenAtStart: true,
  },
  {
    id: 7,
    title: "Tek Nefes",
    brief: "Tek canın var. Tek bir hata bile ölümcül. Bir gelin öldür ve çık.",
    objectiveHint: "Tek can · 1 gelin → çık",
    levelBase: 4,
    lives: 1,
    killTarget: 1,
  },
  {
    id: 8,
    title: "Kıyamet Düğünü",
    brief: "Final. Kalabalık bir sürüden 5 gelin indir ve 150 sn içinde kaç.",
    objectiveHint: "5 gelin öldür · 150 sn içinde çık",
    levelBase: 6,
    lives: 2,
    zombies: 22,
    killTarget: 5,
    timeLimit: 150,
  },
];

export function missionById(id: number): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

// Ayrı mod: Sonsuz Hayatta Kalma (görev listesinde değil, menüden ayrı)
export const ENDLESS: Mission = {
  id: 100,
  title: "Bitmeyen Gece",
  brief:
    "Çıkış yok, umut yok. Gelinler ölür ama geri döner ve gitgide çoğalır. Karanlıkta ne kadar dayanabilirsin? Dayandığın her saniye skorundur.",
  objectiveHint: "Ölene kadar dayan",
  levelBase: 4,
  lives: 1,
  zombies: 10,
  endless: true,
  escalateEvery: 18, // her 18 sn bir ekstra gelin
};
