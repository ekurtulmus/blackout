import sharp from "sharp";
const scene = "C:/Users/LENOVO/Downloads/Mobile_game_app_icon_square_An_old_brass_lantern_glowing_war.jpg";
const OUT = "D:/OneDrive/Desktop/JILTED-store/ozellik-grafigi-1024x500.png";
const W = 1024, H = 500;

// sahne sağa, 560x500 kapla (kareyi hafif kırpar)
const photo = await sharp(scene).resize(560, H, { fit: "cover", position: "centre" }).toBuffer();

// koyu zemin
const bg = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs><linearGradient id="b" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#0e1418"/><stop offset=".6" stop-color="#070a0c"/><stop offset="1" stop-color="#030405"/></linearGradient></defs>
  <rect width="${W}" height="${H}" fill="url(#b)"/></svg>`);

// üst katman: sol scrim (fotoğrafın sol kenarını karanlığa yedirir) + başlık
const overlay = Buffer.from(`<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}">
  <defs>
    <linearGradient id="scrim" x1="0" y1="0" x2="1" y2="0">
      <stop offset="0" stop-color="#05080a" stop-opacity="1"/><stop offset=".44" stop-color="#05080a" stop-opacity="1"/>
      <stop offset=".64" stop-color="#05080a" stop-opacity="0"/></linearGradient>
    <filter id="glow" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="7" result="b"/><feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge></filter>
    <filter id="sg" x="-60%" y="-60%" width="220%" height="220%"><feGaussianBlur stdDeviation="16"/></filter>
  </defs>
  <rect width="${W}" height="${H}" fill="url(#scrim)"/>
  <text x="248" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="104" font-weight="700" letter-spacing="9" fill="#e0a24a" opacity=".5" filter="url(#sg)">JILTED</text>
  <text x="248" y="215" text-anchor="middle" font-family="Georgia, serif" font-size="104" font-weight="700" letter-spacing="9" fill="#f4ecd8" filter="url(#glow)">JILTED</text>
  <rect x="120" y="242" width="256" height="2.5" fill="#8a1f1f"/>
  <text x="248" y="292" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="23" letter-spacing="6" fill="#c9bfa6">ESCAPE IN THE DARK</text>
  <text x="248" y="336" text-anchor="middle" font-family="Segoe UI, Arial, sans-serif" font-size="20" fill="#8f8674">Outrun the Blood Brides.</text>
</svg>`);

await sharp(bg)
  .composite([{ input: photo, left: W - 560, top: 0 }, { input: overlay, left: 0, top: 0 }])
  .png({ compressionLevel: 9 }).toFile(OUT);
console.log("OK -> " + OUT);
