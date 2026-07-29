// JILTED — gerçekçi/dokulu korku ikonları (v2, turbulence artefaktı yok). node scripts/gen-icon-real.mjs
// Yönlü ışık + asimetri + gradyan sis + sharp film greni. (feTurbulence render sorunlu → kullanılmadı.)
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";

const OUT = "D:/OneDrive/Desktop/JILTED-store/ikon-adaylar";
const S = 512;

const DEFS = `
  <radialGradient id="bg" cx="32%" cy="88%" r="98%"><stop offset="0" stop-color="#3e2716"/><stop offset=".34" stop-color="#150d08"/><stop offset="1" stop-color="#040202"/></radialGradient>
  <radialGradient id="bgc" cx="50%" cy="52%" r="82%"><stop offset="0" stop-color="#1c1310"/><stop offset=".5" stop-color="#0a0605"/><stop offset="1" stop-color="#030201"/></radialGradient>
  <linearGradient id="face" x1="0.15" y1="1" x2="0.78" y2="0.08"><stop offset="0" stop-color="#f2d4a4"/><stop offset=".32" stop-color="#c39c74"/><stop offset=".64" stop-color="#6b5138"/><stop offset="1" stop-color="#241a12"/></linearGradient>
  <linearGradient id="rim" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="#ffbf62" stop-opacity=".95"/><stop offset="1" stop-color="#ffbf62" stop-opacity="0"/></linearGradient>
  <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffe6ad" stop-opacity=".95"/><stop offset=".5" stop-color="#ef9a2a" stop-opacity=".28"/><stop offset="1" stop-color="#ef9a2a" stop-opacity="0"/></radialGradient>
  <radialGradient id="haze" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#d99a4a" stop-opacity=".22"/><stop offset="1" stop-color="#d99a4a" stop-opacity="0"/></radialGradient>
  <radialGradient id="eye" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb090"/><stop offset=".3" stop-color="#ff2a1e" stop-opacity=".98"/><stop offset="1" stop-color="#d40c0c" stop-opacity="0"/></radialGradient>
  <radialGradient id="shad" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#060402" stop-opacity=".92"/><stop offset="1" stop-color="#060402" stop-opacity="0"/></radialGradient>
  <radialGradient id="blood" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7e1010" stop-opacity=".9"/><stop offset="1" stop-color="#7e1010" stop-opacity="0"/></radialGradient>
  <radialGradient id="vig" cx="46%" cy="46%" r="66%"><stop offset="48%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".88"/></radialGradient>
  <filter id="soft"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="soft2"><feGaussianBlur stdDeviation="22"/></filter>
  <filter id="eyeb" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="9"/></filter>`;

