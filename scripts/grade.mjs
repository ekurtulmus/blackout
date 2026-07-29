// AI görselleri "3D render" hissinden "karanlık boyanmış sanat" hissine çeker:
// doygunluk ↓ + hafif koyu/kontrast + film greni. node scripts/grade.mjs
import sharp from "sharp";
const DIR = "D:/OneDrive/Desktop/JILTED-store";

async function grade(inFile, outFile, W, H) {
  const graded = await sharp(`${DIR}/${inFile}`)
    .modulate({ saturation: 0.72, brightness: 0.95 })   // renkleri kıs, hafif koyulaştır
    .linear(1.08, -10)                                   // hafif kontrast (mat/gritty)
    .gamma(1.05)
    .toBuffer();
  const g1 = await sharp({ create: { width: W, height: H, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 20 } } }).ensureAlpha(0.5).png().toBuffer();
  const g2 = await sharp({ create: { width: Math.round(W / 2), height: Math.round(H / 2), channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 26 } } }).resize(W, H).blur(0.6).ensureAlpha(0.36).png().toBuffer();
  await sharp(graded).composite([{ input: g1, blend: "soft-light" }, { input: g2, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(`${DIR}/${outFile}`);
  console.log("✓ " + outFile);
}

await grade("uygulama-ikonu-512.png", "uygulama-ikonu-512-mat.png", 512, 512);
await grade("ozellik-grafigi-1024x500.png", "ozellik-grafigi-1024x500-mat.png", 1024, 500);
