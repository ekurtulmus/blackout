// BLACKOUT — başarımlar (Faz F / Madde 17). Kilit koşulları oyun akışında tetiklenir;
// açılanlar localStorage'da saklanır. Menüde rozet vitrini + açılınca sonuç ekranında bildirim.

export type Achievement = { id: string; title: string; desc: string; icon: string };

export const ACHIEVEMENTS: Achievement[] = [
  { id: "first_kill", title: "İlk Kan", desc: "İlk gelini yok et.", icon: "🩸" },
  { id: "reach3", title: "Derinlere", desc: "3. bölüme ulaş.", icon: "🕳" },
  { id: "reach5", title: "Yarı Yol", desc: "5. bölüme ulaş.", icon: "🗺️" },
  { id: "reach8", title: "Cesur", desc: "8. bölüme ulaş.", icon: "🔥" },
  { id: "flawless", title: "Hayalet Gibi", desc: "Bir bölümü hiç hasar almadan bitir.", icon: "✨" },
  { id: "queenslayer", title: "Kraliçe Avcısı", desc: "Bir gelin kraliçesini öldür.", icon: "👑" },
  { id: "savior", title: "Kurtarıcı", desc: "Zincirli bir askeri kurtar.", icon: "🤝" },
  { id: "escapist", title: "Kıl Payı", desc: "Çöken bir çıkıştan sağ çık.", icon: "🧨" },
  { id: "rich", title: "Karanlık Zengini", desc: "100 para biriktir.", icon: "🪙" },
  { id: "shopper", title: "Müşteri", desc: "Dükkândan ilk alışverişini yap.", icon: "🛒" },
  { id: "collector", title: "Arşivci", desc: "İlk günlük sayfasını bul.", icon: "📖" },
  { id: "win", title: "Gün Ağardı", desc: "10 bölümün hepsinden sağ çık.", icon: "🌅" },
];

const KEY = "blackout_achievements";
let mem: string[] = [];

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
