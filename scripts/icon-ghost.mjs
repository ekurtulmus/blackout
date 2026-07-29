// JILTED — hayalet+fener sahnesinden OYUNSU ikon 512. node scripts/icon-ghost.mjs
// Odak kırpma (fener + hayalet gözleri) + vinyet + parlayan vurgu → küçükken bile okunur.
import sharp from "sharp";
const SRC = "C:/Users/LENOVO/Downloads/Mobile_game_app_icon_square_An_old_brass_lantern_glowing_war.jpg";
const OUT = "D:/OneDrive/Desktop/JILTED-store/uygulama-ikonu-512.png";
const S = 512;

// güçlü kare kırpma: fener + hayalet gözleri kadrajda
const base = await sharp(SRC).extract({ left: 40, top: 235, width: 700, height: 700 }).resize(S, S)
  .modulate({ saturation: 0.95, brightness: 1.0 }).linear(1.12, -14).toBuffer(); // hafif kontrast, odak popsun

// üst katman: vinyet (odakla) + fener/göz parıltısı vurgusu
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>
  <radialGradient id="vig" cx="48%" cy="46%" r="62%"><stop offset="52%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".7"/></radialGradient>
  <radialGradient id="warm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe6ad" stop-opacity=".5"/><stop offset="1" stop-color="#ffe6ad" stop-opacity="0"/></radialGradient>
  <radialGradient id="cyan" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8fe8ff" stop-opacity=".55"/><stop offset="1" stop-color="#8fe8ff" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="205" cy="420" rx="120" ry="120" fill="url(#warm)"/>
  <ellipse cx="352" cy="82" rx="70" ry="46" fill="url(#cyan)"/>
  <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`);

// hafif film greni (set ile tutarlı ama az)
const grain = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 12 } } }).ensureAlpha(0.3).png().toBuffer();

await sharp(base).composite([{ input: overlay }, { input: grain, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(OUT);
console.log("OK -> " + OUT);
