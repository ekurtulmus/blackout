"use client";
import { useEffect, useState } from "react";

// Cihaz dokunmatik mi? Klavye/fare metinlerini (WASD, Esc, sol tık…) telefonda
// GÖSTERMEMEK için kullanılır — oyun Play Store'da mobil uygulama olarak yayınlanıyor.
//
// Sağlam tespit: bazı mobil tarayıcılarda yalnız `pointer: coarse` güvenilmez,
// bu yüzden dokunma noktası sayısı ve `ontouchstart` de kontrol edilir.
//
// SSR NOTU: ilk render'da her zaman `false` döner ve gerçek değer effect'te yazılır.
// Sunucu dokunmatik olup olmadığını bilemez; doğrudan tahmin etmek hydration
// uyuşmazlığı üretirdi. Pratikte bir kare sonra düzelir, göze çarpmaz.
export function useIsTouch(): boolean {
  const [isTouch, setIsTouch] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const coarse = !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const touchPts = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const hasTouch = "ontouchstart" in window;
    setIsTouch(coarse || touchPts || hasTouch);
  }, []);
  return isTouch;
}
