// JILTED — PWA / Play Store ikon üretici.  Çalıştır:  node scripts/gen-icons.mjs
//
// NEDEN VAR: app/icon.svg yalnız favicon. Android/Play PNG ister ve İKİ ÇEŞİT lazım:
//   1) normal ikon  → köşeleri yuvarlatılmış, sanat neredeyse kenara kadar
//   2) MASKELİ ikon → arka plan KENARDAN KENARA dolu, sanat ortada küçük durur.
//      Android maskeli ikonu daire/kare/damla gibi farklı şekillere KIRPAR; kırpma
//      kenardan %10 yiyebilir, bu yüzden sanat "güvenli bölge"de (ortadaki %80 daire)
//      kalmalı. Normal ikonu maskeli diye verirsen J harfinin kenarları kesilir.
//
// Logo değişirse: aşağıdaki ART'ı güncelle, scripti tekrar çalıştır.
import sharp from "sharp";
import { mkdir } from "node:fs/promises";
import path from "node:path";

const OUT = path.join(process.cwd(), "public", "icons");

// Ortak sanat (app/icon.svg ile aynı): fener halesi + kıvrılan J + fener alevi.
const DEFS = `
  <defs>
    <radialGradient id="glow" cx="34%" cy="80%" r="70%">
      <stop offset="0" stop-color="#e0a24a" stop-opacity=".55"/>
      <stop offset=".5" stop-color="#e0a24a" stop-opacity=".12"/>
      <stop offset="1" stop-color="#e0a24a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="au" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#f7e6c2" stop-opacity=".95"/>
      <stop offset="1" stop-color="#f7e6c2" stop-opacity="0"/>
    </radialGradient>
  </defs>`;

const ART = `
    <circle cx="52" cy="130" r="54" fill="url(#glow)"/>
    <path d="M46 28 H110 M94 28 V112 A30 30 0 0 1 52 130" fill="none" stroke="#c79a52"
          stroke-width="16" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="52" cy="130" r="16" fill="url(#au)"/>
    <circle cx="52" cy="123.5" r="4" fill="#fff7e6"/>
    <path d="M52 128 L46.5 142 H57.5 Z" fill="#fff7e6"/>`;

const BG = "#0a0706";

// Normal: yuvarlatılmış kare, sanat büyük (favicon/PWA listesi görünümü)
const normalSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 168">
  ${DEFS}
  <rect width="168" height="168" rx="36" fill="${BG}"/>
  <g transform="translate(7,10)">${ART}</g>
</svg>`;

// Maskeli: arka plan TAM dolu (rx yok), sanat ~%62'ye küçültülüp ortalanır.
// Sanatın görsel merkezi (85,91) — oradan ölçekleyip tuval merkezine (84,84) taşıyoruz.
const maskableSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 168 168">
  ${DEFS}
  <rect width="168" height="168" fill="${BG}"/>
  <g transform="translate(84,84) scale(0.62) translate(-85,-91)">
    <g transform="translate(7,10)">${ART}</g>
  </g>
</svg>`;

const jobs = [
  { svg: normalSvg, size: 192, name: "icon-192.png" },
  { svg: normalSvg, size: 512, name: "icon-512.png" },
  { svg: maskableSvg, size: 192, name: "icon-192-maskable.png" },
  { svg: maskableSvg, size: 512, name: "icon-512-maskable.png" },
  { svg: normalSvg, size: 180, name: "apple-touch-icon.png" }, // iOS ana ekran
];

await mkdir(OUT, { recursive: true });
for (const j of jobs) {
  await sharp(Buffer.from(j.svg))
    .resize(j.size, j.size)
    .png({ compressionLevel: 9 })
    .toFile(path.join(OUT, j.name));
  console.log(`✓ public/icons/${j.name} (${j.size}x${j.size})`);
}
console.log("\nPlay Console'a yüklenecek mağaza ikonu: public/icons/icon-512.png");
