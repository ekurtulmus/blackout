import { definePart } from "./_part";

// Kabuk ve ara sahneler: Finale.tsx, MenuShell.tsx, Splash.tsx
// (Bu parca doldurulacak: tr = kaynak, en = ceviri. Anahtar bicimi: <alan>.<oge>)
//
// NOT: "JILTED" MARKA ADIDIR — sozlukte yok, bilesende sabit yazilidir (asla cevrilmez).
// ".aria" son ekli anahtarlar ekranda GORUNMEZ; ekran okuyucu icindir (aria-label/title).
export const chrome = definePart({
  tr: {
    // --- Splash (acilis) ---
    "chrome.splash.sub": "Karanlıkta Kaçış",
    "chrome.splash.skip.aria": "Girişi atla",

    // --- Finale (kampanya kapanisi) ---
    // Uc anlatı satırı sırayla belirip solar; sonra başlık, kanca, kararma, tek kelime.
    "chrome.fin.line1": "Son gelin sustuğunda, düğün marşı da sustu.",
    "chrome.fin.line2": "Fenerin son kez titredi ve söndü — artık ona ihtiyacın yoktu.",
    "chrome.fin.line3": "Taşın ardında gri bir aralık. Sabah.",
    "chrome.fin.title": "GÜN AĞARDI",
    "chrome.fin.hook": "Karanlık geride kaldı.",
    "chrome.fin.last": "Şimdilik.",
    "chrome.fin.skip": "dokun · geç",
    "chrome.fin.skip.aria": "Finali geç",

    // --- MenuShell (ortak kabuk) ---
    "chrome.shell.wallet": "Cüzdan",
    "chrome.shell.wallet.aria": "Cüzdan: {n} altın",
    "chrome.shell.back": "Geri",
    "chrome.shell.help": "Nasıl Oynanır",
    "chrome.shell.settings": "Ayarlar",
    "chrome.shell.friends": "Arkadaşlarım",
    "chrome.shell.fullscreen": "Tam ekran oyna",
    "chrome.shell.fullscreen.exit": "Tam ekrandan çık",
  },
  en: {
    // --- Splash ---
    "chrome.splash.sub": "Escape in the Dark",
    "chrome.splash.skip.aria": "Skip intro",

    // --- Finale ---
    "chrome.fin.line1": "When the last bride fell silent, so did the wedding march.",
    "chrome.fin.line2": "Your lantern flickered one last time and died — you no longer needed it.",
    "chrome.fin.line3": "Beyond the stone, a sliver of grey. Morning.",
    "chrome.fin.title": "DAYBREAK",
    "chrome.fin.hook": "The dark is behind you.",
    "chrome.fin.last": "For now.",
    "chrome.fin.skip": "tap · skip",
    "chrome.fin.skip.aria": "Skip finale",

    // --- MenuShell ---
    "chrome.shell.wallet": "Wallet",
    "chrome.shell.wallet.aria": "Wallet: {n} gold",
    "chrome.shell.back": "Back",
    "chrome.shell.help": "How to Play",
    "chrome.shell.settings": "Settings",
    "chrome.shell.friends": "My Friends",
    "chrome.shell.fullscreen": "Play fullscreen",
    "chrome.shell.fullscreen.exit": "Exit fullscreen",
  },
});
