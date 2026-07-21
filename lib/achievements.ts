// BLACKOUT — başarımlar (Faz F / Madde 17). Kilit koşulları oyun akışında tetiklenir;
// açılanlar localStorage'da saklanır. Menüde rozet vitrini + açılınca sonuç ekranında bildirim.
// Her başarımın ZORLUĞUNA göre bir ALTIN ödülü var; açılınca "Ödülü Al" ile bir kez alınır.
import { addCoins, getCoins } from "./coins";
import type { DictKey } from "@/lib/i18n/dict";

export type AchTier = "kolay" | "orta" | "zor";
// title/desc ÇEVİRİ ANAHTARIDIR (metin değil): ekrana basan bileşen t(a.title) / t(a.desc) çağırır.
// Metinler: lib/i18n/dict/parts/missions.ts → "ach.<id>.title" / "ach.<id>.desc"
export type Achievement = { id: string; title: DictKey; desc: DictKey; icon: string; reward: number; tier: AchTier };

// Zorluk rozetinin etiketi de anahtardır (t(ACH_TIER_LABEL[a.tier])).
export const ACH_TIER_LABEL: Record<AchTier, DictKey> = {
  kolay: "ach.tier.kolay",
  orta: "ach.tier.orta",
  zor: "ach.tier.zor",
};

