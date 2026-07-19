"use client";

// JILTED — açılış animasyonu (marka splash). Uygulama yüklenince bir kez oynar,
// sonra menüye geçer. Dokununca atlanır; ~4 sn sonra otomatik kapanır.
// Tasarım: karanlık sahne + fenerini tutan oyuncu + kıvrılan J + "JILTED" başlığı.
import { useEffect, useRef } from "react";

export default function Splash({ onDone }: { onDone: () => void }) {
  const done = useRef(false);
  const finish = () => {
    if (done.current) return;
    done.current = true;
    onDone();
  };
  useEffect(() => {
    const t = window.setTimeout(finish, 4200);
    return () => window.clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="splash-stage" onClick={finish} role="button" aria-label="Girişi atla">
      <div className="splash-vignette" />

      <svg viewBox="0 0 156 168" width="230" height="248" style={{ position: "relative", maxWidth: "60vw" }} aria-hidden="true">
        <defs>
          <radialGradient id="jltLu" cx="34%" cy="80%" r="82%">
            <stop offset="0" stopColor="#e0a24a" stopOpacity=".6" />
            <stop offset=".45" stopColor="#e0a24a" stopOpacity=".14" />
            <stop offset="1" stopColor="#e0a24a" stopOpacity="0" />
          </radialGradient>
          <radialGradient id="jltAu" cx="50%" cy="50%" r="50%">
            <stop offset="0" stopColor="#f7e6c2" stopOpacity=".95" />
            <stop offset="1" stopColor="#f7e6c2" stopOpacity="0" />
          </radialGradient>
        </defs>
        <circle cx="52" cy="130" r="52" fill="url(#jltLu)" style={{ animation: "spl-fade 1s ease-out 1.8s both" }} />
        <path d="M46 28 H110 M94 28 V112 A30 30 0 0 1 52 130" fill="none" stroke="#8a6f3e" strokeWidth="30" strokeLinecap="round" strokeLinejoin="round" pathLength={100} strokeDasharray={100} style={{ animation: "spl-draw 1.3s ease-in-out .25s both" }} />
        <path d="M46 28 H110 M94 28 V112 A30 30 0 0 1 52 130" fill="none" stroke="#0e0a08" strokeWidth="25" strokeLinecap="round" strokeLinejoin="round" style={{ animation: "spl-fade .5s ease-out 1.25s both" }} />
        <path d="M62 41 V16 M78 41 V28 M104 16 V41 M81 54 H94 M94 72 H107 M81 92 H94 M100 108 H107 M74 118 H92" stroke="#6b5a3a" strokeWidth="2.2" style={{ animation: "spl-fade .6s ease-out 1.55s both" }} />
        <g style={{ transformBox: "fill-box", transformOrigin: "center", animation: "spl-pop .8s cubic-bezier(.2,.9,.3,1.2) 1.7s both" }}>
          <circle cx="52" cy="130" r="17" fill="url(#jltAu)" style={{ animation: "spl-flick 2.4s ease-in-out 2.6s infinite" }} />
          <circle cx="52" cy="123" r="4" fill="#fff7e6" />
          <path d="M52 128 L46 143 H58 Z" fill="#fff7e6" />
          <circle cx="61" cy="131" r="2.6" fill="#f2d9a8" />
        </g>
      </svg>

      <div style={{ textAlign: "center", position: "relative" }}>
        <div className="splash-title">JILTED</div>
        <div className="splash-sub">
          <span className="splash-rule" />
          <span>Karanlıkta Kaçış</span>
          <span className="splash-rule" />
        </div>
      </div>
    </div>
  );
}
