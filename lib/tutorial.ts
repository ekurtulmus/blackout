// BLACKOUT — Rehberli 1. Bölüm (tutorial). Kampanya level 1 (görev değil) LABİRENT
// DEĞİL: tek yönlü, çıkmazsız KIVRIMLI KORİDOR. Oyuncu ilerledikçe oyun kademe kademe
// tanıtılır (kılıç → gelin → tabanca+mermi → gelin → 3 can → duvak → gelin → dükkân →
// "gerisi labirent"). Motor bu senaryoyu (beats) yol ilerlemesine göre işletir.
import type { Vec } from "./types";
import type { Maze } from "./maze";
import type { DictKey } from "./i18n/dict";

// Kıvrımlı koridor (boustrophedon): tek genişlikte yılan yol; başka her yer duvar.
// Döner: maze + başlangıçtan çıkışa SIRALI yol hücreleri (path[0]=başlangıç, son=çıkış).
export function buildTutorialCorridor(): { maze: Maze; path: Vec[] } {
  const cols = 15;
  const rows = 15; // tek sayı; 7 yatay koridor (daha uzun rehber)
  const walls: boolean[][] = Array.from({ length: rows }, () =>
    Array.from({ length: cols }, () => true)
  );
  const path: Vec[] = [];
  const carve = (x: number, y: number) => {
    walls[y][x] = false;
  };
  const rowsY = [1, 3, 5, 7, 9, 11, 13];
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
  | "sword" // yerde kılıç → kilit açılır + ELE kuşanılır
  | "bride" // önde gelin doğ (SALDIRIR, canını götürebilir)
  | "gun" // yerde tabanca+mermi → mermi verilir + ELE kuşanılır
  | "sprint" // koşmayı tanıt (bilgi)
  | "veil" // yerde duvak → otomatik görünmez ol
  | "brideVeil" // duvaklıyken gelin doğ (etkisi geçince saldırır)
  | "shop" // altın kazanıldı → dükkânı işaret et
  | "openexit"; // "gerisi labirent" → çıkış açılır

// `hint` artık METİN DEĞİL, sözlük ANAHTARI (lib/i18n/dict/parts/game.ts). Motor React
// olmadığı için çeviremez; anahtarı Game.tsx `t(...)` ile ekrana basar.
export type TutBeat = { at: number; hint: DictKey; action: TutAction };

// Sıra ÖNEMLİ (yol boyunca artan `at`). Motor bunları path index'e çevirir.
// NOT: Gelinler 1. bölümde de SALDIRIR ve can götürür; can barı baştan görünür.
export const TUTORIAL_BEATS: TutBeat[] = [
  { at: 0.0, hint: "game.tut.start", action: "start" },
  { at: 0.09, hint: "game.tut.sword", action: "sword" },
  { at: 0.17, hint: "game.tut.bride1", action: "bride" },
  { at: 0.29, hint: "game.tut.gun", action: "gun" },
  { at: 0.37, hint: "game.tut.bride2", action: "bride" },
  { at: 0.48, hint: "game.tut.sprint", action: "sprint" },
  { at: 0.57, hint: "game.tut.bride3", action: "bride" },
  { at: 0.67, hint: "game.tut.veil", action: "veil" },
  { at: 0.75, hint: "game.tut.brideveil", action: "brideVeil" },
  { at: 0.86, hint: "game.tut.shop", action: "shop" },
  { at: 0.93, hint: "game.tut.openexit", action: "openexit" },
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
