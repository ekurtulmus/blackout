// ANDROID UYGULAMASI İÇİN REKLAM — AdMob (Capacitor eklentisi @capacitor-community/admob).
//
// Yalnız Play'den kurulan Android uygulamasında (Capacitor yerel platformu) çalışır; tarayıcıda
// lib/ads.ts kendi web akışını (AdSense / test kartı) kullanır. Eklenti DİNAMİK yüklenir ki web
// paketine gereksiz kod girmesin ve sunucu tarafında hiç çalışmasın.
//
// KİMLİKLER: ortam değişkenleri verilmezse Google'ın resmî TEST birimleri kullanılır (gerçek
// reklam/gelir YOK, hesap riski YOK). Gerçekleri Vercel ortam değişkenlerine yazılır:
//   NEXT_PUBLIC_ADMOB_INTERSTITIAL = ca-app-pub-XXXX/YYYY  (geçiş reklamı birimi)
//   NEXT_PUBLIC_ADMOB_REWARDED     = ca-app-pub-XXXX/ZZZZ  (ödüllü reklam birimi)
// (Uygulama kimliği ise Android paketinde: android/app/build.gradle admobAppId.)
//
// KURAL: oyuncu ASLA reklam yüzünden takılı kalmaz — her bekleme zaman aşımıyla biter.
import { Capacitor } from "@capacitor/core";

const TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
const TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917";
const INTERSTITIAL_ID = process.env.NEXT_PUBLIC_ADMOB_INTERSTITIAL || TEST_INTERSTITIAL;
const REWARDED_ID = process.env.NEXT_PUBLIC_ADMOB_REWARDED || TEST_REWARDED;
const TESTING = INTERSTITIAL_ID === TEST_INTERSTITIAL;

export function isNativeApp(): boolean {
  try {
    return Capacitor.isNativePlatform();
  } catch {
    return false;
  }
}

type AdMobMod = typeof import("@capacitor-community/admob");
let modP: Promise<AdMobMod> | null = null;
function mod() {
  if (!modP) modP = import("@capacitor-community/admob");
  return modP;
}

let initP: Promise<boolean> | null = null;
// SDK'yı başlat + AB/İngiltere'de zorunlu İZİN penceresini (Google UMP) gerekiyorsa göster.
export function initNativeAds(): Promise<boolean> {
  if (!isNativeApp()) return Promise.resolve(false);
  if (initP) return initP;
  initP = (async () => {
    try {
      const { AdMob, AdmobConsentStatus } = await mod();
      await AdMob.initialize({});
      try {
        const info = await AdMob.requestConsentInfo();
        if (info.isConsentFormAvailable && info.status === AdmobConsentStatus.REQUIRED) {
          await AdMob.showConsentForm();
        }
      } catch {
        /* izin bilgisi alınamadı — Google varsayılan (kişiselleştirilmemiş) reklama düşer */
      }
      return true;
    } catch {
      return false;
    }
  })();
  return initP;
}

const wait = (ms: number) => new Promise<void>((r) => setTimeout(r, ms));

// BÖLÜM ARASI reklam. Reklam kapanınca (ya da yüklenemezse) çözülür.
export async function nativeInterstitial(onStart: () => void, onEnd: () => void): Promise<void> {
  if (!(await initNativeAds())) return;
  const { AdMob, InterstitialAdPluginEvents } = await mod();
  try {
    await Promise.race([AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: TESTING }), wait(6000).then(() => { throw new Error("timeout"); })]);
  } catch {
    return; // reklam yok / ağ yok → oyuna devam
  }
  await new Promise<void>((resolve) => {
    let done = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const finish = () => {
      if (done) return;
      done = true;
      handles.forEach((h) => h.remove().catch(() => {}));
      onEnd();
      resolve();
    };
    Promise.all([
      AdMob.addListener(InterstitialAdPluginEvents.Dismissed, finish),
      AdMob.addListener(InterstitialAdPluginEvents.FailedToShow, finish),
    ]).then((hs) => handles.push(...hs));
    setTimeout(finish, 120_000); // emniyet
    onStart();
    AdMob.showInterstitial().catch(finish);
  });
}

// ÖDÜLLÜ reklam: önce yüklenir; yüklenirse `show` fonksiyonu döner (düğme o zaman görünür).
// show() reklamı oynatır; sonuna kadar izlenirse onReward çağrılır.
export async function nativePrepareReward(cb: {
  onStart: () => void;
  onEnd: () => void;
  onReward: () => void;
}): Promise<(() => void) | null> {
  if (!(await initNativeAds())) return null;
  const { AdMob, RewardAdPluginEvents } = await mod();
  try {
    await Promise.race([AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, isTesting: TESTING }), wait(8000).then(() => { throw new Error("timeout"); })]);
  } catch {
    return null;
  }
  return () => {
    let rewarded = false;
    let ended = false;
    const handles: { remove: () => Promise<void> }[] = [];
    const end = () => {
      if (ended) return;
      ended = true;
      handles.forEach((h) => h.remove().catch(() => {}));
      cb.onEnd();
    };
    Promise.all([
      AdMob.addListener(RewardAdPluginEvents.Rewarded, () => {
        if (!rewarded) {
          rewarded = true;
          cb.onReward();
        }
      }),
      AdMob.addListener(RewardAdPluginEvents.Dismissed, end),
      AdMob.addListener(RewardAdPluginEvents.FailedToShow, end),
    ]).then((hs) => handles.push(...hs));
    cb.onStart();
    AdMob.showRewardVideoAd().catch(end);
  };
}
