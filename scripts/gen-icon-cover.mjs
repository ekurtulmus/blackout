// JILTED — daha çarpıcı MAĞAZA İKONU 512x512. node scripts/gen-icon-cover.mjs
// Kalın parlak altın J + canlı fener alevi + köşede karanlıktan bakan kırmızı gözler.
import sharp from "sharp";
import path from "node:path";

const OUT = "D:/OneDrive/Desktop/JILTED-store";
const S = 512;

// J + fener (156-uzayında), sonra tüm grup ölçeklenir
const jGroup = `
  <g transform="translate(110,70) scale(2.5)">
    <circle cx="52" cy="130" r="66" fill="url(#lampG)"/>
    <!-- J gövde: dış koyu + iç parlak altın (derinlik) -->
    <path d="M46 26 H112 M95 26 V114 A31 31 0 0 1 51 132" fill="none" stroke="#3a2b13" stroke-width="34" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M46 26 H112 M95 26 V114 A31 31 0 0 1 51 132" fill="none" stroke="url(#gold)" stroke-width="24" stroke-linecap="round" stroke-linejoin="round"/>
    <path d="M50 24 H100" stroke="#fff1cf" stroke-width="5" stroke-linecap="round" opacity=".5"/>
    <!-- fener alevi -->
    <circle cx="52" cy="130" r="15" fill="url(#flame)"/>
    <path d="M52 118 C44 126 44 138 52 140 C60 138 60 126 52 118 Z" fill="#ffe9b0"/>
    <circle cx="52" cy="132" r="4.5" fill="#fff7ea"/>
  </g>`;

// köşede pusuya yatmış gelin + kırmızı gözler (sağ üst karanlık)
const lurk = `
  <g transform="translate(392,96)">
    <path d="M0 -30 C-30 -30 -40 6 -42 70 L42 70 C40 6 30 -30 0 -30 Z" fill="#0a0708" opacity=".92"/>
    <circle cx="0" cy="-34" r="16" fill="#0a0708" opacity=".92"/>
    <circle cx="-8" cy="-34" r="13" fill="#ff2a2a" opacity=".28"/>
    <circle cx="9" cy="-34" r="13" fill="#ff2a2a" opacity=".28"/>
    <circle cx="-8" cy="-34" r="4.6" fill="#ff5252"/>
    <circle cx="9" cy="-34" r="4.6" fill="#ff5252"/>
    <circle cx="-8" cy="-35" r="1.8" fill="#fff0f0"/>
    <circle cx="9" cy="-35" r="1.8" fill="#fff0f0"/>
  </g>`;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="bg" cx="46%" cy="58%" r="75%">
      <stop offset="0" stop-color="#1c1410"/><stop offset=".55" stop-color="#0b0807"/><stop offset="1" stop-color="#050302"/>
    </radialGradient>
    <linearGradient id="gold" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#f2cf7c"/><stop offset=".5" stop-color="#d6a24a"/><stop offset="1" stop-color="#a9762f"/>
    </linearGradient>
    <radialGradient id="lampG" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffdf9e" stop-opacity=".7"/><stop offset=".45" stop-color="#e8a24a" stop-opacity=".22"/><stop offset="1" stop-color="#e8a24a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="flame" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#fff7ea" stop-opacity=".95"/><stop offset="1" stop-color="#ffcf7a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blood" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7a1414" stop-opacity=".4"/><stop offset="1" stop-color="#7a1414" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="48%" cy="52%" r="65%">
      <stop offset="55%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".62"/>
    </radialGradient>
  </defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <ellipse cx="400" cy="120" rx="200" ry="160" fill="url(#blood)"/>
  ${jGroup}
  ${lurk}
  <rect width="${S}" height="${S}" fill="url(#vig)"/>
</svg>`;

await sharp(Buffer.from(svg)).resize(S, S).png({ compressionLevel: 9 }).toFile(path.join(OUT, "uygulama-ikonu-512.png"));
console.log("✓ uygulama-ikonu-512.png (yeni ikon)");
