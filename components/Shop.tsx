"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { getCoins, addCoins } from "@/lib/coins";

// Dükkân eşya id → line ikon
const ITEM_ICON: Record<string, IconName> = {
  radar: "radar",
  shield: "shield",
  trap: "trap",
  veil: "veil",
  ammoPack: "ammo",
  healthPack: "heart",
  permAmmo: "ammo",
  extraLife: "heart",
  flash_amber: "flame",
  flash_crimson: "flame",
  flash_toxic: "flame",
  flash_ice: "flame",
  flash_violet: "flame",
  flash_rose: "flame",
  flash_gold: "flame",
  skin_gold: "people",
  skin_violet: "people",
  skin_cyan: "people",
  skin_emerald: "people",
  skin_rose: "people",
  skin_ice: "people",
  skin_crimson: "people",
};
import {
  SHOP_ITEMS,
  buyItem,
  getInventory,
  ownsCosmetic,
  equippedCosmetic,
  FLASH_COLORS,
  SKIN_RINGS,
  type Inventory,
  type ShopItem,
} from "@/lib/inventory";
import { unlock } from "@/lib/achievements";

// Oyun parası (altın) paketleri — GERÇEK ÖDEME YOK (deneme). Tıklayınca altın bedava verilir.
// İleride gerçek satış eklenebilir; şimdilik ₺ fiyatı yalnızca sembolik gösterilir.
const GOLD_PACKS: { gold: number; price: string; tag?: string }[] = [
  { gold: 500, price: "12₺" },
  { gold: 1200, price: "25₺", tag: "%15 daha çok" },
  { gold: 3000, price: "55₺", tag: "en avantajlı" },
];

// Dükkân sıralaması — ilişkili eşyalar yan yana (cephane grubu, can grubu, sonra kozmetikler)
const SHOP_ORDER = [
  "shield", "radar", "veil", "trap",
  "ammoPack", "permAmmo",
  "healthPack", "extraLife",
  "flash_amber", "flash_crimson", "flash_toxic", "flash_ice", "flash_violet", "flash_rose", "flash_gold",
  "skin_cyan", "skin_gold", "skin_violet", "skin_emerald", "skin_rose", "skin_ice", "skin_crimson",
];
const orderedShopItems = [...SHOP_ITEMS].sort(
  (a, b) => (SHOP_ORDER.indexOf(a.id) + 1 || 99) - (SHOP_ORDER.indexOf(b.id) + 1 || 99)
);

