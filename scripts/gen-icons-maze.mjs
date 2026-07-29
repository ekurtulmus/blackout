// JILTED — uygulama ikon seti (labirent görselinden). node scripts/gen-icons-maze.mjs
//
// Bunlar HEM web manifest ikonları HEM DE AAB üretilirken kullanılan kaynak:
// Bubblewrap/PWABuilder ana ekran ikonunu VE açılış (splash) ekranını buradan alır.
// Yani bu dosyaları değiştirmek TEK BAŞINA yetmez — AAB yeniden üretilip Play'e
// yüklenmeden telefondaki eski ikon/splash değişmez.
//
// MASKELİ (maskable) sürüm neden ayrı: Android ikonu daire/damla/kare gibi şekillere
// kırpar; güvenli alan ikonun ORTA %80'lik dairesidir. Tam kadraj görsel kırpılınca
// kenardaki gelinler kesilir → maskeli sürümde merkeze doğru yakınlaştırıyoruz.
import sharp from "sharp";
import path from "node:path";

const SRC = "D:/OneDrive/Desktop/JILTED-store/uygulama-ikonu-512.png"; // mağaza ikonuyla AYNI
const OUT = "D:/OneDrive/Desktop/blackout/public/icons";

// Normal ikon: görselin tamamı.
async function plain(size, file) {
  await sharp(SRC).resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
  console.log("✓ " + file + "  (" + size + ")");
}

// Maskeli ikon: %78'lik merkez kırpılıp büyütülür → maske ne keserse kessin
// ortadaki kapüşonlu + fener güvenli alanda kalır.
async function maskable(size, file) {
  const meta = await sharp(SRC).metadata();
  const w = meta.width ?? 512;
  const keep = Math.round(w * 0.78);
  const off = Math.round((w - keep) / 2);
  await sharp(SRC).extract({ left: off, top: off, width: keep, height: keep })
    .resize(size, size, { fit: "cover" }).png({ compressionLevel: 9 })
    .toFile(path.join(OUT, file));
  console.log("✓ " + file + "  (" + size + ", maskeli)");
}

await plain(192, "icon-192.png");
await plain(512, "icon-512.png");
await maskable(192, "icon-192-maskable.png");
await maskable(512, "icon-512-maskable.png");
await plain(180, "apple-touch-icon.png");
console.log("\nBitti → " + OUT);
console.log("UNUTMA: AAB yeniden uretilmeden telefondaki ikon/splash DEGISMEZ.");
