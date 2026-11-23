// REKLAM — Google H5 Games Ads (AdSense "Ad Placement API": adBreak / adConfig).
//
// Neden bu: oyun bir WEB oyunu (Play'de TWA = Chrome sekmesi). AdMob yerel SDK ister,
// TWA'da çalışmaz. H5 Games Ads Google'ın web oyunları için yaptığı API'dir: bölüm arası
// (interstitial) ve ödüllü (rewarded) reklamı Google'ın kendisi yönetir, sıklık sınırını
// da Google uygular (çok sık çağırsak bile reklam göstermeyebilir — bu NORMAL).
//
// KURULUM: AdSense hesabı + H5 Games Ads onayı gerekir. Yayıncı kimliği (ca-pub-...)
// ortam değişkeninde: NEXT_PUBLIC_ADSENSE_CLIENT. Tanımlı değilse reklam sistemi TAMAMEN
// KAPALI (no-op): oyun reklamsız çalışır, ödüllü reklam düğmesi hiç görünmez.
// Geliştirmede `data-adbreak-test="on"` ile Google'ın TEST reklamları gelir.
//
// KURAL: adBreak'e verilen adBreakDone HER ZAMAN çağrılır (reklam gösterilmese de).
// Reklam engelleyici betiği hiç yüklemezse çağrılmaz → zaman aşımıyla oyuna devam edilir;
// oyuncu ASLA reklam yüzünden takılı kalmaz.

import { sound } from "./audio";
import { isPremium } from "./billing";

const CLIENT = process.env.NEXT_PUBLIC_ADSENSE_CLIENT ?? "";

type AdBreakOpts = Record<string, unknown>;
type AdWindow = Window & {
  adsbygoogle?: unknown[];
  adBreak?: (o: AdBreakOpts) => void;
  adConfig?: (o: AdBreakOpts) => void;
};

let inited = false;
let scriptOk = false; // betik gerçekten yüklendi mi (engelleyici yoksa)

export function adsEnabled(): boolean {
  return CLIENT.startsWith("ca-pub-");
}

export function initAds() {
  if (inited || !adsEnabled() || typeof window === "undefined") return;
  inited = true;
  const w = window as AdWindow;
  w.adsbygoogle = w.adsbygoogle || [];
  w.adBreak = w.adConfig = (o: AdBreakOpts) => {
    w.adsbygoogle!.push(o);
  };
  const s = document.createElement("script");
  s.async = true;
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${CLIENT}`;
  s.crossOrigin = "anonymous";
  s.setAttribute("data-ad-client", CLIENT);
  s.setAttribute("data-ad-frequency-hint", "45s"); // iki bölüm arası reklam en az ~45 sn arayla
  if (process.env.NODE_ENV !== "production") s.setAttribute("data-adbreak-test", "on");
  s.onload = () => {
    scriptOk = true;
  };
  document.head.appendChild(s);
  w.adConfig({ preloadAdBreaks: "on", sound: "on" });
}

// Reklam sırasında oyunun TÜM sesi durur (müzik reklamla üst üste binmesin), sonra döner.
const beforeAd = () => sound.setPaused(true);
const afterAd = () => sound.setPaused(false);

// BÖLÜM ARASI reklam. Premium'da / reklam kapalıyken hemen döner.
// Söz (promise) reklam bitince ya da gösterilmeyeceği anlaşılınca çözülür.
export function showInterstitial(name: string): Promise<void> {
  if (!adsEnabled() || isPremium() || typeof window === "undefined") return Promise.resolve();
  initAds();
  const w = window as AdWindow;
  return new Promise((resolve) => {
    let done = false;
    let started = false;
    const finish = () => {
      if (done) return;
      done = true;
      if (started) afterAd();
      resolve();
    };
    // Betik yoksa / reklam hiç başlamazsa oyuncuyu bekletme
    window.setTimeout(() => {
      if (!started) finish();
    }, scriptOk ? 3500 : 1500);
    window.setTimeout(finish, 90_000); // en kötü durum emniyeti
    w.adBreak!({
      type: "next",
      name,
      beforeAd: () => {
        if (done) return;
        started = true;
        beforeAd();
      },
      afterAd: () => {},
      adBreakDone: finish,
    });
  });
}

// ÖDÜLLÜ reklam: Google reklam HAZIRSA `onReady(show)` çağırır → biz düğmeyi gösteririz.
// Oyuncu düğmeye basarsa show() reklamı oynatır; sonuna kadar izlerse `onReward`.
// Hazır reklam yoksa onReady hiç çağrılmaz → düğme hiç görünmez (boş vaat yok).
// Premium oyuncu da isterse izleyebilir (zorunlu değil, ödül karşılığı).
export function requestReward(
  name: string,
  cb: { onReady: (show: () => void) => void; onReward: () => void; onDone?: () => void }
): () => void {
  if (!adsEnabled() || typeof window === "undefined") return () => {};
  initAds();
  const w = window as AdWindow;
  let cancelled = false;
  let started = false;
  w.adBreak!({
    type: "reward",
    name,
    beforeReward: (showAdFn: () => void) => {
      if (!cancelled) cb.onReady(showAdFn);
    },
    beforeAd: () => {
      started = true;
      beforeAd();
    },
    afterAd: () => {
      if (started) afterAd();
      started = false;
    },
    adViewed: () => cb.onReward(),
    adDismissed: () => {},
    adBreakDone: () => cb.onDone?.(),
  });
  return () => {
    cancelled = true;
  };
}
