"use client";

import { useState } from "react";
import { getCoins } from "@/lib/coins";
import {
  SHOP_ITEMS,
  buyItem,
  getInventory,
  ownsCosmetic,
  equippedCosmetic,
  type Inventory,
  type ShopItem,
} from "@/lib/inventory";
import { unlock } from "@/lib/achievements";

// Dükkân ekranı — parayla eşya al. Menüden veya bölüm arası açılır.
export default function Shop({ onBack, title = "DÜKKÂN" }: { onBack: () => void; title?: string }) {
  const [coins, setCoins] = useState(() => getCoins());
  const [inv, setInv] = useState<Inventory>(() => getInventory());
  const [msg, setMsg] = useState("");

  function ownedText(it: ShopItem): string {
    if (it.id === "radar") return `Elinde: ${inv.radars}`;
    if (it.id === "shield") return `Elinde: ${inv.shields}`;
    if (it.id === "trap") return `Elinde: ${inv.traps}`;
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
      <div style={{ maxWidth: 760, margin: "0 auto", width: "100%" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
          <div className="big" style={{ color: "#ffd75a" }}>🛒 {title}</div>
          <div className="chip" style={{ borderColor: "rgba(255,205,80,0.6)", fontSize: 18 }}>
            <span className="lbl">Cüzdan</span>
            <span className="val" style={{ color: "#ffd75a" }}>🪙 {coins}</span>
          </div>
        </div>

        <div style={{ minHeight: 22, color: "#8be9ff", fontWeight: 700, margin: "6px 0 14px" }}>{msg}</div>

        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 12 }}>
          {SHOP_ITEMS.map((it) => {
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
                <div style={{ fontSize: 26 }}>{it.icon}</div>
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

        <div style={{ textAlign: "center", marginTop: 20 }}>
          <button className="btn" onClick={onBack}>← Geri</button>
        </div>
      </div>
    </div>
  );
}
