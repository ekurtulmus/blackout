// JILTED — 4 farklı çarpıcı korku ikonu adayı 512. node scripts/gen-icon-variants.mjs
import sharp from "sharp";
import path from "node:path";
const OUT = "D:/OneDrive/Desktop/JILTED-store/ikon-adaylar";
const S = 512;

const DEFS = `
  <radialGradient id="bg" cx="50%" cy="82%" r="85%"><stop offset="0" stop-color="#2e1e14"/><stop offset=".4" stop-color="#100a07"/><stop offset="1" stop-color="#050302"/></radialGradient>
  <radialGradient id="bgc" cx="50%" cy="48%" r="80%"><stop offset="0" stop-color="#1a1210"/><stop offset=".5" stop-color="#0a0605"/><stop offset="1" stop-color="#040202"/></radialGradient>
  <linearGradient id="face" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f0d3a6"/><stop offset=".3" stop-color="#cda981"/><stop offset=".62" stop-color="#7a5f49"/><stop offset="1" stop-color="#33261d"/></linearGradient>
  <linearGradient id="faceL" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#e8c99c"/><stop offset=".45" stop-color="#9c7d60"/><stop offset=".8" stop-color="#3a2c22"/><stop offset="1" stop-color="#1c150f"/></linearGradient>
  <linearGradient id="veil" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#0b0709"/><stop offset="1" stop-color="#1a1119"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="1" x2="0" y2="0"><stop offset="0" stop-color="#f0b45a" stop-opacity=".95"/><stop offset="1" stop-color="#f0b45a" stop-opacity="0"/></linearGradient>
  <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe6ad" stop-opacity=".95"/><stop offset=".5" stop-color="#ef9e2e" stop-opacity=".3"/><stop offset="1" stop-color="#ef9e2e" stop-opacity="0"/></radialGradient>
  <radialGradient id="eye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ff8a6a"/><stop offset=".35" stop-color="#ff2323" stop-opacity=".95"/><stop offset="1" stop-color="#e01010" stop-opacity="0"/></radialGradient>
  <radialGradient id="shad" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#080503" stop-opacity=".9"/><stop offset="1" stop-color="#080503" stop-opacity="0"/></radialGradient>
  <radialGradient id="blood" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#8a1414" stop-opacity=".85"/><stop offset="1" stop-color="#8a1414" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="50%" cy="47%" r="66%"><stop offset="50%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".82"/></radialGradient>
  <filter id="soft" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="soft2" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="20"/></filter>
  <filter id="eyeb" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="9"/></filter>`;

