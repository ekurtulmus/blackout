// BLACKOUT — envanter + dükkân (Faz B). Parayla eşya al; kimi tüketilir (oyunda
// istediğin an aktive: kalkan/radar), kimi bölüm başı otomatik (mermi/can paketi),
// kimi KALICI upgrade (her bölüm +mermi, +can hakkı, kişiselleştirme).
// Kalıcı (localStorage). SSR/test'te bellek yedeğiyle güvenli.
import { getCoins, addCoins } from "./coins";

export type Inventory = {
  shields: number; // kalkan — oyunda istediğin an 3 sn dokunulmazlık (tüketilir)
  radars: number; // radar — oyunda istediğin an çıkış yönünü 1 kez gösterir (tüketilir)
  traps: number; // tuzak — oyunda yere koy, gelini yavaşlatır (tüketilir)
  veils: number; // duvak — oyunda istediğin an birkaç sn görünmez ol (tüketilir)
  ammoPacks: number; // sonraki bölüme +3 mermi (bölüm başı otomatik tüketilir)
  healthPacks: number; // sonraki bölüme tam can + kalkan (bölüm başı otomatik tüketilir)
  permAmmo: boolean; // KALICI: her bölüm +3 mermiyle başla
  extraLives: number; // KALICI: +1 başlangıç can hakkı (adet)
  hiredSoldier: boolean; // asker müttefiki: yanında savaşır; ölene dek durur, ölünce sıfırlanır
  flashColor: string; // kişiselleştirme: SEÇİLİ fener rengi
  skin: string; // kişiselleştirme: SEÇİLİ oyuncu görünümü
  ownedFlash: string[]; // sahip olunan fener renkleri (tekrar para verilmez)
  ownedSkin: string[]; // sahip olunan görünümler
};

const DEFAULT_INV: Inventory = {
  shields: 0,
  radars: 0,
  traps: 0,
  veils: 0,
  ammoPacks: 0,
  healthPacks: 0,
  permAmmo: false,
  extraLives: 0,
  hiredSoldier: false,
  flashColor: "default",
  skin: "default",
  ownedFlash: ["default"],
  ownedSkin: ["default"],
};

const KEY = "blackout_inventory";
let mem: Inventory = { ...DEFAULT_INV };

export function getInventory(): Inventory {
  let stored: Partial<Inventory> = mem;
  try {
    const v = localStorage.getItem(KEY);
    if (v) stored = JSON.parse(v) as Partial<Inventory>;
  } catch {
    /* geç */
  }
  // Sahip listeleri DAİMA yeni dizi (DEFAULT_INV'in paylaşılan dizisini asla mutasyona uğratma)
  // + KENDİNİ ONAR: seçili/kuşanılan renk & görünüm her zaman "sahip" sayılır → eski/bozuk
  // kayıtlarda kişiselleştirmeler bir daha ASLA yeniden satın aldırılmaz (kalıcı sahiplik).
  const flashColor = stored.flashColor ?? DEFAULT_INV.flashColor;
  const skin = stored.skin ?? DEFAULT_INV.skin;
  const uniq = (arr: string[]) => Array.from(new Set(arr));
  return {
    ...DEFAULT_INV,
    ...stored,
    flashColor,
    skin,
    ownedFlash: uniq([...(stored.ownedFlash ?? []), "default", flashColor]),
    ownedSkin: uniq([...(stored.ownedSkin ?? []), "default", skin]),
  };
}

export function saveInventory(inv: Inventory) {
  mem = { ...inv };
  try {
    localStorage.setItem(KEY, JSON.stringify(inv));
  } catch {
    /* geç */
  }
}