// 50 başarım — 10 KOLAY, 30 ORTA, 10 ZOR. Ödül zorlukla artar.
export const ACHIEVEMENTS: Achievement[] = [
  // --- KOLAY (10) ---
  { id: "first_kill", title: "ach.first_kill.title", desc: "ach.first_kill.desc", icon: "🩸", reward: 10, tier: "kolay" },
  { id: "reach3", title: "ach.reach3.title", desc: "ach.reach3.desc", icon: "🕳", reward: 12, tier: "kolay" },
  { id: "first_coin", title: "ach.first_coin.title", desc: "ach.first_coin.desc", icon: "🪙", reward: 10, tier: "kolay" },
  { id: "shopper", title: "ach.shopper.title", desc: "ach.shopper.desc", icon: "🛒", reward: 10, tier: "kolay" },
  { id: "collector", title: "ach.collector.title", desc: "ach.collector.desc", icon: "📖", reward: 12, tier: "kolay" },
  { id: "taste_dark", title: "ach.taste_dark.title", desc: "ach.taste_dark.desc", icon: "💀", reward: 10, tier: "kolay" },
  { id: "kills10", title: "ach.kills10.title", desc: "ach.kills10.desc", icon: "🗡", reward: 15, tier: "kolay" },
  // --- ORTA (30) ---
  { id: "reach5", title: "ach.reach5.title", desc: "ach.reach5.desc", icon: "🗺️", reward: 25, tier: "orta" },
  { id: "reach8", title: "ach.reach8.title", desc: "ach.reach8.desc", icon: "🔥", reward: 40, tier: "orta" },
  { id: "flawless", title: "ach.flawless.title", desc: "ach.flawless.desc", icon: "✨", reward: 35, tier: "orta" },
  { id: "queenslayer", title: "ach.queenslayer.title", desc: "ach.queenslayer.desc", icon: "👑", reward: 45, tier: "orta" },
  { id: "savior", title: "ach.savior.title", desc: "ach.savior.desc", icon: "🤝", reward: 40, tier: "orta" },
  { id: "escapist", title: "ach.escapist.title", desc: "ach.escapist.desc", icon: "🧨", reward: 40, tier: "orta" },
  { id: "rich", title: "ach.rich.title", desc: "ach.rich.desc", icon: "🪙", reward: 20, tier: "orta" },
  { id: "kills50", title: "ach.kills50.title", desc: "ach.kills50.desc", icon: "🗡", reward: 25, tier: "orta" },
  { id: "kills100", title: "ach.kills100.title", desc: "ach.kills100.desc", icon: "🗡", reward: 35, tier: "orta" },
  { id: "deaths5", title: "ach.deaths5.title", desc: "ach.deaths5.desc", icon: "💀", reward: 20, tier: "orta" },
  { id: "games10", title: "ach.games10.title", desc: "ach.games10.desc", icon: "♾", reward: 20, tier: "orta" },
  { id: "clears20", title: "ach.clears20.title", desc: "ach.clears20.desc", icon: "🗺️", reward: 30, tier: "orta" },
  { id: "coins500", title: "ach.coins500.title", desc: "ach.coins500.desc", icon: "🪙", reward: 30, tier: "orta" },
  { id: "coins1500", title: "ach.coins1500.title", desc: "ach.coins1500.desc", icon: "🪙", reward: 40, tier: "orta" },
  { id: "journal7", title: "ach.journal7.title", desc: "ach.journal7.desc", icon: "📖", reward: 25, tier: "orta" },
  { id: "secrets6", title: "ach.secrets6.title", desc: "ach.secrets6.desc", icon: "🖼", reward: 30, tier: "orta" },
  { id: "missions3", title: "ach.missions3.title", desc: "ach.missions3.desc", icon: "🎯", reward: 25, tier: "orta" },
  { id: "missions6", title: "ach.missions6.title", desc: "ach.missions6.desc", icon: "🎯", reward: 35, tier: "orta" },
  { id: "endless60", title: "ach.endless60.title", desc: "ach.endless60.desc", icon: "♾", reward: 25, tier: "orta" },
  { id: "endless180", title: "ach.endless180.title", desc: "ach.endless180.desc", icon: "♾", reward: 40, tier: "orta" },
  { id: "arena5", title: "ach.arena5.title", desc: "ach.arena5.desc", icon: "⚔", reward: 30, tier: "orta" },
  { id: "arena10", title: "ach.arena10.title", desc: "ach.arena10.desc", icon: "⚔", reward: 40, tier: "orta" },
  { id: "kor60", title: "ach.kor60.title", desc: "ach.kor60.desc", icon: "🌑", reward: 30, tier: "orta" },
  { id: "horde5", title: "ach.horde5.title", desc: "ach.horde5.desc", icon: "🐝", reward: 35, tier: "orta" },
  { id: "use_veil", title: "ach.use_veil.title", desc: "ach.use_veil.desc", icon: "👰", reward: 20, tier: "orta" },
  { id: "flawless3", title: "ach.flawless3.title", desc: "ach.flawless3.desc", icon: "✨", reward: 40, tier: "orta" },
  { id: "queen3", title: "ach.queen3.title", desc: "ach.queen3.desc", icon: "👑", reward: 40, tier: "orta" },
  { id: "escapes3", title: "ach.escapes3.title", desc: "ach.escapes3.desc", icon: "🧨", reward: 35, tier: "orta" },
  { id: "buy_perm", title: "ach.buy_perm.title", desc: "ach.buy_perm.desc", icon: "🔫", reward: 25, tier: "orta" },
  // --- ZOR (10) ---
  { id: "win", title: "ach.win.title", desc: "ach.win.desc", icon: "🌅", reward: 80, tier: "zor" },
  { id: "win_hard", title: "ach.win_hard.title", desc: "ach.win_hard.desc", icon: "👑", reward: 120, tier: "zor" },
  { id: "kills300", title: "ach.kills300.title", desc: "ach.kills300.desc", icon: "🗡", reward: 70, tier: "zor" },
  { id: "missions_all", title: "ach.missions_all.title", desc: "ach.missions_all.desc", icon: "🎯", reward: 90, tier: "zor" },
  { id: "secrets_all", title: "ach.secrets_all.title", desc: "ach.secrets_all.desc", icon: "🖼", reward: 90, tier: "zor" },
  { id: "journal_all", title: "ach.journal_all.title", desc: "ach.journal_all.desc", icon: "📖", reward: 70, tier: "zor" },
  { id: "endless300", title: "ach.endless300.title", desc: "ach.endless300.desc", icon: "♾", reward: 90, tier: "zor" },
  { id: "arena20", title: "ach.arena20.title", desc: "ach.arena20.desc", icon: "⚔", reward: 100, tier: "zor" },
  { id: "queen5", title: "ach.queen5.title", desc: "ach.queen5.desc", icon: "👑", reward: 70, tier: "zor" },
  { id: "rich5000", title: "ach.rich5000.title", desc: "ach.rich5000.desc", icon: "🪙", reward: 80, tier: "zor" },
];