const wrap = (bg, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${DEFS}</defs><rect width="${S}" height="${S}" fill="url(#${bg})"/>${inner}<rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`;
const eyeSet = (lx, rx, y, r, slit = false) => `
  <circle cx="${lx}" cy="${y}" r="${r * 1.15}" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="${rx}" cy="${y}" r="${r * 1.15}" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="${lx}" cy="${y}" r="${r * 0.32}" fill="#ff9a86"/><circle cx="${rx}" cy="${y}" r="${r * 0.32}" fill="#ff9a86"/>
  ${slit ? `<ellipse cx="${lx}" cy="${y}" rx="${r * 0.09}" ry="${r * 0.42}" fill="#2a0606"/><ellipse cx="${rx}" cy="${y}" rx="${r * 0.09}" ry="${r * 0.42}" fill="#2a0606"/>` : ""}
  <circle cx="${lx - r * 0.14}" cy="${y - r * 0.18}" r="${r * 0.1}" fill="#fff4f0"/><circle cx="${rx - r * 0.14}" cy="${y - r * 0.18}" r="${r * 0.1}" fill="#fff4f0"/>`;

// --- ADAY 1: DUVAKLI YÜZ (mevcut yön, rafine) ---
const v1 = wrap("bg", `
  <path d="M256 48 C138 48 82 148 78 306 C76 408 108 476 140 512 L372 512 C404 476 436 408 434 306 C430 148 374 48 256 48 Z" fill="url(#veil)"/>
  <path d="M256 48 C138 48 82 148 78 306 C76 408 108 476 140 512" fill="none" stroke="url(#rim)" stroke-width="7" filter="url(#soft)" opacity=".85"/>
  <path d="M256 96 C186 96 152 162 152 244 C152 338 202 414 256 430 C310 414 360 338 360 244 C360 162 326 96 256 96 Z" fill="url(#face)"/>
  <ellipse cx="176" cy="250" rx="42" ry="80" fill="url(#shad)" filter="url(#soft2)"/><ellipse cx="336" cy="250" rx="42" ry="80" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="256" cy="315" rx="18" ry="46" fill="url(#shad)" filter="url(#soft)"/>
  <ellipse cx="212" cy="250" rx="34" ry="27" fill="#090504" filter="url(#soft)"/><ellipse cx="300" cy="250" rx="34" ry="27" fill="#090504" filter="url(#soft)"/>
  ${eyeSet(212, 300, 252, 26)}
  <path d="M300 268 C300 320 296 340 300 356 C304 340 300 320 300 268 Z" fill="#8a1414" opacity=".85"/><circle cx="300" cy="356" r="4.5" fill="#a11a1a"/>
  <path d="M152 322 C190 304 322 304 360 322 C350 384 308 420 256 420 C204 420 162 384 152 322 Z" fill="#0c0a0e" opacity=".8"/>
  <circle cx="256" cy="486" r="165" fill="url(#lamp)"/><circle cx="256" cy="484" r="8" fill="#fff3d6"/>`);

// --- ADAY 2: YAKIN PLAN YANAN GÖZLER (minimal, çok vurucu) ---
const v2 = wrap("bgc", `
  <path d="M256 70 C120 70 70 180 78 300 C40 300 40 380 120 400 C180 500 332 500 392 400 C472 380 472 300 434 300 C442 180 392 70 256 70 Z" fill="#0a0608" opacity=".9" filter="url(#soft2)"/>
  <path d="M110 250 C170 210 342 210 402 250 L402 292 C342 258 170 258 110 292 Z" fill="#060403" opacity=".8" filter="url(#soft)"/>
  ${eyeSet(180, 332, 262, 66, true)}
  <path d="M175 330 C175 372 172 392 176 408 C180 392 177 372 177 330 Z" fill="#8a1414" opacity=".8"/><circle cx="176" cy="408" r="5" fill="#a11a1a"/>
  <path d="M337 330 C337 366 334 384 338 398 C342 384 339 366 339 330 Z" fill="#8a1414" opacity=".7"/>
  <ellipse cx="256" cy="470" rx="200" ry="80" fill="url(#blood)"/>`);

// --- ADAY 3: FENER YAN IŞIĞI (sinematik, yarısı ışık yarısı gölge) ---
const v3 = wrap("bgc", `
  <path d="M300 90 C210 90 172 170 172 250 C172 350 220 430 290 448 C300 300 300 200 300 90 Z" fill="url(#faceL)"/>
  <path d="M300 90 C388 92 420 180 416 268 C412 372 360 436 300 448 C300 300 300 200 300 90 Z" fill="#0d0908"/>
  <ellipse cx="360" cy="250" rx="40" ry="90" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="252" cy="248" rx="30" ry="24" fill="#0a0605" filter="url(#soft)"/>
  <circle cx="252" cy="250" r="26" fill="url(#eye)" filter="url(#eyeb)"/><circle cx="252" cy="250" r="8" fill="#ff9a86"/><circle cx="249" cy="246" r="2.6" fill="#fff4f0"/>
  <circle cx="330" cy="250" r="15" fill="url(#eye)" opacity=".55" filter="url(#eyeb)"/>
  <path d="M172 320 C210 306 300 306 340 322 C330 384 292 416 250 414 C214 412 182 380 172 320 Z" fill="#0c0a0e" opacity=".72"/>
  <!-- fener sol alt -->
  <g transform="translate(120,392)">
    <circle r="120" fill="url(#lamp)"/>
    <g fill="none" stroke="#b98a44" stroke-width="6" stroke-linecap="round"><path d="M-20 -34 a20 20 0 0 1 40 0"/><path d="M-26 -26 H26"/><path d="M-22 -26 V34 M22 -26 V34"/><path d="M-30 34 H30"/></g>
    <rect x="-18" y="-22" width="36" height="52" rx="6" fill="url(#lamp)"/>
    <path d="M0 -6 C-9 4 -9 20 0 24 C9 20 9 4 0 -6 Z" fill="#ffe9b0"/><circle cy="12" r="5" fill="#fff7ea"/>
  </g>`);

// --- ADAY 4: KANLI DUVAK (soluk örtü + kan sızması + ardında gözler) ---
const v4 = wrap("bgc", `
  <path d="M256 60 C150 60 96 150 92 300 C90 400 120 470 150 512 L362 512 C392 470 422 400 420 300 C416 150 362 60 256 60 Z" fill="#0a0709"/>
  <ellipse cx="212" cy="250" rx="30" ry="24" fill="url(#eye)" filter="url(#eyeb)" opacity=".9"/><ellipse cx="300" cy="250" rx="30" ry="24" fill="url(#eye)" filter="url(#eyeb)" opacity=".9"/>
  <circle cx="212" cy="250" r="6" fill="#ff9a86"/><circle cx="300" cy="250" r="6" fill="#ff9a86"/>
  <!-- soluk sheer duvak (yarı saydam) -->
  <path d="M256 96 C300 96 336 116 356 150 C372 210 372 340 344 400 C320 452 288 476 256 476 C224 476 192 452 168 400 C140 340 140 210 156 150 C176 116 212 96 256 96 Z" fill="#cbbfb0" opacity=".24"/>
  <path d="M256 96 C300 96 336 116 356 150" fill="none" stroke="#e6ddce" stroke-width="4" opacity=".3"/>
  <!-- kan sızmaları -->
  <ellipse cx="222" cy="262" rx="26" ry="34" fill="url(#blood)"/><ellipse cx="298" cy="262" rx="24" ry="30" fill="url(#blood)"/>
  <path d="M214 280 C212 330 210 380 216 420 C222 380 218 330 216 280 Z" fill="#8a1414" opacity=".85"/><circle cx="216" cy="420" r="6" fill="#a11a1a"/>
  <path d="M300 278 C300 320 298 356 302 384 C306 356 302 320 302 278 Z" fill="#7a1010" opacity=".8"/>
  <ellipse cx="256" cy="340" rx="60" ry="40" fill="url(#blood)" opacity=".7"/>
  <circle cx="256" cy="492" r="150" fill="url(#lamp)" opacity=".8"/>`);

await (async () => {
  const { mkdir } = await import("node:fs/promises");
  await mkdir(OUT, { recursive: true });
  const jobs = [["ikon1-duvakli-yuz.png", v1], ["ikon2-yanan-gozler.png", v2], ["ikon3-fener-isigi.png", v3], ["ikon4-kanli-duvak.png", v4]];
  for (const [f, svg] of jobs) { await sharp(Buffer.from(svg)).resize(S, S).png({ compressionLevel: 9 }).toFile(path.join(OUT, f)); console.log("✓ " + f); }
  console.log("\n" + OUT);
})();
