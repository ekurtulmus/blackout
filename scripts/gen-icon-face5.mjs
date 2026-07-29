// JILTED — duvaklı yüz ikonu, 5 rafine varyasyon. node scripts/gen-icon-face5.mjs
// Daha iyi yüz modellemesi (ışık/gölge/highlight), yönlü fener, atmosfer + film greni.
import sharp from "sharp";
import path from "node:path";
import { mkdir } from "node:fs/promises";
const OUT = "D:/OneDrive/Desktop/JILTED-store/ikon-adaylar";
const S = 512;

const F = `
  <filter id="s6"><feGaussianBlur stdDeviation="6"/></filter>
  <filter id="s14"><feGaussianBlur stdDeviation="14"/></filter>
  <filter id="s24"><feGaussianBlur stdDeviation="24"/></filter>
  <filter id="eb" x="-160%" y="-160%" width="420%" height="420%"><feGaussianBlur stdDeviation="9"/></filter>`;

// ortak: gölge / highlight elipsi
const sh = (x, y, rx, ry, op = .9, bl = "s24") => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="#050301" opacity="${op}" filter="url(#${bl})"/>`;
const hi = (x, y, rx, ry, col, op) => `<ellipse cx="${x}" cy="${y}" rx="${rx}" ry="${ry}" fill="${col}" opacity="${op}" filter="url(#s24)"/>`;

// göz: çukur + parıltı + iris + dikey bebek + parlak nokta
const eye = (x, y, r, grad, slit, catch_ = true) => `
  <ellipse cx="${x}" cy="${y}" rx="${r * 1.28}" ry="${r}" fill="#070403" filter="url(#s6)"/>
  <circle cx="${x}" cy="${y}" r="${r * 1.15}" fill="url(#${grad})" filter="url(#eb)"/>
  <circle cx="${x}" cy="${y}" r="${r * 0.34}" fill="${grad === 'eR' ? '#ffb4a0' : '#dff6ff'}"/>
  ${slit ? `<ellipse cx="${x}" cy="${y}" rx="${r * 0.1}" ry="${r * 0.5}" fill="${grad === 'eR' ? '#280505' : '#052029'}"/>` : ""}
  ${catch_ ? `<circle cx="${x - r * 0.22}" cy="${y - r * 0.26}" r="${r * 0.11}" fill="#fff8f4"/>` : ""}`;

const drip = (x, y1, len, col = "#7e1212") => `<path d="M${x} ${y1} C${x - 1} ${y1 + len * .55} ${x - 2} ${y1 + len * .85} ${x} ${y1 + len} C${x + 2} ${y1 + len * .85} ${x + 1} ${y1 + len * .55} ${x} ${y1} Z" fill="${col}" opacity=".85"/><circle cx="${x}" cy="${y1 + len}" r="4.5" fill="#9c1818"/>`;

// yüz + duvak sahnesi. opts ile ışık/renk/kan/duvak değişir
function faceIcon(o) {
  const light = o.light; // {x,y,r,grad}
  const eg = o.eyeGrad;
  const lace = o.veil === "lace" ? `<path d="M150 340 q13 24 26 0 q13 24 26 0 q13 24 26 0 q13 24 26 0 q13 24 26 0 q13 24 26 0" fill="none" stroke="#0a080c" stroke-width="10" opacity=".85"/>` : "";
  const torn = o.veil === "torn" ? `<path d="M150 324 L172 356 L196 322 L220 360 L246 320 L272 358 L298 322 L322 356 L346 324" fill="#0b090d" opacity=".9"/>` : "";
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${S}" height="${S}" viewBox="0 0 ${S} ${S}"><defs>
    <radialGradient id="bg" cx="${o.bgcx}%" cy="86%" r="98%"><stop offset="0" stop-color="${o.bgWarm}"/><stop offset=".36" stop-color="#120b08"/><stop offset="1" stop-color="#040202"/></radialGradient>
    <linearGradient id="face" x1="${o.fg.x1}" y1="${o.fg.y1}" x2="${o.fg.x2}" y2="${o.fg.y2}">${o.fg.stops}</linearGradient>
    <linearGradient id="rim" x1="0" y1="1" x2="0.4" y2="0"><stop offset="0" stop-color="${o.rim}" stop-opacity=".95"/><stop offset="1" stop-color="${o.rim}" stop-opacity="0"/></linearGradient>
    <radialGradient id="lamp" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${o.lampC}" stop-opacity=".95"/><stop offset=".5" stop-color="${o.lampC2}" stop-opacity=".3"/><stop offset="1" stop-color="${o.lampC2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="haze" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="${o.lampC2}" stop-opacity=".2"/><stop offset="1" stop-color="${o.lampC2}" stop-opacity="0"/></radialGradient>
    <radialGradient id="eR" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#ffb090"/><stop offset=".3" stop-color="#ff2a1e" stop-opacity=".98"/><stop offset="1" stop-color="#d40c0c" stop-opacity="0"/></radialGradient>
    <radialGradient id="eC" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#eaffff"/><stop offset=".3" stop-color="#5fd0ff" stop-opacity=".98"/><stop offset="1" stop-color="#1f7fb0" stop-opacity="0"/></radialGradient>
    <radialGradient id="blood" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#7e1010" stop-opacity=".9"/><stop offset="1" stop-color="#7e1010" stop-opacity="0"/></radialGradient>
    <radialGradient id="vig" cx="46%" cy="46%" r="66%"><stop offset="48%" stop-color="black" stop-opacity="0"/><stop offset="100%" stop-color="black" stop-opacity=".9"/></radialGradient>
    ${F}</defs>
    <rect width="${S}" height="${S}" fill="url(#bg)"/>
    <ellipse cx="${light.x}" cy="${light.y}" rx="240" ry="190" fill="url(#haze)" filter="url(#s24)"/>
    <path d="M258 46 C132 50 78 156 76 312 C74 412 108 480 138 512 L378 512 C406 476 434 404 430 300 C424 150 372 44 258 46 Z" fill="#0c080a"/>
    <path d="${o.rimPath}" fill="none" stroke="url(#rim)" stroke-width="9" filter="url(#s6)" opacity=".9"/>
    <path d="M256 96 C182 98 150 168 152 250 C154 344 206 420 258 434 C312 418 360 342 358 246 C356 160 322 94 256 96 Z" fill="url(#face)"/>
    ${sh(o.darkX, 240, 50, 100, .9)}
    ${sh(280, 168, 96, 60, .85)}
    ${sh(256, 322, 22, 54, .8, "s14")}
    ${hi(light.hx, light.hy, 46, 70, o.hiCol, .28)}
    <path d="M186 214 C220 198 296 196 328 216 L326 236 C296 222 218 224 188 236 Z" fill="#070402" opacity=".72" filter="url(#s6)"/>
    <path d="M256 252 q-8 30 -2 46" fill="none" stroke="${o.hiCol}" stroke-width="5" opacity=".18" filter="url(#s6)"/>
    ${eye(214, 254, 22, eg, o.slit)}
    ${eye(300, 250, 20, eg, o.slit)}
    ${o.blood === "heavy" ? drip(214, 274, 128) + drip(300, 268, 104) : drip(214, 274, 120)}
    <path d="M152 322 C192 302 322 302 358 320 C346 386 306 420 256 420 C206 420 164 386 152 322 Z" fill="#0b090d" opacity=".82"/>
    ${lace}${torn}
    <circle cx="${light.x}" cy="${light.y}" r="${light.r}" fill="url(#lamp)"/><circle cx="${light.x}" cy="${light.y - 2}" r="8" fill="#fff3d6"/>
    <rect width="${S}" height="${S}" fill="url(#vig)"/></svg>`;
}