const KEY = "blackout_achievements";
const CLAIM_KEY = "blackout_ach_claimed";
let mem: string[] = [];
let claimMem: string[] = [];

export function getUnlocked(): string[] {
  try {
    const v = localStorage.getItem(KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return mem.slice();
}

export function isUnlocked(id: string): boolean {
  return getUnlocked().includes(id);
}

// Aç; yeni açıldıysa true döner (bildirim için).
export function unlock(id: string): boolean {
  const cur = getUnlocked();
  if (cur.includes(id)) return false;
  const next = [...cur, id];
  mem = next;
  try {
    localStorage.setItem(KEY, JSON.stringify(next));
  } catch {
    /* geç */
  }
  return true;
}

export function achievementById(id: string): Achievement | undefined {
  return ACHIEVEMENTS.find((a) => a.id === id);
}

// --- Ödül alma (bir kez) ---
export function getClaimed(): string[] {
  try {
    const v = localStorage.getItem(CLAIM_KEY);
    if (v) return JSON.parse(v);
  } catch {
    /* geç */
  }
  return claimMem.slice();
}

export function isClaimed(id: string): boolean {
  return getClaimed().includes(id);
}

// Açık ve daha önce alınmamışsa ödülü ver. { ok, reward, coins } döndürür.
export function claimReward(id: string): { ok: boolean; reward: number; coins: number } {
  const a = achievementById(id);
  if (!a) return { ok: false, reward: 0, coins: getCoins() };
  if (!isUnlocked(id) || isClaimed(id)) return { ok: false, reward: a.reward, coins: getCoins() };
  const claimed = [...getClaimed(), id];
  claimMem = claimed;
  try {
    localStorage.setItem(CLAIM_KEY, JSON.stringify(claimed));
  } catch {
    /* geç */
  }
  const coins = addCoins(a.reward);
  return { ok: true, reward: a.reward, coins };
}

// Alınmayı bekleyen (açık + alınmamış) ödül sayısı — menü rozeti için
export function pendingRewardCount(): number {
  const claimed = getClaimed();
  return getUnlocked().filter((id) => !claimed.includes(id)).length;
}

// --- Kümülatif istatistikler (başarım koşulları için) ---
const STATS_KEY = "blackout_stats";
export type Stats = Record<string, number>;
let statsMem: Stats = {};

export function getStats(): Stats {
  try {
    const v = localStorage.getItem(STATS_KEY);
    if (v) return { ...JSON.parse(v) };
  } catch {
    /* geç */
  }
  return { ...statsMem };
}
function saveStats(s: Stats) {
  statsMem = s;
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(s));
  } catch {
    /* geç */
  }
}
// Bir istatistiği artır (kümülatif toplam).
export function bumpStat(key: string, n = 1): Stats {
  const s = getStats();
  s[key] = (s[key] ?? 0) + n;
  saveStats(s);
  return s;
}
// Bir istatistiği "en yüksek" olarak sakla (ör. ulaşılan en yüksek bölüm).
export function setStatMax(key: string, n: number): Stats {
  const s = getStats();
  if (n > (s[key] ?? 0)) {
    s[key] = n;
    saveStats(s);
  }
  return s;
}

