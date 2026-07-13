// BLACKOUT — başarımlar (Faz F / Madde 17). Kilit koşulları oyun akışında tetiklenir;
// açılanlar localStorage'da saklanır. Menüde rozet vitrini + açılınca sonuç ekranında bildirim.
// Her başarımın ZORLUĞUNA göre bir ALTIN ödülü var; açılınca "Ödülü Al" ile bir kez alınır.
import { addCoins, getCoins } from "./coins";

export type Achievement = { id: string; title: string; desc: string; icon: string; reward: number };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_kill", title: "İlk Kan", desc: "İlk gelini yok et.", icon: "🩸", reward: 10 },
  { id: "reach3", title: "Derinlere", desc: "3. bölüme ulaş.", icon: "🕳", reward: 15 },
  { id: "reach5", title: "Yarı Yol", desc: "5. bölüme ulaş.", icon: "🗺️", reward: 25 },
  { id: "reach8", title: "Cesur", desc: "8. bölüme ulaş.", icon: "🔥", reward: 40 },
  { id: "flawless", title: "Hayalet Gibi", desc: "Bir bölümü hiç hasar almadan bitir.", icon: "✨", reward: 35 },
  { id: "queenslayer", title: "Kraliçe Avcısı", desc: "Bir gelin kraliçesini öldür.", icon: "👑", reward: 50 },
  { id: "savior", title: "Kurtarıcı", desc: "Zincirli bir askeri kurtar.", icon: "🤝", reward: 40 },
  { id: "escapist", title: "Kıl Payı", desc: "Çöken bir çıkıştan sağ çık.", icon: "🧨", reward: 40 },
  { id: "rich", title: "Karanlık Zengini", desc: "100 para biriktir.", icon: "🪙", reward: 20 },
  { id: "shopper", title: "Müşteri", desc: "Dükkândan ilk alışverişini yap.", icon: "🛒", reward: 10 },
  { id: "collector", title: "Arşivci", desc: "İlk günlük sayfasını bul.", icon: "📖", reward: 15 },
  { id: "win", title: "Gün Ağardı", desc: "10 bölümün hepsinden sağ çık.", icon: "🌅", reward: 100 },
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