// ışık/renk presetleri
const warmFace = { x1: .15, y1: 1, x2: .78, y2: .08, stops: `<stop offset="0" stop-color="#f2d4a4"/><stop offset=".32" stop-color="#c39c74"/><stop offset=".64" stop-color="#6b5138"/><stop offset="1" stop-color="#241a12"/>` };
const coldFace = { x1: .2, y1: 0, x2: .8, y2: 1, stops: `<stop offset="0" stop-color="#d8e4ee"/><stop offset=".4" stop-color="#8fa1b0"/><stop offset=".72" stop-color="#3c4650"/><stop offset="1" stop-color="#161c22"/>` };
const rimL = "M256 48 C138 50 84 150 80 306";
const rimR = "M256 48 C374 50 428 150 432 306";

const variants = [
  { name: "yuz1-sinematik.png", bgcx: 30, bgWarm: "#3e2716", light: { x: 130, y: 480, r: 170, hx: 200, hy: 250 }, hx: 200, fg: warmFace, rim: "#ffbf62", rimPath: rimL, lampC: "#ffe6ad", lampC2: "#ef9a2a", eyeGrad: "eR", slit: false, blood: "light", veil: "lace", darkX: 332, hiCol: "#ffdca0" },
  { name: "yuz2-kanli.png", bgcx: 50, bgWarm: "#3a2414", light: { x: 256, y: 492, r: 165, hx: 256, hy: 300 }, fg: warmFace, rim: "#ffbf62", rimPath: rimL, lampC: "#ffe6ad", lampC2: "#ef9a2a", eyeGrad: "eR", slit: true, blood: "heavy", veil: "plain", darkX: 300, hiCol: "#ffdca0" },
  { name: "yuz3-hayalet.png", bgcx: 50, bgWarm: "#1c2836", light: { x: 256, y: 120, r: 150, hx: 256, hy: 200 }, fg: coldFace, rim: "#a9c4e0", rimPath: rimL, lampC: "#dfeeff", lampC2: "#5f86b0", eyeGrad: "eC", slit: false, blood: "light", veil: "lace", darkX: 320, hiCol: "#cfe0ff" },
  { name: "yuz4-yirtik.png", bgcx: 68, bgWarm: "#3e2716", light: { x: 382, y: 480, r: 168, hx: 312, hy: 250 }, fg: warmFace, rim: "#ffbf62", rimPath: rimR, lampC: "#ffe6ad", lampC2: "#ef9a2a", eyeGrad: "eR", slit: false, blood: "light", veil: "torn", darkX: 190, hiCol: "#ffdca0" },
  { name: "yuz5-bakis.png", bgcx: 50, bgWarm: "#43230f", light: { x: 256, y: 500, r: 175, hx: 256, hy: 310 }, fg: warmFace, rim: "#ffcf78", rimPath: rimL, lampC: "#fff0c8", lampC2: "#f0952a", eyeGrad: "eR", slit: true, blood: "heavy", veil: "plain", darkX: 316, hiCol: "#ffe0a8" },
];

async function grainOut(svg, file) {
  const base = await sharp(Buffer.from(svg)).resize(S, S).png().toBuffer();
  const g1 = await sharp({ create: { width: S, height: S, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 22 } } }).ensureAlpha(0.5).png().toBuffer();
  const g2 = await sharp({ create: { width: 256, height: 256, channels: 3, background: { r: 128, g: 128, b: 128 }, noise: { type: "gaussian", mean: 128, sigma: 28 } } }).resize(S, S).blur(0.6).ensureAlpha(0.38).png().toBuffer();
  await sharp(base).composite([{ input: g1, blend: "soft-light" }, { input: g2, blend: "soft-light" }]).png({ compressionLevel: 9 }).toFile(path.join(OUT, file));
  console.log("✓ " + file);
}

await mkdir(OUT, { recursive: true });
for (const v of variants) await grainOut(faceIcon(v), v.name);
console.log("\n" + OUT);
