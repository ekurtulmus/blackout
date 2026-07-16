"use client";

import { useEffect, useState } from "react";

// Giriş animasyonu YALNIZ ilk açılışta oynasın; menüye her dönüşte tekrar etmesin.
let introShown = false;

// BLACKOUT — ANA MENÜ (tasarım handoff).
// Arka plan/chrome (cüzdan, ayarlar, arkadaşlar) MenuShell'de; burada yalnız merkez içerik var.
// Yapı: BLACKOUT başlık → eyebrow → lore → (Devam Et) → 2 primary kart → 6 tek tip kutu → Nasıl Oynanır.
export default function MainMenu({
  onSolo,
  onMulti,
  onMissions,
  onModes,
  onShop,
  onAchievements,
  onJournal,
  onSecrets,
  continueLabel,
  onContinue,
}: {
  onSolo: () => void;
  onMulti: () => void;
  onMissions: () => void;
  onModes: () => void;
  onShop: () => void;
  onAchievements: () => void;
  onJournal: () => void;
  onSecrets: () => void;
  continueLabel?: string | null; // "Bölüm 4" — yoksa Devam Et gizli
  onContinue?: () => void;
}) {
  const [help, setHelp] = useState(false);
  const [isTouch, setIsTouch] = useState(false);
  const anim = !introShown;
  useEffect(() => {
    introShown = true;
  }, []);
  useEffect(() => {
    if (typeof window !== "undefined" && window.matchMedia) {
      setIsTouch(window.matchMedia("(pointer: coarse)").matches);
    }
  }, []);
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") setHelp(false); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, []);

  // Giriş animasyonu yardımcıları (menüye dönüşte anında görünsün)
  const fx = (delay: string): React.CSSProperties =>
    anim ? { opacity: 0, animation: `mm-fade 1s ease-out ${delay} both` } : {};

  const boxes: { label: string; onClick: () => void; icon: React.ReactNode }[] = [
    {
      label: "Görevler", onClick: onMissions,
      icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    },
    {
      label: "Modlar", onClick: onModes,
      icon: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 3v18M4 7.5l8 4.5 8-4.5" /></>,
    },
    {
      label: "Dükkân", onClick: onShop,
      icon: <><path d="M4 5h2l2 11h9l2-7H7" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>,
    },
    {
      label: "Başarım", onClick: onAchievements,
      icon: <><path d="M7 8a5 5 0 0 1 10 0v2h1l-1 8H7l-1-8h1z" /><path d="M9.5 12v2M14.5 12v2" /></>,
    },
    {
      label: "Günlük", onClick: onJournal,
      icon: <path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 1.5zM20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 1.5z" />,
    },
    {
      label: "Sırlar", onClick: onSecrets,
      icon: <><circle cx="8.5" cy="8.5" r="4.5" /><path d="M11.7 11.7L20 20M17 17l-2 2 2 2 2-2z" /></>,
    },
  ];

  return (
    <div className="mm-wrap">
      <h1 className={"mm-title" + (anim ? " mm-title-in" : "")}>
        BLACK<span className="mm-o">O</span>UT
      </h1>

      <div className="mm-eyebrow" style={fx("0.75s")}>
        <span className="mm-rule mm-rule-l" />
        <span>Karanlıkta Kaçış</span>
        <span className="mm-rule mm-rule-r" />
      </div>

      <p className="mm-lore" style={fx("1s")}>
        Bir düğün vardı; kimse ondan sağ dönmedi.{" "}
        <span className="mm-r">Kanlı gelinler</span> hâlâ damadını arıyor.
      </p>

      {continueLabel && (
        <button className="mm-continue" onClick={onContinue} style={fx("1.15s")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          Devam Et · {continueLabel}
        </button>
      )}

      {/* İki eşit birincil kart */}
      <div className="mm-primaries" style={fx("1.3s")}>
        <button className="mm-card" onClick={onSolo}>
          <span className="mm-card-ico">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="12" cy="7.5" r="3.6" /><path d="M5 20a7 7 0 0 1 14 0" />
            </svg>
          </span>
          <span className="mm-card-txt">
            <span className="mm-card-title">TEK KİŞİLİK</span>
            <span className="mm-card-sub">Yalnız kaçış · 10 bölüm</span>
          </span>
        </button>
        <button className="mm-card" onClick={onMulti}>
          <span className="mm-card-ico">
            <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <circle cx="8.5" cy="8" r="3" /><circle cx="16.5" cy="9" r="2.4" />
              <path d="M3 19a5.5 5.5 0 0 1 11 0M14.5 15a4.5 4.5 0 0 1 6.5 4" />
            </svg>
          </span>
          <span className="mm-card-txt">
            <span className="mm-card-title">ÇOK OYUNCULU</span>
            <span className="mm-card-sub">Ölüm koşusu · 2–6 kişi</span>
          </span>
        </button>
      </div>

      {/* Tek tip 6 kutu */}
      <div className="mm-boxes" style={fx("1.5s")}>
        {boxes.map((b) => (
          <button key={b.label} className="mm-box" onClick={b.onClick}>
            <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              {b.icon}
            </svg>
            <span>{b.label}</span>
          </button>
        ))}
      </div>

      <div className="mm-foot" style={fx("1.65s")}>
        <button className="mm-ghost" onClick={() => setHelp(true)}>
          <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="9" />
            <path d="M9.4 9.4a2.6 2.6 0 0 1 5 .9c0 1.7-2.4 2.2-2.4 3.7" />
            <circle cx="12" cy="17" r=".6" fill="currentColor" />
          </svg>
          Nasıl Oynanır
        </button>
      </div>

      {/* Nasıl Oynanır modalı */}
      {help && (
        <div className="mm-modal" onClick={(e) => { if (e.target === e.currentTarget) setHelp(false); }}>
          <div className="mm-modal-card">
            <h2 className="mm-modal-title">Nasıl Oynanır</h2>
            <ul className="mm-help">
              <li><b>Hareket</b>{isTouch ? "Sol alttaki joystick'i sürükle; Shift yerine KOŞ düğmesi." : "WASD / ok tuşları · Shift ile koş (nefes barı tükenir)."}</li>
              <li><b>Ateş</b>{isTouch ? "Sağ alttaki ATEŞ düğmesi — baktığın yöne atar." : "Boşluk tuşu — baktığın yöne atar. Ses gelinleri çeker."}</li>
              <li><b>Amaç</b>Kapkaranlık labirentte fenerinle yolunu bul. Çıkış KİLİTLİ; en az 1 gelini yok edince açılır.</li>
              <li><b>Can</b>Gelin teması can barını düşürür; bar bitince bir can gider. Yerdeki can paketlerini topla.</li>
              <li><b>Eşya</b>{isTouch ? "Envanterden kuşan, ateşin solundaki slot düğmesiyle kullan." : "Q kalkan · R radar · E bariyer · T tuzak. Envanterden kuşan."}</li>
            </ul>
            <button className="mm-modal-close" onClick={() => setHelp(false)}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
