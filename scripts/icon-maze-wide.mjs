// JILTED — top-down labirent, GENİŞ (yakınlaştırmadan) 512 ikon. node scripts/icon-maze-wide.mjs
import sharp from "sharp";
const SRC = "C:/Users/LENOVO/Downloads/Stylized_dark_fantasy_horror_game_key_art_square_A_moody_top.jpg";
const OUT = "D:/OneDrive/Desktop/JILTED-store/uygulama-ikonu-512.png";
const S = 512;

// neredeyse tam görsel (kenarlardan minik kırpma) → 512, hafif mat
const base = await sharp(SRC).extract({ left: 20, top: 20, width: 984, height: 984 }).resize(S, S)
  .modulate({ saturation: 0.92, brightness: 1.0 }).linear(1.06, -6).toBuffer();

// çok hafif vinyet (ikon cilası) — yakınlaştırma yok, köşedeki gelinler kaybolmasın
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}"><defs>
  <radialGradient id="vig" cx="50%" cy="50%" r="78%"><stop offset="70%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".34"/></radialGradient></defs>
  <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`);
const grain = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 10 } } }).ensureAlpha(0.25).png().toBuffer();

await sharp(base).composite([{ input: overlay }, { input: grain, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(OUT);
console.log("OK -> " + OUT);
