import sharp from "sharp";
const src = "C:/Users/LENOVO/Downloads/Mobile_game_app_icon_square_A_pair_of_softly_glowing_eyes_pe.jpg";
const out = "D:/OneDrive/Desktop/JILTED-store/uygulama-ikonu-512.png";
// iç ikon karesini kırp (gri çerçeveyi at), 512x512
await sharp(src).extract({ left: 218, top: 250, width: 590, height: 590 }).resize(512, 512).png({ compressionLevel: 9 }).toFile(out);
console.log("OK -> " + out);
