// BLACKOUT — başarımlar (Faz F / Madde 17). Kilit koşulları oyun akışında tetiklenir;
// açılanlar localStorage'da saklanır. Menüde rozet vitrini + açılınca sonuç ekranında bildirim.
// Her başarımın ZORLUĞUNA göre bir ALTIN ödülü var; açılınca "Ödülü Al" ile bir kez alınır.
import { addCoins, getCoins } from "./coins";

export type AchTier = "kolay" | "orta" | "zor";
export type Achievement = { id: string; title: string; desc: string; icon: string; reward: number; tier: AchTier };

// 50 başarım — 10 KOLAY, 30 ORTA, 10 ZOR. Ödül zorlukla artar.
export const ACHIEVEMENTS: Achievement[] = [
  // --- KOLAY (10) ---
  { id: "first_kill", title: "İlk Kan", desc: "İlk gelini yok et.", icon: "🩸", reward: 10, tier: "kolay" },
  { id: "reach3", title: "Derinlere", desc: "3. bölüme ulaş.", icon: "🕳", reward: 12, tier: "kolay" },
  { id: "first_coin", title: "İlk Ganimet", desc: "10 altın biriktir.", icon: "🪙", reward: 10, tier: "kolay" },
  { id: "shopper", title: "Müşteri", desc: "Dükkândan ilk alışverişini yap.", icon: "🛒", reward: 10, tier: "kolay" },
  { id: "collector", title: "Arşivci", desc: "İlk günlük sayfasını bul.", icon: "📖", reward: 12, tier: "kolay" },
  { id: "taste_dark", title: "Karanlığın Tadı", desc: "İlk kez öl (herkes ölür).", icon: "💀", reward: 10, tier: "kolay" },
  { id: "use_shield", title: "Kalkan Ardında", desc: "Bir kez kalkan kullan.", icon: "🛡", reward: 10, tier: "kolay" },
  { id: "use_radar", title: "Yön Bul", desc: "Bir kez radar kullan.", icon: "📡", reward: 10, tier: "kolay" },
  { id: "use_trap", title: "İlk Tuzak", desc: "Bir kez tuzak kur.", icon: "🕸", reward: 10, tier: "kolay" },
  { id: "kills10", title: "Avcı Çırağı", desc: "Toplam 10 gelin öldür.", icon: "🗡", reward: 15, tier: "kolay" },
  // --- ORTA (30) ---
  { id: "reach5", title: "Yarı Yol", desc: "5. bölüme ulaş.", icon: "🗺️", reward: 25, tier: "orta" },
  { id: "reach8", title: "Cesur", desc: "8. bölüme ulaş.", icon: "🔥", reward: 40, tier: "orta" },
  { id: "flawless", title: "Hayalet Gibi", desc: "Bir bölümü hiç hasar almadan bitir.", icon: "✨", reward: 35, tier: "orta" },
  { id: "queenslayer", title: "Kraliçe Avcısı", desc: "Bir gelin kraliçesini öldür.", icon: "👑", reward: 45, tier: "orta" },
  { id: "savior", title: "Kurtarıcı", desc: "Zincirli bir askeri kurtar.", icon: "🤝", reward: 40, tier: "orta" },
  { id: "escapist", title: "Kıl Payı", desc: "Çöken bir çıkıştan sağ çık.", icon: "🧨", reward: 40, tier: "orta" },
  { id: "rich", title: "Karanlık Zengini", desc: "100 altın biriktir.", icon: "🪙", reward: 20, tier: "orta" },
  { id: "kills50", title: "Avcı", desc: "Toplam 50 gelin öldür.", icon: "🗡", reward: 25, tier: "orta" },
  { id: "kills100", title: "Kâbus Avcısı", desc: "Toplam 100 gelin öldür.", icon: "🗡", reward: 35, tier: "orta" },
  { id: "deaths5", title: "Ölümle Dost", desc: "5 kez öl.", icon: "💀", reward: 20, tier: "orta" },
  { id: "games10", title: "Israrcı", desc: "10 oyun oyna (biten koşu).", icon: "♾", reward: 20, tier: "orta" },
  { id: "clears20", title: "Koridor Ustası", desc: "Toplam 20 bölüm geç.", icon: "🗺️", reward: 30, tier: "orta" },
  { id: "coins500", title: "Altın Avı", desc: "500 altın biriktir.", icon: "🪙", reward: 30, tier: "orta" },
  { id: "coins1500", title: "Kasa", desc: "1500 altın biriktir.", icon: "🪙", reward: 40, tier: "orta" },
  { id: "journal7", title: "Yarım Hikâye", desc: "7 günlük sayfası bul.", icon: "📖", reward: 25, tier: "orta" },
  { id: "secrets6", title: "Sırdaş", desc: "6 sır aç.", icon: "🖼", reward: 30, tier: "orta" },
  { id: "missions3", title: "Görevli", desc: "3 görev tamamla.", icon: "🎯", reward: 25, tier: "orta" },
  { id: "missions6", title: "Kıdemli", desc: "6 görev tamamla.", icon: "🎯", reward: 35, tier: "orta" },
  { id: "endless60", title: "Dayanıklı", desc: "Bitmeyen Gece'de 60 sn dayan.", icon: "♾", reward: 25, tier: "orta" },
  { id: "endless180", title: "Uzun Gece", desc: "Bitmeyen Gece'de 180 sn dayan.", icon: "♾", reward: 40, tier: "orta" },
  { id: "arena5", title: "Arenacı", desc: "Arena'da 5. dalgaya ulaş.", icon: "⚔", reward: 30, tier: "orta" },
  { id: "arena10", title: "Gladyatör", desc: "Arena'da 10. dalgaya ulaş.", icon: "⚔", reward: 40, tier: "orta" },
  { id: "kor60", title: "Kör Cesaret", desc: "Kör Gece'de 60 sn dayan.", icon: "🌑", reward: 30, tier: "orta" },
  { id: "horde5", title: "Sürü Kırıcı", desc: "Sürü Gecesi'nde 5. dalgaya ulaş.", icon: "🐝", reward: 35, tier: "orta" },
  { id: "use_veil", title: "Duvağın Altında", desc: "Bir kez duvak (görünmezlik) kullan.", icon: "👰", reward: 20, tier: "orta" },
  { id: "flawless3", title: "Üç Kez Hayalet", desc: "3 bölümü hasarsız bitir.", icon: "✨", reward: 40, tier: "orta" },
  { id: "queen3", title: "Taç Kırıcı", desc: "3 kraliçe öldür.", icon: "👑", reward: 40, tier: "orta" },
  { id: "escapes3", title: "Kaçış Sanatı", desc: "3 çöken çıkıştan kaç.", icon: "🧨", reward: 35, tier: "orta" },
  { id: "buy_perm", title: "Silahlı", desc: "Sürekli cephane geliştirmesini al.", icon: "🔫", reward: 25, tier: "orta" },
  { id: "buy_life", title: "Yedek Can", desc: "Ekstra can satın al.", icon: "❤", reward: 25, tier: "orta" },
  // --- ZOR (10) ---
  { id: "win", title: "Gün Ağardı", desc: "10 bölümün hepsinden sağ çık.", icon: "🌅", reward: 80, tier: "zor" },
  { id: "win_hard", title: "Karanlığın Efendisi", desc: "Zor'da 10 bölümü bitir.", icon: "👑", reward: 120, tier: "zor" },
  { id: "kills300", title: "Katliam", desc: "Toplam 300 gelin öldür.", icon: "🗡", reward: 70, tier: "zor" },
  { id: "missions_all", title: "Görev Ustası", desc: "12 görevin hepsini bitir.", icon: "🎯", reward: 90, tier: "zor" },
  { id: "secrets_all", title: "Kâhin", desc: "12 sırrın hepsini aç.", icon: "🖼", reward: 90, tier: "zor" },
  { id: "journal_all", title: "Tarihçi", desc: "14 günlük sayfasının hepsini bul.", icon: "📖", reward: 70, tier: "zor" },
  { id: "endless300", title: "Ölümsüz", desc: "Bitmeyen Gece'de 300 sn dayan.", icon: "♾", reward: 90, tier: "zor" },
  { id: "arena20", title: "Arena Kralı", desc: "Arena'da 20. dalgaya ulaş.", icon: "⚔", reward: 100, tier: "zor" },
  { id: "queen5", title: "Kraliçe Kâbusu", desc: "5 kraliçe öldür.", icon: "👑", reward: 70, tier: "zor" },
  { id: "rich5000", title: "Karanlık Hazinedarı", desc: "5000 altın biriktir.", icon: "🪙", reward: 80, tier: "zor" },
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
  use_shield: (s) => (s.shieldUses ?? 0) >= 1,
  use_radar: (s) => (s.radarUses ?? 0) >= 1,
  use_trap: (s) => (s.trapUses ?? 0) >= 1,
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
  buy_life: (_s, c) => c.extraLives >= 1,
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
