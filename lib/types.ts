// BLACKOUT — ortak tipler

export type Vec = { x: number; y: number };

// Hücre görüş durumu: hiç görülmedi / hafızada (soluk) / şu an aydınlık
export type CellVisibility = 0 | 1 | 2; // 0 = unseen, 1 = memory, 2 = visible

// Gelin arketipleri: normal / karanlıkta hızlanan (dark) / mukus bırakan (mucus)
export type BrideKind = "normal" | "dark" | "mucus";

export type Zombie = {
  id: number;
  pos: Vec; // hücre biriminde (float)
  hp: number;
  aware: boolean; // oyuncuyu gördü mü / kovalıyor mu
  lastSeen: Vec | null; // oyuncunun son görüldüğü hücre
  seenTimer: number; // kaç saniyedir oyuncuyu görmüyor
  wanderDir: Vec; // aylak dolaşma yönü
  wanderTimer: number;
  path: Vec[] | null; // hedefe giden yol (hücre listesi)
  repathTimer: number;
  kind?: BrideKind; // arketip (yok = normal)
  speedMul?: number; // hız çarpanı (mini-görev "yüzük" → bir gelin delirir/hızlanır); tavan yine geçerli
};

// Mukus lekesi (Madde 7): ölen mukus gelininin hücresinde kalan hasar bölgesi
export type Mucus = { x: number; y: number; until: number };

export type Ammo = {
  id: number;
  cell: Vec; // hücre koordinatı
  taken: boolean;
  takenAt?: number; // toplandığı an (saniye) — respawn için
};

export type Bullet = {
  id: number;
  pos: Vec;
  vel: Vec; // hücre/saniye
  life: number; // saniye
};

export type LevelConfig = {
  level: number;
  cols: number; // labirent hücre genişliği (tek sayı)
  rows: number; // labirent hücre yüksekliği (tek sayı)
  zombies: number;
  zombieSpeed: number; // hücre/saniye
  ammoBuffer: number; // zombi sayısına eklenen tampon mermi
  visionRadius: number; // hücre cinsinden görüş yarıçapı
  braid: number; // 0..1 ne kadar döngü açılsın (çıkmaz azalt)
  openness: number; // 0..1 labirente açılan oda/boşluk miktarı
  intelligence: number; // 0..1 zombi zekâsı (seviyeyle artar)
};

export type GameStatus =
  | "menu"
  | "playing"
  | "dead" // bir can gitti, bölüm başa dönecek
  | "levelclear"
  | "gameover"
  | "win";

export type Phase = {
  status: GameStatus;
};