// Başarım değerlendirme bağlamı — kümülatif olmayan (anlık) veriler dışarıdan gelir.
export type AchCtx = {
  coins: number; // güncel cüzdan
  journal: number; // toplanan günlük sayfa sayısı
  secrets: number; // açılan sır sayısı
  missions: number; // tamamlanan görev sayısı
  endlessBest: number; // sn
  korBest: number; // sn
  arenaBest: number; // dalga
  hordeBest: number; // dalga
  permAmmo: boolean;
  extraLives: number;
  wonHard: boolean; // Zor'da 10 bölüm bitirildi mi (bu koşuda)
};

// Koşul tablosu — her başarım için (stats + ctx) → açık mı? Emoji-serbest, saf mantık.
const COND: Record<string, (s: Stats, c: AchCtx) => boolean> = {
  first_kill: (s) => (s.kills ?? 0) >= 1,
  reach3: (s) => (s.maxLevel ?? 0) >= 3,
  first_coin: (_s, c) => c.coins >= 10,
  taste_dark: (s) => (s.deaths ?? 0) >= 1,
  kills10: (s) => (s.kills ?? 0) >= 10,
  reach5: (s) => (s.maxLevel ?? 0) >= 5,
  reach8: (s) => (s.maxLevel ?? 0) >= 8,
  flawless: (s) => (s.flawless ?? 0) >= 1,
  queenslayer: (s) => (s.queen ?? 0) >= 1,
  savior: (s) => (s.hostages ?? 0) >= 1,
  escapist: (s) => (s.escapes ?? 0) >= 1,
  rich: (_s, c) => c.coins >= 100,
  kills50: (s) => (s.kills ?? 0) >= 50,
  kills100: (s) => (s.kills ?? 0) >= 100,
  deaths5: (s) => (s.deaths ?? 0) >= 5,
  games10: (s) => (s.games ?? 0) >= 10,
  clears20: (s) => (s.clears ?? 0) >= 20,
  coins500: (_s, c) => c.coins >= 500,
  coins1500: (_s, c) => c.coins >= 1500,
  journal7: (_s, c) => c.journal >= 7,
  secrets6: (_s, c) => c.secrets >= 6,
  missions3: (_s, c) => c.missions >= 3,
  missions6: (_s, c) => c.missions >= 6,
  endless60: (_s, c) => c.endlessBest >= 60,
  endless180: (_s, c) => c.endlessBest >= 180,
  arena5: (_s, c) => c.arenaBest >= 5,
  arena10: (_s, c) => c.arenaBest >= 10,
  kor60: (_s, c) => c.korBest >= 60,
  horde5: (_s, c) => c.hordeBest >= 5,
  use_veil: (s) => (s.veilUses ?? 0) >= 1,
  flawless3: (s) => (s.flawless ?? 0) >= 3,
  queen3: (s) => (s.queen ?? 0) >= 3,
  escapes3: (s) => (s.escapes ?? 0) >= 3,
  buy_perm: (_s, c) => c.permAmmo,
  win: (s) => (s.wins ?? 0) >= 1,
  win_hard: (_s, c) => c.wonHard,
  kills300: (s) => (s.kills ?? 0) >= 300,
  missions_all: (_s, c) => c.missions >= 12,
  secrets_all: (_s, c) => c.secrets >= 12,
  journal_all: (_s, c) => c.journal >= 14,
  endless300: (_s, c) => c.endlessBest >= 300,
  arena20: (_s, c) => c.arenaBest >= 20,
  queen5: (s) => (s.queen ?? 0) >= 5,
  rich5000: (_s, c) => c.coins >= 5000,
};

// Tüm koşulları değerlendir; yeni açılanların id listesini döndür (bildirim için).
export function evaluateAll(ctx: AchCtx): string[] {
  const s = getStats();
  const newly: string[] = [];
  for (const a of ACHIEVEMENTS) {
    if (isUnlocked(a.id)) continue;
    const f = COND[a.id];
    if (f && f(s, ctx) && unlock(a.id)) newly.push(a.id);
  }
  return newly;
}
