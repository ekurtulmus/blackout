import { definePart } from "./_part";

// DÜKKÂN: lib/inventory.ts eşya ad/açıklamaları + components/Shop.tsx arayüzü.
//
// Anahtar biçimi:
//   shop.item.<id>.title / shop.item.<id>.desc   → SHOP_ITEMS eşyaları (id = eşyanın id'si)
//   shop.color.<slot>.<value>                    → kozmetik renk adları (slot: flash/skin/sword)
//   shop.<öge>                                   → dükkân arayüzü (sekme, buton, mesaj, şerit)
//
// NOT: Dükkânda gerçek para YOK — her şey oyun-içi altınla alınır. İngilizce metinler
// bu yüzden "buy/gold" der, ödeme/satın alma çağrışımı yapan ifade kullanmaz.
export const shop = definePart({
  tr: {
    // --- Eşyalar (lib/inventory.ts) ---
    "shop.item.veil.title": "Duvak (x2)",
    "shop.item.veil.desc":
      "Oyunda kullan — birkaç sn görünmez ol; gelinler seni göremez (ateş edersen bozulur). 2 adet.",
    "shop.item.permAmmo.title": "Sürekli Cephane",
    "shop.item.permAmmo.desc": "KALICI: her bölüme +3 mermiyle başla.",
    "shop.item.soldier.title": "Asker Müttefiki",
    "shop.item.soldier.desc":
      "Yanında savaşan bir asker: seni takip eder, gelinlere ateş eder (senin renk çerçeven + ismin). Bir kez alınır; ölene dek yanında kalır (sen ölünce gider, tekrar alınabilir). Çok oyunculuda da geçerli.",

    "shop.item.sword_ember.title": "Kılıç: Köz",
    "shop.item.sword_ember.desc": "Kişiselleştirme — köz gibi yanan turuncu kılıç.",
    "shop.item.sword_void.title": "Kılıç: Boşluk",
    "shop.item.sword_void.desc": "Kişiselleştirme — mor boşluk ışığı saçan kılıç.",
    "shop.item.sword_frost.title": "Kılıç: Ayaz",
    "shop.item.sword_frost.desc": "Kişiselleştirme — buz mavisi, soğuk parıltılı kılıç.",

    "shop.item.flash_crimson.title": "Fener: Kızıl",
    "shop.item.flash_crimson.desc": "Kişiselleştirme — tekinsiz kızıl fener ışığı.",
    "shop.item.flash_toxic.title": "Fener: Zehir Yeşili",
    "shop.item.flash_toxic.desc": "Kişiselleştirme — hastalıklı zehir yeşili fener ışığı.",
    "shop.item.flash_violet.title": "Fener: Mor",
    "shop.item.flash_violet.desc": "Kişiselleştirme — tekinsiz mor fener ışığı.",
    "shop.item.flash_gold.title": "Fener: Altın",
    "shop.item.flash_gold.desc": "Kişiselleştirme — sıcak altın sarısı fener ışığı.",

    "shop.item.skin_gold.title": "Görünüm: Altın Halka",
    "shop.item.skin_gold.desc": "Kişiselleştirme — oyuncu altın halkayla parlar.",
    "shop.item.skin_violet.title": "Görünüm: Mor Halka",
    "shop.item.skin_violet.desc": "Kişiselleştirme — oyuncu mor halkayla parlar.",
    "shop.item.skin_emerald.title": "Görünüm: Zümrüt Halka",
    "shop.item.skin_emerald.desc": "Kişiselleştirme — oyuncu zümrüt yeşili halkayla parlar.",
    "shop.item.skin_crimson.title": "Görünüm: Kızıl Halka",
    "shop.item.skin_crimson.desc": "Kişiselleştirme — oyuncu kızıl halkayla parlar.",

    // --- Kozmetik renk adları (swatch altındaki kısa isim) ---
    "shop.color.flash.default": "Soğuk Beyaz",
    "shop.color.flash.crimson": "Kızıl",
    "shop.color.flash.toxic": "Zehir Yeşili",
    "shop.color.flash.violet": "Mor",
    "shop.color.flash.gold": "Altın",

    "shop.color.skin.default": "Halkasız",
    "shop.color.skin.gold": "Altın",
    "shop.color.skin.violet": "Mor",
    "shop.color.skin.emerald": "Zümrüt",
    "shop.color.skin.crimson": "Kızıl",

    "shop.color.sword.default": "Paslı Çelik",
    "shop.color.sword.ember": "Köz",
    "shop.color.sword.void": "Boşluk",
    "shop.color.sword.frost": "Ayaz",

    // --- Dükkân arayüzü (components/Shop.tsx) ---
    "shop.title": "DÜKKÂN",
    "shop.title.interlude": "BÖLÜM ARASI DÜKKÂN",
    "shop.eyebrow": "Kuşan ve Güçlen",
    "shop.close": "Kapat",

    "shop.tab.features": "Özellikler",
    "shop.tab.cosmetics": "Kişiselleştirme",

    "shop.inventory": "Envanterin",
    "shop.strip.veil": "Duvak",
    "shop.strip.permAmmo": "Sürekli cephane",
    "shop.strip.soldier": "Asker",

    "shop.badge.perm": "KALICI",
    "shop.owned": "Elinde: {n}",
    "shop.owned.btn": "Sahipsin",
    "shop.buy": "Satın al",
    "shop.notEnough": "Yetersiz altın",
    "shop.alreadyOwned": "Zaten sahipsin",
    "shop.bought": "{name} alındı",
    "shop.selected": "Seçildi",

    "shop.cos.flash": "Fener Rengi",
    "shop.cos.skin": "Görünüm Halkası",
    "shop.cos.sword": "Kılıç Rengi",
    "shop.equipped": "SEÇİLİ",
    "shop.free": "Ücretsiz",
    "shop.use": "Kullan",
  },
  en: {
    // --- Items (lib/inventory.ts) ---
    "shop.item.veil.title": "Veil (x2)",
    "shop.item.veil.desc":
      "Use it in-game — go invisible for a few seconds; the brides can't see you (firing breaks it). 2 uses.",
    "shop.item.permAmmo.title": "Endless Ammo",
    "shop.item.permAmmo.desc": "PERMANENT: start every chapter with +3 bullets.",
    "shop.item.soldier.title": "Soldier Ally",
    "shop.item.soldier.desc":
      "A soldier who fights at your side: he follows you and shoots the brides (wearing your ring color and your name). Bought once; he stays until he falls (lost when you die, and can be bought again). Works in multiplayer too.",

    "shop.item.sword_ember.title": "Sword: Ember",
    "shop.item.sword_ember.desc": "Customization — an orange blade burning like an ember.",
    "shop.item.sword_void.title": "Sword: Void",
    "shop.item.sword_void.desc": "Customization — a blade pouring violet void light.",
    "shop.item.sword_frost.title": "Sword: Frost",
    "shop.item.sword_frost.desc": "Customization — an ice-blue blade with a cold glow.",

    "shop.item.flash_crimson.title": "Lantern: Crimson",
    "shop.item.flash_crimson.desc": "Customization — an eerie crimson lantern light.",
    "shop.item.flash_toxic.title": "Lantern: Toxic",
    "shop.item.flash_toxic.desc": "Customization — a sickly toxic-green lantern light.",
    "shop.item.flash_violet.title": "Lantern: Violet",
    "shop.item.flash_violet.desc": "Customization — an eerie violet lantern light.",
    "shop.item.flash_gold.title": "Lantern: Gold",
    "shop.item.flash_gold.desc": "Customization — a warm golden lantern light.",

    "shop.item.skin_gold.title": "Skin: Gold Ring",
    "shop.item.skin_gold.desc": "Customization — you glow with a gold ring.",
    "shop.item.skin_violet.title": "Skin: Violet Ring",
    "shop.item.skin_violet.desc": "Customization — you glow with a violet ring.",
    "shop.item.skin_emerald.title": "Skin: Emerald Ring",
    "shop.item.skin_emerald.desc": "Customization — you glow with an emerald ring.",
    "shop.item.skin_crimson.title": "Skin: Crimson Ring",
    "shop.item.skin_crimson.desc": "Customization — you glow with a crimson ring.",

    // --- Cosmetic color names (short label under the swatch) ---
    "shop.color.flash.default": "Cold White",
    "shop.color.flash.crimson": "Crimson",
    "shop.color.flash.toxic": "Toxic",
    "shop.color.flash.violet": "Violet",
    "shop.color.flash.gold": "Gold",

    "shop.color.skin.default": "No Ring",
    "shop.color.skin.gold": "Gold",
    "shop.color.skin.violet": "Violet",
    "shop.color.skin.emerald": "Emerald",
    "shop.color.skin.crimson": "Crimson",

    "shop.color.sword.default": "Rusted Steel",
    "shop.color.sword.ember": "Ember",
    "shop.color.sword.void": "Void",
    "shop.color.sword.frost": "Frost",

    // --- Shop UI (components/Shop.tsx) ---
    "shop.title": "SHOP",
    "shop.title.interlude": "CHAPTER BREAK SHOP",
    "shop.eyebrow": "Gear Up, Grow Stronger",
    "shop.close": "Close",

    "shop.tab.features": "Upgrades",
    "shop.tab.cosmetics": "Customization",

    "shop.inventory": "Your Inventory",
    "shop.strip.veil": "Veil",
    "shop.strip.permAmmo": "Endless ammo",
    "shop.strip.soldier": "Soldier",

    "shop.badge.perm": "PERMANENT",
    "shop.owned": "You have: {n}",
    "shop.owned.btn": "Owned",
    "shop.buy": "Buy",
    "shop.notEnough": "Not enough gold",
    "shop.alreadyOwned": "Already owned",
    "shop.bought": "Bought {name}",
    "shop.selected": "Selected",

    "shop.cos.flash": "Lantern Color",
    "shop.cos.skin": "Skin Ring",
    "shop.cos.sword": "Sword Color",
    "shop.equipped": "EQUIPPED",
    "shop.free": "Free",
    "shop.use": "Equip",
  },
});
