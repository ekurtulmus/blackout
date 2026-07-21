"use client";

// JILTED — kampanya kapanış sahnesi. 10. bölüm bitince BİR KEZ oynar, sonra sonuç
// ekranı (skor/altın/başarım) gelir. Tasarım dili açılış Splash'ıyla aynı:
// karanlık sahne + altın line-art + Cinzel başlık.
// Sahne: sönen fener (geride bırakılır) → taş kemerde şafak aralığı genişler →
// siluet ışığa yürür → "GÜN AĞARDI".
// Dokununca atlanır; süre dolunca kendiliğinden biter. prefers-reduced-motion desteklenir.
import { useEffect, useRef } from "react";
import { useT } from "@/lib/i18n";

const FULL_MS = 18400; // tam sahne (globals.css'teki fin-* gecikmeleriyle uyumlu)
const REDUCED_MS = 5200; // hareket azaltma açıkken her şey sabit görünür → kısa dursun

export default function Finale({ onDone }: { onDone: () => void }) {
  const t = useT();
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      !!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const t = window.setTimeout(finish, reduced ? REDUCED_MS : FULL_MS);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="fin-stage" onClick={finish} role="button" aria-label={t("chrome.fin.skip.aria")}>
      <div className="splash-vignette" />

      <svg
        viewBox="0 0 200 216"
        width="218"
        height="235"
        style={{ position: "relative", maxWidth: "58vw" }}
        aria-hidden="true"
      >
        <defs>
          {/* Kapı aralığından gelen şafak */}
          <radialGradient id="finDawn" cx="50%" cy="58%" r="64%">
            <stop offset="0" stopColor="#fff6e2" stopOpacity=".97" />
            <stop offset=".44" stopColor="#f0c680" stopOpacity=".72" />
            <stop offset="1" stopColor="#e0a24a" stopOpacity="0" />
          </radialGradient>
          {/* Zemine taşan ışık */}
          <linearGradient id="finFloor" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#f0c680" stopOpacity=".5" />
            <stop offset="1" stopColor="#f0c680" stopOpacity="0" />
          </linearGradient>
          {/* Fenerin halesi */}
          <radialGradient id="finLamp" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f7e6c2" stopOpacity=".9" />
            <stop offset="1" stopColor="#f7e6c2" stopOpacity="0" />
          </radialGradient>
          <clipPath id="finDoor">
            <path d="M62 196 V72 A38 38 0 0 1 138 72 V196 Z" />
          </clipPath>
        </defs>

        {/* Kapı boşluğu: önce kapkaranlık, sonra ışık ortadan dışa doğru genişler.
            Kırpma DIŞ g'de, dönüşüm İÇ g'de — yoksa clip de birlikte ölçeklenirdi. */}
        <g clipPath="url(#finDoor)">
          <rect x="62" y="30" width="76" height="166" fill="#050303" />
          <g className="fin-crack">
            <rect x="62" y="30" width="76" height="166" fill="url(#finDawn)" />
          </g>
        </g>

        {/* Işığın zemine düşen izi */}
        <g className="fin-spill">
          <path d="M62 196 L26 214 H174 L138 196 Z" fill="url(#finFloor)" />
        </g>

        {/* Işığa yürüyen siluet (arkadan) */}
        <g className="fin-walk">
          <circle cx="100" cy="150" r="7.5" fill="#0b0806" />
          <path d="M100 158 C92 158 88 174 87 194 H113 C112 174 108 158 100 158 Z" fill="#0b0806" />
        </g>

        {/* Taş kemer + zemin */}
        <g fill="none" stroke="#8a6f3e" strokeLinecap="round" strokeLinejoin="round">
          <path d="M62 196 V72 A38 38 0 0 1 138 72 V196" strokeWidth="7" />
          <path d="M50 176 H62 M50 140 H62 M138 176 H150 M138 140 H150" strokeWidth="2.2" opacity=".7" />
          <path d="M14 196 H186" strokeWidth="2.4" opacity=".55" />
        </g>

        {/* Geride bırakılan fener — ışığı titreyip söner, gövdesi kalır */}
        <circle cx="38" cy="187" r="22" fill="url(#finLamp)" className="fin-glow" />
        <g fill="none" stroke="#8a6f3e" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M34 173 a4 4 0 0 1 8 0" />
          <path d="M31 178 H45" />
          <path d="M33 178 V196 M43 178 V196" />
          <path d="M29 196 H47" strokeWidth="2.4" />
        </g>
        <circle cx="38" cy="187" r="3.2" fill="#fff7e6" className="fin-glow" />
      </svg>

      {/* Kapanış anlatısı — üç satır sırayla belirip solar (aynı yerde, sayfa zıplamaz) */}
      <div className="fin-lines">
        <p className="fin-line fin-l1">{t("chrome.fin.line1")}</p>
        <p className="fin-line fin-l2">{t("chrome.fin.line2")}</p>
        <p className="fin-line fin-l3">{t("chrome.fin.line3")}</p>
      </div>

      <div style={{ textAlign: "center", position: "relative" }}>
        <div className="fin-title">{t("chrome.fin.title")}</div>
        <div className="fin-hook">
          <span className="splash-rule" />
          <span>{t("chrome.fin.hook")}</span>
          <span className="splash-rule" />
        </div>
      </div>

      {/* Kapanış: sahne tamamen kararır, sonra TEK kelime kalır — asıl kanca burada. */}
      <div className="fin-dark" />
      <div className="fin-last">{t("chrome.fin.last")}</div>

      <div className="fin-skip">{t("chrome.fin.skip")}</div>
    </div>
  );
}
