"use client";

// Sayıyı 0'dan (ya da `from`'dan) hedefe doğru SAYARAK gösterir — bölüm sonu altını gibi
// ödül anlarında "kazandım" hissini görünür kılar. `delay` ile sahneli girişe uyar.
// "Hareketi azalt" açıksa doğrudan son değeri gösterir.
import { useEffect, useRef, useState } from "react";

export default function CountUp({
  to,
  from = 0,
  ms = 700,
  delay = 0,
  prefix = "",
}: {
  to: number;
  from?: number;
  ms?: number;
  delay?: number; // ms
  prefix?: string;
}) {
  const [v, setV] = useState(from);
  const raf = useRef(0);
  useEffect(() => {
    let reduce = false;
    try {
      reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    } catch {
      /* geç */
    }
    if (reduce || to === from) {
      setV(to);
      return;
    }
    setV(from);
    let start = 0;
    const tick = (now: number) => {
      if (!start) start = now;
      const k = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - k, 3); // ease-out: hızlı başlar, yavaşça oturur
      setV(Math.round(from + (to - from) * e));
      if (k < 1) raf.current = requestAnimationFrame(tick);
    };
    const t = window.setTimeout(() => {
      raf.current = requestAnimationFrame(tick);
    }, delay);
    return () => {
      window.clearTimeout(t);
      cancelAnimationFrame(raf.current);
    };
  }, [to, from, ms, delay]);
  return (
    <>
      {prefix}
      {v}
    </>
  );
}
