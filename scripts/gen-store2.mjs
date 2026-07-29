// JILTED — mağaza görselleri, AI labirent illüstrasyonundan. node scripts/gen-store2.mjs
// Yukarıdan labirent sanatı (stilize, oyuna uygun) → kırp + mat tonla + oyun HUD'u + yazı.
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const MAZE = "C:/Users/LENOVO/Downloads/Stylized_dark_fantasy_horror_game_key_art_square_A_moody_top.jpg";
const OUT = "D:/OneDrive/Desktop/JILTED-store";
const INK = "#efe7d6", GOLD = "#c79a52";

// oyun HUD şeridi (üst): canlar + mermi + altın + bölüm
const hud = (W, chapter, ammoN, goldN) => `
  <g font-family="Segoe UI, Arial, sans-serif" font-weight="600">
    <rect x="0" y="0" width="${W}" height="92" fill="#05040a" opacity=".5"/>
    ${[0, 1, 2].map(i => `<path transform="translate(${40 + i * 40},46) scale(1.05)" d="M0 3 C-4 -3 -12 -1 -12 5 C-12 11 0 16 0 16 C0 16 12 11 12 5 C12 -1 4 -3 0 3 Z" fill="#e8556b"/>`).join("")}
    <g transform="translate(${W - 430},32)"><rect x="-4" y="-12" width="9" height="24" rx="3" fill="#b8944a"/><text x="20" y="10" font-size="30" fill="${INK}">${ammoN}</text></g>
    <g transform="translate(${W - 300},44)"><circle r="11" fill="#e6b84a" stroke="#8a6a26" stroke-width="2.5"/><circle r="5" fill="none" stroke="#8a6a26" stroke-width="2"/><text x="22" y="10" font-size="30" fill="#ffd75a">${goldN}</text></g>
    <text x="${W - 140}" y="54" font-size="30" fill="#b3aa93">${chapter}</text>
  </g>`;

const cap = (W, H, c1, c2, big = 60) => `
  <rect x="0" y="${H - 250}" width="${W}" height="250" fill="#040302" opacity=".66"/>
  <text x="${W / 2}" y="${H - 140}" text-anchor="middle" font-family="Georgia, serif" font-size="${big}" font-weight="700" fill="${INK}">${c1}</text>
  <text x="${W / 2}" y="${H - 84}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="32" fill="#b3aa93">${c2}</text>`;

// AI kırpma → mat tonla (fotoğraf hissini azalt) → buffer
async function mazeCrop(crop, W, H) {
  return await sharp(MAZE).extract(crop).resize(W, H, { fit: "cover", position: "centre" })
    .modulate({ saturation: 0.82, brightness: 0.97 }).linear(1.05, -6).toBuffer();
}
// koyu zemin
const darkBg = (W, H) => Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}"><rect width="${W}" height="${H}" fill="#060405"/></svg>`);
// son: film greni (tutarlılık + az "3D")
async function grain(buf, W, H, file) {
  const g = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 16 } } }).ensureAlpha(0.4).png().toBuffer();
  await sharp(buf).composite([{ input: g, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  console.log("✓ " + file);
}

await mkdir(OUT, { recursive: true });

// ---- TELEFON (1080x1920): labirent üstte + HUD + alt yazı ----
const P = [1080, 1920];
async function phone(file, crop, c1, c2, chapter, ammoN, goldN) {
  const cH = 1500; // kadrajı doldur (alttaki boş siyahı azalt)
  const maze = await mazeCrop(crop, 1080, cH);
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1080" height="1920"><defs>
    <linearGradient id="fade" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#060405" stop-opacity="0"/><stop offset="1" stop-color="#060405"/></linearGradient></defs>
    <rect x="0" y="${cH - 280}" width="1080" height="320" fill="url(#fade)"/>
    ${hud(1080, chapter, ammoN, goldN)}
    ${cap(...P, c1, c2)}</svg>`);
  const composed = await sharp(darkBg(...P)).composite([{ input: maze, top: 0, left: 0 }, { input: overlay, top: 0, left: 0 }]).png().toBuffer();
  await grain(composed, ...P, file);
}
await phone("shot1.png", { left: 0, top: 0, width: 1024, height: 1024 }, "Trapped in a shifting maze", "Find the exit before the dark does", "3 / 10", 8, 120);
await phone("shot2.png", { left: 290, top: 240, width: 470, height: 560 }, "One lantern. Endless dark.", "Its light is all you have", "3 / 10", 8, 120);
await phone("shot3.png", { left: 20, top: 440, width: 460, height: 540 }, "The Blood Brides hunt you", "They never stop, never rest", "5 / 10", 4, 260);
await phone("shot4.png", { left: 640, top: 250, width: 384, height: 460 }, "They close in from the dark", "Every corridor hides a bride", "6 / 10", 6, 340);
await phone("shot5.png", { left: 0, top: 260, width: 1024, height: 764 }, "Ten chapters of dread", "Each one darker than the last", "8 / 10", 12, 480);

// ---- TABLET (1920x1080): geniş labirent + HUD + yazı ----
const T = [1920, 1080];
async function tablet(file, crop, c1, c2) {
  const maze = await sharp(MAZE).extract(crop).resize(1920, 1080, { fit: "cover" }).modulate({ saturation: 0.82, brightness: 0.97 }).linear(1.05, -6).toBuffer();
  const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1920" height="1080">${hud(1920, c2.chapter, c2.ammo, c2.gold)}${cap(...T, c1, c2.sub, 56)}</svg>`);
  const composed = await sharp(darkBg(...T)).composite([{ input: maze, top: 0, left: 0 }, { input: overlay, top: 0, left: 0 }]).png().toBuffer();
  await grain(composed, ...T, file);
}
await tablet("tablet1.png", { left: 0, top: 200, width: 1024, height: 576 }, "Escape the maze before the dark takes you", { sub: "10 chapters, each darker than the last", chapter: "3 / 10", ammo: 8, gold: 120 });
await tablet("tablet2.png", { left: 0, top: 400, width: 1024, height: 576 }, "The Blood Brides are everywhere", { sub: "Sword or gun — choose your kill", chapter: "8 / 10", ammo: 12, gold: 480 });

// ---- KAPAK (1024x500): stilize labirent + JILTED ----
const feat = await sharp(MAZE).extract({ left: 0, top: 220, width: 1024, height: 584 }).resize(1024, 500, { fit: "cover" }).modulate({ saturation: 0.8, brightness: 0.95 }).linear(1.05, -6).toBuffer();
const featOverlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="1024" height="500"><defs>
  <linearGradient id="s" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#040302" stop-opacity=".92"/><stop offset=".5" stop-color="#040302" stop-opacity=".4"/><stop offset="1" stop-color="#040302" stop-opacity="0"/></linearGradient>
  <filter id="g" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
  <filter id="sg" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter></defs>
  <rect width="1024" height="500" fill="url(#s)"/>
  <text x="512" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="86" font-weight="700" letter-spacing="10" fill="#e0a24a" opacity=".5" filter="url(#sg)">JILTED</text>
  <text x="512" y="380" text-anchor="middle" font-family="Georgia, serif" font-size="86" font-weight="700" letter-spacing="10" fill="#f4ecd8" filter="url(#g)">JILTED</text>
  <text x="512" y="430" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="21" letter-spacing="5" fill="#c9bfa6">ESCAPE IN THE DARK</text></svg>`);
await grain(await sharp(feat).composite([{ input: featOverlay }]).png().toBuffer(), 1024, 500, "ozellik-grafigi-1024x500.png");

console.log("\nHepsi: " + OUT);
