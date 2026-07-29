// JILTED — Play Store görselleri. node scripts/gen-store.mjs
// Öne çıkan görsel (1024x500) + telefon (1080x1920) + TABLET yatay (1920x1080) + ikon.
// Oyunun gerçek görünümü: yukarıdan bakış labirent + fener ışık konisi + oyuncu + Kanlı Gelin + HUD.
// SVG → sharp (tam boyut PNG, tarayıcı gerekmez).
import sharp from "sharp";
import { mkdir, copyFile } from "node:fs/promises";
import path from "node:path";

const OUT = "D:/OneDrive/Desktop/JILTED-store";
const GOLD = "#c79a52", INK = "#efe7d6";

// --- basit deterministik labirent (binary tree) ---
function lcg(seed) { let s = seed >>> 0; return () => (s = (s * 1664525 + 1013904223) >>> 0) / 4294967296; }
function genMaze(cols, rows, rng) {
  const W = 2 * cols + 1, H = 2 * rows + 1;
  const g = Array.from({ length: H }, () => Array(W).fill(1));
  for (let r = 0; r < rows; r++) for (let c = 0; c < cols; c++) {
    const cy = 2 * r + 1, cx = 2 * c + 1; g[cy][cx] = 0;
    const canN = r > 0, canE = c < cols - 1;
    if (canN && (!canE || rng() < 0.5)) g[cy - 1][cx] = 0;
    else if (canE) g[cy][cx + 1] = 0;
  }
  return g;
}

// duvaklı gelin (hücre ölçeğinde)
const bride = (x, y, s, eyes = true) => `
  <g transform="translate(${x},${y}) scale(${s})">
    <path d="M0 -34 C-19 -34 -26 -11 -27 34 L27 34 C26 -11 19 -34 0 -34 Z" fill="#0b0806"/>
    <circle cx="0" cy="-37" r="11" fill="#0b0806"/>
    <path d="M-11 -37 C-11 -55 11 -55 11 -37 L15 17 C6 25 -6 25 -15 17 Z" fill="#171019" opacity=".9"/>
    ${eyes ? '<circle cx="-4" cy="-38" r="2" fill="#ff5a5a"/><circle cx="4.5" cy="-38" r="2" fill="#ff5a5a"/>' : ""}
  </g>`;

// oyuncu (küçük fenerli figür, halka renkli)
const player = (x, y, ring = "#6ee7ff") => `
  <g transform="translate(${x},${y})">
    <circle r="15" fill="#cfe0f0"/>
    <circle r="19" fill="none" stroke="${ring}" stroke-width="3.5"/>
    <circle cy="-3" r="4" fill="#fff7e6"/>
  </g>`;

// kılıç (oyuncunun elinde, verilen açıda)
const sword = (x, y, ang, blade = "#c9d2dc", glow = "rgba(200,220,255,.6)") => `
  <g transform="translate(${x},${y}) rotate(${ang})">
    <rect x="14" y="-3.5" width="46" height="7" rx="2.5" fill="${blade}" style="filter:drop-shadow(0 0 8px ${glow})"/>
    <rect x="10" y="-8" width="6" height="16" rx="2" fill="#5b4a34"/>
  </g>`;

// altın sikke + mermi
const coin = (x, y) => `<circle cx="${x}" cy="${y}" r="11" fill="#e6b84a" stroke="#8a6a26" stroke-width="2.5"/><circle cx="${x}" cy="${y}" r="5" fill="none" stroke="#8a6a26" stroke-width="2"/>`;
const ammo = (x, y) => `<rect x="${x - 4}" y="${y - 10}" width="8" height="20" rx="3" fill="#b8944a"/>`;

// HUD üst şerit
const hud = (W, chapter, ammoN, goldN) => {
  const hearts = [0, 1, 2].map(i => `<path transform="translate(${40 + i * 42},44) scale(1.1)" d="M0 3 C-4 -3 -12 -1 -12 5 C-12 11 0 16 0 16 C0 16 12 11 12 5 C12 -1 4 -3 0 3 Z" fill="#e8556b"/>`).join("");
  return `
    <g font-family="Segoe UI, Arial, sans-serif" font-weight="600">
      <rect x="0" y="0" width="${W}" height="96" fill="#05040a" opacity=".55"/>
      ${hearts}
      <g transform="translate(${W - 470},34)"><rect x="-4" y="-12" width="9" height="24" rx="3" fill="#b8944a"/><text x="20" y="10" font-size="30" fill="${INK}">${ammoN}</text></g>
      <g transform="translate(${W - 330},46)">${coin(0, 0)}<text x="22" y="10" font-size="30" fill="#ffd75a">${goldN}</text></g>
      <text x="${W - 150}" y="56" font-size="30" fill="#b3aa93">${chapter}</text>
    </g>`;
};

