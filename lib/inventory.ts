// BLACKOUT — envanter + dükkân (Faz B). Parayla eşya al; kimi tüketilir (oyunda
// istediğin an aktive: kalkan/radar), kimi bölüm başı otomatik (mermi/can paketi),
// kimi KALICI upgrade (her bölüm +mermi, +can hakkı, kişiselleştirme).
// Kalıcı (localStorage). SSR/test'te bellek yedeğiyle güvenli.
import { getCoins, addCoins } from "./coins";
import type { DictKey } from "@/lib/i18n/dict";

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
  sword: string; // kişiselleştirme: SEÇİLİ kılıç rengi
  ownedFlash: string[]; // sahip olunan fener renkleri (tekrar para verilmez)
  ownedSkin: string[]; // sahip olunan görünümler
  ownedSword: string[]; // sahip olunan kılıç renkleri
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
  sword: "default",
  ownedFlash: ["default"],
  ownedSkin: ["default"],
  ownedSword: ["default"],
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
  const sword = stored.sword ?? DEFAULT_INV.sword;
  const uniq = (arr: string[]) => Array.from(new Set(arr));
  return {
    ...DEFAULT_INV,
    ...stored,
    flashColor,
    skin,
    sword,
    ownedFlash: uniq([...(stored.ownedFlash ?? []), "default", flashColor]),
    ownedSkin: uniq([...(stored.ownedSkin ?? []), "default", skin]),
    ownedSword: uniq([...(stored.ownedSword ?? []), "default", sword]),
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
// Kılıç palet: [namlu/keskin yüz, parıltı/aura]. "default" = paslı çelik (ücretsiz).
export const SWORD_COLORS: Record<string, { blade: string; glow: string }> = {
  default: { blade: "#c9d2dc", glow: "rgba(200,220,255,0.35)" }, // paslı çelik
  ember: { blade: "#ff7a3c", glow: "rgba(255,110,40,0.75)" }, // Köz (turuncu-kızıl)
  void: { blade: "#b46bff", glow: "rgba(160,80,255,0.8)" }, // Boşluk (mor)
  frost: { blade: "#7fe4ff", glow: "rgba(90,210,255,0.8)" }, // Ayaz (buz mavisi)
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
  // Metin DEĞİL, SÖZLÜK ANAHTARI (lib/i18n/dict/parts/shop.ts). Shop.tsx t(it.title) ile basar.
  title: DictKey;
  desc: DictKey;
  icon: string;
  price: number;
  kind: "consumable" | "perm" | "cosmetic";
  // kozmetikler için: hangi slot + değer (sahiplik takibi buyItem'da)
  cosmetic?: { slot: CosmeticSlot; value: string };
  // satın alınabilir mi? (kalıcı olanlar bir kez; kozmetik özel ele alınır)
  canBuy: (inv: Inventory) => boolean;
  apply: (inv: Inventory) => void;
};

// NOT: Kalkan/Radar/Tuzak + Ekstra Mermi (tüketilir) + Can Paketi + Ekstra Can Hakkı
// dükkândan KALDIRILDI (kullanıcı isteği). Kalıcı Cephane (permAmmo) korunur; Duvak kalır.
export const SHOP_ITEMS: ShopItem[] = [
  {
    id: "veil",
    title: "shop.item.veil.title",
    desc: "shop.item.veil.desc",
    icon: "🕊️",
    price: 44,
    kind: "consumable",
    canBuy: () => true,
    apply: (inv) => (inv.veils += 2),
  },
  {
    id: "permAmmo",
    title: "shop.item.permAmmo.title",
    desc: "shop.item.permAmmo.desc",
    icon: "🔫✨",
    price: 270,
    kind: "perm",
    canBuy: (inv) => !inv.permAmmo,
    apply: (inv) => (inv.permAmmo = true),
  },
  {
    id: "soldier",
    title: "shop.item.soldier.title",
    desc: "shop.item.soldier.desc",
    icon: "🪖",
    price: 360,
    kind: "perm",
    canBuy: (inv) => !inv.hiredSoldier,
    apply: (inv) => (inv.hiredSoldier = true),
  },
  // --- Kılıç renkleri (kılıç TEMEL silahtır; renk yalnız görünüm) ---
  {
    id: "sword_ember",
    title: "shop.item.sword_ember.title",
    desc: "shop.item.sword_ember.desc",
    icon: "⚔",
    price: 120,
    kind: "cosmetic",
    cosmetic: { slot: "sword", value: "ember" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "sword_void",
    title: "shop.item.sword_void.title",
    desc: "shop.item.sword_void.desc",
    icon: "⚔",
    price: 120,
    kind: "cosmetic",
    cosmetic: { slot: "sword", value: "void" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "sword_frost",
    title: "shop.item.sword_frost.title",
    desc: "shop.item.sword_frost.desc",
    icon: "⚔",
    price: 120,
    kind: "cosmetic",
    cosmetic: { slot: "sword", value: "frost" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "flash_crimson",
    title: "shop.item.flash_crimson.title",
    desc: "shop.item.flash_crimson.desc",
    icon: "💡",
    price: 90,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "crimson" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_gold",
    title: "shop.item.skin_gold.title",
    desc: "shop.item.skin_gold.desc",
    icon: "🩸",
    price: 120,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "gold" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_violet",
    title: "shop.item.skin_violet.title",
    desc: "shop.item.skin_violet.desc",
    icon: "🩸",
    price: 120,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "violet" },
    canBuy: () => true,
    apply: () => {},
  },
  // --- Bol kişiselleştirme: ek fener renkleri ---
  {
    id: "flash_toxic",
    title: "shop.item.flash_toxic.title",
    desc: "shop.item.flash_toxic.desc",
    icon: "💡",
    price: 90,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "toxic" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "flash_violet",
    title: "shop.item.flash_violet.title",
    desc: "shop.item.flash_violet.desc",
    icon: "💡",
    price: 105,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "violet" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "flash_gold",
    title: "shop.item.flash_gold.title",
    desc: "shop.item.flash_gold.desc",
    icon: "💡",
    price: 135,
    kind: "cosmetic",
    cosmetic: { slot: "flash", value: "gold" },
    canBuy: () => true,
    apply: () => {},
  },
  // --- Bol kişiselleştirme: ek görünüm (halka) renkleri ---
  {
    id: "skin_emerald",
    title: "shop.item.skin_emerald.title",
    desc: "shop.item.skin_emerald.desc",
    icon: "🩸",
    price: 135,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "emerald" },
    canBuy: () => true,
    apply: () => {},
  },
  {
    id: "skin_crimson",
    title: "shop.item.skin_crimson.title",
    desc: "shop.item.skin_crimson.desc",
    icon: "🩸",
    price: 150,
    kind: "cosmetic",
    cosmetic: { slot: "skin", value: "crimson" },
    canBuy: () => true,
    apply: () => {},
  },
];

// Bir kozmetik değeri sahip mi / seçili mi (Shop UI kullanır)
export type CosmeticSlot = "flash" | "skin" | "sword";
const OWNED_OF: Record<CosmeticSlot, (i: Inventory) => string[]> = {
  flash: (i) => i.ownedFlash, skin: (i) => i.ownedSkin, sword: (i) => i.ownedSword,
};
export function ownsCosmetic(inv: Inventory, slot: CosmeticSlot, value: string): boolean {
  return OWNED_OF[slot](inv).includes(value);
}
export function equippedCosmetic(inv: Inventory, slot: CosmeticSlot): string {
  return slot === "flash" ? inv.flashColor : slot === "skin" ? inv.skin : inv.sword;
}
function equipCosmetic(inv: Inventory, slot: CosmeticSlot, value: string) {
  if (slot === "flash") inv.flashColor = value;
  else if (slot === "skin") inv.skin = value;
  else inv.sword = value;
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
      equipCosmetic(inv, slot, value);
      saveInventory(inv);
      return { ok: true, coins: getCoins() };
    }
    // Sahip değilsin → satın al + kuşan
    if (getCoins() < item.price) return { ok: false, coins: getCoins(), reason: "yetersiz para" };
    const coins = addCoins(-item.price);
    OWNED_OF[slot](inv).push(value);
    equipCosmetic(inv, slot, value);
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
