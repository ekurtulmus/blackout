// SATIN ALMA — Google Play Faturalandırma (Digital Goods API + Payment Request).
//
// Oyun Play Store'a TWA (Trusted Web Activity) olarak çıkar. Google, Play'den indirilen
// uygulamada dijital ürünlerin Play Billing ile satılmasını ŞART koşar; TWA bunu tarayıcının
// Digital Goods API'si üzerinden sağlar. Bu API YALNIZ Play'den kurulan TWA içinde vardır →
// tarayıcıdan oynayan biri satın alma düğmelerini HİÇ görmez (`billingAvailable()` false).
//
// ÜRÜNLER Play Console → Monetize → Products → In-app products altında AYNI ID'lerle
// oluşturulmalı (bkz. PRODUCTS). Altın paketleri TÜKETİLEBİLİR (consume edilir, tekrar alınır),
// premium TEK SEFERLİK (consume EDİLMEZ, listPurchases ile her açılışta geri yüklenir).
//
// GÜVENLİK NOTU: Altın zaten cihazda (localStorage) tutulduğu için sunucu doğrulaması bu
// sürümde yok; ödeme Google'da gerçekleşir, biz yalnız sonucu işleriz. Çift vermeyi önlemek
// için işlenen satın alma jetonları saklanır (GRANTED_KEY).

import { addCoins } from "./coins";

export type ProductId = "premium_noads" | "gold_300" | "gold_500" | "gold_1000";

export type Product = {
  id: ProductId;
  kind: "premium" | "gold";
  gold: number; // altın paketi miktarı (premium için 0)
};

// Fiyatlar Play Console'da girilir (Türkiye: premium → ₺30, 300 → ₺12, 500 → ₺15, 1000 → ₺20).
// "Daha fazla altın" rozeti SABİT YAZILMAZ: Play'den gelen gerçek fiyatlardan hesaplanır
// (bonusPercents) → her ülkede ve her fiyat değişikliğinde doğru kalır, oyuncu yanıltılmaz.
export const PRODUCTS: Product[] = [
  { id: "premium_noads", kind: "premium", gold: 0 },
  { id: "gold_300", kind: "gold", gold: 300 },
  { id: "gold_500", kind: "gold", gold: 500 },
  { id: "gold_1000", kind: "gold", gold: 1000 },
];

const PLAY_BILLING = "https://play.google.com/billing";
const PREMIUM_KEY = "blackout_premium";
const GRANTED_KEY = "blackout_iap_granted";
const MOCK_KEY = "blackout_billing_mock"; // YALNIZ geliştirmede: "1" → sahte mağaza (test için)

// --- Digital Goods API tipleri (TS lib'inde yok) ---
type ItemDetails = { itemId: string; title: string; description: string; price: { currency: string; value: string } };
type PurchaseDetails = { itemId: string; purchaseToken: string };
type DigitalGoodsService = {
  getDetails(itemIds: string[]): Promise<ItemDetails[]>;
  listPurchases(): Promise<PurchaseDetails[]>;
  consume(purchaseToken: string): Promise<void>;
};
type WindowWithDG = Window & { getDigitalGoodsService?: (provider: string) => Promise<DigitalGoodsService> };

// --- Premium (reklamsız) ---
export function isPremium(): boolean {
  try {
    return localStorage.getItem(PREMIUM_KEY) === "1";
  } catch {
    return false;
  }
}
function setPremium(on: boolean) {
  try {
    if (on) localStorage.setItem(PREMIUM_KEY, "1");
    else localStorage.removeItem(PREMIUM_KEY);
  } catch {
    /* geç */
  }
  premiumListeners.forEach((f) => f(on));
}
const premiumListeners = new Set<(on: boolean) => void>();
export function onPremiumChange(f: (on: boolean) => void): () => void {
  premiumListeners.add(f);
  return () => premiumListeners.delete(f);
}

// --- İşlenmiş jetonlar (çift altın vermeyi önler) ---
function grantedTokens(): string[] {
  try {
    const a = JSON.parse(localStorage.getItem(GRANTED_KEY) ?? "[]");
    return Array.isArray(a) ? a : [];
  } catch {
    return [];
  }
}
function markGranted(token: string) {
  const a = grantedTokens().filter((x) => x !== token);
  a.push(token);
  try {
    localStorage.setItem(GRANTED_KEY, JSON.stringify(a.slice(-60)));
  } catch {
    /* geç */
  }
}

// --- Sahte mağaza (geliştirme testi) ---
function mockOn(): boolean {
  if (process.env.NODE_ENV === "production") return false;
  try {
    return localStorage.getItem(MOCK_KEY) === "1";
  } catch {
    return false;
  }
}
const MOCK_PRICES: Record<ProductId, string> = {
  premium_noads: "30",
  gold_300: "12",
  gold_500: "15",
  gold_1000: "20",
};
const mockService: DigitalGoodsService = {
  async getDetails(ids) {
    return ids.map((id) => ({
      itemId: id,
      title: id,
      description: "",
      price: { currency: "TRY", value: MOCK_PRICES[id as ProductId] ?? "0" },
    }));
  },
  async listPurchases() {
    return isPremium() ? [{ itemId: "premium_noads", purchaseToken: "mock-premium" }] : [];
  },
  async consume() {},
};

