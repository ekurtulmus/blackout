// Android simge + açılış ekranı görsellerini oyunun kendi ikonundan üretir (Capacitor varsayılanının yerine).
// Çalıştır: node scripts/gen-android-res.mjs   (ikon değişirse tekrar)
import sharp from "sharp";
import { readdirSync, existsSync } from "node:fs";
import { join } from "node:path";

const RES = "android/app/src/main/res";
const SRC = "scripts/art/android-ikon-1024.png"; // Play mağaza simgesiyle AYNI sanat (gelin)
const BG = { r: 5, g: 3, b: 4, alpha: 1 };

const circle = (n) => Buffer.from(`<svg width="${n}" height="${n}"><circle cx="${n / 2}" cy="${n / 2}" r="${n / 2}"/></svg>`);
const rounded = (n) => Buffer.from(`<svg width="${n}" height="${n}"><rect width="${n}" height="${n}" rx="${n * 0.2}"/></svg>`);

const DENS = { mdpi: 1, hdpi: 1.5, xhdpi: 2, xxhdpi: 3, xxxhdpi: 4 };
for (const [d, k] of Object.entries(DENS)) {
  const dir = join(RES, `mipmap-${d}`);
  const n = Math.round(48 * k);
  const base = await sharp(SRC).resize(n, n).flatten({ background: BG }).ensureAlpha().png().toBuffer();
  await sharp(base).composite([{ input: rounded(n), blend: "dest-in" }]).png().toFile(join(dir, "ic_launcher.png"));
  await sharp(base).composite([{ input: circle(n), blend: "dest-in" }]).png().toFile(join(dir, "ic_launcher_round.png"));
  // Uyarlanabilir simge: 108dp katman, görünen alan ortadaki ~72dp
  const f = Math.round(108 * k);
  await sharp(SRC).resize(f, f).flatten({ background: BG }).png().toFile(join(dir, "ic_launcher_foreground.png"));
}

// Açılış ekranları: koyu zemin + ortada yuvarlak ikon (mevcut her splash.png'nin kendi boyutunda)
for (const dir of readdirSync(RES).filter((x) => x.startsWith("drawable"))) {
  const p = join(RES, dir, "splash.png");
  if (!existsSync(p)) continue;
  const { width, height } = await sharp(p).metadata();
  const n = Math.round(Math.min(width, height) * 0.34);
  const icon = await sharp(SRC).resize(n, n).ensureAlpha().composite([{ input: circle(n), blend: "dest-in" }]).png().toBuffer();
  const out = await sharp({ create: { width, height, channels: 4, background: BG } }).composite([{ input: icon, gravity: "center" }]).png().toBuffer();
  await sharp(out).toFile(p);
}
console.log("android simge + açılış görselleri üretildi");