// Kişiselleştirme paletleri (satın alınınca seçilebilir)
export const FLASH_COLORS: Record<string, [number, number, number]> = {
  default: [200, 220, 255], // soğuk beyaz
  amber: [255, 200, 120], // kehribar
  crimson: [255, 120, 120], // kızıl
  toxic: [170, 255, 140], // zehir yeşili
  ice: [150, 210, 255], // buz mavisi
  violet: [200, 150, 255], // mor
  rose: [255, 160, 200], // gül pembe
  gold: [255, 225, 150], // altın
};
export const SKIN_RINGS: Record<string, string | undefined> = {
  default: undefined,
  cyan: "#6ee7ff",
  gold: "#ffd75a",
  violet: "#c58bff",
  emerald: "#4ce0a0",
  rose: "#ff8ab0",
  ice: "#a8d8ff",
  crimson: "#ff5a5a",
};

// --- Dükkân eşya tanımları ---
export type ShopItem = {
  id: string;
  title: string;
  desc: string;
  icon: string;
  price: number;
  kind: "consumable" | "perm" | "cosmetic";
  // kozmetikler için: hangi slot + değer (sahiplik takibi buyItem'da)
  cosmetic?: { slot: "flash" | "skin"; value: string };
  // satın alınabilir mi? (kalıcı olanlar bir kez; kozmetik özel ele alınır)
  canBuy: (inv: Inventory) => boolean;
  apply: (inv: Inventory) => void;
};

export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "radar",
    title: "Radar",
    desc: "Oyunda istediğin an kullan — çıkış yönünü 1 kez gösterir.",
    icon: "📻",
    price: 15,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.radars += 1),
  },
  {
    id: "shield",
    title: "Kalkan",
    desc: "Oyunda istediğin an kullan — 3 sn dokunulmazlık.",
    icon: "🛡️",
    price: 20,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.shields += 1),
  },
  {
    id: "trap",
    title: "Tuzak (x2)",
    desc: "Yere koy — üstünden geçen gelin 8 sn yavaşlar (durdurmaz). 2 adet.",
    icon: "🕸️",
    price: 18,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.traps += 2),
  },
  {
    id: "veil",
    title: "Duvak (x2)",
    desc: "Oyunda kullan — birkaç sn görünmez ol; gelinler seni göremez (ateş edersen bozulur). 2 adet.",
    icon: "🕊️",
    price: 22,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.veils += 2),
  },
  {
    id: "ammoPack",
    title: "Ekstra Mermi",
    desc: "Sonraki bölüme +3 mermiyle başla (tek kullanım).",
    icon: "🔫",
    price: 10,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.ammoPacks += 1),
  },
  {
    id: "healthPack",
    title: "Can Paketi",
    desc: "Sonraki bölüme tam can + kalkanla başla (tek kullanım).",
    icon: "❤️",
    price: 25,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.healthPacks += 1),
  },
  {
    id: "permAmmo",
    title: "Sürekli Cephane",
    desc: "KALICI: her bölüme +3 mermiyle başla.",
    icon: "🔫✨",
    price: 90,
    kind: "perm",
    canBuy: (inv) => !inv.permAmmo,
    apply: (inv) => (inv.permAmmo = true),
  },
  {
    id: "extraLife",
    title: "Ekstra Can Hakkı",
    desc: "KALICI: +1 başlangıç can hakkı.",
    icon: "❤️➕",
    price: 80,
    kind: "perm",
    canBuy: (inv) => inv.extraLives < 3,
    apply: (inv) => (inv.extraLives += 1),
  },
  {
    id: "soldier",
    title: "Asker Müttefiki",
    desc: "Yanında savaşan bir asker: seni takip eder, gelinlere ateş eder (senin renk çerçeven + ismin). Bir kez alınır; ölene dek yanında kalır (sen ölünce gider, tekrar alınabilir). Çok oyunculuda da geçerli.",
    icon: "🪖",
    price: 120,
    kind: "perm",
    canBuy: (inv) => !inv.hiredSoldier,
    apply: (inv) => (inv.hiredSoldier = true),
  },
  {
    id: "flash_crimson",
    title: "Fener: Kızıl",
    desc: "Kişiselleştirme — tekinsiz kızıl fener ışığı.",
    icon: "💡",
    price: 30,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "crimson" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_gold",
    title: "Görünüm: Altın Halka",
    desc: "Kişiselleştirme — oyuncu altın halkayla parlar.",
    icon: "🩸",
    price: 40,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "gold" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_violet",
    title: "Görünüm: Mor Halka",
    desc: "Kişiselleştirme — oyuncu mor halkayla parlar.",
    icon: "🩸",
    price: 40,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "violet" },
    canBuy: () => true,
    apply: () => {},
  },
  // --- Bol kişiselleştirme: ek fener renkleri ---
  {
    id: "flash_toxic",
    title: "Fener: Zehir Yeşili",
    desc: "Kişiselleştirme — hastalıklı zehir yeşili fener ışığı.",
    icon: "💡",
    price: 30,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "toxic" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "flash_violet",
    title: "Fener: Mor",
    desc: "Kişiselleştirme — tekinsiz mor fener ışığı.",
    icon: "💡",
    price: 35,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "violet" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "flash_gold",
    title: "Fener: Altın",
    desc: "Kişiselleştirme — sıcak altın sarısı fener ışığı.",
    icon: "💡",
    price: 45,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "gold" },
    canBuy: () => true,
    apply: () => {},
  },
  // --- Bol kişiselleştirme: ek görünüm (halka) renkleri ---
  {
    id: "skin_emerald",
    title: "Görünüm: Zümrüt Halka",
    desc: "Kişiselleştirme — oyuncu zümrüt yeşili halkayla parlar.",
    icon: "🩸",
    price: 45,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "emerald" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_crimson",
    title: "Görünüm: Kızıl Halka",
    desc: "Kişiselleştirme — oyuncu kızıl halkayla parlar.",
    icon: "🩸",
    price: 50,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "crimson" },
    canBuy: () => true,
    apply: () => {},
  },
];

