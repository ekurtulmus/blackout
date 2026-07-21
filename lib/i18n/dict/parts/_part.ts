import type { Lang } from "../../langs";

// SÖZLÜK PARÇASI TANIMLAYICI.
//
// NEDEN PARÇA: sözlük tek dosya olsaydı aynı anda birden çok kişi/ajan üzerinde
// çalışamazdı. Her konu (dükkân, başarımlar, görevler…) KENDİ dosyasında ve o dosya
// 6 dilin TAMAMINI içerir → dosyalar birbirine değmez.
//
// GARANTİ: `tr` KAYNAKTIR. TypeScript diğer 5 dilin `tr`deki anahtarların TAMAMINI
// içermesini zorunlu kılar; eksik ya da fazla anahtar DERLEME HATASI olur.
// Yani "bir dilde şu yazı çevrilmemiş" durumu sessizce yayına gidemez.
//
// KULLANIM:
//   export const shop = definePart({
//     tr: { "shop.title": "DÜKKÂN" },
//     en: { "shop.title": "SHOP" },
//     ru: { … }, es: { … }, hi: { … }, zh: { … },
//   });
export function definePart<T extends Record<string, string>>(
  p: { tr: T } & { [L in Exclude<Lang, "tr">]: { [K in keyof T]: string } }
): { tr: T } & { [L in Exclude<Lang, "tr">]: { [K in keyof T]: string } } {
  return p;
}
