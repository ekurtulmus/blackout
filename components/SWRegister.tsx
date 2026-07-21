"use client";

// Service worker'ı kaydeder (public/sw.js).
// YALNIZ ÜRETİMDE: dev sunucusunda kaydedilirse Turbopack/HMR parçalarını önbelleğe
// alır ve "kod değişti ama tarayıcı eskisini gösteriyor" tuzağına yol açar.
// Kayıt `load` sonrasına bırakılır → ilk açılışın hızını yavaşlatmaz.
import { useEffect } from "react";

export default function SWRegister() {
  useEffect(() => {
    if (process.env.NODE_ENV !== "production") return;
    if (typeof navigator === "undefined" || !("serviceWorker" in navigator)) return;
    const reg = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* kayıt başarısızsa oyun normal çalışmaya devam eder */
      });
    };
    if (document.readyState === "complete") reg();
    else {
      window.addEventListener("load", reg, { once: true });
      return () => window.removeEventListener("load", reg);
    }
  }, []);
  return null;
}
