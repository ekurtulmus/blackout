// JILTED — top-down labirentten OYUNSU ikon 512. node scripts/icon-maze.mjs
// Ortadaki kapüşonlu + fener odasına odak kırpma + sıcak parıltı + vinyet.
import sharp from "sharp";
const SRC = "C:/Users/LENOVO/Downloads/Stylized_dark_fantasy_horror_game_key_art_square_A_moody_top.jpg";
const OUT = "D:/OneDrive/Desktop/JILTED-store/uygulama-ikonu-512.png";
const S = 512;

// merkez oda (kapüşonlu + fener) kadrajda, çevresinde karanlık labirent
const base = await sharp(SRC).extract({ left: 300, top: 288, width: 452, height: 452 }).resize(S, S)
  .modulate({ saturation: 0.98, brightness: 1.02 }).linear(1.14, -16).toBuffer(); // odak popsun

const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>
  <radialGradient id="vig" cx="50%" cy="52%" r="60%"><stop offset="46%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".72"/></radialGradient>
  <radialGradient id="warm" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffca70" stop-opacity=".42"/><stop offset="1" stop-color="#ffca70" stop-opacity="0"/></radialGradient>
  </defs>
  <ellipse cx="256" cy="300" rx="180" ry="200" fill="url(#warm)"/>
  <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`);

const grain = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 11 } } }).ensureAlpha(0.28).png().toBuffer();

await sharp(base).composite([{ input: overlay }, { input: grain, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(OUT);
console.log("OK -> " + OUT);