// fener + kıvrık J işareti (başlık/feature için)
const lanternMark = (id, x, y, s) => `
  <g transform="translate(${x},${y}) scale(${s})">
    <radialGradient id="glow${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#e0a24a" stop-opacity=".5"/><stop offset=".5" stop-color="#e0a24a" stop-opacity=".12"/><stop offset="1" stop-color="#e0a24a" stop-opacity="0"/></radialGradient>
    <radialGradient id="au${id}" cx="50%" cy="50%" r="50%"><stop offset="0" stop-color="#fff7e6" stop-opacity=".95"/><stop offset="1" stop-color="#fff7e6" stop-opacity="0"/></radialGradient>
    <circle cx="52" cy="130" r="60" fill="url(#glow${id})"/>
    <path d="M46 28 H110 M94 28 V112 A30 30 0 0 1 52 130" fill="none" stroke="${GOLD}" stroke-width="15" stroke-linecap="round" stroke-linejoin="round"/>
    <circle cx="52" cy="130" r="16" fill="url(#au${id})"/><circle cx="52" cy="123.5" r="4" fill="#fff7e6"/><path d="M52 128 L46.5 142 H57.5 Z" fill="#fff7e6"/>
  </g>`;

// --- OYNANIŞ SAHNESİ (yukarıdan labirent + ışık konisi) ---
function scene(id, W, H, cfg) {
  const cols = cfg.cols, rows = Math.round(cols * H / W);
  const rng = lcg(cfg.seed);
  const g = genMaze(cols, rows, rng);
  const gw = g[0].length, gh = g.length;
  const cs = W / gw; // hücre piksel
  const PX = (Math.floor(gw / 2) + 0.5) * cs, PY = (Math.floor(gh / 2) + 0.5) * cs;
  const R = cs * 5.2; // ışık yarıçapı
  // labirent hücreleri
  let cells = "";
  for (let y = 0; y < gh; y++) for (let x = 0; x < gw; x++) {
    if (g[y][x] === 1) cells += `<rect x="${x * cs}" y="${y * cs}" width="${cs + 1}" height="${cs + 1}" fill="#241c14"/>`;
  }
  // birimleri hücre koordinatından piksele
  const cell = (cx, cy) => ({ x: (cx + 0.5) * cs, y: (cy + 0.5) * cs });
  let ents = "";
  for (const b of cfg.brides || []) { const p = cell(b[0], b[1]); ents += bride(p.x, p.y, cs / 34 * 0.9); }
  for (const a of cfg.ammo || []) { const p = cell(a[0], a[1]); ents += ammo(p.x, p.y); }
  for (const c of cfg.coins || []) { const p = cell(c[0], c[1]); ents += coin(p.x, p.y); }
  const pc = cfg.playerCell ? cell(cfg.playerCell[0], cfg.playerCell[1]) : { x: PX, y: PY };
  let pl = "";
  if (cfg.sword) pl += sword(pc.x, pc.y, cfg.swordAng ?? -30);
  pl += player(pc.x, pc.y, cfg.ring);
  const cx = pc.x, cy = pc.y;
  return `
    <defs>
      <radialGradient id="floor${id}" cx="42%" cy="40%" r="90%"><stop offset="0" stop-color="#120d09"/><stop offset="1" stop-color="#050302"/></radialGradient>
      <radialGradient id="dark${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${R}">
        <stop offset="0" stop-color="#040302" stop-opacity="0"/><stop offset=".5" stop-color="#050302" stop-opacity=".3"/>
        <stop offset=".82" stop-color="#040302" stop-opacity=".93"/><stop offset="1" stop-color="#030201" stop-opacity=".985"/>
      </radialGradient>
      <radialGradient id="warm${id}" gradientUnits="userSpaceOnUse" cx="${cx}" cy="${cy}" r="${R * 0.85}">
        <stop offset="0" stop-color="#e6a850" stop-opacity=".26"/><stop offset="1" stop-color="#e6a850" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <rect width="${W}" height="${H}" fill="url(#floor${id})"/>
    ${cells}
    <rect width="${W}" height="${H}" fill="url(#dark${id})"/>
    <rect width="${W}" height="${H}" fill="url(#warm${id})"/>
    ${ents}${pl}`;
}

const caption = (W, H, c1, c2, big = 62) => `
  <rect x="0" y="${H - 260}" width="${W}" height="260" fill="#040302" opacity=".62"/>
  <text x="${W / 2}" y="${H - 150}" text-anchor="middle" font-family="Georgia, serif" font-size="${big}" font-weight="700" fill="${INK}">${c1}</text>
  <text x="${W / 2}" y="${H - 90}" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="34" fill="#b3aa93">${c2}</text>`;

const wrap = (W, H, inner) => `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">${inner}</svg>`;
const toPng = async (svg, W, H, f) => { await sharp(Buffer.from(svg)).resize(W, H).png({ compressionLevel: 9 }).toFile(path.join(OUT, f)); console.log(`✓ ${f} (${W}x${H})`); };

await mkdir(OUT, { recursive: true });

