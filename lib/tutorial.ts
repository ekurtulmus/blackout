// BLACKOUT — Rehberli 1. Bölüm (tutorial). Kampanya level 1 (görev değil) LABİRENT
// DEĞİL: tek yönlü, çıkmazsız KIVRIMLI KORİDOR. Oyuncu ilerledikçe oyun kademe kademe
// tanıtılır (kılıç → gelin → tabanca+mermi → gelin → 3 can → duvak → gelin → dükkân →
// "gerisi labirent"). Motor bu senaryoyu (beats) yol ilerlemesine göre işletir.
import type { Vec } from "./types";
import type { Maze } from "./maze";

// Kıvrımlı koridor (boustrophedon): tek genişlikte yılan yol; başka her yer duvar.
// Döner: maze + başlangıçtan çıkışa SIRALI yol hücreleri (path[0]=başlangıç, son=çıkış).
export function buildTutorialCorridor(): { maze: Maze; path: Vec[] } {
  const cols = 15;
  const rows = 11; // tek sayı; 5 yatay koridor (y=1,3,5,7,9)
  const walls: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => true)
  );
  const path: Vec[] = [];
  const carve = (x: number, y: number) => {
    walls[y][x] = false;
  };
  const rowsY = [1, 3, 5, 7, 9];
  for (let ri = 0; ri < rowsY.length; ri++) {
    const y = rowsY[ri];
    const leftToRight = ri % 2 === 0;
    if (leftToRight) {
      for (let x = 1; x <= cols - 2; x++) {
        carve(x, y);
        path.push({ x, y });
      }
    } else {
      for (let x = cols - 2; x >= 1; x--) {
        carve(x, y);
        path.push({ x, y });
      }
    }
    // Alt koridora bağlayıcı (son satır hariç)
    if (ri < rowsY.length - 1) {
      const cx = leftToRight ? cols - 2 : 1; // bu satırın bittiği uç
      carve(cx, y + 1);
      path.push({ x: cx, y: y + 1 });
    }
  }
  return { maze: { cols, rows, walls }, path };
}

// Senaryo aşaması (beat). `at` = yol ilerlemesinin oranı (0..1); oyuncu o hücreyi
// GEÇİNCE beat tetiklenir: ipucu yazısı gösterilir + action uygulanır.
export type TutAction =
  | "start"
  | "sword" // yerde kılıç → kilit açılır
  | "bride" // önde gelin doğ (zararsız aşamada canını götürmez)
  | "gun" // yerde tabanca+mermi → mermi verilir
  | "health" // can barı belirir + 3 can + dokunulmazlık kapanır (hasar başlar)
  | "veil" // yerde duvak → otomatik görünmez ol
  | "brideVeil" // duvaklıyken gelin doğ (etkisi geçince saldırır)
  | "shop" // altın kazanıldı → dükkânı işaret et
  | "openexit"; // "gerisi labirent" → çıkış açılır

export type TutBeat = { at: number; hint: string; action: TutAction };

// Sıra ÖNEMLİ (yol boyunca artan `at`). Motor bunları path index'e çevirir.
export const TUTORIAL_BEATS: TutBeat[] = [
  { at: 0.0, hint: "Karanlıktasın. Fenerin baktığın yeri aydınlatır — ilerle.", action: "start" },
  { at: 0.12, hint: "Yerde bir KILIÇ var! Al ve yaklaşan geline saldır.", action: "sword" },
  { at: 0.2, hint: "Bir gelin geliyor — üstüne git ve SALDIR!", action: "bride" },
  { at: 0.33, hint: "TABANCA + mermi buldun! Silahını değiştir, sonra ateş et.", action: "gun" },
  { at: 0.41, hint: "Bu gelini uzaktan vur — ATEŞ et!", action: "bride" },
  { at: 0.53, hint: "Artık 3 CANIN var. Dikkat: bundan sonra gelinler canını götürür!", action: "health" },
  { at: 0.63, hint: "DUVAK aldın — birkaç saniye GÖRÜNMEZ oldun.", action: "veil" },
  { at: 0.71, hint: "Görünmezken gelin seni fark etmez… ama duvak bitince saldırır!", action: "brideVeil" },
  { at: 0.83, hint: "Gelini indirince ALTIN kazandın! İstersen DÜKKÂN'a göz at.", action: "shop" },
  { at: 0.92, hint: "Bundan sonrası gerçek LABİRENT. Çıkışa ulaş ve maceraya başla!", action: "openexit" },
];

// Beat'lerin path index karşılıkları (artan, benzersiz). Motor kurulumda bir kez üretir.
export function tutorialBeatIndices(pathLen: number): number[] {
  const last = Math.max(0, pathLen - 1);
  let prev = -1;
  return TUTORIAL_BEATS.map((b) => {
    let idx = Math.round(b.at * last);
    if (idx <= prev) idx = prev + 1; // sıralı ve benzersiz tut
    prev = idx;
    return Math.min(idx, last);
  });
}

// Yerde çizilen tutorial eşyaları (görsel). Motor beat tetikleyince taken=true yapar.
export type TutItemKind = "sword" | "gun" | "veil";
