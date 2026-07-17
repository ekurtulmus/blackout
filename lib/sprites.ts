// Ortak canvas çizimleri (tek kişilik + online aynısını kullanır).
// Fonksiyonlar ctx ve TS (hücre boyutu) parametre alır.
import type { Vec } from "./types";

// Hücre koordinatından deterministik "kir" gürültüsü (0..1)
export function grime(x: number, y: number) {
  const h = Math.sin(x * 12.9898 + y * 78.233) * 43758.5453;
  return h - Math.floor(h);
}

// Hayatta kalan oyuncu (tepeden bakış). opts.cone=false → fener konisi çizme.
// opts.ring → oyuncunun etrafına renkli halka (rakibi ayırt etmek için).
export function drawPlayer(
  ctx: CanvasRenderingContext2D,
  TS: number,
  cx: number,
  cy: number,
  dir: Vec,
  t: number,
  moving: boolean,
  flicker: number,
  visionRadius: number,
  opts?: { cone?: boolean; ring?: string; coneColor?: [number, number, number] }
) {
  const ang = Math.atan2(dir.y, dir.x);

  if (opts?.cone !== false) {
    const reach = visionRadius * TS * 0.95;
    const spread = 0.46;
    const [cr, cg, cb] = opts?.coneColor ?? [200, 220, 255]; // fener rengi (kişiselleştirme)
    const cone = ctx.createRadialGradient(cx, cy, TS * 0.3, cx, cy, reach);
    cone.addColorStop(0, `rgba(${cr},${cg},${cb},${0.15 * flicker})`);
    cone.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
    ctx.save();
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, reach, ang - spread, ang + spread);
    ctx.closePath();
    ctx.fillStyle = cone;
    ctx.fill();
    ctx.restore();
  }

  const R = TS * 0.42;
  const bob = moving ? Math.sin(t * 12) : 0;

  ctx.save();
  ctx.translate(cx, cy);
  ctx.rotate(ang);

  ctx.fillStyle = "rgba(0,0,0,0.5)";
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.9, R * 0.72, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#0b0d0f";
  ctx.lineWidth = R * 0.22;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-R * 0.05, -R * 0.3);
  ctx.lineTo(-R * 0.5, -R * 0.3 - bob * R * 0.16);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(-R * 0.05, R * 0.3);
  ctx.lineTo(-R * 0.5, R * 0.3 + bob * R * 0.16);
  ctx.stroke();

  const body = ctx.createRadialGradient(R * 0.15, -R * 0.15, R * 0.05, 0, 0, R * 0.85);
  body.addColorStop(0, "#2c3338");
  body.addColorStop(1, "#0a0c0e");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, R * 0.6, R * 0.48, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = `rgba(150,180,210,${0.5 * flicker})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.ellipse(R * 0.08, -R * 0.05, R * 0.55, R * 0.44, 0, -1.0, 0.9);
  ctx.stroke();

  ctx.strokeStyle = "#161a1d";
  ctx.lineWidth = R * 0.18;
  ctx.beginPath();
  ctx.moveTo(R * 0.1, -R * 0.3);
  ctx.lineTo(R * 0.5, -R * 0.14);
  ctx.stroke();
  ctx.beginPath();
  ctx.moveTo(R * 0.1, R * 0.3);
  ctx.lineTo(R * 0.5, R * 0.14);
  ctx.stroke();

  const head = ctx.createRadialGradient(R * 0.32, -R * 0.06, R * 0.02, R * 0.26, 0, R * 0.28);
  head.addColorStop(0, "#c9bda6");
  head.addColorStop(1, "#6f6353");
  ctx.fillStyle = head;
  ctx.beginPath();
  ctx.arc(R * 0.26, 0, R * 0.24, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#08090a";
  ctx.fillRect(R * 0.48, -R * 0.08, R * 0.22, R * 0.16);
  ctx.save();
  ctx.globalAlpha = flicker;
  ctx.shadowColor = "rgba(200,225,255,0.9)";
  ctx.shadowBlur = 12;
  ctx.fillStyle = "#e6f0ff";
  ctx.beginPath();
  ctx.arc(R * 0.7, 0, R * 0.07, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.restore();

  if (opts?.ring) {
    ctx.save();
    ctx.strokeStyle = opts.ring;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = opts.ring;
    ctx.shadowBlur = 12;
    ctx.beginPath();
    ctx.arc(cx, cy, TS * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
}

// KILIÇ — oyuncunun elinde. Kuşanılıysa hep görünür (elinde olduğu belli olsun):
// uzunca ve kalınca, ama oyuncuyu bastırmayacak kadar.
// swing: 0..1 (1 = darbenin başı) → savururken yay çizer + iz bırakır.
export function drawSword(
  ctx: CanvasRenderingContext2D,
  TS: number,
  cx: number,
  cy: number,
  dir: Vec,
  blade: string,
  glow: string,
  swing = 0
) {
  const ang = Math.atan2(dir.y, dir.x);
  const R = TS * 0.42;
  const L = TS * 0.95; // namlu uzunluğu (~1 kare menzile yakın)
  const W = TS * 0.1; // kalınlık
  ctx.save();
  ctx.translate(cx, cy);
  // Savururken -0.95 → +0.6 rad arası döner; boştayken elde hafif yana durur
  const sweep = swing > 0 ? -0.95 + (1 - swing) * 1.55 : 0.55;
  ctx.rotate(ang + sweep);

  // Savurma izi (yay)
  if (swing > 0) {
    ctx.save();
    ctx.globalAlpha = swing * 0.5;
    ctx.strokeStyle = glow;
    ctx.lineWidth = TS * 0.16;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.arc(0, 0, R + L * 0.6, -0.5, 0.9);
    ctx.stroke();
    ctx.restore();
  }

  ctx.translate(R * 0.5, 0);
  ctx.fillStyle = "#2a2018"; // sap
  ctx.fillRect(-TS * 0.14, -W * 0.32, TS * 0.17, W * 0.64);
  ctx.fillStyle = "#6b5a44"; // balçak
  ctx.fillRect(0, -W * 1.05, TS * 0.05, W * 2.1);
  // Namlu — uca doğru sivrilir
  ctx.shadowColor = glow;
  ctx.shadowBlur = 10;
  ctx.fillStyle = blade;
  ctx.beginPath();
  ctx.moveTo(TS * 0.05, -W * 0.5);
  ctx.lineTo(TS * 0.05 + L * 0.82, -W * 0.34);
  ctx.lineTo(TS * 0.05 + L, 0); // uç
  ctx.lineTo(TS * 0.05 + L * 0.82, W * 0.34);
  ctx.lineTo(TS * 0.05, W * 0.5);
  ctx.closePath();
  ctx.fill();
  // Orta sırt çizgisi (parlaklık)
  ctx.shadowBlur = 0;
  ctx.globalAlpha = 0.5;
  ctx.strokeStyle = "rgba(255,255,255,0.7)";
  ctx.lineWidth = Math.max(1, TS * 0.012);
  ctx.beginPath();
  ctx.moveTo(TS * 0.07, 0);
  ctx.lineTo(TS * 0.05 + L * 0.9, 0);
  ctx.stroke();
  ctx.restore();
}

// Kanlı Gelin — 4 çeşit (id % 4), dik duruş = oyuncuya (kameraya) dönük.
export function drawBride(
  ctx: CanvasRenderingContext2D,
  TS: number,
  cx: number,
  cy: number,
  t: number,
  id: number,
  aware: boolean,
  lean: number
) {
  const variant = id % 4;
  const S = TS * (0.4 + ((id * 53) % 20) / 200);
  const hp = t * (aware ? 2.4 : 1.4) + id;
  const bob = Math.sin(t * 1.3 + id) * S * 0.05;

  ctx.save();
  ctx.translate(cx, cy + bob);
  ctx.rotate(lean * 0.07);
  ctx.lineJoin = "round";
  ctx.lineCap = "round";

  ctx.fillStyle = "rgba(0,0,0,0.42)";
  ctx.beginPath();
  ctx.ellipse(0, S * 1.0, S * 0.85, S * 0.28, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.translate(0, -S * 0.45);

  const gown = (c1: string, c2: string) => {
    const gg = ctx.createLinearGradient(0, 0, 0, S * 1.5);
    gg.addColorStop(0, c1);
    gg.addColorStop(1, c2);
    ctx.fillStyle = gg;
    ctx.beginPath();
    ctx.moveTo(-S * 0.26, S * 0.3);
    ctx.lineTo(-S * 0.8, S * 1.5);
    ctx.quadraticCurveTo(0, S * 1.72, S * 0.8, S * 1.5);
    ctx.lineTo(S * 0.26, S * 0.3);
    ctx.closePath();
    ctx.fill();
  };
  const backHair = (col: string) => {
    ctx.fillStyle = col;
    for (let i = -1; i <= 1; i += 2) {
      ctx.beginPath();
      ctx.moveTo(0, -S * 0.45);
      ctx.quadraticCurveTo(i * S * 0.9, S * 0.5 + Math.sin(hp + i) * S * 0.12, i * S * 0.5, S * 1.35);
      ctx.quadraticCurveTo(i * S * 0.18, S * 0.9, 0, S * 0.15);
      ctx.closePath();
      ctx.fill();
    }
  };
  const face = (shadow: boolean) => {
    const fg = ctx.createRadialGradient(-S * 0.1, -S * 0.12, 2, 0, 0, S * 0.56);
    fg.addColorStop(0, shadow ? "#d0d4d7" : "#e9ecef");
    fg.addColorStop(1, shadow ? "#7c8288" : "#969ca2");
    ctx.fillStyle = fg;
    ctx.beginPath();
    ctx.ellipse(0, 0, S * 0.42, S * 0.52, 0, 0, Math.PI * 2);
    ctx.fill();
  };
  const fringe = (col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.58);
    ctx.quadraticCurveTo(-S * 0.62, -S * 0.42, -S * 0.44, S * 0.12);
    ctx.quadraticCurveTo(-S * 0.52, -S * 0.32, 0, -S * 0.36);
    ctx.quadraticCurveTo(S * 0.52, -S * 0.32, S * 0.44, S * 0.12);
    ctx.quadraticCurveTo(S * 0.62, -S * 0.42, 0, -S * 0.58);
    ctx.fill();
  };
  const drawEyes = (col: string) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.ellipse(-S * 0.15, -S * 0.04, S * 0.07, S * 0.11, 0, 0, Math.PI * 2);
    ctx.ellipse(S * 0.15, -S * 0.04, S * 0.07, S * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    if (aware) {
      ctx.save();
      ctx.shadowColor = "rgba(255,45,30,0.95)";
      ctx.shadowBlur = 12;
      ctx.fillStyle = "#ff3a22";
      ctx.beginPath();
      ctx.arc(-S * 0.15, -S * 0.03, S * 0.035, 0, Math.PI * 2);
      ctx.arc(S * 0.15, -S * 0.03, S * 0.035, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };
  const tear = (ex: number, sy: number, len: number, w: number, thick = 0.035) => {
    ctx.strokeStyle = "#8a1414";
    ctx.lineWidth = S * thick;
    ctx.beginPath();
    ctx.moveTo(ex, sy);
    ctx.quadraticCurveTo(ex + Math.sin(hp + w) * S * 0.04, sy + len * 0.5, ex * 0.9, sy + len);
    ctx.stroke();
    ctx.fillStyle = "#9a1010";
    ctx.beginPath();
    ctx.arc(ex * 0.9, sy + len, S * (thick * 1.1), 0, Math.PI * 2);
    ctx.fill();
  };

  if (variant === 0) {
    gown("#c8ccd0", "rgba(120,126,132,0.12)");
    backHair("#08080d");
    ctx.save();
    ctx.globalAlpha = 0.5;
    ctx.fillStyle = "#eae4de";
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.7);
    ctx.quadraticCurveTo(-S * 0.85, -S * 0.2, -S * 0.66, S * 1.0);
    ctx.quadraticCurveTo(0, S * 1.25, S * 0.66, S * 1.0);
    ctx.quadraticCurveTo(S * 0.85, -S * 0.2, 0, -S * 0.7);
    ctx.fill();
    ctx.restore();
    face(false);
    fringe("#0c0a12");
    drawEyes("#0a0710");
    tear(-S * 0.15, S * 0.05, S * 0.5, 0);
    tear(S * 0.15, S * 0.05, S * 0.5, 1.5);
    ctx.fillStyle = "#5a0c0c";
    ctx.beginPath();
    ctx.ellipse(0, S * 0.24, S * 0.05, S * 0.04, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 1) {
    gown("#a7a89a", "rgba(80,84,74,0.12)");
    backHair("#0c0a0c");
    ctx.save();
    ctx.globalAlpha = 0.42;
    ctx.fillStyle = "#cfc9bf";
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.72);
    ctx.quadraticCurveTo(-S * 0.8, -S * 0.2, -S * 0.62, S * 0.85);
    for (let i = 0; i < 5; i++) {
      const xx = -S * 0.62 + i * S * 0.26;
      ctx.lineTo(xx + S * 0.06, S * (0.85 + (i % 2 ? 0.2 : 0.03)));
      ctx.lineTo(xx + S * 0.16, S * 0.82);
    }
    ctx.quadraticCurveTo(S * 0.8, -S * 0.2, 0, -S * 0.72);
    ctx.fill();
    ctx.restore();
    face(true);
    fringe("#0d0b0f");
    ctx.fillStyle = "rgba(10,8,10,0.5)";
    ctx.beginPath();
    ctx.ellipse(-S * 0.15, -S * 0.03, S * 0.13, S * 0.14, 0, 0, Math.PI * 2);
    ctx.ellipse(S * 0.15, -S * 0.03, S * 0.13, S * 0.14, 0, 0, Math.PI * 2);
    ctx.fill();
    drawEyes("#080608");
    tear(-S * 0.15, S * 0.05, S * 0.55, 0);
    tear(S * 0.15, S * 0.05, S * 0.45, 2);
    ctx.fillStyle = "#3a0808";
    ctx.beginPath();
    ctx.ellipse(0, S * 0.24, S * 0.06, S * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
  } else if (variant === 2) {
    ctx.save();
    ctx.globalAlpha = 0.4;
    ctx.fillStyle = "#e6e0da";
    ctx.beginPath();
    ctx.moveTo(-S * 0.5, -S * 0.55);
    ctx.quadraticCurveTo(0, -S * 1.1, S * 0.5, -S * 0.55);
    ctx.quadraticCurveTo(0, -S * 0.75, -S * 0.5, -S * 0.55);
    ctx.fill();
    ctx.restore();
    gown("#d6d0ca", "rgba(150,140,132,0.1)");
    backHair("#0a0810");
    face(false);
    fringe("#0c0a12");
    drawEyes("#0a0710");
    tear(-S * 0.15, S * 0.05, S * 0.8, 0, 0.05);
    tear(S * 0.15, S * 0.05, S * 0.8, 1, 0.05);
    ctx.fillStyle = "#0a0508";
    ctx.beginPath();
    ctx.ellipse(0, S * 0.26, S * 0.08, S * 0.13, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#8a1414";
    ctx.lineWidth = S * 0.045;
    ctx.beginPath();
    ctx.moveTo(0, S * 0.36);
    ctx.quadraticCurveTo(Math.sin(hp) * S * 0.04, S * 0.6, -S * 0.05, S * 0.82);
    ctx.stroke();
    ctx.fillStyle = "#9a1010";
    ctx.beginPath();
    ctx.arc(-S * 0.05, S * 0.82, S * 0.04, 0, Math.PI * 2);
    ctx.fill();
  } else {
    const halo = ctx.createRadialGradient(0, S * 0.2, 4, 0, S * 0.2, S * 1.5);
    halo.addColorStop(0, "rgba(220,225,235,0.2)");
    halo.addColorStop(1, "rgba(220,225,235,0)");
    ctx.fillStyle = halo;
    ctx.beginPath();
    ctx.arc(0, S * 0.2, S * 1.5, 0, Math.PI * 2);
    ctx.fill();
    gown("#e2ddd8", "rgba(180,175,170,0.1)");
    backHair("#0c0a12");
    ctx.save();
    ctx.globalAlpha = 0.45;
    ctx.fillStyle = "#f0ece7";
    ctx.beginPath();
    ctx.moveTo(0, -S * 0.72);
    ctx.quadraticCurveTo(-S * 0.95, -S * 0.1, -S * 0.75 + Math.sin(hp) * S * 0.08, S * 1.35);
    ctx.quadraticCurveTo(0, S * 1.6, S * 0.75 + Math.sin(hp + 1) * S * 0.08, S * 1.35);
    ctx.quadraticCurveTo(S * 0.95, -S * 0.1, 0, -S * 0.72);
    ctx.fill();
    ctx.restore();
    face(false);
    fringe("#0d0b13");
    drawEyes("#0b0812");
    tear(S * 0.15, S * 0.05, S * 0.5, 1);
    ctx.fillStyle = "#3a1a20";
    ctx.beginPath();
    ctx.ellipse(0, S * 0.23, S * 0.04, S * 0.03, 0, 0, Math.PI * 2);
    ctx.fill();
  }

  ctx.restore();
}