// ÖNE ÇIKAN GÖRSEL
const feature = wrap(1024, 500, `
  <defs><radialGradient id="bgF" cx="42%" cy="44%" r="90%"><stop offset="0" stop-color="#171110"/><stop offset=".5" stop-color="#0a0706"/><stop offset="1" stop-color="#040202"/></radialGradient></defs>
  <rect width="1024" height="500" fill="url(#bgF)"/>
  ${lanternMark("F", 55, 150, 1.25)}
  ${bride(840, 250, 3.2)}
  <text x="470" y="235" font-family="Georgia, serif" font-size="96" font-weight="700" letter-spacing="14" fill="${INK}">JILTED</text>
  <text x="474" y="288" font-family="Segoe UI, Arial, sans-serif" font-size="25" letter-spacing="6" fill="#b3aa93">ESCAPE IN THE DARK</text>
  <text x="474" y="342" font-family="Segoe UI, Arial, sans-serif" font-size="22" fill="#8f8674">A horror maze-runner. Outrun the Blood Brides.</text>`);
await toPng(feature, 1024, 500, "ozellik-grafigi-1024x500.png");

// TELEFON (1080x1920)
const P = [1080, 1920];
// p1 başlık
await toPng(wrap(...P, `
  <defs><radialGradient id="bgT" cx="50%" cy="42%" r="80%"><stop offset="0" stop-color="#171110"/><stop offset=".5" stop-color="#0a0706"/><stop offset="1" stop-color="#040202"/></radialGradient></defs>
  <rect width="1080" height="1920" fill="url(#bgT)"/>
  ${lanternMark("T", 380, 470, 2.6)}
  <text x="540" y="1160" text-anchor="middle" font-family="Georgia, serif" font-size="150" font-weight="700" letter-spacing="22" fill="${INK}">JILTED</text>
  <text x="540" y="1240" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="40" letter-spacing="8" fill="#b3aa93">ESCAPE IN THE DARK</text>`), ...P, "shot1.png");

// p2 oynanış: fener + bir gelin kenarda
await toPng(wrap(...P, scene("s2", ...P, { cols: 7, seed: 7, brides: [[8, 6]], ammo: [[6, 8]], ring: "#6ee7ff" }) + hud(1080, "3 / 10", 8, 120) + caption(...P, "One lantern. Endless dark.", "Find the exit before it finds you")), ...P, "shot2.png");

// p3 oynanış: kılıç + iki gelin
await toPng(wrap(...P, scene("s3", ...P, { cols: 7, seed: 3, sword: true, swordAng: -35, brides: [[8, 7], [6, 6]], coins: [[9, 8]], ring: "#ffd75a" }) + hud(1080, "6 / 10", 4, 340) + caption(...P, "Blade or gun — choose", "Two hits and the Bride falls")), ...P, "shot3.png");

// p4 gelin yakın plan (etkileyici)
await toPng(wrap(...P, `
  <defs><radialGradient id="bgB" cx="50%" cy="40%" r="80%"><stop offset="0" stop-color="#141010"/><stop offset=".6" stop-color="#0a0706"/><stop offset="1" stop-color="#040202"/></radialGradient></defs>
  <rect width="1080" height="1920" fill="url(#bgB)"/>
  ${bride(540, 760, 8.2)}
  ${caption(...P, "The Blood Brides never stop", "They hear you in the dark")}`), ...P, "shot4.png");

// p5 oynanış: altın + mermi topla
await toPng(wrap(...P, scene("s5", ...P, { cols: 7, seed: 11, brides: [[8, 8]], coins: [[6, 7], [7, 9]], ammo: [[5, 8]], ring: "#7dffb0" }) + hud(1080, "4 / 10", 6, 210) + caption(...P, "Survive to earn gold", "Spend it on veils, allies, blades")), ...P, "shot5.png");

// TABLET yatay (1920x1080) — 7" ve 10" için aynıları kullanılabilir
const T = [1920, 1080];
await toPng(wrap(...T, scene("t1", ...T, { cols: 13, seed: 21, brides: [[16, 8], [10, 5]], ammo: [[12, 9]], coins: [[15, 6]], ring: "#6ee7ff" }) + hud(1920, "3 / 10", 8, 120) + caption(...T, "Escape the maze before the dark takes you", "10 chapters, each darker than the last", 56)), ...T, "tablet1.png");
await toPng(wrap(...T, scene("t2", ...T, { cols: 13, seed: 5, sword: true, swordAng: -25, brides: [[16, 7], [12, 9], [9, 5]], coins: [[14, 8]], ring: "#ffd75a" }) + hud(1920, "8 / 10", 12, 480) + caption(...T, "Multiplayer Death Run", "2–6 players — first one out wins", 56)), ...T, "tablet2.png");

await copyFile(path.join(process.cwd(), "public", "icons", "icon-512.png"), path.join(OUT, "uygulama-ikonu-512.png"));
console.log("✓ uygulama-ikonu-512.png");
console.log(`\nHepsi: ${OUT}`);
