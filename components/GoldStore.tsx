"use client";

// Dükkân → "Altın" sekmesi: premium (reklamsız, tek seferlik) + altın paketleri.
// YALNIZ Play Billing varken görünür (Shop.tsx sekmeyi billingAvailable() ile açar).
// Fiyatlar Play'den YERELLEŞTİRİLMİŞ gelir; burada fiyat yazılmaz.

import { useEffect, useState } from "react";
import { useLang, useT } from "@/lib/i18n";
import { PRODUCTS, bonusPercents, buy, isPremium, loadPrices, onPremiumChange, restorePurchases, type PriceMap, type Product } from "@/lib/billing";
import { getCoins } from "@/lib/coins";
import Icon from "@/components/Icon";
import { sound } from "@/lib/audio";
import { isNativeApp } from "@/lib/admobNative";

export default function GoldStore({ onCoins }: { onCoins: (n: number) => void }) {
  const t = useT();
  const { lang } = useLang();
  const [prices, setPrices] = useState<PriceMap>({});
  const [premium, setPremiumState] = useState(false);
  const [busy, setBusy] = useState<string | null>(null);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);

  useEffect(() => {
    setPremiumState(isPremium());
    loadPrices(lang).then(setPrices);
    return onPremiumChange(setPremiumState);
  }, [lang]);

  function flash(ok: boolean, text: string) {
    setMsg({ ok, text });
    window.setTimeout(() => setMsg(null), 2600);
  }

  async function handleBuy(p: Product) {
    if (busy) return;
    setBusy(p.id);
    const r = await buy(p.id);
    setBusy(null);
    onCoins(getCoins());
    if (r.ok) {
      sound.purchase(true);
      flash(true, p.kind === "premium" ? t("iap.premium.thanks") : t("iap.gold.added", { n: p.gold }));
    // Android uygulamasında Play Billing eklentisi henüz bağlanmadı → "yakında" de (web mesajı yanlış olurdu)
    } else if (r.reason === "unavailable") flash(false, t(isNativeApp() ? "iap.nativeSoon" : "iap.webOnly"));
    else if (r.reason !== "cancelled") flash(false, t("iap.error"));
  }

  async function handleRestore() {
    setBusy("restore");
    await restorePurchases();
    setBusy(null);
    onCoins(getCoins());
    flash(true, isPremium() ? t("iap.restored.premium") : t("iap.restored.none"));
  }

  const prem = PRODUCTS.find((p) => p.kind === "premium")!;
  const bonus = bonusPercents(prices);
  const golds = PRODUCTS.filter((p) => p.kind === "gold");

  return (
    <div style={{ marginTop: 10 }}>
      {/* Premium — reklamsız */}
      <div className={"iap-premium" + (premium ? " is-owned" : "")}>
        <div className="iap-premium-ico"><Icon name="moon" size={26} /></div>
        <div className="iap-premium-txt">
          <div className="iap-premium-t">{t("iap.premium.title")}</div>
          <div className="iap-premium-d">{t("iap.premium.desc")}</div>
        </div>
        {premium ? (
          <div className="iap-owned"><Icon name="check" size={15} /> {t("iap.premium.owned")}</div>
        ) : (
          <button className="btn-primary-x" disabled={!!busy} onClick={() => handleBuy(prem)}>
            {busy === prem.id ? "…" : prices[prem.id]?.label ?? t("iap.buy")}
          </button>
        )}
      </div>

      {/* Altın paketleri */}
      <div className="iap-grid">
        {golds.map((p) => (
          <button key={p.id} className="iap-gold" disabled={!!busy} onClick={() => handleBuy(p)}>
            {bonus[p.id] && <span className="iap-bonus">{t("iap.bonus", { n: bonus[p.id]! })}</span>}
            <span className="iap-gold-n"><Icon name="coin" size={20} /> {p.gold}</span>
            <span className="iap-gold-p">{busy === p.id ? "…" : prices[p.id]?.label ?? t("iap.buy")}</span>
          </button>
        ))}
      </div>

      <div className="iap-foot">
        <div style={{ minHeight: 20, color: msg?.ok ? "var(--ok-text)" : "var(--danger-text)", fontWeight: 600, fontSize: 13.5 }}>
          {msg?.text}
        </div>
        <button className="mm-ghost" disabled={!!busy} onClick={handleRestore}>
          {busy === "restore" ? "…" : t("iap.restore")}
        </button>
        <div className="iap-legal">{t("iap.legal")}</div>
      </div>
    </div>
  );
}