// SVG → PNG → çift film greni (kaba + ince), soft-light → "elde çizilmiş / fotoğraf" hissi
async function renderGrain(svg, file) {
  const base = await sharp(Buffer.from(svg)).resize(S, S).png().toBuffer();
  const g1 = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 24 } } }).ensureAlpha(0.55).png().toBuffer();
  const g2 = await sharp({ create: { width: 256, height: 256, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 30 } } }).resize(S, S).blur(0.6).ensureAlpha(0.4).png().toBuffer();
  await sharp(base).composite([{ input: g1, blend: "soft-light" }, { input: g2, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  console.log("✓ " + file);
}

// ADAY A: fenerden yönlü ışık, asimetrik aydınlanan duvaklı yüz
const A = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${DEFS}</defs>
  <rect width="${S}" height="${S}" fill="url(#bg)"/>
  <ellipse cx="150" cy="470" rx="240" ry="180" fill="url(#haze)" filter="url(#soft2)"/>
  <path d="M258 46 C132 50 78 156 76 312 C74 412 108 480 138 512 L378 512 C406 476 434 404 430 300 C424 150 372 44 258 46 Z" fill="#0c080a"/>
  <path d="M256 48 C138 50 84 150 80 306" fill="none" stroke="url(#rim)" stroke-width="9" filter="url(#soft)" opacity=".9"/>
  <path d="M256 98 C182 100 150 168 152 250 C154 344 206 418 258 432 C312 416 360 340 358 246 C356 160 322 96 256 98 Z" fill="url(#face)"/>
  <ellipse cx="332" cy="252" rx="46" ry="94" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="300" cy="172" rx="94" ry="62" fill="url(#shad)" filter="url(#soft2)"/>
  <ellipse cx="262" cy="320" rx="20" ry="52" fill="url(#shad)" filter="url(#soft)"/>
  <ellipse cx="196" cy="300" rx="30" ry="58" fill="url(#shad)" filter="url(#soft2)" opacity=".45"/>
  <path d="M186 214 C220 198 296 196 328 216 L326 236 C296 222 218 224 188 236 Z" fill="#070402" opacity=".72" filter="url(#soft)"/>
  <ellipse cx="214" cy="252" rx="33" ry="26" fill="#070403" filter="url(#soft)"/><ellipse cx="300" cy="248" rx="31" ry="25" fill="#070403" filter="url(#soft)"/>
  <circle cx="214" cy="254" r="30" fill="url(#eye)" filter="url(#eyeb)"/><circle cx="300" cy="250" r="26" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="214" cy="254" r="8.5" fill="#ffb4a0"/><circle cx="300" cy="250" r="7" fill="#ffb4a0"/>
  <circle cx="211" cy="250" r="2.6" fill="#fff6f2"/><circle cx="297" cy="246" r="2.4" fill="#fff6f2"/>
  <path d="M214 272 C213 320 210 360 216 398 C222 360 217 320 217 272 Z" fill="#7e1212" opacity=".8"/><circle cx="216" cy="398" r="5" fill="#9c1818"/>
  <path d="M152 322 C192 302 322 302 358 320 C346 386 306 420 256 420 C206 420 164 386 152 322 Z" fill="#0b090d" opacity=".82"/>
  <circle cx="150" cy="486" r="172" fill="url(#lamp)"/><circle cx="150" cy="484" r="8" fill="#fff3d6"/>
  <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`;

// ADAY B: yakın plan yanan gözler (minimal, dokulu, dikey bebek)
const B = `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>${DEFS}</defs>
  <rect width="${S}" height="${S}" fill="url(#bgc)"/>
  <path d="M256 66 C118 70 66 186 80 306 C40 306 40 388 122 406 C184 502 330 502 392 406 C474 388 474 306 434 306 C448 186 396 70 256 66 Z" fill="#0a0608"/>
  <path d="M108 244 C170 202 344 202 406 244 L406 292 C344 256 170 256 108 292 Z" fill="#050303" opacity=".8" filter="url(#soft)"/>
  <ellipse cx="182" cy="264" rx="78" ry="62" fill="url(#eye)" filter="url(#eyeb)"/><ellipse cx="332" cy="260" rx="74" ry="60" fill="url(#eye)" filter="url(#eyeb)"/>
  <circle cx="182" cy="264" r="23" fill="#ffb4a0"/><circle cx="332" cy="260" r="22" fill="#ffb4a0"/>
  <ellipse cx="182" cy="264" rx="6.5" ry="30" fill="#280505"/><ellipse cx="332" cy="260" rx="6" ry="28" fill="#280505"/>
  <circle cx="176" cy="255" r="5.5" fill="#fff4f0"/><circle cx="326" cy="251" r="5" fill="#fff4f0"/>
  <path d="M180 322 C178 368 176 404 182 426 C188 404 182 368 182 322 Z" fill="#7e1010" opacity=".82"/><circle cx="182" cy="426" r="6" fill="#9c1818"/>
  <path d="M334 316 C334 352 332 378 336 396 C340 378 336 352 336 316 Z" fill="#6e0e0e" opacity=".7"/>
  <ellipse cx="256" cy="474" rx="230" ry="96" fill="url(#blood)"/>
  <ellipse cx="256" cy="450" rx="200" ry="150" fill="url(#haze)" filter="url(#soft2)" opacity=".5"/>
  <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`;

await mkdir(OUT, { recursive: true });
await renderGrain(A, "gercekci-A-fener-yuz.png");
await renderGrain(B, "gercekci-B-yanan-gozler.png");
console.log("\n" + OUT);
