// BLACKOUT — tema süslemeleri (Faz 5 / Madde 11). Zemin hücrelerine DETERMİNİSTİK
// serpiştirilen dekorlar: Mezarlık → mezar taşı/haç, Orman → ağaç/çalı. Hash tabanlı
// olduğu için hem tek kişilik hem online AYNI görünür (ekstra ağ trafiği yok).
import type { Theme } from "./themes";

// Hücre koordinatından 0..1 deterministik değer (salt ile farklı katman)
function hash01(x: number, y: number, salt = 0): number {
  let h = (Math.imul(x, 73856093) ^ Math.imul(y, 19349663) ^ Math.imul(salt, 83492791)) >>> 0;
  h = (h ^ (h >>> 13)) >>> 0;
  return (h % 100000) / 100000;
}

// Bir zemin hücresine tema süsü çiz (varsa). sx,sy: hücrenin sol-üst ekran köşesi.
// lit: hücre şu an aydınlık mı (soluk hafıza için daha karanlık çizilir).
export function drawDecor(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  sx: number,
  sy: number,
  TS: number,
  lit: boolean
) {
  const decor = theme.decor;
  if (!decor) return;
  const present = hash01(x, y, 1);
  const cx = sx + TS / 2;
  const cy = sy + TS / 2;

  if (decor === "graves") {
    if (present > 0.24) return; // ~%24 hücrede mezar
    ctx.save();
    ctx.globalAlpha = lit ? 0.92 : 0.4;
    const isCross = hash01(x, y, 2) > 0.68;
    ctx.fillStyle = lit ? "rgb(150,150,158)" : "rgb(74,74,80)";
    if (isCross) {
      const w = TS * 0.075;
      const hh = TS * 0.36;
      ctx.fillRect(cx - w / 2, cy - hh / 2, w, hh);
      ctx.fillRect(cx - TS * 0.12, cy - hh * 0.16, TS * 0.24, w);
    } else {
      const w = TS * 0.3;
      const h = TS * 0.34;
      ctx.beginPath();
      ctx.moveTo(cx - w / 2, cy + h / 2);
      ctx.lineTo(cx - w / 2, cy - h * 0.08);
      ctx.arc(cx, cy - h * 0.08, w / 2, Math.PI, 0);
      ctx.lineTo(cx + w / 2, cy + h / 2);
      ctx.closePath();
      ctx.fill();
      // haça/taşa göre koyu çatlak
      ctx.globalAlpha *= 0.5;
      ctx.strokeStyle = "rgb(30,30,34)";
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(cx, cy - h * 0.2);
      ctx.lineTo(cx + w * 0.12, cy + h * 0.2);
      ctx.stroke();
    }
    // taban gölgesi
    ctx.globalAlpha = lit ? 0.35 : 0.18;
    ctx.fillStyle = "rgb(14,14,16)";
    ctx.beginPath();
    ctx.ellipse(cx, cy + TS * 0.2, TS * 0.2, TS * 0.06, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  } else if (decor === "forest") {
    // Ağaçlar artık DUVARLARDA (drawWallDecor). Zeminde yalnız KORİDORU KAPATMAYAN
    // alçak yer örtüsü: küçük ot/çalı tutamları, hücre KENARINA yaslı (ortada değil).
    if (present > 0.2) return; // seyrek
    ctx.save();
    ctx.globalAlpha = lit ? 0.85 : 0.4;
    // kenara yaslı ofset (dört köşeden biri) — koridor ortası boş kalır
    const q = Math.floor(hash01(x, y, 4) * 4);
    const ox = q === 0 || q === 3 ? -TS * 0.3 : TS * 0.3;
    const oy = q < 2 ? TS * 0.28 : -TS * 0.28;
    ctx.fillStyle = lit ? "rgb(46,74,40)" : "rgb(20,34,20)";
    ctx.beginPath();
    ctx.ellipse(cx + ox, cy + oy, TS * 0.12, TS * 0.07, 0, 0, Math.PI * 2);
    ctx.fill();
    // birkaç ot bıçağı
    ctx.strokeStyle = lit ? "rgb(58,92,50)" : "rgb(26,42,26)";
    ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.moveTo(cx + ox + i * TS * 0.05, cy + oy);
      ctx.lineTo(cx + ox + i * TS * 0.05 + TS * 0.02, cy + oy - TS * 0.1);
      ctx.stroke();
    }
    ctx.restore();
  }
}

// Duvar hücresine tema süsü çiz (ör. Orman'da duvarlar AĞAÇtır). Zemin çiziminden
// sonra, duvarın üstüne çizilir. Deterministik → tek kişilik + online aynı.
export function drawWallDecor(
  ctx: CanvasRenderingContext2D,
  theme: Theme,
  x: number,
  y: number,
  sx: number,
  sy: number,
  TS: number,
  lit: boolean
) {
  if (theme.wallStyle !== "trees") return;
  const cx = sx + TS / 2;
  const cy = sy + TS / 2;
  ctx.save();
  ctx.globalAlpha = lit ? 1 : 0.55;
  // gövde
  ctx.fillStyle = lit ? "rgb(58,42,28)" : "rgb(28,20,14)";
  ctx.fillRect(cx - TS * 0.07, cy - TS * 0.05, TS * 0.14, TS * 0.5);
  // tepe (üst üste birkaç yaprak yumağı — hücreyi doldurur, duvar hissi verir)
  const g1 = lit ? "rgb(38,74,36)" : "rgb(18,36,20)";
  const g2 = lit ? "rgb(48,90,44)" : "rgb(22,44,24)";
  const r = TS * 0.34;
  ctx.fillStyle = g1;
  ctx.beginPath();
  ctx.arc(cx, cy - TS * 0.06, r, 0, Math.PI * 2);
  ctx.fill();
  // hafif deterministik ışık noktası (hacim hissi)
  ctx.fillStyle = g2;
  const jx = (hash01(x, y, 5) - 0.5) * TS * 0.2;
  const jy = (hash01(x, y, 6) - 0.5) * TS * 0.2;
  ctx.beginPath();
  ctx.arc(cx + jx - TS * 0.08, cy - TS * 0.12 + jy, r * 0.6, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}
