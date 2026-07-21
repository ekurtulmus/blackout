"use client";

import { useState } from "react";
import Icon, { type IconName } from "@/components/Icon";
import { getCoins } from "@/lib/coins";
import {
  SHOP_ITEMS,
  buyItem,
  getInventory,
  saveInventory,
  ownsCosmetic,
  equippedCosmetic,
  FLASH_COLORS,
  SKIN_RINGS,
  SWORD_COLORS,
  type Inventory,
  type ShopItem,
} from "@/lib/inventory";
import { unlock } from "@/lib/achievements";
import { useT } from "@/lib/i18n";
import type { DictKey } from "@/lib/i18n/dict";

// Dükkân eşya id → ince ikon (tutarlı çizgi-ikon seti). Yalnız MEVCUT eşyalar
// (kalkan/radar/tuzak/can-paketi/ekstra-can kaldırıldı).
const ITEM_ICON: Record<string, IconName> = {
  veil: "veil", permAmmo: "ammo", soldier: "people",
};

// Kozmetik değer → görünen ad (tasarım: swatch altında kısa isim).
// Değerler METİN DEĞİL sözlük anahtarıdır; t() ile basılır.
const FLASH_NAME: Record<string, DictKey> = {
  default: "shop.color.flash.default", crimson: "shop.color.flash.crimson",
  toxic: "shop.color.flash.toxic", violet: "shop.color.flash.violet", gold: "shop.color.flash.gold",
};
const SKIN_NAME: Record<string, DictKey> = {
  default: "shop.color.skin.default", gold: "shop.color.skin.gold",
  violet: "shop.color.skin.violet", emerald: "shop.color.skin.emerald", crimson: "shop.color.skin.crimson",
};
const SWORD_NAME: Record<string, DictKey> = {
  default: "shop.color.sword.default", ember: "shop.color.sword.ember",
  void: "shop.color.sword.void", frost: "shop.color.sword.frost",
};

// NOT: "Altın Satın Al" bandı KALDIRILDI (kullanıcı isteği) — altın YALNIZ oynayarak
// kazanılır. Bu yüzden fiyatlar ×3 (duvak ×2) ve başlangıç altını 0'dır.

// Özellik sıralaması (mevcut eşyalar)
const ORDER = ["veil", "permAmmo", "soldier"];
const featureItems = SHOP_ITEMS.filter((i) => !i.cosmetic).sort(
  (a, b) => (ORDER.indexOf(a.id) + 1 || 99) - (ORDER.indexOf(b.id) + 1 || 99)
);
const flashItems = SHOP_ITEMS.filter((i) => i.cosmetic?.slot === "flash");
const skinItems = SHOP_ITEMS.filter((i) => i.cosmetic?.slot === "skin");
const swordItems = SHOP_ITEMS.filter((i) => i.cosmetic?.slot === "sword");

// Küçük altın ikonu (fiyat/cüzdan) — ortak sikke ikonu
const Coin = ({ size = 13 }: { size?: number }) => <Icon name="coin" size={size} stroke={1.5} />;

// Kılıç önizleme: seçilecek rengin gerçek namlu rengi + parıltısı
const SwordSwatch = ({ v }: { v: string }) => {
  const c = SWORD_COLORS[v] ?? SWORD_COLORS.default;
  return (
    <span
      style={{
        color: c.blade,
        filter: `drop-shadow(0 0 7px ${c.glow})`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: 32,
        height: 32,
      }}
    >
      <Icon name="sword" size={26} stroke={1.8} />
    </span>
  );
};

