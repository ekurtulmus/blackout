// JILTED — gerçekçi/atmosferik korku ikonu 512 (v2, daha parlak ve net). node scripts/gen-icon2.mjs
import sharp from "sharp";
import path from "node:path";

const OUT = "D:/OneDrive/Desktop/JILTED-store";
const S = 512;

const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}">
  <defs>
    <radialGradient id="bg" cx="50%" cy="82%" r="85%">
      <stop offset="0" stop-color="#2e1e14"/><stop offset=".4" stop-color="#100a07"/><stop offset="1" stop-color="#050302"/>
    </radialGradient>
    <!-- yüz: alttan sıcak/parlak, üste koyu (ürkütücü alt aydınlatma), yeşil tona kaçmayan sıcak kahveler -->
    <linearGradient id="face" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#f0d3a6"/><stop offset=".3" stop-color="#cda981"/>
      <stop offset=".62" stop-color="#7a5f49"/><stop offset="1" stop-color="#33261d"/>
    </linearGradient>
    <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0" stop-color="#0b0709"/><stop offset="1" stop-color="#1a1119"/>
    </linearGradient>
    <linearGradient id="rim" x1="0" y1="1" x2="0" y2="0">
      <stop offset="0" stop-color="#f0b45a" stop-opacity=".95"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/>
    </linearGradient>
    <radialGradient id="lamp" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ffe6ad" stop-opacity=".95"/><stop offset=".5" stop-color="#ef9e2e" stop-opacity=".3"/><stop offset="1" stop-color="#ef9e2e" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="eye" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#ff8a6a" stop-opacity="1"/><stop offset=".35" stop-color="#ff2323" stop-opacity=".95"/><stop offset="1" stop-color="#e01010" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="shad" cx="50%" cy="50%" r="50%">
      <stop offset="0" stop-color="#080503" stop-opacity=".9"/><stop offset="1" stop-color="#080503" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="vig" cx="50%" cy="47%" r="66%">
      <stop offset="50%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".82"/>
    </radialGradient>
    <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
    <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>
    <filter id="eyeb" x="-140%" y="-140%" width="380%" height="380%"><feGaussianBlur stdDeviation="8"/></filter>
  </defs>

  <rect width="${S}" height="${S}" fill="url(#bg)"/>

  <!-- DUVAK: yüzü çerçeveleyen koyu örtü + fener tarafı altın kenar -->
  <path d="M256 48 C138 48 82 148 78 306 C76 408 108 476 140 512 L372 512 C404 476 436 408 434 306 C430 148 374 48 256 48 Z" fill="url(#veil)"/>
  <path d="M256 48 C138 48 82 148 78 306 C76 408 108 476 140 512" fill="none" stroke="url(#rim)" stroke-width="7" filter="url(#soft)" opacity=".85"/>
  <path d="M256 48 C374 48 430 148 434 306 C436 408 404 476 372 512" fill="none" stroke="url(#rim)" stroke-width="5" filter="url(#soft)" opacity=".5"/>

  <!-- YÜZ (daha büyük, kadrajı doldurur) -->
  <path d="M256 96 C186 96 152 162 152 244 C152 338 202 414 256 430 C310 414 360 338 360 244 C360 162 326 96 256 96 Z" fill="url(#face)"/>
  <!-- yanak/şakak gölgeleri + burun (yumuşak, temiz) -->
  <ellipse cx="176" cy="250" rx="42" ry="80" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="336" cy="250" rx="42" ry="80" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="256" cy="315" rx="18" ry="46" fill="url(#shad)" filter="url(#soft)"/>
  <!-- kaş gölgesi (gözlerin üstü) -->
  <path d="M188 214 C220 196 292 196 324 214 L324 234 C292 220 220 220 188 234 Z" fill="#0a0604" opacity=".7" filter="url(#soft)"/>

  <!-- GÖZLER: koyu çukur + kızıl parıltı + parlak nokta -->
  <ellipse cx="212" cy="250" rx="34" ry="27" fill="#090504" filter="url(#soft)"/>
  <ellipse cx="300" cy="250" rx="34" ry="27" fill="#090504" filter="url(#soft)"/>
  <circle cx="212" cy="252" r="30" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="300" cy="252" r="30" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="212" cy="252" r="8.5" fill="#ff9a86"/>
  <circle cx="300" cy="252" r="8.5" fill="#ff9a86"/>
  <circle cx="209" cy="248" r="3" fill="#fff4f0"/>
  <circle cx="297" cy="248" r="3" fill="#fff4f0"/>

  <!-- kan damlası (sağ gözden) -->
  <path d="M300 268 C300 300 296 336 300 356 C304 336 300 300 300 268 Z" fill="#8a1414" opacity=".85"/>
  <circle cx="300" cy="356" r="4.5" fill="#a11a1a"/>

  <!-- ALT DUVAK: ağzı örten yarı saydam örtü -->
  <path d="M152 322 C190 304 322 304 360 322 C350 384 308 420 256 420 C204 420 162 384 152 322 Z" fill="#0c0a0e" opacity=".8"/>
  <path d="M170 330 C208 318 304 318 342 330" fill="none" stroke="#2c2432" stroke-width="2" opacity=".55"/>

  <!-- FENER (alt orta) -->
  <circle cx="256" cy="486" r="165" fill="url(#lamp)"/>
  <circle cx="256" cy="484" r="8" fill="#fff3d6"/>

  <rect width="${S}" height="${S}" fill="url(#vig)"/>
</svg>`;

await sharp(Buffer.from(svg)).resize(S, S).png({ compressionLevel: 9 }).toFile(path.join(OUT, "uygulama-ikonu-512.png"));
console.log("✓ uygulama-ikonu-512.png (v2)");
