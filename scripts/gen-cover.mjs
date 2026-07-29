// JILTED — daha çarpıcı ÖNE ÇIKAN GÖRSEL (kapak) 1024x500. node scripts/gen-cover.mjs
// Sahne: derinlemesine taş kemer tüneli + fener ışığı + karanlıktan çıkan Kanlı Gelinler + dramatik başlık.
import sharp from "sharp";
import path from "node:path";

const OUT = "D:/OneDrive/Desktop/JILTED-store";
const W = 1024, H = 500;

// Kanlı Gelin silueti (duvaklı, tekinsiz), red=parlak göz
const bride = (x, y, s, eyeGlow = 1) => `
  <g transform="translate(${x},${y}) scale(${s})">
    <path d="M0 -46 C-24 -46 -33 -14 -35 46 L35 46 C33 -14 24 -46 0 -46 Z" fill="#080605"/>
    <circle cx="0" cy="-50" r="14" fill="#080605"/>
    <path d="M-14 -50 C-14 -74 14 -74 14 -50 L20 22 C8 33 -8 33 -20 22 Z" fill="#120c14" opacity=".92"/>
    <path d="M-14 -50 C-14 -74 14 -74 14 -50" fill="none" stroke="#241a1f" stroke-width="1.5" opacity=".7"/>
    <circle cx="-5" cy="-52" r="2.6" fill="#ff4d4d" opacity="${eyeGlow}"/>
    <circle cx="5.5" cy="-52" r="2.6" fill="#ff4d4d" opacity="${eyeGlow}"/>
    <circle cx="-5" cy="-52" r="6" fill="#ff2d2d" opacity="${0.35 * eyeGlow}"/>
    <circle cx="5.5" cy="-52" r="6" fill="#ff2d2d" opacity="${0.35 * eyeGlow}"/>
  </g>`;

// derinlemesine taş kemer (doorway), ölçek+opaklıkla derinlik
const arch = (cx, cy, w, h, op) => {
  const x = cx - w / 2, r = w / 2;
  return `<path d="M${x} ${cy + h} V${cy - h * 0.15} A${r} ${r} 0 0 1 ${cx + r} ${cy - h * 0.15} V${cy + h}"
    fill="none" stroke="#7a5f34" stroke-width="${Math.max(2, w * 0.03)}" opacity="${op}"/>`;
};

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <defs>
    <radialGradient id="bg" cx="38%" cy="52%" r="85%">
      <stop offset="0" stop-color="#1b1410"/><stop offset=".5" stop-color="#0a0706"/><stop offset="1" stop-color="#030201"/>
    </radialGradient>
    <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe6b0" stop-opacity=".95"/><stop offset=".3" stop-color="#e8a24a" stop-opacity=".5"/>
      <stop offset="1" stop-color="#e8a24a" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="blood" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#7a1414" stop-opacity=".5"/><stop offset="1" stop-color="#7a1414" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="42%" cy="50%" r="70%">
      <stop offset="52%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".78"/>
    </radialGradient>
    <linearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0a0706" stop-opacity="0"/><stop offset="1" stop-color="#050302"/>
    </linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="7" result="b"/>
      <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
    </filter>
    <filter id="softglow" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="16"/>
    </filter>
  </defs>

  <rect width="${W}" height="${H}" fill="url(#bg)"/>
  <ellipse cx="330" cy="470" rx="360" ry="120" fill="url(#blood)"/>

  <!-- derinlemesine tünel: içe doğru küçülen kemerler -->
  <g transform="translate(300,0)">
    ${arch(60, 250, 620, 300, .5)}
    ${arch(50, 250, 430, 230, .55)}
    ${arch(42, 250, 290, 175, .6)}
    ${arch(36, 250, 185, 130, .55)}
    ${arch(30, 250, 110, 95, .45)}
  </g>
  <rect x="0" y="330" width="${W}" height="170" fill="url(#floor)"/>

  <!-- uzaktaki gelin (küçük, sönük), orta gelin, yakın gelin -->
  ${bride(330, 250, 0.7, 0.7)}
  ${bride(250, 300, 1.35, 1)}
  ${bride(470, 320, 1.7, 1)}

  <!-- fenerin ışığı + fenerli oyuncu silueti (ön plan) -->
  <circle cx="150" cy="360" r="140" fill="url(#lamp)"/>
  <g transform="translate(150,360)">
    <circle cx="0" cy="0" r="9" fill="#fff7e6"/>
    <path d="M-16 40 C-16 8 16 8 16 40 Z" fill="#050403"/>
    <circle cx="0" cy="-4" r="13" fill="#0a0806"/>
  </g>

  <rect width="${W}" height="${H}" fill="url(#vig)"/>

  <!-- BAŞLIK -->
  <text x="600" y="215" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="118"
        font-weight="700" letter-spacing="10" fill="#e0a24a" opacity=".55" filter="url(#softglow)">JILTED</text>
  <text x="600" y="215" text-anchor="middle" font-family="Georgia, 'Times New Roman', serif" font-size="118"
        font-weight="700" letter-spacing="10" fill="#f4ecd8" filter="url(#glow)">JILTED</text>
  <rect x="470" y="243" width="260" height="2.5" fill="#8a1f1f"/>
  <path d="M540 245 v14 M600 245 v20 M660 245 v11" stroke="#8a1f1f" stroke-width="2" opacity=".8"/>
  <text x="600" y="300" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="24"
        letter-spacing="7" fill="#c9bfa6">ESCAPE IN THE DARK</text>
  <text x="600" y="345" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="21"
        fill="#8f8674">Outrun the Blood Brides. Find the exit.</text>
</svg>`;

await sharp(Buffer.from(svg)).resize(W, H).png({ compressionLevel: 9 }).toFile(path.join(OUT, "ozellik-grafigi-1024x500.png"));
console.log("✓ ozellik-grafigi-1024x500.png (yeni kapak)");
