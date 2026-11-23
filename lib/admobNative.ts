// ANDROID UYGULAMASI İÇİN REKLAM — AdMob (Capacitor eklentisi @capacitor-community/admob).
//
// Yalnız Play'den kurulan Android uygulamasında (Capacitor yerel platformu) çalışır; tarayıcıda
// lib/ads.ts kendi web akışını (AdSense / test kartı) kullanır. Eklenti DİNAMİK yüklenir ki web
// paketine gereksiz kod girmesin ve sunucu tarafında hiç çalışmasın.
//
// KİMLİKLER aşağıda (gizli değildir, uygulamada zaten görünür). HANGİSİ KULLANILIR:
//   NEXT_PUBLIC_ADMOB_LIVE=1  → gerçek birimler (gelir). Vercel ortam değişkeni + yeniden deploy.
//   tanımsız / başka değer    → Google TEST birimleri (hesap riski yok). VARSAYILAN BUDUR.
// Geliştirirken/denerken gerçek reklama tıklamak AdMob hesabını kapattırabilir → yayına kadar kapalı tut.
// (Uygulama kimliği Android paketinde: android/app/build.gradle admobAppId.)
//
// KURAL: oyuncu ASLA reklam yüzünden takılı kalmaz — her bekleme zaman aşımıyla biter.
import { Capacitor } from "@capacitor/core";

const LIVE = process.env.NEXT_PUBLIC_ADMOB_LIVE === "1";
const REAL_INTERSTITIAL = "ca-app-pub-1034346502909902/1296758344"; // jilted_bolum_arasi_gecis
const REAL_REWARDED = "ca-app-pub-1034346502909902/9869509244"; // jilted_bolum_sonu_2x_altin
const TEST_INTERSTITIAL = "ca-app-pub-3940256099942544/1033173712";
const TEST_REWARDED = "ca-app-pub-3940256099942544/5224354917";
const INTERSTITIAL_ID = LIVE ? REAL_INTERSTITIAL : TEST_INTERSTITIAL;
const REWARDED_ID = LIVE ? REAL_REWARDED : TEST_REWARDED;

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
    await Promise.race([AdMob.prepareInterstitial({ adId: INTERSTITIAL_ID, isTesting: !LIVE }), wait(6000).then(() => { throw new Error("timeout"); })]);
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
    await Promise.race([AdMob.prepareRewardVideoAd({ adId: REWARDED_ID, isTesting: !LIVE }), wait(8000).then(() => { throw new Error("timeout"); })]);
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