// Bir kozmetik değeri sahip mi / seçili mi (Shop UI kullanır)
export function ownsCosmetic(inv: Inventory, slot: "flash" | "skin", value: string): boolean {
  return (slot === "flash" ? inv.ownedFlash : inv.ownedSkin).includes(value);
}
export function equippedCosmetic(inv: Inventory, slot: "flash" | "skin"): string {
  return slot === "flash" ? inv.flashColor : inv.skin;
}

// Satın al / kuşan. Kozmetiklerde: sahipsen ÜCRETSİZ kuşanılır, değilsen satın alınıp
// kuşanılır (bir daha para vermezsin). { ok, coins, reason } döndürür.
export function buyItem(item: ShopItem): { ok: boolean; coins: number; reason?: string } {
  const inv = getInventory();

  if (item.cosmetic) {
    const { slot, value } = item.cosmetic;
    if (equippedCosmetic(inv, slot) === value) return { ok: false, coins: getCoins(), reason: "zaten seçili" };
    if (ownsCosmetic(inv, slot, value)) {
      // Sahipsin → ücretsiz kuşan
      if (slot === "flash") inv.flashColor = value;
      else inv.skin = value;
      saveInventory(inv);
      return { ok: true, coins: getCoins() };
    }
    // Sahip değilsin → satın al + kuşan
    if (getCoins() < item.price) return { ok: false, coins: getCoins(), reason: "yetersiz para" };
    const coins = addCoins(-item.price);
    if (slot === "flash") { inv.ownedFlash.push(value); inv.flashColor = value; }
    else { inv.ownedSkin.push(value); inv.skin = value; }
    saveInventory(inv);
    return { ok: true, coins };
  }

  if (!item.canBuy(inv)) return { ok: false, coins: getCoins(), reason: "zaten sahipsin" };
  if (getCoins() < item.price) return { ok: false, coins: getCoins(), reason: "yetersiz para" };
  const coins = addCoins(-item.price);
  item.apply(inv);
  saveInventory(inv);
  return { ok: true, coins };
}
