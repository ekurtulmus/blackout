"use client";

import { useCallback, useEffect, useState } from "react";
import { useT } from "@/lib/i18n";

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
  help = false,
  onHelpClose,
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
  // Nasıl Oynanır düğmesi kabuğun sağ üstünde (MenuShell) — açık/kapalı durumu page.tsx'te tutulur,
  // modalın kendisi burada. Bu yüzden dışarıdan kontrol edilir.
  help?: boolean;
  onHelpClose?: () => void;
}) {
  const t = useT();
  const [topic, setTopic] = useState<string | null>(null); // Nasıl Oynanır: açık konu
  const [isTouch, setIsTouch] = useState(false);
  const anim = !introShown;
  useEffect(() => {
    introShown = true;
  }, []);
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Sağlam dokunmatik tespiti: bazı mobil tarayıcılarda yalnız `pointer: coarse`
    // güvenilmez → touch noktaları ve ontouchstart de kontrol edilir. Yoksa telefonda
    // "Nasıl Oynanır" yanlışlıkla WASD/klavye kontrollerini gösteriyordu.
    const coarse = !!window.matchMedia && window.matchMedia("(pointer: coarse)").matches;
    const touchPts = typeof navigator !== "undefined" && navigator.maxTouchPoints > 0;
    const hasTouch = "ontouchstart" in window;
    setIsTouch(coarse || touchPts || hasTouch);
  }, []);
  // Modal kapanınca açık konu da sıfırlanır (bir dahaki açılış konu listesinden başlasın)
  const closeHelp = useCallback(() => {
    setTopic(null);
    onHelpClose?.();
  }, [onHelpClose]);
  useEffect(() => {
    const onEsc = (e: KeyboardEvent) => { if (e.key === "Escape") closeHelp(); };
    window.addEventListener("keydown", onEsc);
    return () => window.removeEventListener("keydown", onEsc);
  }, [closeHelp]);

  // Giriş animasyonu yardımcıları (menüye dönüşte anında görünsün)
  const fx = (delay: string): React.CSSProperties =>
    anim ? { opacity: 0, animation: `mm-fade 1s ease-out ${delay} both` } : {};

  // Nasıl Oynanır — konu-konu bilgi (kullanıcı merak ettiğine tıklar)
  const helpTopics: { key: string; title: string; items: { k?: string; t: string }[] }[] = [
    {
      key: "kontrol",
      title: t("menu.help.controls.title"),
      items: isTouch
        ? [
            { k: t("menu.help.controls.move"), t: t("menu.help.controls.move.touch") },
            { k: t("menu.help.controls.fire"), t: t("menu.help.controls.fire.touch") },
            { k: t("menu.help.controls.swap"), t: t("menu.help.controls.swap.touch") },
          ]
        : [
            { k: t("menu.help.controls.move"), t: t("menu.help.controls.move.key") },
            { k: t("menu.help.controls.fire"), t: t("menu.help.controls.fire.key") },
            { k: t("menu.help.controls.swap"), t: t("menu.help.controls.swap.key") },
          ],
    },
    {
      key: "amac",
      title: t("menu.help.goal.title"),
      items: [
        { t: t("menu.help.goal.body") },
        { k: t("menu.help.goal.lock"), t: t("menu.help.goal.lock.body") },
        { k: t("menu.help.goal.next"), t: t("menu.help.goal.next.body") },
      ],
    },
    {
      key: "gelinler",
      title: t("menu.help.brides.title"),
      items: [
        { k: t("menu.help.brides.classic"), t: t("menu.help.brides.classic.body") },
        { k: t("menu.help.brides.queen"), t: t("menu.help.brides.queen.body") },
        { t: t("menu.help.brides.others") },
      ],
    },
    {
      key: "can",
      title: t("menu.help.life.title"),
      items: [
        { k: t("menu.help.life.lives"), t: t("menu.help.life.lives.body") },
        { k: t("menu.help.life.respawn"), t: t("menu.help.life.respawn.body") },
        { k: t("menu.help.life.heart"), t: t("menu.help.life.heart.body") },
      ],
    },
    {
      key: "mermi",
      title: t("menu.help.ammo.title"),
      items: [
        { k: t("menu.help.ammo.limited"), t: t("menu.help.ammo.limited.body") },
        { k: t("menu.help.ammo.noise"), t: t("menu.help.ammo.noise.body") },
        { k: t("menu.help.ammo.respawn"), t: t("menu.help.ammo.respawn.body") },
      ],
    },
    {
      key: "para",
      title: t("menu.help.gold.title"),
      items: [
        { k: t("menu.help.gold.earn"), t: t("menu.help.gold.earn.body") },
        { k: t("menu.help.gold.shop"), t: t("menu.help.gold.shop.body") },
        { k: t("menu.help.gold.forever"), t: t("menu.help.gold.forever.body") },
      ],
    },
    {
      key: "esya",
      title: t("menu.help.veil.title"),
      items: [
        { k: t("menu.help.veil.veil"), t: t("menu.help.veil.veil.body") },
        { t: t("menu.help.veil.chances") },
        { k: t("menu.help.veil.ring"), t: t("menu.help.veil.ring.body") },
        { k: t("menu.help.veil.mirror"), t: t("menu.help.veil.mirror.body") },
        { k: t("menu.help.veil.bell"), t: t("menu.help.veil.bell.body") },
        { k: t("menu.help.veil.candles"), t: t("menu.help.veil.candles.body") },
      ],
    },
    {
      key: "yaris",
      title: t("menu.help.race.title"),
      items: [
        { t: t("menu.help.race.body") },
        { k: t("menu.help.race.barrier"), t: t("menu.help.race.barrier.body") },
        { k: t("menu.help.race.shop"), t: t("menu.help.race.shop.body") },
        { k: t("menu.help.race.death"), t: t("menu.help.race.death.body") },
      ],
    },
  ];
  const openTopic = topic ? helpTopics.find((h) => h.key === topic) : null;

  const boxes: { label: string; onClick: () => void; icon: React.ReactNode }[] = [
    {
      label: t("menu.box.missions"), onClick: onMissions,
      icon: <><circle cx="12" cy="12" r="8" /><circle cx="12" cy="12" r="3.4" /><path d="M12 2v3M12 19v3M2 12h3M19 12h3" /></>,
    },
    {
      label: t("menu.box.modes"), onClick: onModes,
      icon: <><path d="M12 3l8 4.5v9L12 21l-8-4.5v-9z" /><path d="M12 3v18M4 7.5l8 4.5 8-4.5" /></>,
    },
    {
      label: t("menu.box.shop"), onClick: onShop,
      icon: <><path d="M4 5h2l2 11h9l2-7H7" /><circle cx="9.5" cy="20" r="1.3" /><circle cx="17" cy="20" r="1.3" /></>,
    },
    {
      label: t("menu.box.achievements"), onClick: onAchievements,
      icon: <><path d="M7 8a5 5 0 0 1 10 0v2h1l-1 8H7l-1-8h1z" /><path d="M9.5 12v2M14.5 12v2" /></>,
    },
    {
      label: t("menu.box.journal"), onClick: onJournal,
      icon: <path d="M4 5.5A2 2 0 0 1 6 4h5v15H6a2 2 0 0 0-2 1.5zM20 5.5A2 2 0 0 0 18 4h-5v15h5a2 2 0 0 1 2 1.5z" />,
    },
    {
      label: t("menu.box.secrets"), onClick: onSecrets,
      icon: <><circle cx="8.5" cy="8.5" r="4.5" /><path d="M11.7 11.7L20 20M17 17l-2 2 2 2 2-2z" /></>,
    },
  ];

  return (
    <div className="mm-wrap">
      <h1 className={"mm-title" + (anim ? " mm-title-in" : "")}>
        J<span className="mm-o">I</span>LTED
      </h1>

      <div className="mm-eyebrow" style={fx("0.75s")}>
        <span className="mm-rule mm-rule-l" />
        <span>{t("menu.eyebrow")}</span>
        <span className="mm-rule mm-rule-r" />
      </div>

      <p className="mm-lore" style={fx("1s")}>
        {t("menu.lore.a")}{" "}
        <span className="mm-r">{t("menu.lore.brides")}</span> {t("menu.lore.b")}
      </p>

      {continueLabel && (
        <button className="mm-continue" onClick={onContinue} style={fx("1.15s")}>
          <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true"><path d="M8 5v14l11-7z" /></svg>
          {t("menu.continue")} · {continueLabel}
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
            <span className="mm-card-title">{t("menu.single")}</span>
            <span className="mm-card-sub">{t("menu.single.sub")}</span>
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
            <span className="mm-card-title">{t("menu.multi")}</span>
            <span className="mm-card-sub">{t("menu.multi.sub")}</span>
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

      {/* Nasıl Oynanır modalı — konu-bazlı (tıkla → detay). Açan düğme kabuğun sağ üstünde. */}
      {help && (
        <div
          className="mm-modal"
          onClick={(e) => { if (e.target === e.currentTarget) closeHelp(); }}
        >
          <div className="mm-modal-card">
            {openTopic ? (
              <>
                <button className="mm-ghost mm-help-back" onClick={() => setTopic(null)}>← {t("common.back")}</button>
                <h2 className="mm-modal-title">{openTopic.title}</h2>
                <ul className="mm-help">
                  {openTopic.items.map((it, i) => (
                    <li key={i}>{it.k ? <b>{it.k}</b> : null}{it.t}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 className="mm-modal-title">{t("menu.help.title")}</h2>
                <p className="mm-help-lead">{t("menu.help.lead")}</p>
                <div className="mm-help-grid">
                  {helpTopics.map((h) => (
                    <button key={h.key} className="mm-help-topic" onClick={() => setTopic(h.key)}>
                      {h.title}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="mm-modal-close" onClick={closeHelp}>{t("menu.help.close")}</button>
          </div>
        </div>
      )}
    </div>
  );
}
