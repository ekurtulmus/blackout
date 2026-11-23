"use client";

// REKLAM ARASI EKRANI.
// 1) Bölüm arası reklamdan önce "Reklam başlıyor 3… 2… 1" sayacı — oyuncu reklamın
//    geleceğini görür, ani kesilme hissi olmaz (mobil oyunlarda alışılmış akış).
// 2) TEST REKLAMI: reklam ağı (AdMob/AdSense) henüz bağlanmadıysa, gerçek reklamın
//    yerine açıkça "test" yazan bir kart gösterilir → reklam akışı kurulumdan önce de
//    görülüp denenebilir. Reklam ağı bağlanınca bu kart HİÇ görünmez, gerçek reklam gelir.
import { useT } from "@/lib/i18n";
import Icon from "@/components/Icon";

export type AdUi = {
  kind: "interstitial" | "reward";
  phase: "count" | "test";
  n: number; // sayaçta kalan saniye
  ms?: number; // test reklamının süresi (ilerleme çubuğu)
};

export default function AdBreak({ ui, onNoAds }: { ui: AdUi; onNoAds?: () => void }) {
  const t = useT();
  return (
    <div className="adb" role="dialog" aria-live="polite">
      {ui.phase === "count" ? (
        <div className="adb-count">
          <div className="adb-label">{t("ads.countdown")}</div>
          {/* key = sayı → her saniye yeniden "vurur" */}
          <div className="adb-num" key={ui.n}>{ui.n}</div>
          {onNoAds && (
            <button className="adb-noads" onClick={onNoAds}>
              {t("ads.remove")}
            </button>
          )}
        </div>
      ) : (
        <div className="adb-card">
          <div className="adb-tag">{t("ads.test.tag")}</div>
          <div className="adb-ico"><Icon name={ui.kind === "reward" ? "coin" : "play"} size={34} /></div>
          <div className="adb-title">{t(ui.kind === "reward" ? "ads.test.reward" : "ads.test.title")}</div>
          <div className="adb-desc">{t("ads.test.desc")}</div>
          <div className="adb-bar"><span style={{ animationDuration: (ui.ms ?? 3500) + "ms" }} /></div>
        </div>
      )}
    </div>
  );
}