let servicePromise: Promise<DigitalGoodsService | null> | null = null;
function getService(): Promise<DigitalGoodsService | null> {
  if (servicePromise) return servicePromise;
  servicePromise = (async () => {
    if (typeof window === "undefined") return null;
    if (mockOn()) return mockService;
    const w = window as WindowWithDG;
    if (!w.getDigitalGoodsService) return null;
    try {
      return await w.getDigitalGoodsService(PLAY_BILLING);
    } catch {
      return null; // Play dışı kurulum / Play Billing yok
    }
  })();
  return servicePromise;
}

export async function billingAvailable(): Promise<boolean> {
  return (await getService()) !== null;
}

export type Price = { label: string; value: number; currency: string };
export type PriceMap = Partial<Record<ProductId, Price>>;

// Play'in YERELLEŞTİRİLMİŞ fiyatları (oyuncunun para birimiyle). Fiyatı biz yazmayız:
// Play Console'da ne girildiyse o gösterilir.
export async function loadPrices(lang: string): Promise<PriceMap> {
  const s = await getService();
  if (!s) return {};
  try {
    const det = await s.getDetails(PRODUCTS.map((p) => p.id));
    const out: PriceMap = {};
    for (const d of det) {
      const n = Number(d.price.value);
      let label = d.price.value;
      try {
        if (Number.isFinite(n)) label = new Intl.NumberFormat(lang, { style: "currency", currency: d.price.currency }).format(n);
      } catch {
        /* bilinmeyen para birimi → ham değer */
      }
      out[d.itemId as ProductId] = { label, value: n, currency: d.price.currency };
    }
    return out;
  } catch {
    return {};
  }
}

// Altın paketlerinin "en küçük pakete göre yüzde kaç fazla altın" değeri — GERÇEK fiyatlardan.
// Fiyat yoksa / para birimleri farklıysa / fark %5'ten azsa rozet gösterilmez.
export function bonusPercents(prices: PriceMap): Partial<Record<ProductId, number>> {
  const golds = PRODUCTS.filter((p) => p.kind === "gold");
  const base = golds[0];
  const bp = prices[base.id];
  const out: Partial<Record<ProductId, number>> = {};
  if (!bp || !(bp.value > 0)) return out;
  const baseRate = base.gold / bp.value;
  for (const p of golds.slice(1)) {
    const pr = prices[p.id];
    if (!pr || !(pr.value > 0) || pr.currency !== bp.currency) continue;
    const pct = Math.round(((p.gold / pr.value) / baseRate - 1) * 100);
    if (pct >= 5) out[p.id] = pct;
  }
  return out;
}

// Ürünün etkisini UYGULA (idempotent: aynı jeton iki kez altın vermez).
async function fulfill(s: DigitalGoodsService, itemId: string, token: string): Promise<boolean> {
  const p = PRODUCTS.find((x) => x.id === itemId);
  if (!p) return false;
  if (p.kind === "premium") {
    setPremium(true);
    return true;
  }
  if (!grantedTokens().includes(token)) {
    addCoins(p.gold);
    markGranted(token);
  }
  try {
    await s.consume(token); // tüketilmezse Play 3 gün içinde iade eder ve paket tekrar alınamaz
  } catch {
    /* bir sonraki açılışta restorePurchases tekrar dener — altın İKİNCİ KEZ verilmez */
  }
  return true;
}

export type BuyResult = { ok: true } | { ok: false; reason: "unavailable" | "cancelled" | "error" };

export async function buy(id: ProductId): Promise<BuyResult> {
  const s = await getService();
  if (!s) return { ok: false, reason: "unavailable" };
  if (s === mockService) {
    await fulfill(s, id, "mock-" + id + "-" + Date.now());
    return { ok: true };
  }
  try {
    const req = new PaymentRequest(
      [{ supportedMethods: PLAY_BILLING, data: { sku: id } }],
      // Tutar Play'den gelir; burası API'nin zorunlu alanı (gösterilmez).
      { total: { label: "Total", amount: { currency: "USD", value: "0" } } }
    );
    const res = await req.show();
    const token = (res.details as { purchaseToken?: string })?.purchaseToken;
    if (!token) {
      await res.complete("fail");
      return { ok: false, reason: "error" };
    }
    await fulfill(s, id, token);
    await res.complete("success");
    return { ok: true };
  } catch (e) {
    const name = (e as { name?: string })?.name;
    return { ok: false, reason: name === "AbortError" ? "cancelled" : "error" };
  }
}

// Açılışta: premium'u geri yükle + yarım kalmış (ödenmiş ama tüketilmemiş) altın
// paketlerini tamamla. Uygulama ödeme anında kapanırsa altın burada verilir.
export async function restorePurchases(): Promise<void> {
  const s = await getService();
  if (!s) return;
  try {
    const list = await s.listPurchases();
    for (const pd of list) await fulfill(s, pd.itemId, pd.purchaseToken);
    // BİLEREK: listede premium yok diye premium GERİ ALINMAZ. Çevrimdışı/geçici boş liste
    // ödeme yapmış birinin reklamsızlığını elinden alabilirdi; iade istismarı bundan küçük risk.
  } catch {
    /* geç */
  }
}
