// JILTED — mağaza görselleri, 3-4 AI referansından ÇEŞİTLİ set. node scripts/gen-store3.mjs
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const D = "C:/Users/LENOVO/Downloads";
const IMG = {
  maze: `${D}/Stylized_dark_fantasy_horror_game_key_art_square_A_moody_top.jpg`,
  amber: `${D}/Mobile_game_app_icon_square_A_pair_of_softly_glowing_eyes_pe.jpg`,
  ghost: `${D}/Mobile_game_app_icon_square_An_old_brass_lantern_glowing_war.jpg`,
  pale: `${D}/Mobile_game_app_icon_square_A_haunting_pale_veiled_figures_f.jpg`,
};
const OUT = "D:/OneDrive/Desktop/JILTED-store";
const INK = "#efe7d6";

const hud = (W, ch, a, g) => `
  <g font-family="Segoe UI, Arial, sans-serif" font-weight="600">
    <rect x="0" y="0" width="${W}" height="92" fill="#05040a" opacity=".5"/>
    ${[0, 1, 2].map(i => `<path transform="translate(${40 + i * 40},46) scale(1.05)" d="M0 3 C-4 -3 -12 -1 -12 5 C-12 11 0 16 0 16 C0 16 12 11 12 5 C12 -1 4 -3 0 3 Z" fill="#e8556b"/>`).join("")}
    <g transform="translate(${W - 430},32)"><rect x="-4" y="-12" width="9" height="24" rx="3" fill="#b8944a"/><text x="20" y="10" font-size="30" fill="${INK}">${a}</text></g>
    <g transform="translate(${W - 300},44)"><circle r="11" fill="#e6b84a" stroke="#8a6a26" stroke-width="2.5"/><circle r="5" fill="none" stroke="#8a6a26" stroke-width="2"/><text x="22" y="10" font-size="30" fill="#ffd75a">${g}</text></g>
    <text x="${W - 140}" y="54" font-size="30" fill="#b3aa93">${ch}</text>
  </g>`;
const cap = (W, H, c1, c2, big) => `
  <rect x="0" y="${H - 250}" width="${W}" height="250" fill="#040302" opacity=".66"/>
  <text x="${W / 2}" y="${H - 140}" text-anchor="middle" font-family="Georgia, serif" font-size="${big}" font-weight="700" fill="${INK}">${c1}</text>
  <text x="${W / 2}" y="${H - 84}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#b3aa93">${c2}</text>`;
const darkBg = (W, H) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#060405"/></svg>`);
async function grain(buf, W, H, file) {
  const g = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 16 } } }).ensureAlpha(0.4).png().toBuffer();
  await sharp(buf).composite([{ input: g, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  console.log("✓ " + file);
}

// genel: kaynak + kırp + mat + (HUD?) + yazı
async function make(file, src, crop, W, H, o) {
  const cH = o.cH ?? (H > W ? 1500 : H);
  const art = await sharp(IMG[src]).extract(crop).resize(W, cH, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.82, brightness: 0.96 }).linear(1.05, -6).toBuffer();
  let inner = `<defs><linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060405" stop-opacity="0"/><stop offset="1" stop-color="#060405"/></linearGradient></defs>`;
  inner += `<rect x="0" y="${cH - 300}" width="${W}" height="360" fill="url(#fade)"/>`;
  if (o.hud) inner += hud(W, o.hud.ch, o.hud.a, o.hud.g);
  inner += cap(W, H, o.c1, o.c2, o.big ?? (H > W ? 60 : 56));
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">${inner}</svg>`);
  const composed = await sharp(darkBg(W, H)).composite([{ input: art, top: 0, left: 0 }, { input: overlay, top: 0, left: 0 }]).png().toBuffer();
  await grain(composed, W, H, file);
}

await mkdir(OUT, { recursive: true });

// ---- TELEFON (1080x1920) — ÇEŞİTLİ kaynaklar ----
// 1 labirent (oynanış + HUD)
await make("shot1.png", "maze", { left: 0, top: 0, width: 1024, height: 1024 }, 1080, 1920, { hud: { ch: "3 / 10", a: 8, g: 120 }, c1: "Trapped in a shifting maze", c2: "Find the exit before the dark does" });
// 2 amber yüz (atmosferik)
await make("shot2.png", "amber", { left: 235, top: 150, width: 560, height: 770 }, 1080, 1920, { c1: "Something is watching", c2: "In the dark, only its eyes glow" });
// 3 hayalet + fener (atmosferik)
await make("shot3.png", "ghost", { left: 150, top: 40, width: 680, height: 940 }, 1080, 1920, { c1: "One lantern against the night", c2: "The Blood Brides drift through the fog" });
// 4 labirent gelin yakın (oynanış + HUD)
await make("shot4.png", "maze", { left: 20, top: 440, width: 470, height: 560 }, 1080, 1920, { hud: { ch: "5 / 10", a: 4, g: 260 }, c1: "The Blood Brides hunt you", c2: "They never stop, never rest" });
// 5 solgun gelin yüzü (atmosferik)
await make("shot5.png", "pale", { left: 110, top: 70, width: 720, height: 900 }, 1080, 1920, { c1: "Every bride wants you", c2: "Ten chapters, each darker than the last" });

// ---- TABLET (1920x1080) ----
await make("tablet1.png", "maze", { left: 0, top: 200, width: 1024, height: 576 }, 1920, 1080, { hud: { ch: "3 / 10", a: 8, g: 120 }, c1: "Escape the maze before the dark takes you", c2: "A top-down horror maze runner" });
await make("tablet2.png", "ghost", { left: 40, top: 210, width: 944, height: 531 }, 1920, 1080, { c1: "A lantern is your only ally", c2: "Outrun the Blood Brides through the fog" });

// ---- KAPAK (1024x500) — hayalet + fener + JILTED ----
const feat = await sharp(IMG.ghost).extract({ left: 70, top: 200, width: 884, height: 470 }).resize(1024, 500, { fit: "cover" }).modulate({ saturation: 0.82, brightness: 0.95 }).linear(1.05, -6).toBuffer();
const fo = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><defs>
  <linearGradient id="s" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#040302" stop-opacity=".92"/><stop offset=".5" stop-color="#040302" stop-opacity=".35"/><stop offset="1" stop-color="#040302" stop-opacity="0"/></linearGradient>
  <filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="sg" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter></defs>
  <rect width="1024" height="500" fill="url(#s)"/>
  <text x="270" y="230" text-anchor="middle" font-family="Georgia, serif" font-size="92" font-weight="700" letter-spacing="9" fill="#e0a24a" opacity=".5" filter="url(#sg)">JILTED</text>
  <text x="270" y="230" text-anchor="middle" font-family="Georgia, serif" font-size="92" font-weight="700" letter-spacing="9" fill="#f4ecd8" filter="url(#g)">JILTED</text>
  <rect x="140" y="258" width="260" height="2.5" fill="#8a1f1f"/>
  <text x="270" y="308" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="22" letter-spacing="5" fill="#c9bfa6">ESCAPE IN THE DARK</text></svg>`);
await grain(await sharp(feat).composite([{ input: fo }]).png().toBuffer(), 1024, 500, "ozellik-grafigi-1024x500.png");

console.log("\nHepsi: " + OUT);