// Dükkân ekranı — parayla eşya al. Menüden veya bölüm arası açılır.
export default function Shop({ onBack, title = "DÜKKÂN" }: { onBack: () => void; title?: string }) {
  const [coins, setCoins] = useState(() => getCoins());
  const [inv, setInv] = useState<Inventory>(() => getInventory());
  const [msg, setMsg] = useState("");

  function buyGold(gold: number) {
    // Deneme: ödeme alınmaz, altın doğrudan verilir.
    setCoins(addCoins(gold));
    setMsg(`✓ +${gold} altın hesabına eklendi (deneme — ücret alınmadı)`);
    window.setTimeout(() => setMsg(""), 2200);
  }

  function ownedText(it: ShopItem): string {
    if (it.id === "radar") return `Elinde: ${inv.radars}`;
    if (it.id === "shield") return `Elinde: ${inv.shields}`;
    if (it.id === "trap") return `Elinde: ${inv.traps}`;
    if (it.id === "veil") return `Elinde: ${inv.veils}`;
    if (it.id === "ammoPack") return `Elinde: ${inv.ammoPacks}`;
    if (it.id === "healthPack") return `Elinde: ${inv.healthPacks}`;
    if (it.id === "permAmmo") return inv.permAmmo ? "✓ Sahipsin" : "";
    if (it.id === "extraLife") return inv.extraLives > 0 ? `+${inv.extraLives} can` : "";
    if (it.cosmetic) {
      const eq = equippedCosmetic(inv, it.cosmetic.slot) === it.cosmetic.value;
      const owned = ownsCosmetic(inv, it.cosmetic.slot, it.cosmetic.value);
      return eq ? "✓ Seçili" : owned ? "✓ Sahipsin" : "";
    }
    return "";
  }

  function handleBuy(it: ShopItem) {
    const r = buyItem(it);
    setCoins(r.coins);
    setInv(getInventory());
    if (r.ok) {
      unlock("shopper"); // Faz F başarım
      setMsg(`✓ ${it.title} alındı`);
    } else {
      setMsg(r.reason === "yetersiz para" ? "✗ Yetersiz para" : "✗ Zaten sahipsin");
    }
    window.setTimeout(() => setMsg(""), 1800);
  }

  return (
    <div className="menuscreen">
      <button className="topback" onClick={onBack}>← Geri</button>
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="big" style={{ color: "#ffd75a", display: "flex", alignItems: "center", gap: 10 }}>
            <Icon name="cart" size={28} stroke={1.6} /> {title}
          </div>
          <div className="chip" style={{ borderColor: "rgba(255,205,80,0.6)", fontSize: 18 }}>
            <span className="lbl">Cüzdan</span>
            <span className="val" style={{ color: "#ffd75a", display: "inline-flex", alignItems: "center", gap: 5 }}>
              <Icon name="coin" size={16} /> {coins}
            </span>
          </div>
        </div>

        <div style={{ minHeight: 22, color: "#8be9ff", fontWeight: 700, margin: "6px 0 14px" }}>{msg}</div>

        {/* Oyun parası (altın) satın al — ilk ürün. DENEME: ödeme alınmaz. */}
        <div className="card-parch" style={{ padding: 16, marginBottom: 18, borderColor: "rgba(255,205,80,0.5)" }}>
          <div style={{ fontWeight: 800, color: "#ffd75a", fontFamily: "'Cinzel',serif", letterSpacing: "0.08em", display: "flex", alignItems: "center", gap: 8 }}><Icon name="coin" size={18} /> ALTIN SATIN AL</div>
          <div style={{ fontSize: 12, color: "var(--muted)", margin: "4px 0 12px" }}>
            Deneme sürümü — ödeme alınmaz, altın anında hesabına eklenir.
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(150px,1fr))", gap: 10 }}>
            {GOLD_PACKS.map((p) => (
              <div key={p.gold} style={{ display: "flex", flexDirection: "column", gap: 6, alignItems: "center", background: "rgba(255,215,90,0.06)", border: "1px solid rgba(255,205,80,0.3)", borderRadius: 8, padding: 12 }}>
                <div style={{ fontSize: 20, fontWeight: 900, color: "#ffd75a", display: "inline-flex", alignItems: "center", gap: 6 }}><Icon name="coin" size={18} /> {p.gold}</div>
                {p.tag && <div style={{ fontSize: 11, color: "#7dffb0" }}>{p.tag}</div>}
                <button className="btn btn-primary" style={{ width: "100%" }} onClick={() => buyGold(p.gold)}>
                  {p.price}
                </button>
              </div>
            ))}
          </div>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {orderedShopItems.map((it) => {
            const owned = ownedText(it);
            const affordable = coins >= it.price;
            // Kozmetik: seçili → kapalı; sahip → "Kullan" (ücretsiz); değil → satın al
            let label: string;
            let canClick: boolean;
            if (it.cosmetic) {
              const eq = equippedCosmetic(inv, it.cosmetic.slot) === it.cosmetic.value;
              const own = ownsCosmetic(inv, it.cosmetic.slot, it.cosmetic.value);
              if (eq) { label = "✓ Seçili"; canClick = false; }
              else if (own) { label = "Kullan"; canClick = true; }
              else { label = `🪙 ${it.price} — Satın Al`; canClick = affordable; }
            } else if (!it.canBuy(inv)) {
              label = "Sahipsin"; canClick = false;
            } else {
              label = `🪙 ${it.price} — Satın Al`; canClick = affordable;
            }
            const buyable = canClick;
            return (
              <div
                key={it.id}
                className="card-parch"
                style={{
                  padding: 14,
                  display: "flex",
                  flexDirection: "column",
                  gap: 8,
                }}
              >
                {it.cosmetic ? (
                  it.cosmetic.slot === "flash" ? (
                    // Fener rengi önizleme: o renkte parlayan nokta
                    <div
                      title="Fener ışığı bu renkte olur"
                      style={{
                        width: 30, height: 30, borderRadius: "50%",
                        background: `rgb(${FLASH_COLORS[it.cosmetic.value].join(",")})`,
                        boxShadow: `0 0 14px 2px rgb(${FLASH_COLORS[it.cosmetic.value].join(",")})`,
                      }}
                    />
                  ) : (
                    // Görünüm önizleme: o renkte parlayan halka (oyuncu böyle görünür)
                    <div
                      title="Oyuncu bu renkte halkayla parlar"
                      style={{
                        width: 30, height: 30, borderRadius: "50%",
                        border: `4px solid ${SKIN_RINGS[it.cosmetic.value] ?? "#888"}`,
                        boxShadow: `0 0 12px ${SKIN_RINGS[it.cosmetic.value] ?? "#888"}`,
                      }}
                    />
                  )
                ) : (
                  <div style={{ color: "#e0a24a" }}><Icon name={ITEM_ICON[it.id] ?? "box"} size={26} stroke={1.6} /></div>
                )}
                <div style={{ fontWeight: 800 }}>{it.title}</div>
                <div style={{ fontSize: 13, color: "var(--muted)", lineHeight: 1.4, flex: 1 }}>{it.desc}</div>
                {owned && <div style={{ fontSize: 12, color: "#7dffb0" }}>{owned}</div>}
                <button
                  className="btn btn-primary"
                  disabled={!buyable}
                  onClick={() => handleBuy(it)}
                  style={{ opacity: buyable ? 1 : 0.45, cursor: buyable ? "pointer" : "not-allowed" }}
                >
                  {label}
                </button>
              </div>
            );
          })}
        </div>

      </div>
    </div>
  );
}
