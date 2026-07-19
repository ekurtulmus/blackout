"use client";

import { useCallback, useEffect, useState } from "react";

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
      title: "Kontroller",
      items: isTouch
        ? [
            { k: "Hareket", t: "Sol alttaki joystick'i sürükle — çektiğin yöne yürürsün." },
            { k: "Ateş / Kılıç", t: "Sağ alttaki büyük düğme kuşandığın silahı kullanır." },
            { k: "Silah değiştir", t: "Ateşin yanındaki düğmeyle mermi ↔ kılıç arası geç." },
          ]
        : [
            { k: "Hareket", t: "WASD veya ok tuşları · Shift ile koş (nefes barı tükenir)." },
            { k: "Ateş / Kılıç", t: "Boşluk ya da SOL TIK — kuşandığın silahı kullanır." },
            { k: "Silah değiştir", t: "F tuşu veya SAĞ TIK — mermi ↔ kılıç." },
          ],
    },
    {
      key: "amac",
      title: "Amaç & Bölüm",
      items: [
        { t: "Kapkaranlık labirentte fenerinle yolunu bul." },
        { k: "Çıkış kilidi", t: "Çıkış önce KİLİTLİ. En az 1 gelini yok edince açılır." },
        { k: "Bölüm geç", t: "Yeşil parlayan kapıya ulaş → sonraki bölüm. Yalnız Kaçış'ta 10 bölüm." },
      ],
    },
    {
      key: "gelinler",
      title: "Kanlı Gelinler",
      items: [
        { k: "Kanlı Gelin", t: "Klasik avcı. Görünce koşar, asla vazgeçmez; bölümle zekileşir." },
        { k: "Karanlık Gelin", t: "Işıkta yavaş, karanlıkta hızlanır. Karanlıkta gözleri kırmızı parlar." },
        { k: "Mukus Gelini", t: "Öldüğünde 10 sn zehirli yeşil leke bırakır; üstünden geçme." },
        { k: "Çağıran Gelin", t: "Çığlık atıp yakındaki uyuyan gelinleri uyandırır, sürü çeker." },
        { k: "Bölünen Gelin", t: "Öldürünce iki hızlı yavruya bölünür. Köşede sıkışma." },
        { k: "Duvar Aşan Gelin", t: "Duvarların içinden yavaşça süzülür; labirent durduramaz." },
        { k: "Kraliçe Gelin", t: "Dev boss, birkaç bölümde bir. Taçlı, kızıl auralı, çok tehlikeli." },
      ],
    },
    {
      key: "can",
      title: "Can & Ölüm",
      items: [
        { k: "3 can", t: "Gelin teması can barını düşürür. Bar bitince bir can gider." },
        { k: "Yeniden doğuş", t: "Ölünce bölüm başında kısa dokunulmazlıkla doğarsın." },
        { k: "Kalp atışı", t: "Karanlıkta kalbin hızlanır — yakında gelin var demektir." },
      ],
    },
    {
      key: "mermi",
      title: "Mermi & Ateş",
      items: [
        { k: "Sınırlı mermi", t: "Yerdeki parlayan mermileri topla; boşa harcama." },
        { k: "Ses çeker", t: "Ateş sesi gelinleri üstüne çeker." },
        { k: "Geri doğar", t: "Toplanan mermi 10 sn sonra yerinde geri belirir." },
      ],
    },
    {
      key: "para",
      title: "Dükkân & Altın",
      items: [
        { k: "Altın kazan", t: "Gelin öldürünce ve bölüm geçince altın kazanırsın." },
        { k: "Dükkân", t: "Kalıcı geliştirmeler (sürekli cephane, asker müttefiki) ve kozmetik (fener/kılıç/görünüm renkleri) al." },
        { k: "Her yerde geçerli", t: "Aldığın her şey tüm modlarda ve bölümlerde geçerlidir." },
      ],
    },
    {
      key: "duvak",
      title: "Duvak (Görünmezlik)",
      items: [
        { k: "Bul & kuşan", t: "Yerde bulursun; envanterden kuşanıp istediğin an tetikle." },
        { k: "Gizlen", t: "Alınca birkaç sn görünmez olursun; gelinler seni göremez — köşeden sıvış." },
        { k: "Dikkat", t: "Ateş edersen ya da saldırırsan görünmezlik anında bozulur." },
      ],
    },
    {
      key: "firsat",
      title: "Fırsatlar (Yüzük, Ayna, Çan…)",
      items: [
        { t: "Bölümlerde ara sıra opsiyonel 'Fırsat' hedefleri çıkar. Çıkışı geciktirmez." },
        { k: "Yüzük", t: "Ekstra altın verir — ama bir gelini çıldırtıp hızlandırır." },
        { k: "Ayna", t: "Kehanet: birkaç sn beklersen çıkışın yönünü gösterir." },
        { k: "Çan", t: "Tüm gelinleri çana çeker — tuzak kurmak için birebir." },
        { k: "Mumlar / Kan izi", t: "Mumları yak ya da doğru kan izini takip et → ödül." },
      ],
    },
    {
      key: "yaris",
      title: "Ölüm Koşusu (Online)",
      items: [
        { t: "2-6 kişi aynı labirentte yarışır; ilk çıkan bölümü kazanır, puan birikir." },
        { k: "Bariyer", t: "Bölüm başına 3 hakkın var; koyduğun bariyer rakibin yolunu kapar, bir atışla yıkılır." },
        { k: "Dükkân", t: "Turlar arası dükkândan kazandığın altınla eşya al." },
        { k: "Ölüm", t: "Can barın bitince 3 sn bekleyip başta güvenle doğarsın; yarış sürer." },
      ],
    },
  ];
  const openTopic = topic ? helpTopics.find((h) => h.key === topic) : null;

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

      {/* Nasıl Oynanır modalı — konu-bazlı (tıkla → detay). Açan düğme kabuğun sağ üstünde. */}
      {help && (
        <div
          className="mm-modal"
          onClick={(e) => { if (e.target === e.currentTarget) closeHelp(); }}
        >
          <div className="mm-modal-card">
            {openTopic ? (
              <>
                <button className="mm-ghost mm-help-back" onClick={() => setTopic(null)}>← Geri</button>
                <h2 className="mm-modal-title">{openTopic.title}</h2>
                <ul className="mm-help">
                  {openTopic.items.map((it, i) => (
                    <li key={i}>{it.k ? <b>{it.k}</b> : null}{it.t}</li>
                  ))}
                </ul>
              </>
            ) : (
              <>
                <h2 className="mm-modal-title">Nasıl Oynanır</h2>
                <p className="mm-help-lead">Merak ettiğin konuya dokun:</p>
                <div className="mm-help-grid">
                  {helpTopics.map((h) => (
                    <button key={h.key} className="mm-help-topic" onClick={() => setTopic(h.key)}>
                      {h.title}
                    </button>
                  ))}
                </div>
              </>
            )}
            <button className="mm-modal-close" onClick={closeHelp}>Kapat</button>
          </div>
        </div>
      )}
    </div>
  );
}
