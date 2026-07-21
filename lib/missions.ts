// Görev Modu — tek kişilik, elle tasarlanmış hedef odaklı görevler.
// Mevcut motoru (engine.ts) kullanır; her görev bazı kuralları değiştirir.

import type { DictKey } from "@/lib/i18n/dict";

// title / brief / objectiveHint ÇEVİRİ ANAHTARIDIR (metin değil): ekrana basan bileşen
// t(m.title) / t(m.brief) / t(m.objectiveHint) çağırır.
// Metinler: lib/i18n/dict/parts/missions.ts
//   title → "mis.<id>.title" · brief → "mis.<id>.desc" · objectiveHint → "mis.<id>.hint"
export type Mission = {
  id: number;
  title: DictKey;
  brief: DictKey; // oyun başında gösterilen kısa açıklama
  objectiveHint: DictKey; // liste ekranında tek satır hedef
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
  arena?: boolean; // Arena: dalga hayatta kalma — her N öldürmede dalga artar, skor=dalga
  escape?: boolean; // Faz E: kaçış görevi — çıkış çöküyor, geri sayımla kaç
  escapeSeconds?: number; // kaçış için saniye
  escort?: boolean; // Askeri bul, zincirini çöz ve çıkışa birlikte götür
};

export const MISSIONS: Mission[] = [
  {
    id: 1,
    title: "mis.1.title",
    brief: "mis.1.desc",
    objectiveHint: "mis.1.hint",
    levelBase: 2,
    lives: 3,
    killTarget: 3,
  },
  {
    id: 2,
    title: "mis.2.title",
    brief: "mis.2.desc",
    objectiveHint: "mis.2.hint",
    levelBase: 3,
    lives: 2,
    escape: true,
    escapeSeconds: 90,
    exitOpenAtStart: true,
  },
  {
    id: 3,
    title: "mis.3.title",
    brief: "mis.3.desc",
    objectiveHint: "mis.3.hint",
    levelBase: 3,
    lives: 2,
    collectTarget: 3,
  },
  {
    id: 4,
    title: "mis.4.title",
    brief: "mis.4.desc",
    objectiveHint: "mis.4.hint",
    levelBase: 4,
    lives: 1,
    zombies: 14,
    surviveTime: 60,
  },
  {
    id: 5,
    title: "mis.5.title",
    brief: "mis.5.desc",
    objectiveHint: "mis.5.hint",
    levelBase: 3,
    lives: 2,
    visionMul: 0.55,
    killTarget: 1,
  },
  {
    id: 6,
    title: "mis.6.title",
    brief: "mis.6.desc",
    objectiveHint: "mis.6.hint",
    levelBase: 3,
    lives: 2,
    noFire: true,
    exitOpenAtStart: true,
  },
  {
    id: 7,
    title: "mis.7.title",
    brief: "mis.7.desc",
    objectiveHint: "mis.7.hint",
    levelBase: 4,
    lives: 1,
    killTarget: 1,
  },
  {
    id: 8,
    title: "mis.8.title",
    brief: "mis.8.desc",
    objectiveHint: "mis.8.hint",
    levelBase: 6,
    lives: 2,
    zombies: 22,
    killTarget: 5,
    timeLimit: 150,
  },
  {
    id: 9,
    title: "mis.9.title",
    brief: "mis.9.desc",
    objectiveHint: "mis.9.hint",
    levelBase: 4,
    lives: 2,
    escort: true,
    exitOpenAtStart: true,
  },
  {
    id: 10,
    title: "mis.10.title",
    brief: "mis.10.desc",
    objectiveHint: "mis.10.hint",
    levelBase: 5,
    lives: 2,
    zombies: 18,
    killTarget: 8,
  },
  {
    id: 11,
    title: "mis.11.title",
    brief: "mis.11.desc",
    objectiveHint: "mis.11.hint",
    levelBase: 4,
    lives: 2,
    visionMul: 0.4,
    noFire: true,
    exitOpenAtStart: true,
  },
  {
    id: 12,
    title: "mis.12.title",
    brief: "mis.12.desc",
    objectiveHint: "mis.12.hint",
    levelBase: 5,
    lives: 1,
    zombies: 16,
    visionMul: 0.75,
    surviveTime: 75,
  },
];

export function missionById(id: number): Mission | undefined {
  return MISSIONS.find((m) => m.id === id);
}

// Ayrı mod: Sonsuz Hayatta Kalma (görev listesinde değil, menüden ayrı)
export const ENDLESS: Mission = {
  id: 100,
  title: "mis.100.title",
  brief: "mis.100.desc",
  objectiveHint: "mis.100.hint",
  levelBase: 4,
  lives: 1,
  zombies: 10,
  endless: true,
  escalateEvery: 18, // her 18 sn bir ekstra gelin
};

// Kör Gece — fenersiz, kapkaranlık hayatta kalma (endless türevi). Skor = süre.
export const KOR_GECE: Mission = {
  id: 102,
  title: "mis.102.title",
  brief: "mis.102.desc",
  objectiveHint: "mis.102.hint",
  levelBase: 4,
  lives: 1,
  zombies: 8,
  endless: true,
  escalateEvery: 20,
  visionMul: 0.32,
};

// Sürü Gecesi — açık alanda yoğun dalga (arena türevi, çok daha kalabalık/hızlı).
export const HORDE: Mission = {
  id: 103,
  title: "mis.103.title",
  brief: "mis.103.desc",
  objectiveHint: "mis.103.hint",
  levelBase: 3,
  lives: 1,
  zombies: 18,
  arena: true,
  escalateEvery: 8,
};

// Ayrı mod: ARENA — dalga hayatta kalma. Her 6 öldürmede dalga artar, gelinler çoğalır.
// Skor = geçilen dalga. Öldürdükçe para + dalga bonusu kazanılır. Tek can.
export const ARENA: Mission = {
  id: 101,
  title: "mis.101.title",
  brief: "mis.101.desc",
  objectiveHint: "mis.101.hint",
  levelBase: 3,
  lives: 1,
  zombies: 8,
  arena: true,
  escalateEvery: 14,
};
