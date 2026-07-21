import { definePart } from "./_part";

// ÇEKİRDEK: dil seçici · ana menü birincil kartlar · Çok Oyunculu ekranı · Ayarlar · ortak.
export const core = definePart({
  tr: {
    "lang.title": "Dil",
    "lang.desc": "Oyunun dili. Seçimin bu cihazda saklanır.",

    "menu.single": "TEK KİŞİLİK",
    "menu.single.sub": "Yalnız kaçış · 10 bölüm",
    "menu.multi": "ÇOK OYUNCULU",
    "menu.multi.sub": "Ölüm koşusu · 2–6 kişi",

    "multi.eyebrow": "Çok Oyunculu",
    "multi.title": "ÖLÜM KOŞUSU",
    "multi.sub": "2–6 kişi, ilk kaçan kazanır.",
    "multi.friends": "ARKADAŞLARINLA OYNA",
    "multi.friends.sub": "Oda kur, kodu paylaş · özel oda",
    "multi.rooms": "ONLINE ODALAR",
    "multi.soon.badge": "Yakında",
    "multi.soon.note": "Online odalar çok yakında oyunda olacak",

    "settings.eyebrow": "Tercihlerin",
    "settings.title": "AYARLAR",
    "settings.name": "Oyuncu Adın",
    "settings.name.saved": "✓ Kaydedildi",
    "settings.name.desc": "Boş bırakırsan arkadaş kodun ({code}) görünür. Çok oyunculuda ve arkadaş listende bu isim görünür.",
    "settings.volume": "Ses Seviyesi",
    "settings.sound": "Ses",
    "settings.on": "Açık",
    "settings.off": "Kapalı",
    "settings.hint": "Oyun içinde Esc / P ile duraklat. Ayarların bu cihazda saklanır.",
    "settings.reset.title": "Tüm İlerlemeyi Sıfırla",
    "settings.reset.desc": "Tüm ilerlemen silinir: altın, envanter ve satın almalar, tamamlanan görevler, açılan sırlar, günlük sayfaları, başarımlar, en iyi skorlar ve kaldığın bölüm. Geri alınamaz. Adın, arkadaşların ve ses tercihlerin korunur.",
    "settings.reset.btn": "Sıfırla",
    "settings.reset.confirm": "Emin misin? Tüm ilerlemen ve satın almaların kalıcı olarak silinecek.",
    "settings.reset.yes": "Evet, hepsini sil",
    "settings.reset.cancel": "Vazgeç",

    "common.back": "Geri",
  },
  en: {
    "lang.title": "Language",
    "lang.desc": "The game's language. Your choice is saved on this device.",

    "menu.single": "SINGLE PLAYER",
    "menu.single.sub": "Solo escape · 10 chapters",
    "menu.multi": "MULTIPLAYER",
    "menu.multi.sub": "Death run · 2–6 players",

    "multi.eyebrow": "Multiplayer",
    "multi.title": "DEATH RUN",
    "multi.sub": "2–6 players. First one out wins.",
    "multi.friends": "PLAY WITH FRIENDS",
    "multi.friends.sub": "Create a room, share the code · private",
    "multi.rooms": "ONLINE ROOMS",
    "multi.soon.badge": "Soon",
    "multi.soon.note": "Online rooms are coming to the game very soon",

    "settings.eyebrow": "Your preferences",
    "settings.title": "SETTINGS",
    "settings.name": "Your Player Name",
    "settings.name.saved": "✓ Saved",
    "settings.name.desc": "Leave it empty and your friend code ({code}) will show instead. This name appears in multiplayer and in your friends list.",
    "settings.volume": "Volume",
    "settings.sound": "Sound",
    "settings.on": "On",
    "settings.off": "Off",
    "settings.hint": "Press Esc / P during the game to pause. Your settings are saved on this device.",
    "settings.reset.title": "Reset All Progress",
    "settings.reset.desc": "Everything will be erased: gold, inventory and purchases, completed missions, unlocked secrets, journal pages, achievements, best scores and the chapter you reached. This cannot be undone. Your name, friends and sound preferences are kept.",
    "settings.reset.btn": "Reset",
    "settings.reset.confirm": "Are you sure? All your progress and purchases will be permanently deleted.",
    "settings.reset.yes": "Yes, delete everything",
    "settings.reset.cancel": "Cancel",

    "common.back": "Back",
  },
});