// DÜKKÂN (tasarım handoff).
// standalone=false → MenuShell içinde (kabuk zemini + geri butonu sağlar)
// standalone=true  → OnlineGame overlay'i (kendi zemini + kapat butonu)
export default function Shop({
  onBack,
  title,
  standalone = false,
}: {
  onBack: () => void;
  /** HAZIR ÇEVRİLMİŞ başlık (ör. t("shop.title.interlude")). Boşsa "shop.title" kullanılır. */
  title?: string;
  standalone?: boolean;
}) {
  const t = useT();
  const [coins, setCoins] = useState(() => getCoins());
  const [inv, setInv] = useState<Inventory>(() => getInventory());
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<"feat" | "cos">("feat");

  function flash(m: string) {
    setMsg(m);
    window.setTimeout(() => setMsg(""), 1800);
  }
  function handleBuy(it: ShopItem) {
    const r = buyItem(it);
    setCoins(r.coins);
    setInv(getInventory());
    if (r.ok) {
      unlock("shopper");
      flash(t("shop.bought", { name: t(it.title) }));
    } else {
      flash(r.reason === "yetersiz para" ? t("shop.notEnough") : t("shop.alreadyOwned"));
    }
  }
  // Ücretsiz varsayılan kozmetiğe dön (dükkân eşyası yok)
  function selectDefault(slot: "flash" | "skin" | "sword") {
    const i = getInventory();
    if (slot === "flash") i.flashColor = "default";
    else if (slot === "skin") i.skin = "default";
    else i.sword = "default";
    saveInventory(i);
    setInv(getInventory());
    flash(t("shop.selected"));
  }

  // Elindeki adet (tüketilebilir — yalnız Duvak kaldı)
  function ownedText(it: ShopItem): string {
    if (it.id === "veil") return t("shop.owned", { n: inv.veils });
    return "";
  }

  const invStrip: { label: DictKey; n: number | string; icon: IconName }[] = [
    { label: "shop.strip.veil", n: inv.veils, icon: "veil" },
  ];

  const body = (
    <div className="scr" style={standalone ? { paddingTop: 82 } : undefined}>
      <div className="scr-body" style={{ maxWidth: 1200 }}>
        {/* Başlık + cüzdan */}
        <div className="shop-head">
          <div>
            <div className="scr-eyebrow">{t("shop.eyebrow")}</div>
            <h2 className="scr-title">{title ?? t("shop.title")}</h2>
          </div>
          <div className="wallet-lg">
            <Coin size={18} /> {coins}
          </div>
        </div>

        {/* Sekmeler */}
        <div className="tabs">
          <button className={"tab" + (tab === "feat" ? " is-on" : "")} onClick={() => setTab("feat")}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M12 3l7 3v5c0 5-3.5 8-7 9-3.5-1-7-4-7-9V6z" />
            </svg>
            {t("shop.tab.features")}
          </button>
          <button className={"tab" + (tab === "cos" ? " is-on" : "")} onClick={() => setTab("cos")}>
            <svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="12" r="4" /><circle cx="12" cy="12" r="9" />
            </svg>
            {t("shop.tab.cosmetics")}
          </button>
        </div>

        <div style={{ minHeight: 20, margin: "10px 0 0", color: "var(--ok-text)", fontWeight: 600, fontSize: 13.5 }}>{msg}</div>

        {tab === "feat" ? (
          <div style={{ marginTop: 10 }}>
            {/* Envanter özeti */}
            <div className="inv-strip">
              <span className="inv-strip-t">{t("shop.inventory")}</span>
              {invStrip.map((s) => (
                <span key={s.label} className={"inv-item" + (Number(s.n) > 0 ? " has" : "")}>
                  <Icon name={s.icon} size={15} /> {t(s.label)} {s.n}
                </span>
              ))}
              {inv.permAmmo && <span className="inv-item has" style={{ color: "var(--ok-text)" }}>{t("shop.strip.permAmmo")}</span>}
              {inv.hiredSoldier && <span className="inv-item has" style={{ color: "var(--ok-text)" }}>{t("shop.strip.soldier")}</span>}
            </div>

            {/* Eşya ızgarası */}
            <div className="item-grid">
              {featureItems.map((it) => {
                const perm = it.kind === "perm";
                const can = it.canBuy(inv);
                const afford = coins >= it.price;
                const own = ownedText(it);
                return (
                  <div key={it.id} className={"item-card" + (perm ? " is-perm" : "")}>
                    {perm && <span className="perm-badge">{t("shop.badge.perm")}</span>}
                    {/* Eşya adı ikonun ALTINDA değil YANINDA */}
                    <div className="card-head">
                      <div className="item-ico"><Icon name={ITEM_ICON[it.id] ?? "box"} size={22} stroke={1.6} /></div>
                      <div className="item-name">{t(it.title)}</div>
                    </div>
                    <div className="item-desc">{t(it.desc)}</div>
                    {own && <div className="item-own">{own}</div>}
                    {can ? (
                      <button className="buy-btn" disabled={!afford} onClick={() => handleBuy(it)} title={afford ? t("shop.buy") : t("shop.notEnough")}>
                        <Coin /> {it.price}
                      </button>
                    ) : (
                      <button className="buy-btn is-owned" disabled>
                        <Icon name="check" size={13} /> {t("shop.owned.btn")}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          <div style={{ marginTop: 10 }}>
            {/* Fener rengi */}
            <div className="cos-label">{t("shop.cos.flash")}</div>
            <div className="swatch-grid">
              {/* Varsayılan (ücretsiz) */}
              <button
                className={"swatch" + (inv.flashColor === "default" ? " is-on" : "")}
                onClick={() => selectDefault("flash")}
              >
                <span className="swatch-dot" style={{ background: `rgb(${FLASH_COLORS.default.join(",")})`, boxShadow: `0 0 16px 2px rgb(${FLASH_COLORS.default.join(",")})` }} />
                <span className="swatch-name">{t(FLASH_NAME.default)}</span>
                {inv.flashColor === "default" ? <span className="swatch-sel">{t("shop.equipped")}</span> : <span className="swatch-meta">{t("shop.free")}</span>}
              </button>
              {flashItems.map((it) => {
                const v = it.cosmetic!.value;
                const eq = equippedCosmetic(inv, "flash") === v;
                const own = ownsCosmetic(inv, "flash", v);
                const rgb = FLASH_COLORS[v]?.join(",") ?? "255,255,255";
                return (
                  <button key={it.id} className={"swatch" + (eq ? " is-on" : "")} onClick={() => handleBuy(it)} disabled={eq}>
                    <span className="swatch-dot" style={{ background: `rgb(${rgb})`, boxShadow: `0 0 16px 2px rgb(${rgb})` }} />
                    <span className="swatch-name">{t(FLASH_NAME[v] ?? it.title)}</span>
                    {eq ? <span className="swatch-sel">{t("shop.equipped")}</span>
                      : own ? <span className="swatch-meta" style={{ color: "var(--ok-text)" }}>{t("shop.use")}</span>
                      : <span className="swatch-meta"><Coin size={11} /> {it.price}</span>}
                  </button>
                );
              })}
            </div>

            {/* Görünüm halkası */}
            <div className="cos-label" style={{ margin: "24px 0 12px" }}>{t("shop.cos.skin")}</div>
            <div className="swatch-grid">
              <button
                className={"swatch" + (inv.skin === "default" ? " is-on" : "")}
                onClick={() => selectDefault("skin")}
              >
                <span className="swatch-ring" style={{ borderColor: "#6f695d", boxShadow: "none" }} />
                <span className="swatch-name">{t(SKIN_NAME.default)}</span>
                {inv.skin === "default" ? <span className="swatch-sel">{t("shop.equipped")}</span> : <span className="swatch-meta">{t("shop.free")}</span>}
              </button>
              {skinItems.map((it) => {
                const v = it.cosmetic!.value;
                const eq = equippedCosmetic(inv, "skin") === v;
                const own = ownsCosmetic(inv, "skin", v);
                const col = SKIN_RINGS[v] ?? "#888";
                return (
                  <button key={it.id} className={"swatch" + (eq ? " is-on" : "")} onClick={() => handleBuy(it)} disabled={eq}>
                    <span className="swatch-ring" style={{ borderColor: col, boxShadow: `0 0 12px ${col}` }} />
                    <span className="swatch-name">{t(SKIN_NAME[v] ?? it.title)}</span>
                    {eq ? <span className="swatch-sel">{t("shop.equipped")}</span>
                      : own ? <span className="swatch-meta" style={{ color: "var(--ok-text)" }}>{t("shop.use")}</span>
                      : <span className="swatch-meta"><Coin size={11} /> {it.price}</span>}
                  </button>
                );
              })}
            </div>

            {/* Kılıç rengi — kılıç TEMEL silah, renk yalnız görünüm */}
            <div className="cos-label" style={{ margin: "24px 0 12px" }}>{t("shop.cos.sword")}</div>
            <div className="swatch-grid">
              <button
                className={"swatch" + (inv.sword === "default" ? " is-on" : "")}
                onClick={() => selectDefault("sword")}
              >
                <SwordSwatch v="default" />
                <span className="swatch-name">{t(SWORD_NAME.default)}</span>
                {inv.sword === "default" ? <span className="swatch-sel">{t("shop.equipped")}</span> : <span className="swatch-meta">{t("shop.free")}</span>}
              </button>
              {swordItems.map((it) => {
                const v = it.cosmetic!.value;
                const eq = equippedCosmetic(inv, "sword") === v;
                const own = ownsCosmetic(inv, "sword", v);
                return (
                  <button key={it.id} className={"swatch" + (eq ? " is-on" : "")} onClick={() => handleBuy(it)} disabled={eq}>
                    <SwordSwatch v={v} />
                    <span className="swatch-name">{t(SWORD_NAME[v] ?? it.title)}</span>
                    {eq ? <span className="swatch-sel">{t("shop.equipped")}</span>
                      : own ? <span className="swatch-meta" style={{ color: "var(--ok-text)" }}>{t("shop.use")}</span>
                      : <span className="swatch-meta"><Coin size={11} /> {it.price}</span>}
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  );

  // Oyun-içi overlay: kendi zemini + kapat butonu (kabuk yok)
  if (standalone) {
    return (
      <div className="shop-standalone">
        <button className="shell-icon shell-back" onClick={onBack} title={t("shop.close")} aria-label={t("shop.close")}>
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M15 18l-6-6 6-6" />
          </svg>
        </button>
        {body}
      </div>
    );
  }
  return body;
}
