// BLACKOUT — para (coin) sistemi. KALICI (localStorage), koşular arası birikir.
// İleride dükkân/harcama için temel. Şimdilik mini-görevlerden kazanılır
// (yüzük = +2 para); başka kaynaklar sonra eklenecek.
const KEY = "blackout_coins";
// Başlangıç altını 0: dükkânda ALTIN SATIŞI YOK, altın yalnız oynayarak kazanılır.
// (Eskiden 1000'di; dükkânın tamamı ~645 altındı → oyuncu hiç oynamadan her şeyi alıyordu.)
const STARTER = 0;
let mem = 0; // localStorage yoksa (SSR/test) bellek yedeği

// Uygulama açılışında BİR KEZ: hiç para kaydı yoksa (yeni oyuncu) 1000 altın ver.
export function initStarterCoins() {
  try {
    if (localStorage.getItem(KEY) === null) {
      localStorage.setItem(KEY, String(STARTER));
      mem = STARTER;
    }
  } catch {
    if (mem === 0) mem = STARTER;
  }
}

export function getCoins(): number {
  try {
    const v = localStorage.getItem(KEY);
    if (v !== null) return Math.max(0, parseInt(v, 10) || 0);
  } catch {
    /* geç */
  }
  return mem;
}

// n kadar ekle (negatif = harca), yeni toplamı döndür.
export function addCoins(n: number): number {
  const total = Math.max(0, getCoins() + n);
  mem = total;
  try {
    localStorage.setItem(KEY, String(total));
  } catch {
    /* geç */
  }
  return total;
}
