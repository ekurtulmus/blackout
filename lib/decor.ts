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
    if (present > 0.3) return; // ~%30 hücre
    ctx.save();
    ctx.globalAlpha = lit ? 0.9 : 0.4;
    const isTree = hash01(x, y, 3) > 0.42;
    if (isTree) {
      // ağaç: gövde + tepe
      ctx.fillStyle = lit ? "rgb(68,50,34)" : "rgb(32,24,18)";
      ctx.fillRect(cx - TS * 0.04, cy - TS * 0.02, TS * 0.08, TS * 0.26);
      ctx.fillStyle = lit ? "rgb(44,84,42)" : "rgb(20,40,22)";
      ctx.beginPath();
      ctx.arc(cx, cy - TS * 0.08, TS * 0.2, 0, Math.PI * 2);
      ctx.fill();
      ctx.fillStyle = lit ? "rgb(52,96,50)" : "rgb(24,46,26)";
      ctx.beginPath();
      ctx.arc(cx - TS * 0.08, cy - TS * 0.12, TS * 0.11, 0, Math.PI * 2);
      ctx.fill();
    } else {
      // çalı
      ctx.fillStyle = lit ? "rgb(50,78,44)" : "rgb(22,38,22)";
      ctx.beginPath();
      ctx.ellipse(cx, cy + TS * 0.08, TS * 0.19, TS * 0.12, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.ellipse(cx - TS * 0.1, cy + TS * 0.05, TS * 0.1, TS * 0.08, 0, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }
}
