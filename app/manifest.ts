import type { MetadataRoute } from "next";

// PWA manifest — Next.js bunu otomatik /manifest.webmanifest olarak yayınlar.
// Play Store'a TWA (Trusted Web Activity) ile çıkarken Bubblewrap uygulamanın adını,
// ikonlarını, açılış rengini ve başlangıç adresini BURADAN okur. Bu dosya olmadan
// site "kurulabilir uygulama" sayılmaz ve TWA üretilemez.
//
// DİKKAT: `id` ve `start_url` yayınlandıktan sonra DEĞİŞTİRİLMEMELİ — tarayıcı
// kurulu uygulamayı bunlarla eşleştirir, değişirse ayrı bir uygulama gibi davranır.
export default function manifest(): MetadataRoute.Manifest {
  return {
    id: "/",
    name: "JILTED — Karanlıkta Kaçış",
    short_name: "JILTED", // ana ekranda ikon altında görünen ad (kısa olmalı)
    description:
      "Karanlık labirentte el fenerinle yolunu keşfet, Kanlı Gelinlerden kaç, gizli çıkışı bul.",
    start_url: "/",
    scope: "/",
    display: "standalone", // tarayıcı çerçevesi yok — gerçek uygulama gibi açılır
    background_color: "#05060a", // açılış ekranının zemini (oyunun karanlığıyla aynı)
    theme_color: "#05060a",
    lang: "tr",
    dir: "ltr",
    categories: ["games", "entertainment"],
    // orientation BİLEREK yok: oyun hem dikey hem yatay çalışıyor, kilitlemiyoruz.
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png", purpose: "any" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png", purpose: "any" },
      // MASKELİ: Android ikonu daire/damla/kare gibi şekillere kırpar. Ayrı sürüm
      // olmazsa J'nin kenarları kesilir (bkz. scripts/gen-icons.mjs).
      { src: "/icons/icon-192-maskable.png", sizes: "192x192", type: "image/png", purpose: "maskable" },
      { src: "/icons/icon-512-maskable.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
